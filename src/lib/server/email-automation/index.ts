import { createHash } from 'node:crypto';
import { desc, eq } from 'drizzle-orm';
import { env } from '$env/dynamic/private';
import { createTelegramAlertPublisher } from '$lib/server/alerts/telegram';
import { db } from '$lib/server/db/client';
import { emailEvents } from '$lib/server/db/schema';
import { createCompanyLedgerExpense, type CompanyLedgerExpenseType } from '$lib/server/ledger-expenses';

const MAX_SNIPPET_LENGTH = 500;

export type EmailAutomationInput = {
  receivedAt: string;
  from: string;
  to: string;
  subject: string;
  messageId?: string;
  attachmentCount: number;
  textBody?: string;
  htmlBody?: string;
};

type Classification = {
  classification: 'expense' | 'income' | 'ignore' | 'review';
  subtype: string;
  processingState: 'ready' | 'review' | 'ignored';
  reviewReason?: string;
  externalRef?: string;
  amountMinor?: number;
  currency?: string;
  counterparty?: string;
  notify: boolean;
};

const normalize = (value: string) => value.replace(/\s+/g, ' ').trim();

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

const bodyText = (input: EmailAutomationInput) => normalize(`${input.textBody ?? ''} ${input.htmlBody ?? ''}`);

const extractReference = (text: string) => {
  const match = text.match(/(?:reference(?:\s*(?:no\.?|number))?|transaction(?:\s*(?:id|ref(?:erence)?))?|ref(?:erence)?)\s*[:#-]?\s*([A-Z0-9-]{6,})/i);
  return match?.[1]?.toUpperCase();
};

const extractAmount = (text: string) => {
  const match = text.match(/(?:amount|total)(?:\s*\([^)]*\))?\s*[:=]?\s*(?:THB|฿)?\s*([\d,]+(?:\.\d{1,2})?)/i) ?? text.match(/(?:THB|฿)\s*[:=]?\s*([\d,]+(?:\.\d{1,2})?)/i);
  if (!match) return undefined;
  const amount = Number(match[1].replace(/,/g, ''));
  return Number.isFinite(amount) ? Math.round(amount * 100) : undefined;
};

const classify = (input: EmailAutomationInput): Classification => {
  const subject = normalize(input.subject);
  const text = `${subject} ${bodyText(input)}`;
  const externalRef = extractReference(text);
  const amountMinor = extractAmount(text);
  const isKbiz = /k\s*biz|kasikorn|kbank/i.test(`${input.from} ${text}`);

  if (/^status .*\(approved\)/i.test(subject)) {
    return { classification: 'ignore', subtype: 'approved_shadow', processingState: 'ignored', externalRef, amountMinor, currency: amountMinor ? 'THB' : undefined, notify: false };
  }
  if (/result of bill payment\/top-up \(success\)/i.test(subject)) {
    return successfulExpense('bill_payment_success', externalRef, amountMinor);
  }
  if (/result of other account funds transfer \(other bank\) \(success\)/i.test(subject)) {
    return successfulExpense('other_bank_transfer_success', externalRef, amountMinor);
  }
  if (/result of promptpay funds transfer \(success\)/i.test(subject)) {
    return successfulExpense('promptpay_transfer_success', externalRef, amountMinor);
  }
  if (/could not be deposited|deposit.*failed/i.test(text) && /k\s*shop/i.test(text)) {
    return { classification: 'review', subtype: 'kshop_settlement_failed', processingState: 'review', reviewReason: 'K SHOP settlement was not deposited.', notify: true };
  }
  if (/fee.*(?:failed|unsuccessful)|(?:failed|unsuccessful).*fee/i.test(text) && /merchant/i.test(text)) {
    return { classification: 'review', subtype: 'merchant_fee_failed', processingState: 'review', reviewReason: 'Merchant fee payment was not confirmed.', notify: true };
  }
  if (/otp|login|sign.?in|email address change|terms of service/i.test(text)) {
    return { classification: 'ignore', subtype: 'security_or_admin', processingState: 'ignored', notify: false };
  }
  if (/statement|e-document|subscription renewal/i.test(text)) {
    return { classification: 'review', subtype: 'statement_or_attachment', processingState: 'review', reviewReason: 'This email needs a person to decide whether it is actionable.', notify: true };
  }
  return {
    classification: 'review',
    subtype: isKbiz ? 'unrecognized_kbiz' : 'unrecognized_email',
    processingState: 'review',
    reviewReason: 'No safe automatic classification matched this email.',
    notify: true
  };
};

const successfulExpense = (subtype: string, externalRef: string | undefined, amountMinor: number | undefined): Classification => {
  const missing = [externalRef === undefined ? 'transaction reference' : null, amountMinor === undefined ? 'amount' : null].filter(Boolean);
  return {
    classification: 'expense',
    subtype,
    processingState: missing.length > 0 ? 'review' : 'ready',
    reviewReason: missing.length > 0 ? `A success email was matched, but its ${missing.join(' and ')} could not be extracted.` : undefined,
    externalRef,
    amountMinor,
    currency: amountMinor === undefined ? undefined : 'THB',
    notify: true
  };
};

const emailHash = (input: EmailAutomationInput) => createHash('sha256')
  .update([input.messageId?.trim() || '', normalize(input.from).toLowerCase(), normalize(input.to).toLowerCase(), normalize(input.subject), normalize(input.textBody ?? input.htmlBody ?? '')].join('\n'))
  .digest('hex');

const formatMoney = (amountMinor?: number, currency?: string) => amountMinor === undefined ? null : `${currency ?? 'THB'} ${(amountMinor / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

const createLedgerRecord = async (input: EmailAutomationInput, classification: Classification) => {
  if (classification.processingState !== 'ready' || classification.amountMinor === undefined) return null;
  if (env.EMAIL_AUTOMATION_LEDGER_ENABLED !== 'true') return null;
  const isPromptPay = classification.subtype === 'promptpay_transfer_success';
  const ledgerType = (isPromptPay ? 'Scan Expense' : 'Bank Transfer Expense') as CompanyLedgerExpenseType;
  const paymentMethod = isPromptPay ? 'Scan' : 'Wire Transfer';
  return createCompanyLedgerExpense({
    ledgerType,
    title: input.subject,
    amount: classification.amountMinor / 100,
    date: input.receivedAt,
    transactionId: classification.externalRef,
    bankAccount: 'KBank',
    paymentMethod,
    notes: `Created by email automation from ${input.from}. Review and attach the invoice/receipt image.`
  });
};

const notify = async (input: EmailAutomationInput, event: Classification, eventId: number, notionPageId?: string) => {
  const botToken = env.TELEGRAM_BOT_TOKEN;
  const chatId = env.EMAIL_AUTOMATION_TELEGRAM_CHAT_ID;
  if (!botToken || !chatId) return 'not_configured';
  const amount = formatMoney(event.amountMinor, event.currency);
  const title = notionPageId ? '✅ Email automation: expense recorded' : event.processingState === 'ready' ? '✅ Email automation: expense ready' : '🔎 Email automation: review needed';
  const lines = [
    `<b>${title}</b>`,
    `<b>Type:</b> ${event.subtype.replaceAll('_', ' ')}`,
    `<b>From:</b> ${escapeHtml(input.from)}`,
    `<b>Subject:</b> ${escapeHtml(input.subject)}`,
    amount ? `<b>Amount:</b> ${amount}` : null,
    event.externalRef ? `<b>Reference:</b> <code>${event.externalRef}</code>` : null,
    event.reviewReason ? `<b>Why:</b> ${escapeHtml(event.reviewReason)}` : null,
    notionPageId ? `<b>Ledger:</b> created (${notionPageId})` : event.processingState === 'ready' ? '<b>Ledger:</b> waiting for the Ledger handler to be enabled' : null,
    `<b>Event:</b> #${eventId}`
  ].filter(Boolean).join('\n');
  await createTelegramAlertPublisher({ botToken, chatId, messageThreadId: env.EMAIL_AUTOMATION_TELEGRAM_MESSAGE_THREAD_ID, timeoutMs: Number(env.TELEGRAM_ALERT_TIMEOUT_MS || 3000) }).publish({ title: '', body: lines, parseMode: 'HTML' });
  return 'sent';
};

