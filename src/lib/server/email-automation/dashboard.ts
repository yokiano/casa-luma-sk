import { and, asc, desc, eq, inArray, isNull, or, sql } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { emailAttentionReviews, emailAutomationActions, emailAutomationAttempts, emailAutomationAuditLog, emailAutomationSettings, emailClassificationRules, emailEvents, emailNotificationOutbox } from '$lib/server/db/schema';
import {
  classifyEmail,
  matchesClassificationRule,
  type EmailAutomationInput,
  type EmailClassification,
  type EmailClassificationRuleInput
} from './classifier';
import {
  BUILTIN_CLASSIFIERS,
  renderEmailAutomationNotification,
  notionPageUrl,
  sendEmailAutomationTestNotification,
  type NotificationSendResult
} from './notifications';
import { loadAutomationSettings, saveAutomationSettings, type EmailAutomationSettings } from './settings';
import { reconcileEmailAutomationAction } from './reconcile';
import { processEmailAutomationActionById, processEmailAutomationNotificationById } from './processor';
import { releaseStaleClaims } from './store';
import { buildEmailAutomationOutcome } from './presentation';
import { applyEmailAutomationSafetyPolicy, getLedgerAutomationPolicyStatus, type LedgerAutomationPolicyStatus } from './ledger-safety';
import { EMAIL_BODY_PREVIEW_MAX_CHARS, renderEmailReviewBundle, type ReviewBundleRecord } from './review-bundle';

export type { EmailAutomationSettings } from './settings';

export type RulePreview = {
  id: number;
  enabled: boolean;
  priority: number;
  name: string;
  classification: string;
  subtype: string;
  senderPattern: string | null;
  subjectPattern: string | null;
  bodyPatterns: unknown;
  handlerKey: string;
  notifyPolicy: string;
  /** Internal DB fields used to render a deterministic preview. */
  ledgerDefaults?: unknown;
  dummyInput?: unknown;
  hasDummyInput: boolean;
  preview: string | null;
  previewNote: string | null;
};

export type ReviewQueueItem = {
  id: number;
  eventId: number;
  status: string;
  reasonCode: string;
  reason: string;
  summary: string | null;
  createdAt: Date;
  updatedAt: Date;
  subject: string;
  fromAddress: string;
  receivedAt: Date;
  classification: string;
  subtype: string;
  processingState: string;
  amountMinor: number | null;
  currency: string | null;
};

export type BuiltinPreview = {
  key: string;
  label: string;
  classification: EmailClassification['classification'];
  subtype: string;
  description: string;
  deprecated: boolean;
  preview: string;
};

export type OperationsHealth = {
  oldestDueAt: Date | null;
  staleActionLeases: number;
  staleNotificationLeases: number;
  failedActions: number;
  failedNotifications: number;
  parserWarnings24h: number;
  latestParserWarningEventId: number | null;
  latestParserWarningAt: Date | null;
  scheduler: 'not_configured';
};

export type DashboardData = {
  totals: { total: number; ready: number; review: number; ignored: number; ledgerCreated: number; failedNotification: number };
  reviewTotals: { waiting: number; inProgress: number; done: number; total: number };
  reviews: ReviewQueueItem[];
  operationsHealth: OperationsHealth;
  recent: typeof emailEvents.$inferSelect[];
  rules: RulePreview[];
  builtinPreviews: BuiltinPreview[];
  subtypes: { classification: string; subtype: string; processingState: string; count: number; latestReceivedAt: Date }[];
  handlers: { handlerKey: string | null; matchedRuleName: string | null; count: number; latestReceivedAt: Date }[];
  settings: EmailAutomationSettings;
  ledgerPolicy: LedgerAutomationPolicyStatus;
  notificationPreview: string;
};

const toRuleInput = (row: Pick<RulePreview, 'name' | 'classification' | 'subtype' | 'senderPattern' | 'subjectPattern' | 'bodyPatterns' | 'handlerKey' | 'notifyPolicy'> & { ledgerDefaults?: unknown }): EmailClassificationRuleInput => ({
  name: row.name,
  classification: row.classification,
  subtype: row.subtype,
  senderPattern: row.senderPattern,
  subjectPattern: row.subjectPattern,
  bodyPatterns: row.bodyPatterns,
  handlerKey: row.handlerKey,
  ledgerDefaults: (row as { ledgerDefaults?: unknown }).ledgerDefaults,
  notifyPolicy: row.notifyPolicy
});

