import { randomUUID } from 'node:crypto';
import { and, asc, eq, inArray, lte } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { emailAttentionReviews, emailAutomationActions, emailAutomationAttempts, emailEvents, emailNotificationOutbox } from '$lib/server/db/schema';
import type { EmailAutomationInput, EmailClassification, EmailClassifierDiagnostics } from './classifier';
import { boundReviewText, createEmailBodyPreview, createHistoricalClassifierDiagnostics, createReviewEvidenceSnapshot, EMAIL_BODY_PREVIEW_MAX_CHARS, sanitizeClassifierDiagnostics } from './review-bundle';
import type { EmailAutomationHandler } from './handlers/types';
import { nextRetryAt, canRetry } from './retry-policy';

export const redactAutomationError = (value: unknown) => (value instanceof Error ? value.message : String(value))
  .replace(/[\r\n]+/g, ' ')
  .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email redacted]')
  .replace(/\b\d{9,}\b/g, '[number redacted]')
  .slice(0, 300);
const cleanError = redactAutomationError;

export type DurableIntent = {
  input: EmailAutomationInput;
  classification: EmailClassification;
  classifierDiagnostics?: EmailClassifierDiagnostics;
  hash: string;
  handler?: EmailAutomationHandler;
  notificationsEnabled: boolean;
  ledgerEnabled: boolean;
};

type ReviewInsert = {
  eventId: number;
  input: EmailAutomationInput;
  classification: EmailClassification;
  classifierDiagnostics?: unknown;
  processingState?: string;
  reasonCode?: string;
  reason?: string;
};

const ensureAttentionReview = async (tx: { insert: Function }, review: ReviewInsert) => {
  if (!['review', 'failed'].includes(review.processingState ?? review.classification.processingState)) return;
  const reason = boundReviewText(review.reason ?? review.classification.reviewReason, 500) || (
    review.processingState === 'failed'
      ? 'The durable external action failed and needs manager attention.'
      : 'This email needs manager review before any external action.'
  );
  const diagnostics = review.classifierDiagnostics ?? createHistoricalClassifierDiagnostics({
    classification: review.classification.classification,
    subtype: review.classification.subtype,
    processingState: review.processingState ?? review.classification.processingState,
    reviewReason: reason
  });
  await tx.insert(emailAttentionReviews).values({
    eventId: review.eventId,
    status: 'waiting',
    reasonCode: review.reasonCode ?? (review.processingState === 'failed' ? 'action_failed' : 'classifier_review'),
    reason,
    evidenceSnapshot: createReviewEvidenceSnapshot(review.input, { ...review.classification, processingState: (review.processingState ?? review.classification.processingState) as EmailClassification['processingState'] }),
    classifierDiagnostics: sanitizeClassifierDiagnostics(diagnostics)
  }).onConflictDoNothing({ target: emailAttentionReviews.eventId });
};

const actionSnapshot = (value: unknown) => value as { input: EmailAutomationInput; classification: EmailClassification; classifierDiagnostics?: unknown };

