import { and, asc, desc, eq, inArray, isNull, or, sql } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { emailAttentionReviews, emailAutomationActions, emailAutomationAttempts, emailAutomationAuditLog, emailAutomationSettings, emailClassificationRules, emailEvents, emailNotificationOutbox } from '$lib/server/db/schema';
import {
  classifyEmail,
  extractSenderEmail,
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
import {
  automationSettingsFromRow,
  DEFAULT_SETTINGS,
  loadAutomationSettings,
  normalizeExactSenderEmail,
  normalizeIgnoredSenders,
  normalizeLedgerAllowedSenders,
  toAutomationSettingsJson,
  type EmailAutomationSettings
} from './settings';
import { reconcileEmailAutomationAction } from './reconcile';
import { processEmailAutomationActionById, processEmailAutomationNotificationById } from './processor';
import { releaseStaleClaims } from './store';
import { buildEmailAutomationOutcome } from './presentation';
import { applyEmailAutomationSafetyPolicy, getLedgerAutomationPolicyStatus, type LedgerAutomationPolicyStatus } from './ledger-safety';
import {
  EMAIL_BODY_PREVIEW_MAX_CHARS,
  readReviewTriageMetadata,
  renderEmailClassifierRuleDraft,
  renderEmailReviewBundle,
  renderPendingEmailReviewBundles,
  type ReviewBundleRecord
} from './review-bundle';

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
  analysis: string | null;
  summary: string | null;
  needsFullBody: boolean;
  revision: number;
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
  mimeCompleteness: string;
  parserVersion: string | null;
  bodyPreviewTruncated: boolean;
};

export type RecentEventItem = {
  id: number;
  receivedAt: Date;
  fromAddress: string;
  subject: string;
  subtype: string;
  processingState: string;
  notificationState: string;
};

export const EMAIL_AUTOMATION_RECENT_EVENT_FIELDS = [
  'id', 'receivedAt', 'fromAddress', 'subject', 'subtype', 'processingState', 'notificationState'
] as const;

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
  recent: RecentEventItem[];
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
    extractedBody: typeof candidate.extractedBody === 'string' ? candidate.extractedBody : undefined,
    extractedBodySource: candidate.extractedBodySource === 'text' || candidate.extractedBodySource === 'html' || candidate.extractedBodySource === 'html-fallback' ? candidate.extractedBodySource : undefined,
    extractedBodyTruncated: candidate.extractedBodyTruncated === true,
    bodyExtractionMetadata: candidate.bodyExtractionMetadata && typeof candidate.bodyExtractionMetadata === 'object' ? candidate.bodyExtractionMetadata as EmailAutomationInput['bodyExtractionMetadata'] : undefined,
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
      const classification = applyEmailAutomationSafetyPolicy(input, classifyEmail(input, [ruleInput], settings.ignoredSenders), settings.ledgerEnabled, settings.ledgerAllowedSenders, settings.ledgerMaxAmountThb);
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

const DEFAULT_DASHBOARD_SETTINGS: EmailAutomationSettings = { automationEnabled: true, ledgerEnabled: false, notificationsEnabled: true, ignoredSenders: [], ledgerAllowedSenders: [], ledgerMaxAmountThb: 5_000 };