const toEmailInput = (value: unknown): EmailAutomationInput | null => {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Record<string, unknown>;
  if (typeof candidate.subject !== 'string' || typeof candidate.from !== 'string') return null;
  return {
    receivedAt: typeof candidate.receivedAt === 'string' ? candidate.receivedAt : new Date().toISOString(),
    from: candidate.from,
    to: typeof candidate.to === 'string' ? candidate.to : 'automations@casalumakpg.com',
    subject: candidate.subject,
    messageId: typeof candidate.messageId === 'string' ? candidate.messageId : undefined,
    attachmentCount: typeof candidate.attachmentCount === 'number' ? candidate.attachmentCount : 0,
    textBody: typeof candidate.textBody === 'string' ? candidate.textBody : undefined,
    htmlBody: typeof candidate.htmlBody === 'string' ? candidate.htmlBody : undefined,
    mime: candidate.mime && typeof candidate.mime === 'object' ? candidate.mime as EmailAutomationInput['mime'] : undefined
  };
};

type RulePreviewSource = Omit<RulePreview, 'hasDummyInput' | 'preview' | 'previewNote'> & { ledgerDefaults: unknown; dummyInput?: unknown };
const buildRulePreview = (rule: RulePreviewSource, settings: EmailAutomationSettings = DEFAULT_DASHBOARD_SETTINGS): RulePreview => {
  const input = toEmailInput((rule as { dummyInput?: unknown }).dummyInput);
  let preview: string | null = null;
  let previewNote: string | null = null;
  if (!input) {
    previewNote = 'No dummy_input set for this rule. Add one to enable preview and test-send.';
  } else {
    const ruleInput = toRuleInput(rule);
    if (!matchesClassificationRule(input, ruleInput)) {
      previewNote = 'The dummy_input does not match this rule\'s patterns. Preview unavailable.';
    } else {
      const classification = applyEmailAutomationSafetyPolicy(input, classifyEmail(input, [ruleInput]), settings.ledgerEnabled, settings.ledgerAllowedSenders, settings.ledgerMaxAmountThb);
      preview = renderEmailAutomationNotification(input, classification);
      if (!preview) previewNote = 'Classification could not be derived from the dummy_input.';
    }
  }
  return {
    id: rule.id, enabled: rule.enabled, priority: rule.priority, name: rule.name,
    classification: rule.classification, subtype: rule.subtype,
    senderPattern: rule.senderPattern, subjectPattern: rule.subjectPattern,
    bodyPatterns: rule.bodyPatterns, handlerKey: rule.handlerKey, notifyPolicy: rule.notifyPolicy,
    hasDummyInput: input !== null, preview, previewNote
  };
};

const DEFAULT_DASHBOARD_SETTINGS: EmailAutomationSettings = { automationEnabled: true, ledgerEnabled: false, notificationsEnabled: true, ledgerAllowedSenders: [], ledgerMaxAmountThb: 5_000 };

const buildBuiltinPreviews = (settings: EmailAutomationSettings = DEFAULT_DASHBOARD_SETTINGS): BuiltinPreview[] => BUILTIN_CLASSIFIERS.map((entry) => {
  const classification = applyEmailAutomationSafetyPolicy(entry.dummyInput, classifyEmail(entry.dummyInput, []), settings.ledgerEnabled, settings.ledgerAllowedSenders, settings.ledgerMaxAmountThb);
  return {
    key: entry.key, label: entry.label, classification: entry.classification,
    subtype: entry.subtype, description: entry.description, deprecated: entry.deprecated,
    preview: renderEmailAutomationNotification(entry.dummyInput, classification)
  };
});

