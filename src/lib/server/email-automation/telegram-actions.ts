import { createHash, randomBytes } from 'node:crypto';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { emailAttentionReviews } from '$lib/server/db/schema';
import {
  addEmailAutomationReviewSenderToIgnoredList,
  dismissEmailAutomationReviewAsIrrelevant,
  markEmailAutomationReviewDone
} from './dashboard';
import { readReviewTriageMetadata } from './review-bundle';
import { getEmailAutomationEventUrl } from './notifications/send';
import {
  buildEmailAutomationKeyboard,
  type EmailAutomationTelegramAction
} from './notifications/telegram-buttons';
import type { TelegramInlineKeyboardMarkup } from '$lib/server/alerts/types';

export type EmailAutomationTelegramActionResult = {
  message: string;
  showAlert?: boolean;
  replyMarkup?: TelegramInlineKeyboardMarkup;
};

type ReviewRecord = Awaited<ReturnType<typeof loadReview>>;
type IgnoreConfirmation = { tokenHash: string; telegramUserId: number; expiresAt: string };

const loadReview = async (eventId: number) => {
  const [review] = await db.select({
    id: emailAttentionReviews.id,
    status: emailAttentionReviews.status,
    analysis: emailAttentionReviews.analysis,
    summary: emailAttentionReviews.summary,
    analysisProvenance: emailAttentionReviews.analysisProvenance
  }).from(emailAttentionReviews).where(eq(emailAttentionReviews.eventId, eventId)).limit(1);
  return review;
};

const dashboardOnlyKeyboard = (eventId: number) => buildEmailAutomationKeyboard({
  eventId,
  dashboardUrl: getEmailAutomationEventUrl(eventId),
  review: false
});

const provenanceRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};

const tokenHash = (token: string) => createHash('sha256').update(token).digest('hex');

const readIgnoreConfirmation = (value: unknown): IgnoreConfirmation | null => {
  const confirmation = provenanceRecord(value).telegramIgnoreConfirmation;
  if (!confirmation || typeof confirmation !== 'object' || Array.isArray(confirmation)) return null;
  const record = confirmation as Record<string, unknown>;
  if (typeof record.tokenHash !== 'string' || typeof record.telegramUserId !== 'number' || typeof record.expiresAt !== 'string') return null;
  return { tokenHash: record.tokenHash, telegramUserId: record.telegramUserId, expiresAt: record.expiresAt };
};

const beginIgnoreConfirmation = async (review: NonNullable<ReviewRecord>, telegramUserId: number) => {
  const token = randomBytes(12).toString('base64url');
  const currentProvenance = provenanceRecord(review.analysisProvenance);
  const revision = readReviewTriageMetadata(currentProvenance).revision;
  const now = new Date();
  const [updated] = await db.update(emailAttentionReviews).set({
    analysisProvenance: {
      ...currentProvenance,
      telegramIgnoreConfirmation: {
        tokenHash: tokenHash(token),
        telegramUserId,
        expiresAt: new Date(now.getTime() + 5 * 60_000).toISOString()
      }
    },
    updatedAt: now
  }).where(and(
    eq(emailAttentionReviews.id, review.id),
    inArray(emailAttentionReviews.status, ['waiting', 'in_progress']),
    sql`coalesce(case when jsonb_typeof(${emailAttentionReviews.analysisProvenance}->'revision') = 'number' then (${emailAttentionReviews.analysisProvenance}->>'revision')::int end, 0) = ${revision}`
  )).returning({ id: emailAttentionReviews.id });
  if (!updated) throw new Error('Review state changed. Try the ignore command again.');
  return token;
};