const buildBuiltinPreviews = (settings: EmailAutomationSettings = DEFAULT_DASHBOARD_SETTINGS): BuiltinPreview[] => BUILTIN_CLASSIFIERS.map((entry) => {
  const classification = applyEmailAutomationSafetyPolicy(entry.dummyInput, classifyEmail(entry.dummyInput, [], settings.ignoredSenders), settings.ledgerEnabled, settings.ledgerAllowedSenders, settings.ledgerMaxAmountThb);
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
    db.select({
      id: emailEvents.id,
      receivedAt: emailEvents.receivedAt,
      fromAddress: emailEvents.fromAddress,
      subject: emailEvents.subject,
      subtype: emailEvents.subtype,
      processingState: emailEvents.processingState,
      notificationState: emailEvents.notificationState
    }).from(emailEvents).orderBy(desc(emailEvents.receivedAt)).limit(12),
    db.select({
      id: emailAttentionReviews.id,
      eventId: emailAttentionReviews.eventId,
      status: emailAttentionReviews.status,
      reasonCode: emailAttentionReviews.reasonCode,
      reason: emailAttentionReviews.reason,
      analysis: emailAttentionReviews.analysis,
      summary: emailAttentionReviews.summary,
      analysisProvenance: emailAttentionReviews.analysisProvenance,
      createdAt: emailAttentionReviews.createdAt,
      updatedAt: emailAttentionReviews.updatedAt,
      subject: emailEvents.subject,
      fromAddress: emailEvents.fromAddress,
      receivedAt: emailEvents.receivedAt,
      classification: emailEvents.classification,
      subtype: emailEvents.subtype,
      processingState: emailEvents.processingState,
      amountMinor: emailEvents.amountMinor,
      currency: emailEvents.currency,
      mimeCompleteness: emailEvents.mimeCompleteness,
      parserVersion: emailEvents.parserVersion,
      bodyPreviewTruncated: sql<boolean>`${emailEvents.extractedBodyTruncated} or ${emailEvents.metadata}->>'bodyPreviewTruncated' = 'true' or char_length(coalesce(${emailEvents.metadata}->>'bodyPreview', ${emailEvents.metadata}->>'textSnippet', '')) > ${EMAIL_BODY_PREVIEW_MAX_CHARS}`
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
    // Triage metadata is parsed into only the bounded fields cards need. The
    // provenance JSON and any body/evidence data remain server-side.
    reviews: reviewRows.map(({ analysisProvenance, ...review }) => {
      const triage = readReviewTriageMetadata(analysisProvenance);
      return { ...review, needsFullBody: triage.needsFullBody, revision: triage.revision };
    }),
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
    notificationPreview: renderEmailAutomationNotification(sampleEmail, applyEmailAutomationSafetyPolicy(sampleEmail, classifyEmail(sampleEmail, [], settings.ignoredSenders), settings.ledgerEnabled, settings.ledgerAllowedSenders, settings.ledgerMaxAmountThb))
  };
};

export const getPendingEmailAutomationReviewBundle = async () => {
  const reviews = await db.select().from(emailAttentionReviews)
    .where(inArray(emailAttentionReviews.status, ['waiting', 'in_progress']))
    .orderBy(asc(emailAttentionReviews.createdAt), asc(emailAttentionReviews.id));
  return {
    count: reviews.length,
    bundle: renderPendingEmailReviewBundles(reviews as ReviewBundleRecord[])
  };
};

export type SettingsUpdate = EmailAutomationSettings & {
  baseSettings: EmailAutomationSettings;
  confirmIgnoredSenderBypassRisk: boolean;
};

const canonicalSettings = (values: EmailAutomationSettings): EmailAutomationSettings => ({
  automationEnabled: values.automationEnabled,
  ledgerEnabled: values.ledgerEnabled,
  notificationsEnabled: values.notificationsEnabled,
  ignoredSenders: normalizeIgnoredSenders(values.ignoredSenders),
  ledgerAllowedSenders: normalizeLedgerAllowedSenders(values.ledgerAllowedSenders),
  ledgerMaxAmountThb: values.ledgerMaxAmountThb
});
const sameSettings = (left: EmailAutomationSettings, right: EmailAutomationSettings) => JSON.stringify(canonicalSettings(left)) === JSON.stringify(canonicalSettings(right));

export const updateSettings = async (values: SettingsUpdate): Promise<void> => {
  if (values.ignoredSenders.some((value) => normalizeExactSenderEmail(value) === null)) {
    throw new Error('Ignored senders must be exact email addresses. Remove display names, domains, and malformed values.');
  }
  await db.transaction(async (tx) => {
    // Serialize settings-backed ignore-list mutations so a confirmed sender is
    // never silently lost to a concurrent dashboard save.
    await tx.insert(emailAutomationSettings).values({
      id: 1,
      automationEnabled: DEFAULT_SETTINGS.automationEnabled,
      ledgerEnabled: DEFAULT_SETTINGS.ledgerEnabled,
      notificationsEnabled: DEFAULT_SETTINGS.notificationsEnabled,
      settings: toAutomationSettingsJson(DEFAULT_SETTINGS)
    }).onConflictDoNothing();
    await tx.execute(sql`select ${emailAutomationSettings.id} from ${emailAutomationSettings} where ${emailAutomationSettings.id} = 1 for update`);
    const [row] = await tx.select({
      automationEnabled: emailAutomationSettings.automationEnabled,
      ledgerEnabled: emailAutomationSettings.ledgerEnabled,
      notificationsEnabled: emailAutomationSettings.notificationsEnabled,
      settings: emailAutomationSettings.settings
    }).from(emailAutomationSettings).where(eq(emailAutomationSettings.id, 1)).limit(1);
    const current = automationSettingsFromRow(row);
    if (!sameSettings(current, values.baseSettings)) throw new Error('Automation settings changed. Refresh before saving.');
    const currentIgnored = normalizeIgnoredSenders(current.ignoredSenders);
    const requestedIgnored = normalizeIgnoredSenders(values.ignoredSenders);
    const added = requestedIgnored.filter((sender) => !currentIgnored.includes(sender));
    const removed = currentIgnored.filter((sender) => !requestedIgnored.includes(sender));
    if (added.length > 0 && !values.confirmIgnoredSenderBypassRisk) {
      throw new Error('Confirm the spoofing and review-bypass warning before adding an ignored sender.');
    }
    const next = canonicalSettings({ ...values, ignoredSenders: requestedIgnored });
    const now = new Date();
    await tx.insert(emailAutomationSettings).values({
      id: 1,
      automationEnabled: next.automationEnabled,
      ledgerEnabled: next.ledgerEnabled,
      notificationsEnabled: next.notificationsEnabled,
      settings: toAutomationSettingsJson(next),
      updatedAt: now
    }).onConflictDoUpdate({
      target: emailAutomationSettings.id,
      set: {
        automationEnabled: next.automationEnabled,
        ledgerEnabled: next.ledgerEnabled,
        notificationsEnabled: next.notificationsEnabled,
        settings: toAutomationSettingsJson(next),
        updatedAt: now
      }
    });
    if (added.length > 0 || removed.length > 0) {
      await tx.insert(emailAutomationAuditLog).values({
        action: 'ignored_sender_settings_updated',
        reason: added.length > 0 ? 'Manager confirmed the visible-sender spoofing and review-bypass risk.' : 'Manager removed sender entries from the ignored list.',
        before: { ignoredSenders: currentIgnored },
        after: { ignoredSenders: requestedIgnored, added, removed }
      });
    }
  });
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
  const classification = applyEmailAutomationSafetyPolicy(input, classifyEmail(input, [ruleInput], settings.ignoredSenders), settings.ledgerEnabled, settings.ledgerAllowedSenders, settings.ledgerMaxAmountThb);
  const sent = await sendEmailAutomationTestNotification(input, classification);
  return { ok: true, sent, target: row.name };
};

export const sendTestForBuiltin = async (key: string): Promise<TestSendResult> => {
  const entry = BUILTIN_CLASSIFIERS.find((e) => e.key === key);
  if (!entry) return { ok: false, error: 'Unknown built-in classifier.' };
  const settings = await loadAutomationSettings();
  const classification = applyEmailAutomationSafetyPolicy(entry.dummyInput, classifyEmail(entry.dummyInput, [], settings.ignoredSenders), settings.ledgerEnabled, settings.ledgerAllowedSenders, settings.ledgerMaxAmountThb);
  const sent = await sendEmailAutomationTestNotification(entry.dummyInput, classification);
  return { ok: true, sent, target: entry.label };
};

export type EmailAutomationEventDetail = {
  event: {
    id: number;
    receivedAt: Date | string;
    messageId: string | null;
    fromAddress: string;
    toAddress: string;
    subject: string;
    attachmentCount: number;
    classification: string;
    subtype: string;
    processingState: string;
    notificationState: string;
    reviewReason: string | null;
    externalRef: string | null;
    amountMinor: number | null;
    currency: string | null;
    notionPageId: string | null;
    authenticityVerdict: string;
    mimeCompleteness: string;
    parserVersion: string | null;
    actionId: number | null;
    senderEmail: string;
    ledgerUrl: string | null;
    bodyPreview: string | null;
    bodyPreviewSource: 'html' | 'text' | 'html-fallback' | null;
    bodyPreviewTruncated: boolean;
    bodyExtractionMetadata?: unknown;
    classifierRuleDraft: string;
  };
  actions: Array<{
    id: number;
    eventId: number;
    handlerKey: string;
    handlerVersion: string;
    status: string;
    externalObjectId: string | null;
    attemptCount: number;
    nextAttemptAt: Date | string;
    createdAt: Date | string;
    updatedAt: Date | string;
    completedAt: Date | string | null;
    hasError: boolean;
  }>;
  outbox: Array<{
    id: number;
    status: string;
    attemptCount: number;
    nextAttemptAt: Date | string;
    sentAt: Date | string | null;
    hasError: boolean;
  }>;
  attempts: Array<{
    id: number;
    kind: string;
    status: string;
    actor: string;
    createdAt: Date | string;
    hasError: boolean;
  }>;
  audits: Array<{
    id: number;
    actor: string;
    action: string;
    reason: string | null;
    createdAt: Date | string;
  }>;
  review: (ReviewBundleRecord & {
    triage: ReturnType<typeof readReviewTriageMetadata>;
    bundle: string;
  }) | null;
  outcome: ReturnType<typeof buildEmailAutomationOutcome>;
};

export const EMAIL_AUTOMATION_REVIEW_DETAIL_FIELDS = [
  'id',
  'eventId',
  'status',
  'reasonCode',
  'reason',
  'evidenceSnapshot',
  'classifierDiagnostics',
  'analysis',
  'summary',
  'analysisProvenance',
  'createdAt',
  'updatedAt',
  'completedAt'
] as const;

const emailAutomationReviewDetailSelection = {
  id: emailAttentionReviews.id,
  eventId: emailAttentionReviews.eventId,
  status: emailAttentionReviews.status,
  reasonCode: emailAttentionReviews.reasonCode,
  reason: emailAttentionReviews.reason,
  evidenceSnapshot: emailAttentionReviews.evidenceSnapshot,
  classifierDiagnostics: emailAttentionReviews.classifierDiagnostics,
  analysis: emailAttentionReviews.analysis,
  summary: emailAttentionReviews.summary,
  analysisProvenance: emailAttentionReviews.analysisProvenance,
  createdAt: emailAttentionReviews.createdAt,
  updatedAt: emailAttentionReviews.updatedAt,
  completedAt: emailAttentionReviews.completedAt
};

export const getEmailAutomationEventDetail = async (eventId: number): Promise<EmailAutomationEventDetail | null> => {
  // Select only fields safe for browser serialization. Full snapshots, payloads,
  // and raw provider errors stay server-side; the body preview is explicitly bounded below.
  const [event] = await db.select({
    id: emailEvents.id, receivedAt: emailEvents.receivedAt, messageId: emailEvents.messageId,
    fromAddress: emailEvents.fromAddress, toAddress: emailEvents.toAddress, subject: emailEvents.subject,
    attachmentCount: emailEvents.attachmentCount, classification: emailEvents.classification, subtype: emailEvents.subtype,
    processingState: emailEvents.processingState, notificationState: emailEvents.notificationState,
    reviewReason: emailEvents.reviewReason, externalRef: emailEvents.externalRef, amountMinor: emailEvents.amountMinor,
    currency: emailEvents.currency, notionPageId: emailEvents.notionPageId,
    authenticityVerdict: emailEvents.authenticityVerdict, mimeCompleteness: emailEvents.mimeCompleteness,
    parserVersion: emailEvents.parserVersion, actionId: emailEvents.actionId,
    extractedBody: emailEvents.extractedBody,
    extractedBodySource: emailEvents.extractedBodySource,
    extractedBodyTruncated: emailEvents.extractedBodyTruncated,
    bodyExtractionMetadata: emailEvents.bodyExtractionMetadata,
    metadata: emailEvents.metadata
  }).from(emailEvents).where(eq(emailEvents.id, eventId)).limit(1);
  if (!event) return null;
  const actionWhere = event.actionId
    ? or(eq(emailAutomationActions.id, event.actionId), eq(emailAutomationActions.eventId, eventId))
    : eq(emailAutomationActions.eventId, eventId);
  const [actions, outbox, audits, reviewRows] = await Promise.all([
    db.select({ id: emailAutomationActions.id, eventId: emailAutomationActions.eventId, handlerKey: emailAutomationActions.handlerKey, handlerVersion: emailAutomationActions.handlerVersion, status: emailAutomationActions.status, externalObjectId: emailAutomationActions.externalObjectId, attemptCount: emailAutomationActions.attemptCount, nextAttemptAt: emailAutomationActions.nextAttemptAt, createdAt: emailAutomationActions.createdAt, updatedAt: emailAutomationActions.updatedAt, completedAt: emailAutomationActions.completedAt, hasError: sql<boolean>`${emailAutomationActions.lastError} is not null` }).from(emailAutomationActions).where(actionWhere).orderBy(desc(emailAutomationActions.createdAt)),
    db.select({ id: emailNotificationOutbox.id, status: emailNotificationOutbox.status, attemptCount: emailNotificationOutbox.attemptCount, nextAttemptAt: emailNotificationOutbox.nextAttemptAt, sentAt: emailNotificationOutbox.sentAt, hasError: sql<boolean>`${emailNotificationOutbox.lastError} is not null` }).from(emailNotificationOutbox).where(eq(emailNotificationOutbox.eventId, eventId)).orderBy(desc(emailNotificationOutbox.createdAt)),
    db.select({ id: emailAutomationAuditLog.id, actor: emailAutomationAuditLog.actor, action: emailAutomationAuditLog.action, reason: emailAutomationAuditLog.reason, createdAt: emailAutomationAuditLog.createdAt }).from(emailAutomationAuditLog).where(eq(emailAutomationAuditLog.eventId, eventId)).orderBy(desc(emailAutomationAuditLog.createdAt)),
    db.select(emailAutomationReviewDetailSelection).from(emailAttentionReviews).where(eq(emailAttentionReviews.eventId, eventId)).limit(1)
  ]);
  const attempts = actions.length ? await db.select({ id: emailAutomationAttempts.id, kind: emailAutomationAttempts.kind, status: emailAutomationAttempts.status, actor: emailAutomationAttempts.actor, createdAt: emailAutomationAttempts.createdAt, hasError: sql<boolean>`${emailAutomationAttempts.error} is not null` }).from(emailAutomationAttempts).where(eq(emailAutomationAttempts.actionId, actions[0].id)).orderBy(desc(emailAutomationAttempts.createdAt)) : [];
  const action = actions[0];
  const review = reviewRows[0] ? {
    ...reviewRows[0],
    triage: readReviewTriageMetadata(reviewRows[0].analysisProvenance),
    bundle: renderEmailReviewBundle(reviewRows[0] as ReviewBundleRecord)
  } : null;
  const metadata = event.metadata && typeof event.metadata === 'object' ? event.metadata as Record<string, unknown> : {};
  const storedBodyPreview = typeof event.extractedBody === 'string'
    ? event.extractedBody
    : typeof metadata.bodyPreview === 'string'
      ? metadata.bodyPreview
      : typeof metadata.textSnippet === 'string'
        ? metadata.textSnippet
        : null;
  // The dedicated column contains only the capped latest visible body, never raw MIME.
  const bodyPreview = storedBodyPreview?.slice(0, 64_000) ?? null;
  const storedSource = event.extractedBodySource ?? metadata.bodyPreviewSource;
  const bodyPreviewSource = storedSource === 'html' || storedSource === 'html-fallback' || storedSource === 'text' ? storedSource : bodyPreview ? 'text' : null;
  const bodyPreviewTruncated = event.extractedBodyTruncated === true || metadata.bodyPreviewTruncated === true || Boolean(bodyPreview && storedBodyPreview && storedBodyPreview.length > 64_000);
  const { metadata: _metadata, ...browserEvent } = event;
  const senderEmail = extractSenderEmail(event.fromAddress);
  return {
    event: {
      ...browserEvent,
      senderEmail,
      ledgerUrl: notionPageUrl(event.notionPageId),
      bodyPreview,
      bodyPreviewSource,
      bodyPreviewTruncated,
      bodyExtractionMetadata: event.bodyExtractionMetadata,
      classifierRuleDraft: renderEmailClassifierRuleDraft({ id: event.id, senderEmail, subject: event.subject, subtype: event.subtype })
    },
    actions,
    outbox,
    attempts,
    audits,
    review,
    outcome: buildEmailAutomationOutcome({ classification: event.classification, subtype: event.subtype, processingState: event.processingState, reviewReason: event.reviewReason, actionState: action?.status as any, notificationState: event.notificationState as any, authenticityVerdict: event.authenticityVerdict as any, externalObjectId: action?.externalObjectId })
  };
};

export type ReviewNotesUpdate = { reviewId: number; analysis: string; summary: string; needsFullBody: boolean; expectedRevision: number };

const normalizeReviewNotes = (values: Pick<ReviewNotesUpdate, 'analysis' | 'summary'>) => ({
  analysis: values.analysis.trim().slice(0, 12_000),
  summary: values.summary.trim().slice(0, 1_000)
});

const reviewProvenance = (now: Date, triage: { needsFullBody: boolean; disposition?: 'dismissed_irrelevant' | null; revision: number }) => ({
  bundleVersion: '1',
  provider: null,
  source: 'manual',
  actor: 'manager',
  savedAt: now.toISOString(),
  needsFullBody: triage.needsFullBody,
  disposition: triage.disposition ?? null,
  revision: triage.revision
});

export const saveEmailAutomationReviewNotes = async ({ reviewId, analysis, summary, needsFullBody, expectedRevision }: ReviewNotesUpdate) => {
  const notes = normalizeReviewNotes({ analysis, summary });
  return db.transaction(async (tx) => {
    const [review] = await tx.select().from(emailAttentionReviews).where(eq(emailAttentionReviews.id, reviewId)).limit(1);
    if (!review) throw new Error('Review not found. Refresh the dashboard.');
    const now = new Date();
    const previousTriage = readReviewTriageMetadata(review.analysisProvenance);
    if (previousTriage.revision !== expectedRevision) throw new Error('Review state changed. Refresh before saving notes.');
    const nextStatus = review.status === 'waiting' ? 'in_progress' : review.status;
    const [updated] = await tx.update(emailAttentionReviews).set({
      status: nextStatus,
      analysis: notes.analysis || null,
      summary: notes.summary || null,
      analysisProvenance: reviewProvenance(now, { needsFullBody, revision: expectedRevision + 1 }),
      lastActor: 'manager',
      startedAt: review.startedAt ?? now,
      updatedAt: now
    }).where(and(eq(emailAttentionReviews.id, reviewId), eq(emailAttentionReviews.status, review.status), sql`coalesce(case when jsonb_typeof(${emailAttentionReviews.analysisProvenance}->'revision') = 'number' then (${emailAttentionReviews.analysisProvenance}->>'revision')::int end, 0) = ${expectedRevision}`)).returning({ id: emailAttentionReviews.id, status: emailAttentionReviews.status });
    if (!updated) throw new Error('Review state changed. Refresh before saving notes.');
    await tx.insert(emailAutomationAuditLog).values({ eventId: review.eventId, action: 'review_analysis_saved', reason: 'Manager saved review notes and triage guidance.', before: { status: review.status, needsFullBody: previousTriage.needsFullBody, revision: expectedRevision }, after: { status: nextStatus, reviewId, needsFullBody, revision: expectedRevision + 1 } });
    return { status: updated.status, nextStep: 'Review notes and triage guidance are saved. Mark the review done when the attention item is resolved.' };
  });
};

export const markEmailAutomationReviewDone = async ({ reviewId, analysis, summary, needsFullBody, expectedRevision }: ReviewNotesUpdate) => {
  const notes = normalizeReviewNotes({ analysis, summary });
  return db.transaction(async (tx) => {
    const [review] = await tx.select().from(emailAttentionReviews).where(eq(emailAttentionReviews.id, reviewId)).limit(1);
    if (!review) throw new Error('Review not found. Refresh the dashboard.');
    const now = new Date();
    const previousTriage = readReviewTriageMetadata(review.analysisProvenance);
    if (previousTriage.revision !== expectedRevision) throw new Error('Review state changed. Refresh before marking it done.');
    const [updated] = await tx.update(emailAttentionReviews).set({
      status: 'done',
      analysis: notes.analysis || null,
      summary: notes.summary || null,
      analysisProvenance: reviewProvenance(now, { needsFullBody, revision: expectedRevision + 1 }),
      lastActor: 'manager',
      startedAt: review.startedAt ?? now,
      completedAt: now,
      updatedAt: now
    }).where(and(eq(emailAttentionReviews.id, reviewId), inArray(emailAttentionReviews.status, ['waiting', 'in_progress']), sql`coalesce(case when jsonb_typeof(${emailAttentionReviews.analysisProvenance}->'revision') = 'number' then (${emailAttentionReviews.analysisProvenance}->>'revision')::int end, 0) = ${expectedRevision}`)).returning({ id: emailAttentionReviews.id, status: emailAttentionReviews.status });
    if (!updated) {
      if (review.status === 'done') return { status: 'done', nextStep: 'This review was already marked done. No action or Telegram queue was changed.' };
      throw new Error('Review state changed. Refresh before marking it done.');
    }
    await tx.insert(emailAutomationAuditLog).values({ eventId: review.eventId, action: 'review_done', reason: 'Manager marked the attention review done.', before: { status: review.status, revision: expectedRevision }, after: { status: 'done', reviewId, needsFullBody, revision: expectedRevision + 1 } });
    return { status: 'done', nextStep: 'Review marked done. No external action, retry, Ledger, or Telegram queue was changed.' };
  });
};

export const dismissEmailAutomationReviewAsIrrelevant = async ({ reviewId, analysis, summary, needsFullBody, expectedRevision }: ReviewNotesUpdate) => {
  const notes = normalizeReviewNotes({ analysis, summary });
  return db.transaction(async (tx) => {
    const [review] = await tx.select().from(emailAttentionReviews).where(eq(emailAttentionReviews.id, reviewId)).limit(1);
    if (!review) throw new Error('Review not found. Refresh the dashboard.');
    const now = new Date();
    const previousTriage = readReviewTriageMetadata(review.analysisProvenance);
    if (previousTriage.revision !== expectedRevision) throw new Error('Review state changed. Refresh before dismissing.');
    const [updated] = await tx.update(emailAttentionReviews).set({
      status: 'done',
      analysis: notes.analysis || null,
      summary: notes.summary || 'Dismissed as irrelevant.',
      analysisProvenance: reviewProvenance(now, { needsFullBody, disposition: 'dismissed_irrelevant', revision: expectedRevision + 1 }),
      lastActor: 'manager',
      startedAt: review.startedAt ?? now,
      completedAt: now,
      updatedAt: now
    }).where(and(eq(emailAttentionReviews.id, reviewId), inArray(emailAttentionReviews.status, ['waiting', 'in_progress']), sql`coalesce(case when jsonb_typeof(${emailAttentionReviews.analysisProvenance}->'revision') = 'number' then (${emailAttentionReviews.analysisProvenance}->>'revision')::int end, 0) = ${expectedRevision}`)).returning({ id: emailAttentionReviews.id });
    if (!updated) throw new Error('Only an open review can be dismissed. Refresh the dashboard.');
    // Dismissal closes only the human review record. The append-only audit entry
    // preserves the explicit irrelevant disposition without deleting the event.
    await tx.insert(emailAutomationAuditLog).values({ eventId: review.eventId, action: 'review_dismissed_irrelevant', reason: 'Manager dismissed the attention review as irrelevant.', before: { status: review.status, revision: expectedRevision }, after: { status: 'done', reviewId, disposition: 'dismissed_irrelevant', needsFullBody, revision: expectedRevision + 1 } });
    return { status: 'done', nextStep: 'Dismissed as irrelevant with audit history. The email event and all durable history remain stored.' };
  });
};

export const addEmailAutomationReviewSenderToIgnoredList = async (reviewId: number, confirmIgnoredSenderBypassRisk: boolean) => db.transaction(async (tx) => {
  if (!confirmIgnoredSenderBypassRisk) throw new Error('Confirm the visible-sender spoofing and review-bypass warning before adding an ignored sender.');
  const [source] = await tx.select({ eventId: emailAttentionReviews.eventId, fromAddress: emailEvents.fromAddress })
    .from(emailAttentionReviews)
    .innerJoin(emailEvents, eq(emailAttentionReviews.eventId, emailEvents.id))
    .where(eq(emailAttentionReviews.id, reviewId))
    .limit(1);
  if (!source) throw new Error('Review not found. Refresh the dashboard.');
  const visibleAddresses = source.fromAddress.match(/[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9.-]+/gi) ?? [];
  const uniqueAddresses = normalizeIgnoredSenders(visibleAddresses);
  const senderEmail = uniqueAddresses.length === 1 ? normalizeExactSenderEmail(uniqueAddresses[0]) : null;
  if (!senderEmail) throw new Error('The visible sender does not contain one unambiguous valid exact email address. Copy and review it manually.');

  await tx.insert(emailAutomationSettings).values({
    id: 1,
    automationEnabled: DEFAULT_SETTINGS.automationEnabled,
    ledgerEnabled: DEFAULT_SETTINGS.ledgerEnabled,
    notificationsEnabled: DEFAULT_SETTINGS.notificationsEnabled,
    settings: toAutomationSettingsJson(DEFAULT_SETTINGS)
  }).onConflictDoNothing();
  await tx.execute(sql`select ${emailAutomationSettings.id} from ${emailAutomationSettings} where ${emailAutomationSettings.id} = 1 for update`);
  const [settingsRow] = await tx.select({
    automationEnabled: emailAutomationSettings.automationEnabled,
    ledgerEnabled: emailAutomationSettings.ledgerEnabled,
    notificationsEnabled: emailAutomationSettings.notificationsEnabled,
    settings: emailAutomationSettings.settings
  }).from(emailAutomationSettings).where(eq(emailAutomationSettings.id, 1)).limit(1);
  const current = automationSettingsFromRow(settingsRow);
  if (current.ignoredSenders.includes(senderEmail)) {
    return { added: false, senderEmail, nextStep: 'This visible sender is already on the ignored list.' };
  }

  const next = { ...current, ignoredSenders: normalizeIgnoredSenders([...current.ignoredSenders, senderEmail]) };
  const now = new Date();
  await tx.insert(emailAutomationSettings).values({
    id: 1,
    automationEnabled: next.automationEnabled,
    ledgerEnabled: next.ledgerEnabled,
    notificationsEnabled: next.notificationsEnabled,
    settings: toAutomationSettingsJson(next),
    updatedAt: now
  }).onConflictDoUpdate({
    target: emailAutomationSettings.id,
    set: { settings: toAutomationSettingsJson(next), updatedAt: now }
  });
  await tx.insert(emailAutomationAuditLog).values({
    eventId: source.eventId,
    action: 'review_sender_added_to_ignored_list',
    reason: 'Manager confirmed the visible sender should bypass future review and notifications.',
    before: { ignoredSenderCount: current.ignoredSenders.length },
    after: { ignoredSenderCount: next.ignoredSenders.length, senderEmail }
  });
  return { added: true, senderEmail, nextStep: 'Visible sender added to the ignored list. Matching future messages will bypass handlers, review creation, and Telegram notifications.' };
});

export const reopenEmailAutomationReview = async (reviewId: number) => db.transaction(async (tx) => {
  const [review] = await tx.select().from(emailAttentionReviews).where(and(eq(emailAttentionReviews.id, reviewId), eq(emailAttentionReviews.status, 'done'))).limit(1);
  if (!review) throw new Error('Only a completed review can be reopened. Refresh the dashboard.');
  const now = new Date();
  const previousTriage = readReviewTriageMetadata(review.analysisProvenance);
  const [updated] = await tx.update(emailAttentionReviews).set({
    status: 'waiting',
    analysisProvenance: reviewProvenance(now, { needsFullBody: previousTriage.needsFullBody, revision: previousTriage.revision + 1 }),
    completedAt: null,
    startedAt: null,
    lastActor: 'manager',
    updatedAt: now
  }).where(and(eq(emailAttentionReviews.id, reviewId), eq(emailAttentionReviews.status, 'done'))).returning({ id: emailAttentionReviews.id, status: emailAttentionReviews.status });
  if (!updated) throw new Error('Review state changed. Refresh before reopening.');
  await tx.insert(emailAutomationAuditLog).values({ eventId: review.eventId, action: 'review_reopened', reason: 'Manager reopened the attention review for another pass.', before: { status: 'done', disposition: previousTriage.disposition, revision: previousTriage.revision }, after: { status: 'waiting', reviewId, disposition: null, revision: previousTriage.revision + 1 } });
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