export const getDashboardData = async (): Promise<DashboardData> => {
  const sampleEmail: EmailAutomationInput = {
    receivedAt: new Date().toISOString(),
    from: 'K BIZ <KBIZ@kasikornbank.com>',
    to: 'automations@casalumakpg.com',
    subject: 'Result of PromptPay Funds Transfer (Success)',
    messageId: '<dashboard-preview@example.test>',
    attachmentCount: 0,
    textBody: 'Reference Number: PPFS260711TEST01 Amount (THB): 123.45',
    mime: { parserVersion: 'dashboard-preview', completeness: 'complete' }
  };
  const sampleClassificationBase: EmailClassification = {
    classification: 'expense', subtype: 'promptpay_transfer_success', processingState: 'ready', externalRef: 'PPFS260711TEST01', amountMinor: 12345, currency: 'THB', notify: true, handlerKey: 'company_ledger_expense'
  };

  const [settings, totals, recent, reviewRows, reviewCount, ruleRows, subtypes, handlers, actionHealth, notificationHealth, parserHealth] = await Promise.all([
    loadAutomationSettings(),
    db.select({
      total: sql<number>`count(*)::int`,
      ready: sql<number>`count(*) filter (where ${emailEvents.processingState} = 'ready')::int`,
      review: sql<number>`count(*) filter (where ${emailEvents.processingState} = 'review')::int`,
      ignored: sql<number>`count(*) filter (where ${emailEvents.processingState} = 'ignored')::int`,
      ledgerCreated: sql<number>`count(*) filter (where ${emailEvents.processingState} in ('action_succeeded', 'reconciled'))::int`,
      failedNotification: sql<number>`count(*) filter (where ${emailEvents.notificationState} in ('retry_scheduled', 'failed'))::int`
    }).from(emailEvents),
    db.select().from(emailEvents).orderBy(desc(emailEvents.receivedAt)).limit(12),
    db.select({
      id: emailAttentionReviews.id,
      eventId: emailAttentionReviews.eventId,
      status: emailAttentionReviews.status,
      reasonCode: emailAttentionReviews.reasonCode,
      reason: emailAttentionReviews.reason,
      summary: emailAttentionReviews.summary,
      createdAt: emailAttentionReviews.createdAt,
      updatedAt: emailAttentionReviews.updatedAt,
      subject: emailEvents.subject,
      fromAddress: emailEvents.fromAddress,
      receivedAt: emailEvents.receivedAt,
      classification: emailEvents.classification,
      subtype: emailEvents.subtype,
      processingState: emailEvents.processingState,
      amountMinor: emailEvents.amountMinor,
      currency: emailEvents.currency
    }).from(emailAttentionReviews).innerJoin(emailEvents, eq(emailAttentionReviews.eventId, emailEvents.id)).where(inArray(emailAttentionReviews.status, ['waiting', 'in_progress'])).orderBy(asc(emailAttentionReviews.createdAt), asc(emailAttentionReviews.id)).limit(50),
    db.select({
      waiting: sql<number>`count(*) filter (where ${emailAttentionReviews.status} = 'waiting')::int`,
      inProgress: sql<number>`count(*) filter (where ${emailAttentionReviews.status} = 'in_progress')::int`,
      done: sql<number>`count(*) filter (where ${emailAttentionReviews.status} = 'done')::int`,
      total: sql<number>`count(*)::int`
    }).from(emailAttentionReviews),
    db.select({
      id: emailClassificationRules.id,
      enabled: emailClassificationRules.enabled,
      priority: emailClassificationRules.priority,
      name: emailClassificationRules.name,
      classification: emailClassificationRules.classification,
      subtype: emailClassificationRules.subtype,
      senderPattern: emailClassificationRules.senderPattern,
      subjectPattern: emailClassificationRules.subjectPattern,
      bodyPatterns: emailClassificationRules.bodyPatterns,
      handlerKey: emailClassificationRules.handlerKey,
      ledgerDefaults: emailClassificationRules.ledgerDefaults,
      notifyPolicy: emailClassificationRules.notifyPolicy,
      dummyInput: emailClassificationRules.dummyInput
    }).from(emailClassificationRules).orderBy(asc(emailClassificationRules.priority), asc(emailClassificationRules.id)),
    db.select({
      classification: emailEvents.classification,
      subtype: emailEvents.subtype,
      processingState: emailEvents.processingState,
      count: sql<number>`count(*)::int`,
      latestReceivedAt: sql<Date>`max(${emailEvents.receivedAt})`
    }).from(emailEvents).groupBy(emailEvents.classification, emailEvents.subtype, emailEvents.processingState).orderBy(desc(sql`count(*)`)).limit(12),
    db.select({
      handlerKey: sql<string | null>`${emailEvents.metadata}->>'handlerKey'`,
      matchedRuleName: sql<string | null>`${emailEvents.metadata}->>'matchedRuleName'`,
      count: sql<number>`count(*)::int`,
      latestReceivedAt: sql<Date>`max(${emailEvents.receivedAt})`
    }).from(emailEvents).groupBy(sql`${emailEvents.metadata}->>'handlerKey'`, sql`${emailEvents.metadata}->>'matchedRuleName'`).orderBy(desc(sql`count(*)`)).limit(12),
    db.select({
      oldestDueAt: sql<Date | null>`min(${emailAutomationActions.nextAttemptAt}) filter (where ${emailAutomationActions.status} in ('pending', 'retry_scheduled') and ${emailAutomationActions.nextAttemptAt} <= now())`,
      staleLeases: sql<number>`count(*) filter (where ${emailAutomationActions.status} = 'claimed' and ${emailAutomationActions.leaseExpiresAt} <= now())::int`,
      failed: sql<number>`count(*) filter (where ${emailAutomationActions.status} = 'failed')::int`
    }).from(emailAutomationActions),
    db.select({
      oldestDueAt: sql<Date | null>`min(${emailNotificationOutbox.nextAttemptAt}) filter (where ${emailNotificationOutbox.status} in ('pending', 'retry_scheduled') and ${emailNotificationOutbox.nextAttemptAt} <= now())`,
      staleLeases: sql<number>`count(*) filter (where ${emailNotificationOutbox.status} = 'claimed' and ${emailNotificationOutbox.leaseExpiresAt} <= now())::int`,
      failed: sql<number>`count(*) filter (where ${emailNotificationOutbox.status} = 'failed')::int`
    }).from(emailNotificationOutbox),
    db.select({
      count: sql<number>`count(*)::int`,
      latestEventId: sql<number | null>`(array_agg(${emailEvents.id} order by ${emailEvents.receivedAt} desc))[1]`,
      latestAt: sql<Date | null>`max(${emailEvents.receivedAt})`
    }).from(emailEvents).where(and(sql`${emailEvents.receivedAt} >= now() - interval '24 hours'`, or(sql`${emailEvents.mimeCompleteness} <> 'complete'`, isNull(emailEvents.parserVersion))))
  ]);

  const actionOps = actionHealth[0] ?? { oldestDueAt: null, staleLeases: 0, failed: 0 };
  const notificationOps = notificationHealth[0] ?? { oldestDueAt: null, staleLeases: 0, failed: 0 };
  const parserOps = parserHealth[0] ?? { count: 0, latestEventId: null, latestAt: null };
  const reviewOps = reviewCount[0] ?? { waiting: 0, inProgress: 0, done: 0, total: 0 };
  const dueTimes = [actionOps.oldestDueAt, notificationOps.oldestDueAt].filter((value): value is Date => value !== null);

  return {
    totals: totals[0] ?? { total: 0, ready: 0, review: 0, ignored: 0, ledgerCreated: 0, failedNotification: 0 },
    reviewTotals: reviewOps,
    reviews: reviewRows,
    operationsHealth: {
      oldestDueAt: dueTimes.length ? new Date(Math.min(...dueTimes.map((value) => new Date(value).getTime()))) : null,
      staleActionLeases: actionOps.staleLeases,
      staleNotificationLeases: notificationOps.staleLeases,
      failedActions: actionOps.failed,
      failedNotifications: notificationOps.failed,
      parserWarnings24h: parserOps.count,
      latestParserWarningEventId: parserOps.latestEventId,
      latestParserWarningAt: parserOps.latestAt,
      scheduler: 'not_configured'
    },
    recent,
    rules: ruleRows.map((rule) => buildRulePreview(rule, settings)),
    builtinPreviews: buildBuiltinPreviews(settings),
    subtypes,
    handlers,
    settings,
    ledgerPolicy: getLedgerAutomationPolicyStatus(settings.ledgerEnabled, settings.ledgerAllowedSenders, settings.ledgerMaxAmountThb),
    notificationPreview: renderEmailAutomationNotification(sampleEmail, applyEmailAutomationSafetyPolicy(sampleEmail, sampleClassificationBase, settings.ledgerEnabled, settings.ledgerAllowedSenders, settings.ledgerMaxAmountThb))
  };
};

