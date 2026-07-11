import { asc, desc, eq, sql } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { emailAutomationSettings, emailClassificationRules, emailEvents } from '$lib/server/db/schema';
import {
  classifyEmail,
  classificationFromRule,
  matchesClassificationRule,
  type EmailAutomationInput,
  type EmailClassification,
  type EmailClassificationRuleInput
} from './classifier';
import {
  BUILTIN_CLASSIFIERS,
  renderEmailAutomationNotification,
  sendEmailAutomationTestNotification,
  type NotificationSendResult
} from './notifications';
import { loadAutomationSettings, saveAutomationSettings, type EmailAutomationSettings } from './settings';

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
  hasDummyInput: boolean;
  preview: string | null;
  previewNote: string | null;
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

export type DashboardData = {
  totals: { total: number; ready: number; review: number; ignored: number; ledgerCreated: number; failedNotification: number };
  recent: typeof emailEvents.$inferSelect[];
  rules: RulePreview[];
  builtinPreviews: BuiltinPreview[];
  subtypes: { classification: string; subtype: string; processingState: string; count: number; latestReceivedAt: Date }[];
  handlers: { handlerKey: string | null; matchedRuleName: string | null; count: number; latestReceivedAt: Date }[];
  settings: EmailAutomationSettings;
  notificationPreview: string;
};

const toRuleInput = (row: Pick<RulePreview, 'name' | 'classification' | 'subtype' | 'senderPattern' | 'subjectPattern' | 'bodyPatterns' | 'handlerKey' | 'notifyPolicy'> & { ledgerDefaults: unknown }): EmailClassificationRuleInput => ({
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
    htmlBody: typeof candidate.htmlBody === 'string' ? candidate.htmlBody : undefined
  };
};

const buildRulePreview = (rule: RulePreview & { ledgerDefaults: unknown }): RulePreview => {
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
      const classification = classificationFromRule(input, ruleInput);
      preview = classification ? renderEmailAutomationNotification(input, classification) : null;
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

const buildBuiltinPreviews = (): BuiltinPreview[] => BUILTIN_CLASSIFIERS.map((entry) => {
  const classification = classifyEmail(entry.dummyInput, []);
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
    textBody: 'Reference Number: PPFS260711TEST01 Amount (THB): 123.45'
  };
  const sampleClassification: EmailClassification = {
    classification: 'expense', subtype: 'promptpay_transfer_success', processingState: 'ready', externalRef: 'PPFS260711TEST01', amountMinor: 12345, currency: 'THB', notify: true, handlerKey: 'company_ledger_expense'
  };

  const [settings, totals, recent, ruleRows, subtypes, handlers] = await Promise.all([
    loadAutomationSettings(),
    db.select({
      total: sql<number>`count(*)::int`,
      ready: sql<number>`count(*) filter (where ${emailEvents.processingState} = 'ready')::int`,
      review: sql<number>`count(*) filter (where ${emailEvents.processingState} = 'review')::int`,
      ignored: sql<number>`count(*) filter (where ${emailEvents.processingState} = 'ignored')::int`,
      ledgerCreated: sql<number>`count(*) filter (where ${emailEvents.processingState} = 'ledger_created')::int`,
      failedNotification: sql<number>`count(*) filter (where ${emailEvents.notificationState} = 'retry_pending')::int`
    }).from(emailEvents),
    db.select().from(emailEvents).orderBy(desc(emailEvents.receivedAt)).limit(12),
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
    }).from(emailEvents).groupBy(sql`${emailEvents.metadata}->>'handlerKey'`, sql`${emailEvents.metadata}->>'matchedRuleName'`).orderBy(desc(sql`count(*)`)).limit(12)
  ]);

  return {
    totals: totals[0] ?? { total: 0, ready: 0, review: 0, ignored: 0, ledgerCreated: 0, failedNotification: 0 },
    recent,
    rules: ruleRows.map(buildRulePreview),
    builtinPreviews: buildBuiltinPreviews(),
    subtypes,
    handlers,
    settings,
    notificationPreview: renderEmailAutomationNotification(sampleEmail, sampleClassification)
  };
};

export type SettingsUpdate = { automationEnabled: boolean; ledgerEnabled: boolean; notificationsEnabled: boolean };

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
  const classification = classificationFromRule(input, ruleInput);
  if (!classification) return { ok: false, error: 'Could not derive a classification from the dummy_input.' };
  const sent = await sendEmailAutomationTestNotification(input, classification);
  return { ok: true, sent, target: row.name };
};

export const sendTestForBuiltin = async (key: string): Promise<TestSendResult> => {
  const entry = BUILTIN_CLASSIFIERS.find((e) => e.key === key);
  if (!entry) return { ok: false, error: 'Unknown built-in classifier.' };
  const classification = classifyEmail(entry.dummyInput, []);
  const sent = await sendEmailAutomationTestNotification(entry.dummyInput, classification);
  return { ok: true, sent, target: entry.label };
};