export const persistDurableEmailIntent = async (intent: DurableIntent) => {
  const bodyPreview = createEmailBodyPreview(intent.input);
  const bodySource = typeof intent.input.textBody === 'string' && intent.input.textBody.trim() ? 'text' : typeof intent.input.htmlBody === 'string' && intent.input.htmlBody.trim() ? 'html' : null;
  const sourceBody = typeof intent.input.textBody === 'string' && intent.input.textBody.trim() ? intent.input.textBody : intent.input.htmlBody;
  const bodyPreviewTruncated = Boolean(intent.input.mime?.textTruncated) || Boolean(sourceBody && sourceBody.trim().length > EMAIL_BODY_PREVIEW_MAX_CHARS);
  return db.transaction(async (tx) => {
  const [event] = await tx.insert(emailEvents).values({
    receivedAt: new Date(intent.input.receivedAt), messageId: intent.input.messageId, emailHash: intent.hash,
    fromAddress: intent.input.from, toAddress: intent.input.to, subject: intent.input.subject,
    attachmentCount: intent.input.attachmentCount, classification: intent.classification.classification,
    subtype: intent.classification.subtype,
    processingState: intent.classification.processingState === 'ready' && intent.handler && intent.ledgerEnabled ? 'queued' : intent.classification.processingState,
    externalRef: intent.classification.externalRef, amountMinor: intent.classification.amountMinor, currency: intent.classification.currency,
    counterparty: intent.classification.counterparty, reviewReason: intent.classification.reviewReason,
    notificationState: intent.classification.notify && intent.notificationsEnabled ? 'pending' : 'not_needed',
    parserVersion: intent.input.mime?.parserVersion, mimeCompleteness: intent.input.mime?.completeness ?? 'incomplete',
    decisionSnapshot: { classifierVersion: '1', handlerKey: intent.handler?.key, handlerVersion: intent.handler?.version, matchedRuleName: intent.classification.matchedRuleName, extractedDescription: intent.classification.description, notifyPolicy: intent.classification.notifyPolicy, ledgerEnabled: intent.ledgerEnabled, classifierDiagnostics: intent.classifierDiagnostics ? sanitizeClassifierDiagnostics(intent.classifierDiagnostics) : null },
    metadata: {
      bodyPreview,
      bodyPreviewSource: bodySource,
      bodyPreviewTruncated,
      textSnippet: intent.input.textBody?.replace(/\s+/g, ' ').slice(0, 500),
      htmlSnippet: intent.input.htmlBody?.replace(/\s+/g, ' ').slice(0, 500),
      description: intent.classification.description,
      handlerKey: intent.classification.handlerKey,
      mime: intent.input.mime
    }
  }).onConflictDoNothing({ target: emailEvents.emailHash }).returning({ id: emailEvents.id, processingState: emailEvents.processingState, notificationState: emailEvents.notificationState });
  if (!event) {
    const [existing] = await tx.select({ id: emailEvents.id, processingState: emailEvents.processingState, notificationState: emailEvents.notificationState }).from(emailEvents).where(eq(emailEvents.emailHash, intent.hash)).limit(1);
    return { duplicate: true as const, eventId: existing?.id, processingState: existing?.processingState, notificationState: existing?.notificationState };
  }
  await ensureAttentionReview(tx, {
    eventId: event.id,
    input: intent.input,
    classification: intent.classification,
    classifierDiagnostics: intent.classifierDiagnostics
  });
  const canRepresentHandler = intent.handler
    && intent.classification.classification !== 'ignore'
    && (intent.classification.processingState === 'ready' || intent.handler.sideEffectRisk === 'none');
  if (canRepresentHandler && intent.handler) {
    const idempotencyKey = intent.handler.idempotencyKey(intent.input, intent.classification);
    const [createdAction] = await tx.insert(emailAutomationActions).values({ eventId: event.id, handlerKey: intent.handler.key, handlerVersion: intent.handler.version, idempotencyKey, payloadSnapshot: { input: intent.input, classification: intent.classification, classifierDiagnostics: intent.classifierDiagnostics ? sanitizeClassifierDiagnostics(intent.classifierDiagnostics) : null } }).onConflictDoNothing({ target: [emailAutomationActions.handlerKey, emailAutomationActions.idempotencyKey] }).returning({ id: emailAutomationActions.id, status: emailAutomationActions.status });
    const linkedAction = createdAction ?? (await tx.select({ id: emailAutomationActions.id, status: emailAutomationActions.status }).from(emailAutomationActions).where(and(eq(emailAutomationActions.handlerKey, intent.handler.key), eq(emailAutomationActions.idempotencyKey, idempotencyKey))).limit(1))[0];
    if (!linkedAction) throw new Error('Could not link the semantic automation action.');
    await tx.update(emailEvents).set({
      actionId: linkedAction.id,
      processingState: createdAction && intent.classification.processingState === 'ready' ? 'queued' : createdAction ? intent.classification.processingState : 'linked_existing_action',
      reviewReason: createdAction ? intent.classification.reviewReason : `This event maps to existing action #${linkedAction.id}; no duplicate action was queued.`
    }).where(eq(emailEvents.id, event.id));
  }
  if (intent.classification.notify && intent.notificationsEnabled) {
    await tx.insert(emailNotificationOutbox).values({ eventId: event.id, idempotencyKey: `event:${event.id}:initial`, payloadSnapshot: { input: intent.input, classification: intent.classification } }).onConflictDoNothing({ target: emailNotificationOutbox.idempotencyKey });
  }
  const [projected] = await tx.select({ processingState: emailEvents.processingState, notificationState: emailEvents.notificationState }).from(emailEvents).where(eq(emailEvents.id, event.id)).limit(1);
  return { duplicate: false as const, eventId: event.id, processingState: projected.processingState, notificationState: projected.notificationState };
  });
};