export type SettingsUpdate = EmailAutomationSettings;

export const updateSettings = async (values: SettingsUpdate): Promise<void> => {
  await saveAutomationSettings(values);
};

export const toggleRule = async (ruleId: number): Promise<{ enabled: boolean } | null> => {
  const [current] = await db.select({ enabled: emailClassificationRules.enabled })
    .from(emailClassificationRules).where(eq(emailClassificationRules.id, ruleId)).limit(1);
  if (!current) return null;
  await db.update(emailClassificationRules).set({ enabled: !current.enabled })
    .where(eq(emailClassificationRules.id, ruleId));
  return { enabled: !current.enabled };
};

export const moveRule = async (ruleId: number, direction: 'up' | 'down'): Promise<boolean> => {
  const ordered = await db.select({ id: emailClassificationRules.id, priority: emailClassificationRules.priority })
    .from(emailClassificationRules).orderBy(asc(emailClassificationRules.priority), asc(emailClassificationRules.id));
  const index = ordered.findIndex((row) => row.id === ruleId);
  if (index === -1) return false;
  const swapIndex = direction === 'up' ? index - 1 : index + 1;
  if (swapIndex < 0 || swapIndex >= ordered.length) return true;
  const a = ordered[index];
  const b = ordered[swapIndex];
  await db.update(emailClassificationRules).set({ priority: b.priority }).where(eq(emailClassificationRules.id, a.id));
  await db.update(emailClassificationRules).set({ priority: a.priority }).where(eq(emailClassificationRules.id, b.id));
  return true;
};

