import { randomUUID } from 'node:crypto';
import { and, eq, inArray } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { emailAttentionReviews, emailAutomationActions, emailEvents, emailNotificationOutbox } from '$lib/server/db/schema';
import { getEmailAutomationHandler } from './handlers/registry';
import type { EmailAutomationInput, EmailClassification } from './classifier';
import { getEmailAutomationEventUrl, sendEmailAutomationNotification } from './notifications';
import { claimDueAction, claimDueNotification, deferNotificationUntil, markActionFailure, markActionResult, markNotificationResult, releaseStaleClaims } from './store';
import { evaluateLedgerAutomationPolicy, isCompanyLedgerHandler } from './ledger-safety';
import { loadAutomationSettings } from './settings';

const asSnapshot = (value: unknown) => value as { input: EmailAutomationInput; classification: EmailClassification };

const executeAction = async (action: typeof emailAutomationActions.$inferSelect) => {
  if (!action.leaseToken) throw new Error('Claimed action is missing its fencing token.');
  const leaseToken = action.leaseToken;
  const snapshot = asSnapshot(action.payloadSnapshot);
  if (isCompanyLedgerHandler(action.handlerKey)) {
    const settings = await loadAutomationSettings();
    const policy = evaluateLedgerAutomationPolicy(snapshot.input, snapshot.classification, settings.ledgerEnabled, settings.ledgerAllowedSenders, settings.ledgerMaxAmountThb);
    if (!policy.allowed) {
      const result = { state: 'review' as const, message: policy.reason ?? policy.status.nextAction };
      await markActionResult(action.id, leaseToken, result);
      return { kind: 'action' as const, status: 'safety_blocked' as const, id: action.id };
    }
  }
  const handler = getEmailAutomationHandler(action.handlerKey);
  if (!handler) {
    await markActionFailure(action.id, leaseToken, action.attemptCount + 1, `Unknown handler ${action.handlerKey}`);
    return { kind: 'action' as const, status: 'failed' as const, id: action.id };
  }
  try {
    const result = await handler.execute({ ...snapshot, eventId: action.eventId, actionId: action.id });
    await markActionResult(action.id, leaseToken, result);
    return { kind: 'action' as const, status: result.state, id: action.id };
  } catch (error) {
    await markActionFailure(action.id, leaseToken, action.attemptCount + 1, error);
    return { kind: 'action' as const, status: 'retry_scheduled' as const, id: action.id };
  }
};


const executeNotification = async (notification: typeof emailNotificationOutbox.$inferSelect) => {
  if (!notification.leaseToken) throw new Error('Claimed notification is missing its fencing token.');
  const leaseToken = notification.leaseToken;
  const snapshot = asSnapshot(notification.payloadSnapshot);
  try {
    const [event] = await db.select({ actionId: emailEvents.actionId, processingState: emailEvents.processingState, reviewReason: emailEvents.reviewReason }).from(emailEvents).where(eq(emailEvents.id, notification.eventId)).limit(1);
    const [review] = await db.select({ id: emailAttentionReviews.id }).from(emailAttentionReviews).where(eq(emailAttentionReviews.eventId, notification.eventId)).limit(1);
    const [action] = event?.actionId ? await db.select({ status: emailAutomationActions.status, externalObjectId: emailAutomationActions.externalObjectId, outcome: emailAutomationActions.outcome }).from(emailAutomationActions).where(eq(emailAutomationActions.id, event.actionId)).limit(1) : [];
    if (action && ['pending', 'claimed', 'retry_scheduled'].includes(action.status)) {
      // A concurrent processor may claim the notification while the external action is still running.
      // Defer instead of sending a premature Telegram message that says no Ledger action ran.
      await deferNotificationUntil(notification.id, leaseToken, new Date(Date.now() + 60_000));
      return { kind: 'notification' as const, status: 'deferred_for_action' as const, id: notification.id };
    }
    const actionOutcome = action?.outcome && typeof action.outcome === 'object' ? action.outcome as { message?: unknown; externalUrl?: unknown } : undefined;
    const actionMessage = actionOutcome && 'message' in actionOutcome ? String(actionOutcome.message ?? '') : undefined;
    const externalUrl = actionOutcome && typeof actionOutcome.externalUrl === 'string' ? actionOutcome.externalUrl : undefined;
    const sent = await sendEmailAutomationNotification(snapshot.input, snapshot.classification, notification.eventId, action?.externalObjectId ?? undefined, { actionStatus: action?.status, externalObjectId: action?.externalObjectId, externalUrl, actionMessage, processingState: event?.processingState, reviewReason: event?.reviewReason, dashboardUrl: getEmailAutomationEventUrl(notification.eventId) });
    if (sent === 'not_configured') throw new Error('Telegram is not configured.');
    await markNotificationResult(notification.id, leaseToken, true, notification.attemptCount + 1);
    return { kind: 'notification' as const, status: 'sent' as const, id: notification.id };
  } catch (error) {
    await markNotificationResult(notification.id, leaseToken, false, notification.attemptCount + 1, error);
    return { kind: 'notification' as const, status: 'retry_scheduled' as const, id: notification.id };
  }
};

export const processEmailAutomationActionById = async (id: number) => {
  const now = new Date();
  const [action] = await db.update(emailAutomationActions).set({ status: 'claimed', leaseToken: `manager-${randomUUID()}`, leaseExpiresAt: new Date(now.getTime() + 5 * 60_000), updatedAt: now }).where(and(eq(emailAutomationActions.id, id), inArray(emailAutomationActions.status, ['pending', 'retry_scheduled', 'failed']))).returning();
  if (!action) throw new Error('This action is no longer eligible for retry. Refresh the event first.');
  return executeAction(action);
};
export const processEmailAutomationNotificationById = async (id: number) => {
  const now = new Date();
  const [notification] = await db.update(emailNotificationOutbox).set({ status: 'claimed', leaseToken: `manager-${randomUUID()}`, leaseExpiresAt: new Date(now.getTime() + 5 * 60_000), updatedAt: now }).where(and(eq(emailNotificationOutbox.id, id), inArray(emailNotificationOutbox.status, ['pending', 'retry_scheduled', 'failed']))).returning();
  if (!notification) throw new Error('This notification is no longer eligible for retry. Refresh the event first.');
  return executeNotification(notification);
};

/** Bounded work runner. It is safe to invoke from a manager command today and a scheduler later. */
export const processOneEmailAutomationItem = async () => {
  await releaseStaleClaims();
  const action = await claimDueAction();
  if (action) return executeAction(action);
  const notification = await claimDueNotification();
  if (notification) return executeNotification(notification);
  return { kind: 'none' as const, status: 'idle' as const };
};
