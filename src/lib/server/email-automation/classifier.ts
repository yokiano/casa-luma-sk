import { createHash } from 'node:crypto';

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

export type EmailClassification = {
  classification: 'expense' | 'income' | 'ignore' | 'review';
  subtype: string;
  processingState: 'ready' | 'review' | 'ignored';
  reviewReason?: string;
  externalRef?: string;
  amountMinor?: number;
  currency?: string;
  counterparty?: string;
  notify: boolean;
  handlerKey?: string;
  ledgerDefaults?: unknown;
  notifyPolicy?: string;
  matchedRuleName?: string;
};

export type EmailClassificationRuleInput = {
  name: string;
  classification: string;
  subtype: string;
  senderPattern?: string | null;
  subjectPattern?: string | null;
  bodyPatterns?: unknown;
  handlerKey?: string | null;
  ledgerDefaults?: unknown;
  notifyPolicy?: string | null;
};

export const normalize = (value: string) => value.replace(/\s+/g, ' ').trim();

export const bodyText = (input: EmailAutomationInput) => normalize(`${input.textBody ?? ''} ${input.htmlBody ?? ''}`);

export const extractReference = (text: string) => {
  const match = text.match(/(?:reference(?:\s*(?:no\.?|number))?|transaction(?:\s*(?:id|ref(?:erence)?))?|ref(?:erence)?)\s*[:#-]?\s*([A-Z0-9-]{6,})/i);
  return match?.[1]?.toUpperCase();
};

export const extractAmount = (text: string) => {
  const match = text.match(/(?:amount|total)(?:\s*\([^)]*\))?\s*[:=]?\s*(?:THB|฿)?\s*([\d,]+(?:\.\d{1,2})?)/i) ?? text.match(/(?:THB|฿)\s*[:=]?\s*([\d,]+(?:\.\d{1,2})?)/i);
  if (!match) return undefined;
  const amount = Number(match[1].replace(/,/g, ''));
  return Number.isFinite(amount) ? Math.round(amount * 100) : undefined;
};

const successfulExpense = (subtype: string, externalRef: string | undefined, amountMinor: number | undefined): EmailClassification => {
  const missing = [externalRef === undefined ? 'transaction reference' : null, amountMinor === undefined ? 'amount' : null].filter(Boolean);
  return {
    classification: 'expense',
    subtype,
    processingState: missing.length > 0 ? 'review' : 'ready',
    reviewReason: missing.length > 0 ? `A success email was matched, but its ${missing.join(' and ')} could not be extracted.` : undefined,
    externalRef,
    amountMinor,
    currency: amountMinor === undefined ? undefined : 'THB',
    notify: true,
    handlerKey: 'company_ledger_expense'
  };
};

const matchesPattern = (value: string, pattern?: string | null) => {
  const trimmed = pattern?.trim();
  if (!trimmed) return true;
  const normalizedValue = normalize(value);
  if (trimmed.startsWith('regex:')) {
    try {
      return new RegExp(trimmed.slice('regex:'.length), 'i').test(normalizedValue);
    } catch {
      return false;
    }
  }
  const slashRegex = trimmed.match(/^\/(.*)\/([a-z]*)$/i);
  if (slashRegex) {
    try {
      const flags = slashRegex[2].includes('i') ? slashRegex[2] : `${slashRegex[2]}i`;
      return new RegExp(slashRegex[1], flags).test(normalizedValue);
    } catch {
      return false;
    }
  }
  return normalizedValue.toLowerCase().includes(trimmed.toLowerCase());
};

const normalizeBodyPatterns = (bodyPatterns: unknown): { mode: 'all' | 'any'; patterns: string[] } => {
  if (Array.isArray(bodyPatterns)) return { mode: 'all', patterns: bodyPatterns.filter((value): value is string => typeof value === 'string') };
  if (typeof bodyPatterns === 'string') return { mode: 'all', patterns: [bodyPatterns] };
  if (bodyPatterns && typeof bodyPatterns === 'object') {
    const candidate = bodyPatterns as { mode?: unknown; match?: unknown; patterns?: unknown };
    const rawPatterns = Array.isArray(candidate.patterns) ? candidate.patterns : [];
    return {
      mode: candidate.mode === 'any' || candidate.match === 'any' ? 'any' : 'all',
      patterns: rawPatterns.filter((value): value is string => typeof value === 'string')
    };
  }
  return { mode: 'all', patterns: [] };
};

const matchesBodyPatterns = (text: string, bodyPatterns: unknown) => {
  const { mode, patterns } = normalizeBodyPatterns(bodyPatterns);
  if (patterns.length === 0) return true;
  const checks = patterns.map((pattern) => matchesPattern(text, pattern));
  return mode === 'any' ? checks.some(Boolean) : checks.every(Boolean);
};

export const matchesClassificationRule = (input: EmailAutomationInput, rule: EmailClassificationRuleInput) => {
  const subject = normalize(input.subject);
  const text = bodyText(input);
  return matchesPattern(input.from, rule.senderPattern)
    && matchesPattern(subject, rule.subjectPattern)
    && matchesBodyPatterns(text, rule.bodyPatterns);
};

const normalizeClassification = (value: string): EmailClassification['classification'] | null => {
  if (value === 'expense' || value === 'income' || value === 'ignore' || value === 'review') return value;
  return null;
};

const shouldNotify = (policy: string | null | undefined, classification: EmailClassification['classification'], processingState: EmailClassification['processingState']) => {
  switch (policy ?? 'review_and_success') {
    case 'never':
      return false;
    case 'always':
      return true;
    case 'review_only':
      return processingState === 'review';
    case 'success_only':
      return processingState === 'ready';
    case 'review_and_success':
    default:
      return classification !== 'ignore';
  }
};

export const classificationFromRule = (input: EmailAutomationInput, rule: EmailClassificationRuleInput): EmailClassification | null => {
  const classification = normalizeClassification(rule.classification);
  if (!classification) return null;
  const subject = normalize(input.subject);
  const text = `${subject} ${bodyText(input)}`;
  const externalRef = extractReference(text);
  const amountMinor = extractAmount(text);
  const handlerKey = rule.handlerKey ?? undefined;
  const matchedRuleName = rule.name;
  const notifyPolicy = rule.notifyPolicy ?? 'review_and_success';

  if (classification === 'ignore') {
    return {
      classification,
      subtype: rule.subtype,
      processingState: 'ignored',
      externalRef,
      amountMinor,
      currency: amountMinor ? 'THB' : undefined,
      notify: shouldNotify(notifyPolicy, classification, 'ignored'),
      handlerKey,
      ledgerDefaults: rule.ledgerDefaults,
      notifyPolicy,
      matchedRuleName
    };
  }

  if (classification === 'review') {
    return {
      classification,
      subtype: rule.subtype,
      processingState: 'review',
      reviewReason: `Matched email classification rule: ${rule.name}.`,
      externalRef,
      amountMinor,
      currency: amountMinor ? 'THB' : undefined,
      notify: shouldNotify(notifyPolicy, classification, 'review'),
      handlerKey,
      ledgerDefaults: rule.ledgerDefaults,
      notifyPolicy,
      matchedRuleName
    };
  }

  const missing = [externalRef === undefined ? 'transaction reference' : null, amountMinor === undefined ? 'amount' : null].filter(Boolean);
  const processingState = missing.length > 0 ? 'review' : 'ready';
  return {
    classification,
    subtype: rule.subtype,
    processingState,
    reviewReason: missing.length > 0 ? `Rule ${rule.name} matched, but its ${missing.join(' and ')} could not be extracted.` : undefined,
    externalRef,
    amountMinor,
    currency: amountMinor === undefined ? undefined : 'THB',
    notify: shouldNotify(notifyPolicy, classification, processingState),
    handlerKey,
    ledgerDefaults: rule.ledgerDefaults,
    notifyPolicy,
    matchedRuleName
  };
};

/**
 * Built-in fallback classifier.
 *
 * DEPRECATION INTENTION: The specific matchers below (bill payment, other-bank
 * transfer, PromptPay success, approved shadow, K SHOP settlement failure,
 * merchant fee failure, security/admin, statement/e-document) are now mirrored
 * as DB rules in migration `drizzle/0005_email_classification_rules_dummy_input.sql`
 * (see `seed-rules.ts`). DB rules run first, so these matchers are effectively
 * dead code once the seeded rules are applied and proven. The plan is to remove
 * the duplicated matchers from here and keep ONLY the final `unrecognized_*`
 * catch-all fallback, so all editable classification logic lives in the DB.
 */
const builtInClassify = (input: EmailAutomationInput): EmailClassification => {
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

export const classifyEmail = (input: EmailAutomationInput, rules: EmailClassificationRuleInput[] = []): EmailClassification => {
  for (const rule of rules) {
    if (!matchesClassificationRule(input, rule)) continue;
    const classification = classificationFromRule(input, rule);
    if (classification) return classification;
  }
  return builtInClassify(input);
};

export const shouldCreateLedgerExpense = (classification: EmailClassification) => classification.classification === 'expense'
  && classification.handlerKey === 'company_ledger_expense'
  && classification.processingState === 'ready'
  && classification.amountMinor !== undefined;

export const createEmailAutomationHash = (input: EmailAutomationInput) => createHash('sha256')
  .update([input.messageId?.trim() || '', normalize(input.from).toLowerCase(), normalize(input.to).toLowerCase(), normalize(input.subject), normalize(input.textBody ?? input.htmlBody ?? '')].join('\n'))
  .digest('hex');