export type TestSendResult = {
  ok: boolean;
  sent?: NotificationSendResult;
  target?: string;
  error?: string;
};

export const sendTestForRule = async (ruleId: number): Promise<TestSendResult> => {
  const [row] = await db.select({
    name: emailClassificationRules.name,
    classification: emailClassificationRules.classification,
    subtype: emailClassificationRules.subtype,
    senderPattern: emailClassificationRules.senderPattern,
    subjectPattern: emailClassificationRules.subjectPattern,
    bodyPatterns: emailClassificationRules.bodyPatterns,
    handlerKey: emailClassificationRules.handlerKey,
    ledgerDefaults: emailClassificationRules.ledgerDefaults,
    notifyPolicy: emailClassificationRules.notifyPolicy,
    dummyInput: emailClassificationRules.dummyInput
  }).from(emailClassificationRules).where(eq(emailClassificationRules.id, ruleId)).limit(1);
  if (!row) return { ok: false, error: 'Rule not found.' };

  const input = toEmailInput(row.dummyInput);
  if (!input) return { ok: false, error: 'This rule has no dummy_input. Add one before sending a test.' };
  const ruleInput = toRuleInput(row);
  if (!matchesClassificationRule(input, ruleInput)) return { ok: false, error: 'The dummy_input does not match this rule\'s patterns.' };
  // Use the same classifier and final canary policy as live intake.
  const settings = await loadAutomationSettings();
  const classification = applyEmailAutomationSafetyPolicy(input, classifyEmail(input, [ruleInput]), settings.ledgerEnabled, settings.ledgerAllowedSenders, settings.ledgerMaxAmountThb);
  const sent = await sendEmailAutomationTestNotification(input, classification);
  return { ok: true, sent, target: row.name };
};

export const sendTestForBuiltin = async (key: string): Promise<TestSendResult> => {
  const entry = BUILTIN_CLASSIFIERS.find((e) => e.key === key);
  if (!entry) return { ok: false, error: 'Unknown built-in classifier.' };
  const settings = await loadAutomationSettings();
  const classification = applyEmailAutomationSafetyPolicy(entry.dummyInput, classifyEmail(entry.dummyInput, []), settings.ledgerEnabled, settings.ledgerAllowedSenders, settings.ledgerMaxAmountThb);
  const sent = await sendEmailAutomationTestNotification(entry.dummyInput, classification);
  return { ok: true, sent, target: entry.label };
};

