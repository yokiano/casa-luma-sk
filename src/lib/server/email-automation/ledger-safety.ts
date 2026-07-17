import type { EmailAutomationInput, EmailClassification } from './classifier';

const LEDGER_HANDLER_KEY = 'company_ledger_expense';
const CANARY_ENV_KEY = 'EMAIL_AUTOMATION_LEDGER_CANARY_ENABLED';
const DEFAULT_MAX_AMOUNT_THB = 5_000;

export const LEDGER_CANARY_NOT_ENABLED_REASON = 'Company Ledger automation is not active. Turn on the dashboard Ledger canary, set EMAIL_AUTOMATION_LEDGER_CANARY_ENABLED=true, and configure the dashboard sender allowlist before Ledger actions can run.';
export const LEDGER_SENDER_NOT_ALLOWED_REASON = 'Company Ledger automation canary blocked this email because its visible sender is not in the explicit allowlist. Review the original email before any manual Ledger entry.';
export const LEDGER_MIME_INCOMPLETE_REASON = 'Company Ledger automation canary blocked this email because the parsed MIME content is incomplete or unsupported.';
export const LEDGER_AMOUNT_LIMIT_REASON = 'Company Ledger automation canary blocked this email because the amount is above the configured canary limit.';
export const LEDGER_REQUIRED_FIELDS_REASON = 'Company Ledger automation canary blocked this email because the extracted transaction reference, amount, currency, or classification was not complete.';
export const LEDGER_AUTHENTICITY_GAP_WARNING = 'Sender authenticity is not yet verified with SPF/DKIM/DMARC evidence. This canary relies on a strict visible-sender allowlist plus amount and MIME safeguards until transport authentication is implemented.';

export type LedgerAutomationPolicyStatus = {
  mode: 'canary' | 'blocked';
  canaryEnvEnabled: boolean;
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

const rawEnv = (key: string) => process.env[key]?.trim() || '';
const envFlag = (key: string) => /^(1|true|yes|on)$/i.test(rawEnv(key));
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

export const isCompanyLedgerHandler = (handlerKey?: string | null) => handlerKey === LEDGER_HANDLER_KEY;

export const getLedgerAutomationPolicyStatus = (dashboardLedgerEnabled: boolean, senderAllowlist: string[] = [], maxAmountThb = DEFAULT_MAX_AMOUNT_THB): LedgerAutomationPolicyStatus => {
  const allowlist = normalizeAllowlist(senderAllowlist);
  const canaryEnvEnabled = envFlag(CANARY_ENV_KEY);
  const active = canaryEnvEnabled && dashboardLedgerEnabled && allowlist.length > 0;
  return {
    mode: active ? 'canary' : 'blocked',
    canaryEnvEnabled,
    dashboardLedgerEnabled,
    senderAllowlistConfigured: allowlist.length > 0,
    senderAllowlistLabels: allowlist,
    maxAmountThb: normalizeMaxAmountThb(maxAmountThb),
    safeguards: [
      'Dashboard Ledger canary switch must be on.',
      `${CANARY_ENV_KEY}=true must be present in the deployment environment.`,
      'Dashboard settings must name exact sender emails or domains allowed for the canary.',
      'Each action must be a Company Ledger expense with a transaction reference, THB amount, complete MIME parse, and amount at or below the dashboard canary limit.',
      'Handler idempotency uses transaction reference plus amount, and the Ledger writer reconciles an existing matching reference instead of creating a duplicate.',
      'Turning off either the dashboard switch or the canary environment flag is the emergency circuit breaker.'
    ],
    risks: [LEDGER_AUTHENTICITY_GAP_WARNING, 'Automatic retries run only when the bounded processor is invoked; no scheduler is configured yet.'],
    nextAction: active
      ? 'Canary is eligible for matching allowed senders. Watch the dashboard after each incoming transaction email and turn the dashboard Ledger switch off if anything looks wrong.'
      : 'Set the canary env flag, configure the dashboard sender allowlist and amount limit, deploy the app, then turn on the dashboard Ledger canary after reviewing the risks.'
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
  if (!isCompanyLedgerHandler(classification.handlerKey)) return { allowed: true, status };
  if (classification.processingState !== 'ready' || classification.classification !== 'expense' || !classification.externalRef || classification.amountMinor === undefined || classification.currency !== 'THB') {
    return { allowed: false, reason: LEDGER_REQUIRED_FIELDS_REASON, status };
  }
  if (input.mime?.completeness !== 'complete') return { allowed: false, reason: LEDGER_MIME_INCOMPLETE_REASON, status };
  if (!status.canaryEnvEnabled || !status.dashboardLedgerEnabled || !status.senderAllowlistConfigured) return { allowed: false, reason: LEDGER_CANARY_NOT_ENABLED_REASON, status };
  if (!senderMatchesAllowlist(input.from, allowlist)) return { allowed: false, reason: LEDGER_SENDER_NOT_ALLOWED_REASON, status };
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
  if (!isCompanyLedgerHandler(classification.handlerKey) || classification.processingState !== 'ready') return classification;
  const decision = evaluateLedgerAutomationPolicy(input, classification, dashboardLedgerEnabled, senderAllowlist, maxAmountThb);
  if (decision.allowed) return classification;
  return { ...classification, processingState: 'review', reviewReason: decision.reason, notify: true };
};