export const ingestEmailAutomationEvent = async (input: EmailAutomationInput) => {
  const classification = classify(input);
  const hash = emailHash(input);
  const [created] = await db.insert(emailEvents).values({
    receivedAt: new Date(input.receivedAt), messageId: input.messageId, emailHash: hash,
    fromAddress: input.from, toAddress: input.to, subject: input.subject,
    attachmentCount: input.attachmentCount, classification: classification.classification,
    subtype: classification.subtype, processingState: classification.processingState,
    externalRef: classification.externalRef, amountMinor: classification.amountMinor,
    currency: classification.currency, counterparty: classification.counterparty,
    reviewReason: classification.reviewReason,
    notificationState: classification.notify ? 'pending' : 'not_needed',
    metadata: { textSnippet: compactSnippet(input.textBody), htmlSnippet: compactSnippet(input.htmlBody) }
  }).onConflictDoNothing({ target: emailEvents.emailHash }).returning({ id: emailEvents.id });

  if (!created) {
    const [existing] = await db.select({ id: emailEvents.id, processingState: emailEvents.processingState, notificationState: emailEvents.notificationState })
      .from(emailEvents).where(eq(emailEvents.emailHash, hash)).orderBy(desc(emailEvents.id)).limit(1);
    return { duplicate: true, eventId: existing?.id, processingState: existing?.processingState, notificationState: existing?.notificationState };
  }

  let notionPageId: string | undefined;
  if (classification.processingState === 'ready') {
    try {
      const ledger = await createLedgerRecord(input, classification);
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

  let notificationState = classification.notify ? 'pending' : 'not_needed';
  try {
    if (classification.notify) notificationState = await notify(input, classification, created.id, notionPageId);
    await db.update(emailEvents).set({ notificationState, processedAt: new Date(), attemptCount: 1 }).where(eq(emailEvents.id, created.id));
  } catch (error) {
    const lastError = error instanceof Error ? error.message : String(error);
    notificationState = 'retry_pending';
    await db.update(emailEvents).set({ notificationState, lastError, attemptCount: 1 }).where(eq(emailEvents.id, created.id));
  }
  return { duplicate: false, eventId: created.id, classification, notificationState };
};