export const getEmailAutomationEventDetail = async (eventId: number) => {
  // Select only fields safe for browser serialization. Full snapshots, payloads,
  // and raw provider errors stay server-side; the body preview is explicitly bounded below.
  const [event] = await db.select({
    id: emailEvents.id, receivedAt: emailEvents.receivedAt, fromAddress: emailEvents.fromAddress,
    subject: emailEvents.subject, classification: emailEvents.classification, subtype: emailEvents.subtype,
    processingState: emailEvents.processingState, notificationState: emailEvents.notificationState,
    reviewReason: emailEvents.reviewReason, externalRef: emailEvents.externalRef, amountMinor: emailEvents.amountMinor,
    currency: emailEvents.currency, notionPageId: emailEvents.notionPageId,
    authenticityVerdict: emailEvents.authenticityVerdict, mimeCompleteness: emailEvents.mimeCompleteness,
    parserVersion: emailEvents.parserVersion, actionId: emailEvents.actionId, metadata: emailEvents.metadata
  }).from(emailEvents).where(eq(emailEvents.id, eventId)).limit(1);
  if (!event) return null;
  const actionWhere = event.actionId
    ? or(eq(emailAutomationActions.id, event.actionId), eq(emailAutomationActions.eventId, eventId))
    : eq(emailAutomationActions.eventId, eventId);
  const [actions, outbox, audits, reviewRows] = await Promise.all([
    db.select({ id: emailAutomationActions.id, eventId: emailAutomationActions.eventId, handlerKey: emailAutomationActions.handlerKey, handlerVersion: emailAutomationActions.handlerVersion, status: emailAutomationActions.status, externalObjectId: emailAutomationActions.externalObjectId, attemptCount: emailAutomationActions.attemptCount, nextAttemptAt: emailAutomationActions.nextAttemptAt, createdAt: emailAutomationActions.createdAt, updatedAt: emailAutomationActions.updatedAt, completedAt: emailAutomationActions.completedAt, hasError: sql<boolean>`${emailAutomationActions.lastError} is not null` }).from(emailAutomationActions).where(actionWhere).orderBy(desc(emailAutomationActions.createdAt)),
    db.select({ id: emailNotificationOutbox.id, status: emailNotificationOutbox.status, attemptCount: emailNotificationOutbox.attemptCount, nextAttemptAt: emailNotificationOutbox.nextAttemptAt, sentAt: emailNotificationOutbox.sentAt, hasError: sql<boolean>`${emailNotificationOutbox.lastError} is not null` }).from(emailNotificationOutbox).where(eq(emailNotificationOutbox.eventId, eventId)).orderBy(desc(emailNotificationOutbox.createdAt)),
    db.select({ id: emailAutomationAuditLog.id, actor: emailAutomationAuditLog.actor, action: emailAutomationAuditLog.action, reason: emailAutomationAuditLog.reason, createdAt: emailAutomationAuditLog.createdAt }).from(emailAutomationAuditLog).where(eq(emailAutomationAuditLog.eventId, eventId)).orderBy(desc(emailAutomationAuditLog.createdAt)),
    db.select().from(emailAttentionReviews).where(eq(emailAttentionReviews.eventId, eventId)).limit(1)
  ]);
  const attempts = actions.length ? await db.select({ id: emailAutomationAttempts.id, kind: emailAutomationAttempts.kind, status: emailAutomationAttempts.status, actor: emailAutomationAttempts.actor, createdAt: emailAutomationAttempts.createdAt, hasError: sql<boolean>`${emailAutomationAttempts.error} is not null` }).from(emailAutomationAttempts).where(eq(emailAutomationAttempts.actionId, actions[0].id)).orderBy(desc(emailAutomationAttempts.createdAt)) : [];
  const action = actions[0];
  const review = reviewRows[0] ? {
    ...reviewRows[0],
    bundle: renderEmailReviewBundle(reviewRows[0] as ReviewBundleRecord)
  } : null;
  const metadata = event.metadata && typeof event.metadata === 'object' ? event.metadata as Record<string, unknown> : {};
  const storedBodyPreview = typeof metadata.bodyPreview === 'string'
    ? metadata.bodyPreview
    : typeof metadata.textSnippet === 'string'
      ? metadata.textSnippet
      : null;
  const bodyPreview = storedBodyPreview?.slice(0, EMAIL_BODY_PREVIEW_MAX_CHARS) ?? null;
  const bodyPreviewSource = metadata.bodyPreviewSource === 'html' ? 'html' : bodyPreview ? 'text' : null;
  const bodyPreviewTruncated = metadata.bodyPreviewTruncated === true || Boolean(bodyPreview && storedBodyPreview && storedBodyPreview.length > EMAIL_BODY_PREVIEW_MAX_CHARS);
  const { metadata: _metadata, ...browserEvent } = event;
  return { event: { ...browserEvent, ledgerUrl: notionPageUrl(event.notionPageId), bodyPreview, bodyPreviewSource, bodyPreviewTruncated }, actions, outbox, attempts, audits, review, outcome: buildEmailAutomationOutcome({ classification: event.classification, subtype: event.subtype, processingState: event.processingState, reviewReason: event.reviewReason, actionState: action?.status as any, notificationState: event.notificationState as any, authenticityVerdict: event.authenticityVerdict as any, externalObjectId: action?.externalObjectId }) };
};

