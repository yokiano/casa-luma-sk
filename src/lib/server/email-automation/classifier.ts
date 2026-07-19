import { createHash } from 'node:crypto';
import { extractMemo, extractTransactionReference } from '$lib/expense-scan/parsers/kbank-parser-utils';
import { mimeReviewReason, requiresMimeReview, type BodyExtractionMetadata, type MimeMetadata } from './mime-contract';

export type EmailAutomationInput = {
  receivedAt: string;
  from: string;
  to: string;
  subject: string;
  messageId?: string;
  attachmentCount: number;
  textBody?: string;
  htmlBody?: string;
  /** Primary body selected by the MIME parser; legacy text/html fields remain rollout fallbacks. */
  extractedBody?: string;
  extractedBodySource?: 'text' | 'html' | 'html-fallback' | null;
  extractedBodyTruncated?: boolean;
  bodyExtractionMetadata?: BodyExtractionMetadata;
  /** Parser completeness is transport evidence, not a classification rule. */
  mime?: MimeMetadata;
};

export type EmailClassification = {
  classification: 'expense' | 'income' | 'ignore' | 'review';
  subtype: string;
  processingState: 'ready' | 'review' | 'ignored';
  reviewReason?: string;
  /** K BIZ Memo/Your Note value used as the Financial Ledger description. */
  description?: string;
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
  id?: number;
  priority?: number;
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

export type EmailClassifierDiagnostics = {
  classifierVersion: '1';
  selectedSource: 'ignored_sender_list' | 'database_rule' | 'built_in_fallback';
  selectedRuleId: number | null;
  selectedRuleName: string | null;
  evaluatedRules: Array<{
    id: number | null;
    priority: number | null;
    name: string;
    classification: string;
    subtype: string;
    patterns: {
      senderPattern: string | null;
      subjectPattern: string | null;
      bodyPatterns: unknown;
    };
    patternMatched: boolean;
    usable: boolean;
  }>;
  final: {
    classification: EmailClassification['classification'];
    subtype: string;
    processingState: EmailClassification['processingState'];
    reviewReason: string | null;
  };
};

export const normalize = (value: string) => value.replace(/\s+/g, ' ').trim();

export const extractSenderEmail = (from: string) => {
  const angle = from.match(/<([^>]+)>/);
  const candidate = (angle?.[1] ?? from).trim().toLowerCase();
  return candidate.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i)?.[0]?.toLowerCase() ?? candidate;
};

export const matchesIgnoredSender = (input: EmailAutomationInput, ignoredSenders: string[]) => {
  const sender = extractSenderEmail(input.from);
  return ignoredSenders.some((entry) => extractSenderEmail(entry) === sender);
};

export const bodyText = (input: EmailAutomationInput) => normalize(input.extractedBody ?? `${input.textBody ?? ''} ${input.htmlBody ?? ''}`);

export const extractReference = (text: string) => extractTransactionReference(text) ?? undefined;

export const extractDescription = (text: string) => {
  const value = extractMemo(text)?.trim();
  return value ? value.slice(0, 240) : undefined;
};

export const extractAmount = (text: string) => {
  const match = text.match(/(?:amount|total)(?:\s*\([^)]*\))?\s*[:=]?\s*(?:THB|฿)?\s*([\d,]+(?:\.\d{1,2})?)/i) ?? text.match(/(?:THB|฿)\s*[:=]?\s*([\d,]+(?:\.\d{1,2})?)/i);
  if (!match) return undefined;
  const amount = Number(match[1].replace(/,/g, ''));
  return Number.isFinite(amount) ? Math.round(amount * 100) : undefined;
};