export const claimDueAction = async (now = new Date()) => db.transaction(async (tx) => {
  // Lock one row before changing it so concurrent processors cannot both run it.
  const [candidate] = await tx.select().from(emailAutomationActions).where(and(inArray(emailAutomationActions.status, ['pending', 'retry_scheduled']), lte(emailAutomationActions.nextAttemptAt, now))).orderBy(asc(emailAutomationActions.nextAttemptAt), asc(emailAutomationActions.id)).limit(1).for('update', { skipLocked: true });
  if (!candidate) return undefined;
  const [claim] = await tx.update(emailAutomationActions).set({ status: 'claimed', leaseToken: randomUUID(), leaseExpiresAt: new Date(now.getTime() + 5 * 60_000), updatedAt: now }).where(eq(emailAutomationActions.id, candidate.id)).returning();
  return claim;
});
export const claimDueNotification = async (now = new Date()) => db.transaction(async (tx) => {
  const [candidate] = await tx.select().from(emailNotificationOutbox).where(and(inArray(emailNotificationOutbox.status, ['pending', 'retry_scheduled']), lte(emailNotificationOutbox.nextAttemptAt, now))).orderBy(asc(emailNotificationOutbox.nextAttemptAt), asc(emailNotificationOutbox.id)).limit(1).for('update', { skipLocked: true });
  if (!candidate) return undefined;
  const [claim] = await tx.update(emailNotificationOutbox).set({ status: 'claimed', leaseToken: randomUUID(), leaseExpiresAt: new Date(now.getTime() + 5 * 60_000), updatedAt: now }).where(eq(emailNotificationOutbox.id, candidate.id)).returning();
  return claim;
});
export const isCurrentLease = (status: string, storedToken: string | null, suppliedToken: string) => status === 'claimed' && Boolean(suppliedToken) && storedToken === suppliedToken;