export type ReviewNotesUpdate = { reviewId: number; analysis: string; summary: string };

const normalizeReviewNotes = (values: Pick<ReviewNotesUpdate, 'analysis' | 'summary'>) => ({
  analysis: values.analysis.trim().slice(0, 12_000),
  summary: values.summary.trim().slice(0, 1_000)
});

const reviewProvenance = (now: Date) => ({
  bundleVersion: '1',
  provider: null,
  source: 'manual',
  actor: 'manager',
  savedAt: now.toISOString()
});

export const saveEmailAutomationReviewNotes = async ({ reviewId, analysis, summary }: ReviewNotesUpdate) => {
  const notes = normalizeReviewNotes({ analysis, summary });
  return db.transaction(async (tx) => {
    const [review] = await tx.select().from(emailAttentionReviews).where(eq(emailAttentionReviews.id, reviewId)).limit(1);
    if (!review) throw new Error('Review not found. Refresh the dashboard.');
    const now = new Date();
    const nextStatus = review.status === 'waiting' ? 'in_progress' : review.status;
    const [updated] = await tx.update(emailAttentionReviews).set({
      status: nextStatus,
      analysis: notes.analysis || null,
      summary: notes.summary || null,
      analysisProvenance: reviewProvenance(now),
      lastActor: 'manager',
      startedAt: review.startedAt ?? now,
      updatedAt: now
    }).where(and(eq(emailAttentionReviews.id, reviewId), eq(emailAttentionReviews.status, review.status))).returning({ id: emailAttentionReviews.id, status: emailAttentionReviews.status });
    if (!updated) throw new Error('Review state changed. Refresh before saving notes.');
    await tx.insert(emailAutomationAuditLog).values({ eventId: review.eventId, action: 'review_analysis_saved', reason: 'Manager saved review notes.', before: { status: review.status }, after: { status: nextStatus, reviewId } });
    return { status: updated.status, nextStep: 'Review notes are saved. Mark the review done when the attention item is resolved.' };
  });
};

export const markEmailAutomationReviewDone = async ({ reviewId, analysis, summary }: ReviewNotesUpdate) => {
  const notes = normalizeReviewNotes({ analysis, summary });
  return db.transaction(async (tx) => {
    const [review] = await tx.select().from(emailAttentionReviews).where(eq(emailAttentionReviews.id, reviewId)).limit(1);
    if (!review) throw new Error('Review not found. Refresh the dashboard.');
    const now = new Date();
    const [updated] = await tx.update(emailAttentionReviews).set({
      status: 'done',
      analysis: notes.analysis || null,
      summary: notes.summary || null,
      analysisProvenance: reviewProvenance(now),
      lastActor: 'manager',
      startedAt: review.startedAt ?? now,
      completedAt: now,
      updatedAt: now
    }).where(and(eq(emailAttentionReviews.id, reviewId), inArray(emailAttentionReviews.status, ['waiting', 'in_progress']))).returning({ id: emailAttentionReviews.id, status: emailAttentionReviews.status });
    if (!updated) {
      if (review.status === 'done') return { status: 'done', nextStep: 'This review was already marked done. No action or Telegram queue was changed.' };
      throw new Error('Review state changed. Refresh before marking it done.');
    }
    await tx.insert(emailAutomationAuditLog).values({ eventId: review.eventId, action: 'review_done', reason: 'Manager marked the attention review done.', before: { status: review.status }, after: { status: 'done', reviewId } });
    return { status: 'done', nextStep: 'Review marked done. No external action, retry, Ledger, or Telegram queue was changed.' };
  });
};