const successfulExpense = (subtype: string, externalRef: string | undefined, amountMinor: number | undefined, description: string | undefined): EmailClassification => {
  const missing = [externalRef === undefined ? 'transaction reference' : null, amountMinor === undefined ? 'amount' : null].filter(Boolean);
  return {
    classification: 'expense',
    subtype,
    processingState: missing.length > 0 ? 'review' : 'ready',
    reviewReason: missing.length > 0 ? `A success email was matched, but its ${missing.join(' and ')} could not be extracted.` : undefined,
    description,
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
  const description = extractDescription(text);
  const handlerKey = rule.handlerKey ?? undefined;
  const matchedRuleName = rule.name;
  const notifyPolicy = rule.notifyPolicy ?? 'review_and_success';

  if (classification === 'ignore') {
    return {
      classification,
      subtype: rule.subtype,
      processingState: 'ignored',
      description,
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
      description,
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
    description,
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
  const description = extractDescription(text);
  const isKbiz = /k\s*biz|kasikorn|kbank/i.test(`${input.from} ${text}`);

  if (/^status .*\(approved\)/i.test(subject)) {
    return { classification: 'ignore', subtype: 'approved_shadow', processingState: 'ignored', description, externalRef, amountMinor, currency: amountMinor ? 'THB' : undefined, notify: false };
  }
  if (/result of bill payment\/top-up \(success\)/i.test(subject)) {
    return successfulExpense('bill_payment_success', externalRef, amountMinor, description);
  }
  if (/result of other account funds transfer \(other bank\) \(success\)/i.test(subject)) {
    return successfulExpense('other_bank_transfer_success', externalRef, amountMinor, description);
  }
  if (/result of promptpay funds transfer \(success\)/i.test(subject)) {
    return successfulExpense('promptpay_transfer_success', externalRef, amountMinor, description);
  }
  if (/could not be deposited|deposit.*failed/i.test(text) && /k\s*shop/i.test(text)) {
    return { classification: 'review', subtype: 'kshop_settlement_failed', processingState: 'review', reviewReason: 'K SHOP settlement was not deposited.', description, notify: true };
  }
  if (/fee.*(?:failed|unsuccessful)|(?:failed|unsuccessful).*fee/i.test(text) && /merchant/i.test(text)) {
    return { classification: 'review', subtype: 'merchant_fee_failed', processingState: 'review', reviewReason: 'Merchant fee payment was not confirmed.', description, notify: true };
  }
  if (/otp|login|sign.?in|email address change|terms of service/i.test(text)) {
    return { classification: 'ignore', subtype: 'security_or_admin', processingState: 'ignored', description, notify: false };
  }
  if (/statement|e-document|subscription renewal/i.test(text)) {
    return { classification: 'review', subtype: 'statement_or_attachment', processingState: 'review', reviewReason: 'This email needs a person to decide whether it is actionable.', description, notify: true };
  }
  return {
    classification: 'review',
    subtype: isKbiz ? 'unrecognized_kbiz' : 'unrecognized_email',
    processingState: 'review',
    reviewReason: 'No safe automatic classification matched this email.',
    description,
    notify: true
  };
};

export const classifyEmailWithDiagnostics = (
  input: EmailAutomationInput,
  rules: EmailClassificationRuleInput[] = [],
  ignoredSenders: string[] = []
): { classification: EmailClassification; diagnostics: EmailClassifierDiagnostics } => {
  const ignoredSenderMatched = matchesIgnoredSender(input, ignoredSenders);
  const ignoredSenderEvaluation = ignoredSenders.length > 0 ? [{
    id: null,
    priority: 0,
    name: 'Ignored sender list',
    classification: 'ignore',
    subtype: 'ignored_sender',
    patterns: { senderPattern: 'configured dashboard sender list', subjectPattern: null, bodyPatterns: [] },
    patternMatched: ignoredSenderMatched,
    usable: ignoredSenderMatched
  }] : [];
  const evaluatedRules = [...ignoredSenderEvaluation, ...rules.map((rule) => {
    const patternMatched = matchesClassificationRule(input, rule);
    const usable = patternMatched && classificationFromRule(input, rule) !== null;
    return {
      id: rule.id ?? null,
      priority: rule.priority ?? null,
      name: rule.name,
      classification: rule.classification,
      subtype: rule.subtype,
      patterns: { senderPattern: rule.senderPattern ?? null, subjectPattern: rule.subjectPattern ?? null, bodyPatterns: rule.bodyPatterns ?? [] },
      patternMatched,
      usable
    };
  })];

  let result: EmailClassification | undefined;
  let selectedRule: EmailClassificationRuleInput | undefined;
  if (ignoredSenderMatched) {
    // This settings-backed rule runs before DB rules so an operator can quiet a
    // trusted sender without creating a broad or easily misordered DB rule.
    result = {
      classification: 'ignore',
      subtype: 'ignored_sender',
      processingState: 'ignored',
      reviewReason: 'Sender matched the dashboard ignored-sender list.',
      notify: false,
      handlerKey: 'none',
      notifyPolicy: 'never',
      matchedRuleName: 'Ignored sender list'
    };
  }
  for (const rule of ignoredSenderMatched ? [] : rules) {
    if (!matchesClassificationRule(input, rule)) continue;
    const classification = classificationFromRule(input, rule);
    if (classification) {
      result = classification;
      selectedRule = rule;
      break;
    }
  }
  result ??= builtInClassify(input);
  // A partial MIME representation must never be sufficient evidence for a financial action.
  const finalClassification = result.processingState === 'ready' && requiresMimeReview(input)
    ? { ...result, processingState: 'review' as const, reviewReason: mimeReviewReason(input), notify: true }
    : result;

  return {
    classification: finalClassification,
    diagnostics: {
      classifierVersion: '1',
      selectedSource: ignoredSenderMatched ? 'ignored_sender_list' : selectedRule ? 'database_rule' : 'built_in_fallback',
      selectedRuleId: selectedRule?.id ?? null,
      selectedRuleName: ignoredSenderMatched ? 'Ignored sender list' : selectedRule?.name ?? null,
      evaluatedRules,
      final: {
        classification: finalClassification.classification,
        subtype: finalClassification.subtype,
        processingState: finalClassification.processingState,
        reviewReason: finalClassification.reviewReason ?? null
      }
    }
  };
};

export const classifyEmail = (input: EmailAutomationInput, rules: EmailClassificationRuleInput[] = [], ignoredSenders: string[] = []): EmailClassification =>
  classifyEmailWithDiagnostics(input, rules, ignoredSenders).classification;

export const shouldCreateLedgerExpense = (classification: EmailClassification) => classification.classification === 'expense'
  && classification.handlerKey === 'company_ledger_expense'
  && classification.processingState === 'ready'
  && classification.amountMinor !== undefined;

export const createEmailAutomationHash = (input: EmailAutomationInput) => createHash('sha256')
  // Message-ID is stable across parser improvements. Only legacy messages
  // without one use extracted body text as fallback entropy.
  .update(input.messageId?.trim()
    ? `message-id\n${input.messageId.trim().toLowerCase()}`
    : ['fallback', normalize(input.from).toLowerCase(), normalize(input.to).toLowerCase(), normalize(input.subject), bodyText(input)].join('\n'))
  .digest('hex');

export const createExtractedBodyHash = (input: EmailAutomationInput) => createHash('sha256')
  .update(bodyText(input))
  .digest('hex');
