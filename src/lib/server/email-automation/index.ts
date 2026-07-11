import { asc, desc, eq } from 'drizzle-orm';
import { env } from '$env/dynamic/private';
import { createTelegramAlertPublisher } from '$lib/server/alerts/telegram';
import { db } from '$lib/server/db/client';
import { emailAutomationSettings, emailClassificationRules, emailEvents } from '$lib/server/db/schema';
import { createCompanyLedgerExpense, type CompanyLedgerExpenseType } from '$lib/server/ledger-expenses';
import {
  classifyEmail,
  createEmailAutomationHash,
  normalize,
  shouldCreateLedgerExpense,
  type EmailAutomationInput,
  type EmailClassification,
  type EmailClassificationRuleInput
} from './classifier';

const MAX_SNIPPET_LENGTH = 500;

const DEFAULT_SETTINGS = {
  automationEnabled: true,
  // DB settings are the runtime control. The env var is kept only as a pre-migration fallback.
  ledgerEnabled: env.EMAIL_AUTOMATION_LEDGER_ENABLED === 'true',
  notificationsEnabled: true
};

export type { EmailAutomationInput, EmailClassification } from './classifier';

type Classification = EmailClassification;

const escapeHtml = (value: string) => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const compactSnippet = (value?: string) => {
  if (!value) return undefined;
  const result = normalize(value);
  return result ? result.slice(0, MAX_SNIPPET_LENGTH) : undefined;
};