export const reopenEmailAutomationReview = async (reviewId: number) => db.transaction(async (tx) => {
  const [review] = await tx.select().from(emailAttentionReviews).where(and(eq(emailAttentionReviews.id, reviewId), eq(emailAttentionReviews.status, 'done'))).limit(1);
  if (!review) throw new Error('Only a completed review can be reopened. Refresh the dashboard.');
  const now = new Date();
  const [updated] = await tx.update(emailAttentionReviews).set({ status: 'waiting', completedAt: null, startedAt: null, lastActor: 'manager', updatedAt: now }).where(and(eq(emailAttentionReviews.id, reviewId), eq(emailAttentionReviews.status, 'done'))).returning({ id: emailAttentionReviews.id, status: emailAttentionReviews.status });
  if (!updated) throw new Error('Review state changed. Refresh before reopening.');
  await tx.insert(emailAutomationAuditLog).values({ eventId: review.eventId, action: 'review_reopened', reason: 'Manager reopened the attention review for another pass.', before: { status: 'done' }, after: { status: 'waiting', reviewId } });
  return { status: 'waiting', nextStep: 'Review reopened. Existing analysis remains saved and all action/Telegram queues are unchanged.' };
});

export const retryEmailAutomationAction = async (actionId: number, reason: string) => {
  if (!reason.trim()) throw new Error('Explain why this external action is safe to retry.');
  const [action] = await db.select().from(emailAutomationActions).where(eq(emailAutomationActions.id, actionId)).limit(1);
  if (!action) throw new Error('Action not found.');
  if (!['failed', 'retry_scheduled'].includes(action.status)) throw new Error(`Action cannot be retried from ${action.status}.`);
  await db.transaction(async (tx) => {
    const [updated] = await tx.update(emailAutomationActions).set({ status: 'pending', nextAttemptAt: new Date(), leaseToken: null, leaseExpiresAt: null, updatedAt: new Date() }).where(and(eq(emailAutomationActions.id, actionId), eq(emailAutomationActions.status, action.status), action.leaseToken ? eq(emailAutomationActions.leaseToken, action.leaseToken) : isNull(emailAutomationActions.leaseToken))).returning({ id: emailAutomationActions.id });
    if (!updated) throw new Error('Action state changed. Refresh before retrying.');
    await tx.insert(emailAutomationAuditLog).values({ eventId: action.eventId, actionId, action: 'manual_retry', reason, before: { status: action.status }, after: { status: 'pending' } });
  });
  const result = await processEmailAutomationActionById(actionId);
  return { result, nextStep: 'Open the event detail to confirm the durable action result.' };
};

export const retryEmailAutomationNotification = async (outboxId: number, reason: string) => {
  if (!reason.trim()) throw new Error('Explain why this notification should be retried.');
  const [outbox] = await db.select().from(emailNotificationOutbox).where(eq(emailNotificationOutbox.id, outboxId)).limit(1);
  if (!outbox) throw new Error('Notification not found.');
  if (!['failed', 'retry_scheduled'].includes(outbox.status)) throw new Error(`Notification cannot be retried from ${outbox.status}.`);
  await db.transaction(async (tx) => {
    const [updated] = await tx.update(emailNotificationOutbox).set({ status: 'pending', nextAttemptAt: new Date(), leaseToken: null, leaseExpiresAt: null, updatedAt: new Date() }).where(and(eq(emailNotificationOutbox.id, outboxId), eq(emailNotificationOutbox.status, outbox.status), outbox.leaseToken ? eq(emailNotificationOutbox.leaseToken, outbox.leaseToken) : isNull(emailNotificationOutbox.leaseToken))).returning({ id: emailNotificationOutbox.id });
    if (!updated) throw new Error('Notification state changed. Refresh before retrying.');
    await tx.insert(emailAutomationAuditLog).values({ eventId: outbox.eventId, action: 'manual_notification_retry', reason, before: { status: outbox.status }, after: { status: 'pending' } });
  });
  const result = await processEmailAutomationNotificationById(outboxId);
  return { result, nextStep: 'Open the event detail to confirm Telegram delivery.' };
};

export const releaseStaleEmailAutomationClaims = async (reason: string) => {
  if (!reason.trim()) throw new Error('Explain why stale claims are being released.');
  await releaseStaleClaims();
  return { nextStep: 'Due work is available for a safe retry. Open the affected event to confirm the result.' };
};
export const reconcileEmailAutomation = reconcileEmailAutomationAction;
