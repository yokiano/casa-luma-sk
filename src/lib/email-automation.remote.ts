import { command } from '$app/server';
import * as v from 'valibot';
import {
  getDashboardData,
  getEmailAutomationEventDetail,
  getPendingEmailAutomationReviewBundle,
  moveRule,
  sendTestForBuiltin,
  sendTestForRule,
  toggleRule,
  updateSettings,
  retryEmailAutomationAction,
  retryEmailAutomationNotification,
  reconcileEmailAutomation,
  releaseStaleEmailAutomationClaims,
  saveEmailAutomationReviewNotes,
  markEmailAutomationReviewDone,
  dismissEmailAutomationReviewAsIrrelevant,
  addEmailAutomationReviewSenderToIgnoredList,
  reopenEmailAutomationReview,
  type TestSendResult
} from './server/email-automation/dashboard';
import { requireEmailAutomationManager } from './server/email-automation/manager-auth';

const RuleIdSchema = v.object({ ruleId: v.pipe(v.number(), v.integer(), v.minValue(1)) });
const EmailAutomationEventIdSchema = v.object({ eventId: v.pipe(v.number(), v.integer(), v.safeInteger(), v.minValue(1)) });

const MoveRuleSchema = v.object({
  ruleId: v.pipe(v.number(), v.integer(), v.minValue(1)),
  direction: v.picklist(['up', 'down'])
});

const SettingsEntries = {
  automationEnabled: v.boolean(),
  ledgerEnabled: v.boolean(),
  notificationsEnabled: v.boolean(),
  ignoredSenders: v.array(v.pipe(v.string(), v.trim(), v.minLength(1))),
  ledgerAllowedSenders: v.array(v.pipe(v.string(), v.trim(), v.minLength(1))),
  ledgerMaxAmountThb: v.pipe(v.number(), v.finite(), v.minValue(1))
};
const SettingsValuesSchema = v.object(SettingsEntries);
const SettingsSchema = v.object({
  ...SettingsEntries,
  baseSettings: SettingsValuesSchema,
  confirmIgnoredSenderBypassRisk: v.boolean()
});

const SendTestRuleSchema = v.object({ ruleId: v.pipe(v.number(), v.integer(), v.minValue(1)) });
const SendTestBuiltinSchema = v.object({ key: v.pipe(v.string(), v.trim(), v.minLength(1)) });
const ReasonSchema = v.pipe(v.string(), v.trim(), v.minLength(3));
const ActionCommandSchema = v.object({ actionId: v.pipe(v.number(), v.integer(), v.minValue(1)), reason: ReasonSchema });
const NotificationCommandSchema = v.object({ outboxId: v.pipe(v.number(), v.integer(), v.minValue(1)), reason: ReasonSchema });
const StaleClaimSchema = v.object({ reason: ReasonSchema });
const ReviewNotesSchema = v.object({
  reviewId: v.pipe(v.number(), v.integer(), v.minValue(1)),
  analysis: v.pipe(v.string(), v.maxLength(12_000)),
  summary: v.pipe(v.string(), v.maxLength(1_000)),
  needsFullBody: v.boolean(),
  expectedRevision: v.pipe(v.number(), v.integer(), v.minValue(0))
});
const ReviewIdSchema = v.object({ reviewId: v.pipe(v.number(), v.integer(), v.minValue(1)) });
const IgnoreReviewSenderSchema = v.object({
  reviewId: v.pipe(v.number(), v.integer(), v.minValue(1)),
  confirmIgnoredSenderBypassRisk: v.literal(true)
});

/**
 * Loads one bounded event detail only after an authorized manager check. Cards
 * call this on demand for quick review or bundle copy, never as a dashboard prefetch.
 */
export const getEmailAutomationEventDetailNow = command(EmailAutomationEventIdSchema, async ({ eventId }) => {
  requireEmailAutomationManager();
  return getEmailAutomationEventDetail(eventId);
});

/** Reloads all dashboard data (used after mutations to refresh without a page navigation). */
export const refreshEmailAutomationDashboard = command(async () => {
  requireEmailAutomationManager();
  return getDashboardData();
});

export const copyPendingEmailAutomationReviews = command(async () => {
  requireEmailAutomationManager();
  return getPendingEmailAutomationReviewBundle();
});

export const saveEmailAutomationSettings = command(SettingsSchema, async (values) => {
  requireEmailAutomationManager();
  await updateSettings(values);
  return { ok: true as const };
});

export const toggleEmailClassificationRule = command(RuleIdSchema, async ({ ruleId }) => {
  requireEmailAutomationManager();
  const result = await toggleRule(ruleId);
  if (!result) return { ok: false as const, error: 'Rule not found.' };
  return { ok: true as const, enabled: result.enabled };
});

export const moveEmailClassificationRule = command(MoveRuleSchema, async ({ ruleId, direction }) => {
  requireEmailAutomationManager();
  const ok = await moveRule(ruleId, direction);
  return { ok: ok as boolean };
});

export const sendEmailAutomationTestForRule = command(SendTestRuleSchema, async ({ ruleId }): Promise<TestSendResult> => {
  requireEmailAutomationManager();
  return sendTestForRule(ruleId);
});

export const sendEmailAutomationTestForBuiltin = command(SendTestBuiltinSchema, async ({ key }): Promise<TestSendResult> => {
  requireEmailAutomationManager();
  return sendTestForBuiltin(key);
});

export const retryEmailAutomationActionNow = command(ActionCommandSchema, async ({ actionId, reason }) => { requireEmailAutomationManager(); return retryEmailAutomationAction(actionId, reason); });
export const retryEmailAutomationNotificationNow = command(NotificationCommandSchema, async ({ outboxId, reason }) => { requireEmailAutomationManager(); return retryEmailAutomationNotification(outboxId, reason); });
export const reconcileEmailAutomationActionNow = command(ActionCommandSchema, async ({ actionId, reason }) => { requireEmailAutomationManager(); const result = await reconcileEmailAutomation(actionId, reason); return { result, nextStep: result.state === 'reconciled' ? 'The existing Ledger record is linked. No duplicate action is needed.' : result.message }; });
export const releaseStaleEmailAutomationClaimsNow = command(StaleClaimSchema, async ({ reason }) => { requireEmailAutomationManager(); return releaseStaleEmailAutomationClaims(reason); });
export const saveEmailAutomationReviewNotesNow = command(ReviewNotesSchema, async (values) => { requireEmailAutomationManager(); return saveEmailAutomationReviewNotes(values); });
export const markEmailAutomationReviewDoneNow = command(ReviewNotesSchema, async (values) => { requireEmailAutomationManager(); return markEmailAutomationReviewDone(values); });
export const dismissEmailAutomationReviewAsIrrelevantNow = command(ReviewNotesSchema, async (values) => { requireEmailAutomationManager(); return dismissEmailAutomationReviewAsIrrelevant(values); });
export const addEmailAutomationReviewSenderToIgnoredListNow = command(IgnoreReviewSenderSchema, async ({ reviewId, confirmIgnoredSenderBypassRisk }) => { requireEmailAutomationManager(); return addEmailAutomationReviewSenderToIgnoredList(reviewId, confirmIgnoredSenderBypassRisk); });
export const reopenEmailAutomationReviewNow = command(ReviewIdSchema, async ({ reviewId }) => { requireEmailAutomationManager(); return reopenEmailAutomationReview(reviewId); });
