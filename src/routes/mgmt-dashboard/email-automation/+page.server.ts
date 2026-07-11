import { asc, desc, eq, sql } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db/client';
import { emailAutomationSettings, emailClassificationRules, emailEvents } from '$lib/server/db/schema';
import {
  classifyEmail,
  classificationFromRule,
  matchesClassificationRule,
  type EmailAutomationInput,
  type EmailClassification,
  type EmailClassificationRuleInput
} from '$lib/server/email-automation/classifier';
import {
  BUILTIN_CLASSIFIERS,
  findBuiltinClassifier,
  renderEmailAutomationNotification,
  sendEmailAutomationTestNotification,
  type NotificationSendResult
} from '$lib/server/email-automation/notifications';

type RuleRow = {
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
  ledgerDefaults: unknown;
  notifyPolicy: string;
  dummyInput: unknown;
};

const toRuleInput = (row: Pick<RuleRow, 'name' | 'classification' | 'subtype' | 'senderPattern' | 'subjectPattern' | 'bodyPatterns' | 'handlerKey' | 'ledgerDefaults' | 'notifyPolicy'>): EmailClassificationRuleInput => ({
  name: row.name,
  classification: row.classification,
  subtype: row.subtype,
  senderPattern: row.senderPattern,
  subjectPattern: row.subjectPattern,
  bodyPatterns: row.bodyPatterns,
  handlerKey: row.handlerKey,
  ledgerDefaults: row.ledgerDefaults,
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

type RulePreview = {
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

const buildRulePreview = (rule: RuleRow): RulePreview => {
  const input = toEmailInput(rule.dummyInput);
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
    id: rule.id,
    enabled: rule.enabled,
    priority: rule.priority,
    name: rule.name,
    classification: rule.classification,
    subtype: rule.subtype,
    senderPattern: rule.senderPattern,
    subjectPattern: rule.subjectPattern,
    bodyPatterns: rule.bodyPatterns,
    handlerKey: rule.handlerKey,
    notifyPolicy: rule.notifyPolicy,
    hasDummyInput: input !== null,
    preview,
    previewNote
  };
};

type BuiltinPreview = {
  key: string;
  label: string;
  classification: EmailClassification['classification'];
  subtype: string;
  description: string;
  deprecated: boolean;
  preview: string;
};

const buildBuiltinPreviews = (): BuiltinPreview[] => BUILTIN_CLASSIFIERS.map((entry) => {
  const classification = classifyEmail(entry.dummyInput, []);
  return {
    key: entry.key,
    label: entry.label,
    classification: entry.classification,
    subtype: entry.subtype,
    description: entry.description,
    deprecated: entry.deprecated,
    preview: renderEmailAutomationNotification(entry.dummyInput, classification)
  };
});

export const load: PageServerLoad = async () => {
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
    db.select().from(emailAutomationSettings).limit(1).catch(() => []),
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
    settings: settings[0] ?? { automationEnabled: true, ledgerEnabled: false, notificationsEnabled: true, settings: {}, updatedAt: new Date() },
    notificationPreview: renderEmailAutomationNotification(sampleEmail, sampleClassification)
  };
};

type SendTestResult = { ok: boolean; action: 'sendTest'; sent?: NotificationSendResult; target?: string; error?: string };

export const actions: Actions = {
  settings: async ({ request }) => {
    const form = await request.formData();
    const values = {
      id: 1,
      automationEnabled: form.get('automationEnabled') === 'on',
      ledgerEnabled: form.get('ledgerEnabled') === 'on',
      notificationsEnabled: form.get('notificationsEnabled') === 'on',
      updatedAt: new Date()
    };

    await db.insert(emailAutomationSettings).values(values)
      .onConflictDoUpdate({
        target: emailAutomationSettings.id,
        set: {
          automationEnabled: values.automationEnabled,
          ledgerEnabled: values.ledgerEnabled,
          notificationsEnabled: values.notificationsEnabled,
          updatedAt: values.updatedAt
        }
      });

    return { ok: true, action: 'settings' as const };
  },

  toggleRule: async ({ request }) => {
    const form = await request.formData();
    const id = Number(form.get('ruleId'));
    if (!Number.isFinite(id) || id <= 0) return { ok: false, action: 'toggleRule' as const, error: 'Invalid rule id.' };

    const [current] = await db.select({ enabled: emailClassificationRules.enabled })
      .from(emailClassificationRules).where(eq(emailClassificationRules.id, id)).limit(1);
    if (!current) return { ok: false, action: 'toggleRule' as const, error: 'Rule not found.' };

    await db.update(emailClassificationRules).set({ enabled: !current.enabled })
      .where(eq(emailClassificationRules.id, id));
    return { ok: true, action: 'toggleRule' as const };
  },

  moveRule: async ({ request }) => {
    const form = await request.formData();
    const id = Number(form.get('ruleId'));
    const direction = String(form.get('direction') ?? '');
    if (!Number.isFinite(id) || id <= 0) return { ok: false, action: 'moveRule' as const, error: 'Invalid rule id.' };
    if (direction !== 'up' && direction !== 'down') return { ok: false, action: 'moveRule' as const, error: 'Invalid direction.' };

    const ordered = await db.select({ id: emailClassificationRules.id, priority: emailClassificationRules.priority })
      .from(emailClassificationRules).orderBy(asc(emailClassificationRules.priority), asc(emailClassificationRules.id));
    const index = ordered.findIndex((row) => row.id === id);
    if (index === -1) return { ok: false, action: 'moveRule' as const, error: 'Rule not found.' };
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= ordered.length) return { ok: true, action: 'moveRule' as const };

    const a = ordered[index];
    const b = ordered[swapIndex];
    await db.update(emailClassificationRules).set({ priority: b.priority }).where(eq(emailClassificationRules.id, a.id));
    await db.update(emailClassificationRules).set({ priority: a.priority }).where(eq(emailClassificationRules.id, b.id));
    return { ok: true, action: 'moveRule' as const };
  },

  sendTest: async ({ request }): Promise<SendTestResult> => {
    const form = await request.formData();
    const scope = String(form.get('scope') ?? '');

    if (scope === 'builtin') {
      const key = String(form.get('key') ?? '');
      const entry = findBuiltinClassifier(key);
      if (!entry) return { ok: false, action: 'sendTest', error: 'Unknown built-in classifier.' };
      const classification = classifyEmail(entry.dummyInput, []);
      const sent = await sendEmailAutomationTestNotification(entry.dummyInput, classification);
      return { ok: true, action: 'sendTest', sent, target: entry.label };
    }

    if (scope === 'rule') {
      const id = Number(form.get('ruleId'));
      if (!Number.isFinite(id) || id <= 0) return { ok: false, action: 'sendTest', error: 'Invalid rule id.' };
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
      }).from(emailClassificationRules).where(eq(emailClassificationRules.id, id)).limit(1);
      if (!row) return { ok: false, action: 'sendTest', error: 'Rule not found.' };

      const input = toEmailInput(row.dummyInput);
      if (!input) return { ok: false, action: 'sendTest', error: 'This rule has no dummy_input. Add one before sending a test.' };
      const ruleInput = toRuleInput(row);
      if (!matchesClassificationRule(input, ruleInput)) return { ok: false, action: 'sendTest', error: 'The dummy_input does not match this rule\'s patterns.' };
      const classification = classificationFromRule(input, ruleInput);
      if (!classification) return { ok: false, action: 'sendTest', error: 'Could not derive a classification from the dummy_input.' };
      const sent = await sendEmailAutomationTestNotification(input, classification);
      return { ok: true, action: 'sendTest', sent, target: row.name };
    }

    return { ok: false, action: 'sendTest', error: 'Unknown test scope.' };
  }
};