const consumeIgnoreConfirmation = async (
  review: NonNullable<ReviewRecord>,
  confirmationToken: string | undefined,
  telegramUserId: number
) => {
  if (!confirmationToken) throw new Error('Ignore confirmation is missing. Start again.');
  const confirmation = readIgnoreConfirmation(review.analysisProvenance);
  const expectedHash = tokenHash(confirmationToken);
  if (
    !confirmation ||
    confirmation.tokenHash !== expectedHash ||
    confirmation.telegramUserId !== telegramUserId ||
    Date.parse(confirmation.expiresAt) <= Date.now()
  ) {
    throw new Error('Ignore confirmation expired or was already used. Start again.');
  }

  const { telegramIgnoreConfirmation: _removed, ...nextProvenance } = provenanceRecord(review.analysisProvenance);
  const [updated] = await db.update(emailAttentionReviews).set({
    analysisProvenance: nextProvenance,
    updatedAt: new Date()
  }).where(and(
    eq(emailAttentionReviews.id, review.id),
    inArray(emailAttentionReviews.status, ['waiting', 'in_progress']),
    sql`${emailAttentionReviews.analysisProvenance}->'telegramIgnoreConfirmation'->>'tokenHash' = ${expectedHash}`
  )).returning({ id: emailAttentionReviews.id });
  if (!updated) throw new Error('Ignore confirmation expired or was already used. Start again.');
};

/**
 * Executes only review-triage commands. Telegram buttons cannot claim, retry,
 * reconcile, or otherwise mutate an email automation action/outbox item.
 */
export const performEmailAutomationTelegramAction = async ({
  action,
  eventId,
  telegramUserId,
  confirmationToken
}: {
  action: EmailAutomationTelegramAction;
  eventId: number;
  telegramUserId: number;
  confirmationToken?: string;
}): Promise<EmailAutomationTelegramActionResult> => {
  if (action === 'test') {
    return { message: '🧪 Demo button only. No data was changed.' };
  }

  const review = await loadReview(eventId);
  if (!review) {
    return { message: 'No attention review exists for this email.', showAlert: true, replyMarkup: dashboardOnlyKeyboard(eventId) };
  }

  const dashboardUrl = getEmailAutomationEventUrl(eventId);
  if (review.status === 'done') {
    return { message: 'This review is already completed.', replyMarkup: dashboardOnlyKeyboard(eventId) };
  }

  if (action === 'ignore') {
    const token = await beginIgnoreConfirmation(review, telegramUserId);
    return {
      message: 'Confirm carefully: visible sender addresses can be spoofed. Future matching emails will bypass handlers, review, and Telegram.',
      showAlert: true,
      replyMarkup: buildEmailAutomationKeyboard({ eventId, dashboardUrl, review: true, ignoreConfirmationToken: token })
    };
  }

  if (action === 'cancel_ignore') {
    await consumeIgnoreConfirmation(review, confirmationToken, telegramUserId);
    return {
      message: 'Ignore cancelled. No data was changed.',
      replyMarkup: buildEmailAutomationKeyboard({ eventId, dashboardUrl, review: true })
    };
  }

  const triage = readReviewTriageMetadata(review.analysisProvenance);
  const values = {
    reviewId: review.id,
    analysis: review.analysis ?? '',
    summary: review.summary ?? '',
    needsFullBody: triage.needsFullBody,
    expectedRevision: triage.revision
  };
  const actor = `telegram:${telegramUserId}`;

  if (action === 'handled') {
    await markEmailAutomationReviewDone(values, actor);
    return { message: 'Review marked handled.', replyMarkup: dashboardOnlyKeyboard(eventId) };
  }

  if (action === 'dismiss') {
    await dismissEmailAutomationReviewAsIrrelevant(values, actor);
    return { message: 'Review dismissed as irrelevant.', replyMarkup: dashboardOnlyKeyboard(eventId) };
  }

  if (action === 'confirm_ignore') {
    // Consume the short-lived, user-bound confirmation before mutating settings,
    // so stale or replayed Telegram callbacks cannot re-add a removed sender.
    await consumeIgnoreConfirmation(review, confirmationToken, telegramUserId);
    const result = await addEmailAutomationReviewSenderToIgnoredList(review.id, true, actor);
    return {
      message: result.added
        ? `Future emails from ${result.senderEmail} will be ignored. This review remains open.`
        : `${result.senderEmail} was already ignored. This review remains open.`,
      showAlert: true,
      replyMarkup: buildEmailAutomationKeyboard({ eventId, dashboardUrl, review: true })
    };
  }

  return { message: 'Unsupported email automation command.', showAlert: true };
};
