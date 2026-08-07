import type { EmailAutomationInput, EmailClassification } from './classifier';
import { parseKShopDailySettlement } from './parsers/kshop';

const LEDGER_HANDLER_KEYS = ['company_ledger_expense', 'financial_ledger_income'] as const;
const LEDGER_HANDLER_CLASSIFICATIONS: Record<typeof LEDGER_HANDLER_KEYS[number], EmailClassification['classification']> = {
  company_ledger_expense: 'expense',
  financial_ledger_income: 'income'
};
const DEFAULT_MAX_AMOUNT_THB = 5_000;

export const LEDGER_AUTOMATION_NOT_ENABLED_REASON = 'Financial Ledger automation is not active. Turn on the dashboard Ledger switch and configure the dashboard sender allowlist before Ledger actions can run.';
export const LEDGER_SENDER_NOT_ALLOWED_REASON = 'Financial Ledger automation blocked this email because its visible sender is not in the explicit allowlist. Review the original email before any manual Ledger entry.';
export const LEDGER_MIME_INCOMPLETE_REASON = 'Financial Ledger automation blocked this email because the parsed MIME content is incomplete or unsupported.';
export const LEDGER_AMOUNT_LIMIT_REASON = 'Financial Ledger automation blocked this email because the amount is above the configured limit.';
export const LEDGER_REQUIRED_FIELDS_REASON = 'Financial Ledger automation blocked this email because the extracted transaction reference, amount, currency, or classification was not complete.';
export const LEDGER_AUTHENTICITY_GAP_WARNING = 'Sender authenticity is not yet verified with SPF/DKIM/DMARC evidence. Production automation relies on a strict visible-sender allowlist plus amount and MIME safeguards until transport authentication is implemented.';

export type LedgerAutomationPolicyStatus = {
  mode: 'active' | 'blocked';
  dashboardLedgerEnabled: boolean;
  senderAllowlistConfigured: boolean;
  senderAllowlistLabels: string[];
  maxAmountThb: number;
  safeguards: string[];
  risks: string[];
  nextAction: string;
};

export type LedgerAutomationPolicyDecision = {
  allowed: boolean;
  reason?: string;
  status: LedgerAutomationPolicyStatus;
};

const normalizeAllowlist = (allowlist: string[]) => Array.from(new Set(allowlist.map((value) => value.trim().toLowerCase()).filter(Boolean)));
const normalizeMaxAmountThb = (value: number) => Number.isFinite(value) && value > 0 ? value : DEFAULT_MAX_AMOUNT_THB;

const extractEmailAddress = (from: string) => {
  const angle = from.match(/<([^>]+)>/);
  const candidate = (angle?.[1] ?? from).trim().toLowerCase();
  const email = candidate.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i)?.[0]?.toLowerCase();
  return email ?? candidate;
};

const senderMatchesAllowlist = (from: string, allowlist: string[]) => {
  const email = extractEmailAddress(from);
  const domain = email.includes('@') ? email.split('@').pop() ?? '' : '';
  return allowlist.some((entry) => {
    const normalized = entry.replace(/^@/, '').toLowerCase();
    if (!normalized) return false;
    if (normalized.includes('@')) return email === normalized;
    return domain === normalized || domain.endsWith(`.${normalized}`);
  });
};

const isKShopIncome = (classification: EmailClassification) => classification.handlerKey === 'financial_ledger_income'
  && classification.classification === 'income'
  && classification.subtype === 'kshop_daily_settlement';

export const isFinancialLedgerHandler = (handlerKey?: string | null): handlerKey is typeof LEDGER_HANDLER_KEYS[number] => Boolean(handlerKey && (LEDGER_HANDLER_KEYS as readonly string[]).includes(handlerKey));
/** Backward-compatible expense-specific predicate for callers that need it. */
export const isCompanyLedgerHandler = (handlerKey?: string | null) => handlerKey === 'company_ledger_expense';
export const financialLedgerHandlerKeys = LEDGER_HANDLER_KEYS;

