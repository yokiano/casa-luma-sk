import { timingSafeEqual } from 'node:crypto';

export type FinancialReminderSummary = {
  asOf: string;
  setup?: { hasOpeningBalances?: boolean; missingOpeningAccounts?: string[] };
  expected?: { totalCashAndBankThb?: number | null };
  actual?: {
    comparableTotalThb?: number | null;
    missingAccounts?: string[];
    snapshots?: Array<{
      accountName: string;
      balanceThb: number;
      varianceThb?: number | null;
      stale?: boolean;
      observedAt?: string;
    }>;
  };
  difference?: { totalThb?: number | null; status?: string };
  error?: string | null;
};

const partsForBangkokDate = (date: Date) => Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Bangkok',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
}).formatToParts(date).map((part) => [part.type, part.value]));

export const bangkokDateKey = (date = new Date()) => {
  const parts = partsForBangkokDate(date);
  return `${parts.year}-${parts.month}-${parts.day}`;
};

export const isCronAuthorized = (authorizationHeader: string | null, secret: string | undefined) => {
  if (!secret?.trim() || !authorizationHeader) return false;
  const expected = Buffer.from(`Bearer ${secret.trim()}`);
  const actual = Buffer.from(authorizationHeader);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
};

const escapeHtml = (value: string) => value
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

const money = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 });
const formatMoney = (value: number | null | undefined) => value === null || value === undefined ? '—' : money.format(value);
const formatSignedMoney = (value: number | null | undefined) => value === null || value === undefined ? '—' : `${value > 0 ? '+' : ''}${money.format(value)}`;

export const financialReminderNextAction = (summary: FinancialReminderSummary) => {
  if (!summary.setup?.hasOpeningBalances) return 'Establish reviewed KBank and Safe / Cash on hand baselines in Notion.';
  if (summary.actual?.missingAccounts?.length) return `Submit observed balances for ${summary.actual.missingAccounts.join(' and ')}.`;
  if (summary.difference?.status === 'stale') return 'Refresh the KBank balance and full safe count before investigating variance.';
  if (summary.difference?.status === 'attention') return 'Review Financial Ledger expenses, fees, deposits, and the per-account variance.';
  return 'No variance above the current tolerance. Review and accept snapshots in Notion when appropriate.';
};

export const renderFinancialBalanceReminder = (
  summary: FinancialReminderSummary,
  options: { localDate: string; reconciliationUrl: string; submitUrl: string }
) => {
  const status = summary.difference?.status?.replaceAll('_', ' ').toUpperCase() ?? 'UNKNOWN';
  const snapshots = summary.actual?.snapshots ?? [];
  const accountLines = snapshots.length
    ? snapshots.map((snapshot) => `• <b>${escapeHtml(snapshot.accountName)}</b>: ${formatMoney(snapshot.balanceThb)} · variance ${formatSignedMoney(snapshot.varianceThb)}${snapshot.stale ? ' · STALE' : ''}`).join('\n')
    : '• No comparable observed snapshots yet.';
  const warning = summary.error ? `\n⚠️ ${escapeHtml(summary.error)}` : '';

  return [
    `🔔 <b>Financials daily balance reminder · ${escapeHtml(options.localDate)}</b>`,
    `Status: <b>${escapeHtml(status)}</b>`,
    `Expected now: <b>${formatMoney(summary.expected?.totalCashAndBankThb)}</b>`,
    `Latest observed: <b>${formatMoney(summary.actual?.comparableTotalThb)}</b>`,
    `Time-aligned variance: <b>${formatSignedMoney(summary.difference?.totalThb)}</b>`,
    '',
    accountLines,
    '',
    `<b>Next action:</b> ${escapeHtml(financialReminderNextAction(summary))}`,
    `<a href="${escapeHtml(options.submitUrl)}">Submit balances</a> · <a href="${escapeHtml(options.reconciliationUrl)}">Open reconciliation</a>`,
    'Submitted snapshots are Observed / Needs Review. They are evidence for review, not verified baselines.',
    warning
  ].filter(Boolean).join('\n');
};