const formatMoney = (amountMinor?: number, currency?: string) => amountMinor === undefined ? null : `${currency ?? 'THB'} ${(amountMinor / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

const humanSubtype = (subtype: string) => subtype
  .replaceAll('_', ' ')
  .replace(/\b\w/g, (letter) => letter.toUpperCase());

const detailBlock = (label: string, value?: string | null) => value
  ? `<b>${label}</b>\n${value}`
  : null;

const ledgerDefaults = (classification: Classification) => classification.ledgerDefaults && typeof classification.ledgerDefaults === 'object'
  ? classification.ledgerDefaults as { ledgerType?: string; bankAccount?: string; paymentMethod?: string; category?: string; department?: string; supplierId?: string }
  : {};

const createLedgerRecord = async (input: EmailAutomationInput, classification: Classification, ledgerEnabled: boolean) => {
  if (!shouldCreateLedgerExpense(classification)) return null;
  if (!ledgerEnabled) return null;
  const amountMinor = classification.amountMinor;
  if (amountMinor === undefined) return null;
  const defaults = ledgerDefaults(classification);
  const isPromptPay = /prompt\s*pay|promptpay/i.test(classification.subtype);
  const ledgerType = (defaults.ledgerType ?? (isPromptPay ? 'Scan Expense' : 'Bank Transfer Expense')) as CompanyLedgerExpenseType;
  const paymentMethod = defaults.paymentMethod ?? (isPromptPay ? 'Scan' : 'Wire Transfer');
  return createCompanyLedgerExpense({
    ledgerType,
    title: input.subject,
    amount: amountMinor / 100,
    date: input.receivedAt,
    transactionId: classification.externalRef,
    bankAccount: defaults.bankAccount ?? 'KBank',
    paymentMethod,
    category: defaults.category,
    department: defaults.department,
    supplierId: defaults.supplierId,
    notes: `Created by email automation from ${input.from}. Review and attach the invoice/receipt image.`
  });
};

export const renderEmailAutomationNotification = (input: EmailAutomationInput, event: Classification, notionPageId?: string) => {
  const amount = formatMoney(event.amountMinor, event.currency);
  const title = notionPageId
    ? '✅ Expense recorded'
    : event.processingState === 'ready'
      ? '✅ Action ready'
      : '🔎 Review needed';
  const action = notionPageId
    ? 'Ledger page was created. Please attach the receipt or invoice if needed.'
    : event.processingState === 'ready'
      ? event.handlerKey === 'company_ledger_expense'
        ? 'Ledger creation is disabled in automation settings. Review this email, then enable Ledger writes when ready.'
        : 'Review the matched automation handler before enabling side effects.'
      : 'Please review this email before any automation runs.';
  return [
    `<b>${title}</b>`,
    humanSubtype(event.subtype),
    detailBlock('Amount', amount),
    detailBlock('Reference', event.externalRef ? `<code>${escapeHtml(event.externalRef)}</code>` : null),
    detailBlock('Why', event.reviewReason ? escapeHtml(event.reviewReason) : null),
    detailBlock('Email', `${escapeHtml(input.from)}\n${escapeHtml(input.subject)}`),
    detailBlock('Next step', action)
  ].filter(Boolean).join('\n\n');
};

const notify = async (input: EmailAutomationInput, event: Classification, _eventId: number, notionPageId?: string) => {
  const botToken = env.TELEGRAM_BOT_TOKEN;
  const chatId = env.EMAIL_AUTOMATION_TELEGRAM_CHAT_ID;
  if (!botToken || !chatId) return 'not_configured';
  const body = renderEmailAutomationNotification(input, event, notionPageId);
  await createTelegramAlertPublisher({ botToken, chatId, messageThreadId: env.EMAIL_AUTOMATION_TELEGRAM_MESSAGE_THREAD_ID, timeoutMs: Number(env.TELEGRAM_ALERT_TIMEOUT_MS || 3000) }).publish({ title: '', body, parseMode: 'HTML' });
  return 'sent';
};

const loadAutomationSettings = async () => {
  try {
    const [settings] = await db.select({
      automationEnabled: emailAutomationSettings.automationEnabled,
      ledgerEnabled: emailAutomationSettings.ledgerEnabled,
      notificationsEnabled: emailAutomationSettings.notificationsEnabled
    }).from(emailAutomationSettings).limit(1);
    return settings ?? DEFAULT_SETTINGS;
  } catch (error) {
    console.warn('Email automation settings unavailable; falling back to env defaults.', error);
    return DEFAULT_SETTINGS;
  }
};

const loadEnabledClassificationRules = async (): Promise<EmailClassificationRuleInput[]> => {
  const rows = await db.select({
    name: emailClassificationRules.name,
    classification: emailClassificationRules.classification,
    subtype: emailClassificationRules.subtype,
    senderPattern: emailClassificationRules.senderPattern,
    subjectPattern: emailClassificationRules.subjectPattern,
    bodyPatterns: emailClassificationRules.bodyPatterns,
    handlerKey: emailClassificationRules.handlerKey,
    ledgerDefaults: emailClassificationRules.ledgerDefaults,
    notifyPolicy: emailClassificationRules.notifyPolicy
  }).from(emailClassificationRules)
    .where(eq(emailClassificationRules.enabled, true))
    .orderBy(asc(emailClassificationRules.priority), asc(emailClassificationRules.id));
  return rows;
};

export const ingestEmailAutomationEvent = async (input: EmailAutomationInput) => {
  const settings = await loadAutomationSettings();
  const rules = settings.automationEnabled ? await loadEnabledClassificationRules() : [];
  const classification = settings.automationEnabled
    ? classifyEmail(input, rules)
    : { classification: 'ignore' as const, subtype: 'automation_disabled', processingState: 'ignored' as const, reviewReason: 'Email automation is disabled in dashboard settings.', notify: false };
  const hash = createEmailAutomationHash(input);
  const [created] = await db.insert(emailEvents).values({
    receivedAt: new Date(input.receivedAt), messageId: input.messageId, emailHash: hash,
    fromAddress: input.from, toAddress: input.to, subject: input.subject,
    attachmentCount: input.attachmentCount, classification: classification.classification,
    subtype: classification.subtype, processingState: classification.processingState,
    externalRef: classification.externalRef, amountMinor: classification.amountMinor,
    currency: classification.currency, counterparty: classification.counterparty,
    reviewReason: classification.reviewReason,
    notificationState: classification.notify && settings.notificationsEnabled ? 'pending' : 'not_needed',
    metadata: {
      textSnippet: compactSnippet(input.textBody),
      htmlSnippet: compactSnippet(input.htmlBody),
      matchedRuleName: classification.matchedRuleName,
      handlerKey: classification.handlerKey,
      notifyPolicy: classification.notifyPolicy,
      ledgerDefaults: classification.ledgerDefaults
    }
  }).onConflictDoNothing({ target: emailEvents.emailHash }).returning({ id: emailEvents.id });

  if (!created) {
    const [existing] = await db.select({ id: emailEvents.id, processingState: emailEvents.processingState, notificationState: emailEvents.notificationState })
      .from(emailEvents).where(eq(emailEvents.emailHash, hash)).orderBy(desc(emailEvents.id)).limit(1);
    return { duplicate: true, eventId: existing?.id, processingState: existing?.processingState, notificationState: existing?.notificationState };
  }

  let notionPageId: string | undefined;
  if (classification.processingState === 'ready') {
    try {
      const ledger = await createLedgerRecord(input, classification, settings.ledgerEnabled);
      notionPageId = ledger?.id;
      if (notionPageId) {
        await db.update(emailEvents).set({ notionPageId, processingState: 'ledger_created' }).where(eq(emailEvents.id, created.id));
      }
    } catch (error) {
      const lastError = error instanceof Error ? error.message : String(error);
      await db.update(emailEvents).set({ processingState: 'retry_pending', lastError, attemptCount: 1 }).where(eq(emailEvents.id, created.id));
      return { duplicate: false, eventId: created.id, classification, notificationState: 'not_sent' };
    }
  }

  let notificationState = classification.notify && settings.notificationsEnabled ? 'pending' : 'not_needed';
  try {
    if (classification.notify && settings.notificationsEnabled) notificationState = await notify(input, classification, created.id, notionPageId);
    await db.update(emailEvents).set({ notificationState, processedAt: new Date(), attemptCount: 1 }).where(eq(emailEvents.id, created.id));
  } catch (error) {
    const lastError = error instanceof Error ? error.message : String(error);
    notificationState = 'retry_pending';
    await db.update(emailEvents).set({ notificationState, lastError, attemptCount: 1 }).where(eq(emailEvents.id, created.id));
  }
  return { duplicate: false, eventId: created.id, classification, notificationState };
};