export const markActionResult = async (id: number, leaseToken: string, result: { state: 'succeeded' | 'reconciled' | 'review'; externalObjectId?: string; externalUrl?: string; message: string }, now = new Date()) => {
  const status = result.state === 'review' ? 'failed' : result.state;
  return db.transaction(async (tx) => {
    const [before] = await tx.select().from(emailAutomationActions).where(and(eq(emailAutomationActions.id, id), eq(emailAutomationActions.status, 'claimed'), eq(emailAutomationActions.leaseToken, leaseToken))).limit(1);
    if (!before) return false;
    const [updated] = await tx.update(emailAutomationActions).set({ status, externalObjectId: result.externalObjectId, outcome: result, completedAt: result.state === 'review' ? undefined : now, updatedAt: now, leaseToken: null, leaseExpiresAt: null }).where(and(eq(emailAutomationActions.id, id), eq(emailAutomationActions.status, 'claimed'), eq(emailAutomationActions.leaseToken, leaseToken))).returning({ id: emailAutomationActions.id });
    if (!updated) return false;
    await tx.update(emailEvents).set({
      processingState: result.state === 'review' ? 'review' : result.state === 'reconciled' ? 'reconciled' : 'action_succeeded',
      notionPageId: result.externalObjectId,
      reviewReason: result.state === 'review' ? result.message : null,
      processedAt: now
    }).where(eq(emailEvents.actionId, id));
    await tx.insert(emailAutomationAttempts).values({ actionId: id, kind: 'execute', status, detail: result });
    if (result.state === 'review') {
      const snapshot = actionSnapshot(before.payloadSnapshot);
      await ensureAttentionReview(tx, {
        eventId: before.eventId,
        input: snapshot.input,
        classification: snapshot.classification,
        classifierDiagnostics: snapshot.classifierDiagnostics,
        processingState: 'review',
        reasonCode: 'safety_blocked',
        reason: result.message
      });
    }
    return true;
  });
};
export const markActionFailure = async (id: number, leaseToken: string, attemptCount: number, error: unknown, now = new Date()) => {
  const retry = canRetry(attemptCount);
  const status = retry ? 'retry_scheduled' : 'failed';
  return db.transaction(async (tx) => {
    const [before] = await tx.select().from(emailAutomationActions).where(and(eq(emailAutomationActions.id, id), eq(emailAutomationActions.status, 'claimed'), eq(emailAutomationActions.leaseToken, leaseToken))).limit(1);
    if (!before) return false;
    const [updated] = await tx.update(emailAutomationActions).set({ status, attemptCount, nextAttemptAt: retry ? nextRetryAt(attemptCount, now) : now, lastError: cleanError(error), leaseToken: null, leaseExpiresAt: null, updatedAt: now }).where(and(eq(emailAutomationActions.id, id), eq(emailAutomationActions.status, 'claimed'), eq(emailAutomationActions.leaseToken, leaseToken))).returning({ id: emailAutomationActions.id });
    if (!updated) return false;
    await tx.update(emailEvents).set({ processingState: status, processedAt: now }).where(eq(emailEvents.actionId, id));
    await tx.insert(emailAutomationAttempts).values({ actionId: id, kind: 'execute', status, error: cleanError(error) });
    if (status === 'failed') {
      const snapshot = actionSnapshot(before.payloadSnapshot);
      await ensureAttentionReview(tx, {
        eventId: before.eventId,
        input: snapshot.input,
        classification: snapshot.classification,
        classifierDiagnostics: snapshot.classifierDiagnostics,
        processingState: 'failed',
        reasonCode: 'action_failed',
        reason: 'The durable external action failed after its retry limit and needs manager attention.'
      });
    }
    return true;
  });
};
export const deferNotificationUntil = async (id: number, leaseToken: string, nextAttemptAt: Date, now = new Date()) => {
  const [updated] = await db.update(emailNotificationOutbox).set({ status: 'retry_scheduled', nextAttemptAt, leaseToken: null, leaseExpiresAt: null, updatedAt: now }).where(and(eq(emailNotificationOutbox.id, id), eq(emailNotificationOutbox.status, 'claimed'), eq(emailNotificationOutbox.leaseToken, leaseToken))).returning({ id: emailNotificationOutbox.id, eventId: emailNotificationOutbox.eventId });
  if (!updated) return false;
  await db.update(emailEvents).set({ notificationState: 'retry_scheduled' }).where(eq(emailEvents.id, updated.eventId));
  return true;
};

export const markNotificationResult = async (id: number, leaseToken: string, sent: boolean, attemptCount: number, error?: unknown, now = new Date()) => {
  const retry = !sent && canRetry(attemptCount);
  const status = sent ? 'sent' : retry ? 'retry_scheduled' : 'failed';
  return db.transaction(async (tx) => {
    const [updated] = await tx.update(emailNotificationOutbox).set(sent ? { status, sentAt: now, attemptCount, leaseToken: null, leaseExpiresAt: null, updatedAt: now } : { status, attemptCount, nextAttemptAt: retry ? nextRetryAt(attemptCount, now) : now, lastError: cleanError(error), leaseToken: null, leaseExpiresAt: null, updatedAt: now }).where(and(eq(emailNotificationOutbox.id, id), eq(emailNotificationOutbox.status, 'claimed'), eq(emailNotificationOutbox.leaseToken, leaseToken))).returning({ id: emailNotificationOutbox.id, eventId: emailNotificationOutbox.eventId });
    if (!updated) return false;
    await tx.update(emailEvents).set({ notificationState: status }).where(eq(emailEvents.id, updated.eventId));
    return true;
  });
};
export const releaseStaleClaims = async (now = new Date()) => Promise.all([db.update(emailAutomationActions).set({ status: 'retry_scheduled', leaseToken: null, leaseExpiresAt: null, nextAttemptAt: now, updatedAt: now }).where(and(eq(emailAutomationActions.status, 'claimed'), lte(emailAutomationActions.leaseExpiresAt, now))), db.update(emailNotificationOutbox).set({ status: 'retry_scheduled', leaseToken: null, leaseExpiresAt: null, nextAttemptAt: now, updatedAt: now }).where(and(eq(emailNotificationOutbox.status, 'claimed'), lte(emailNotificationOutbox.leaseExpiresAt, now)))]);