export const getLedgerAutomationPolicyStatus = (dashboardLedgerEnabled: boolean, senderAllowlist: string[] = [], maxAmountThb = DEFAULT_MAX_AMOUNT_THB): LedgerAutomationPolicyStatus => {
  const allowlist = normalizeAllowlist(senderAllowlist);
  const active = dashboardLedgerEnabled && allowlist.length > 0;
  return {
    mode: active ? 'active' : 'blocked',
    dashboardLedgerEnabled,
    senderAllowlistConfigured: allowlist.length > 0,
    senderAllowlistLabels: allowlist,
    maxAmountThb: normalizeMaxAmountThb(maxAmountThb),
    safeguards: [
      'Dashboard Ledger switch must be on.',
      'Dashboard settings must name exact sender emails or domains allowed for automatic writes.',
      'Each action must use an approved Financial Ledger expense or income handler with a transaction reference, THB amount, complete MIME parse, and amount at or below the dashboard limit.',
      'Handler idempotency uses transaction reference plus amount, and the Ledger writer reconciles only an existing matching reference, amount, and Ledger Type instead of creating a duplicate.',
      'Turning off the dashboard Ledger switch is the emergency circuit breaker.'
    ],
    risks: [LEDGER_AUTHENTICITY_GAP_WARNING, 'Automatic retries run only when the bounded processor is invoked; no scheduler is configured yet.'],
    nextAction: active
      ? 'Automation is active for matching allowed senders. Watch new Financial Ledger records and turn the dashboard Ledger switch off if anything looks wrong.'
      : 'Configure the dashboard sender allowlist and amount limit, then turn on the dashboard Ledger switch.'
  };
};

export const evaluateLedgerAutomationPolicy = (
  input: EmailAutomationInput,
  classification: EmailClassification,
  dashboardLedgerEnabled: boolean,
  senderAllowlist: string[] = [],
  maxAmountThb = DEFAULT_MAX_AMOUNT_THB
): LedgerAutomationPolicyDecision => {
  const allowlist = normalizeAllowlist(senderAllowlist);
  const status = getLedgerAutomationPolicyStatus(dashboardLedgerEnabled, allowlist, maxAmountThb);
  if (!isFinancialLedgerHandler(classification.handlerKey)) return { allowed: true, status };
  const expectedClassification = LEDGER_HANDLER_CLASSIFICATIONS[classification.handlerKey];
  const kShopIncome = isKShopIncome(classification);
  if (classification.processingState !== 'ready' || classification.classification !== expectedClassification || !classification.externalRef || classification.amountMinor === undefined || classification.currency !== 'THB') {
    return { allowed: false, reason: LEDGER_REQUIRED_FIELDS_REASON, status };
  }
  if (!Number.isSafeInteger(classification.amountMinor) || classification.amountMinor <= 0) {
    return { allowed: false, reason: LEDGER_REQUIRED_FIELDS_REASON, status };
  }
  if (input.mime?.completeness !== 'complete') return { allowed: false, reason: LEDGER_MIME_INCOMPLETE_REASON, status };
  if (kShopIncome) {
    const parsed = parseKShopDailySettlement(input);
    if (!parsed.ready || parsed.externalRef !== classification.externalRef || parsed.amountMinor !== classification.amountMinor) {
      return { allowed: false, reason: LEDGER_REQUIRED_FIELDS_REASON, status };
    }
  } else {
    if (!status.dashboardLedgerEnabled || !status.senderAllowlistConfigured) return { allowed: false, reason: LEDGER_AUTOMATION_NOT_ENABLED_REASON, status };
    if (!senderMatchesAllowlist(input.from, allowlist)) return { allowed: false, reason: LEDGER_SENDER_NOT_ALLOWED_REASON, status };
  }
  if (classification.amountMinor > status.maxAmountThb * 100) return { allowed: false, reason: `${LEDGER_AMOUNT_LIMIT_REASON} Limit: ${status.maxAmountThb.toLocaleString('en-US')} THB.`, status };
  return { allowed: true, status };
};

/** Applies the same final policy at intake and in dashboard previews/tests. */
export const applyEmailAutomationSafetyPolicy = (
  input: EmailAutomationInput,
  classification: EmailClassification,
  dashboardLedgerEnabled = false,
  senderAllowlist: string[] = [],
  maxAmountThb = DEFAULT_MAX_AMOUNT_THB
): EmailClassification => {
  if (!isFinancialLedgerHandler(classification.handlerKey) || classification.processingState !== 'ready') return classification;
  const decision = evaluateLedgerAutomationPolicy(input, classification, dashboardLedgerEnabled, senderAllowlist, maxAmountThb);
  if (decision.allowed) return classification;
  return { ...classification, processingState: 'review', reviewReason: decision.reason, notify: true };
};
