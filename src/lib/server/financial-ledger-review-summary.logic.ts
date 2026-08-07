import { timingSafeEqual } from 'node:crypto';

const HOUR_MS = 60 * 60 * 1000;

export type FinancialLedgerReviewSummaryRow = {
  receivedAt: Date | string;
  analysisProvenance: unknown;
  reason?: string | null;
};

export type FinancialLedgerReviewSummary = {
  localDate: string;
  asOf: string;
  count: number;
  oldestAt: string | null;
  oldestAgeHours: number | null;
  missingFields: {
    category: number;
    invoiceReceipt: number;
  };
};

const bangkokParts = (date: Date) => Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Bangkok',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
}).formatToParts(date).map((part) => [part.type, part.value]));

export const bangkokDateKey = (date = new Date()) => {
  const parts = bangkokParts(date);
  return `${parts.year}-${parts.month}-${parts.day}`;
};

/** Bangkok has no DST, so this gives the UTC instant at local midnight. */
export const bangkokStartOfDate = (date = new Date()) => {
  const localDate = bangkokDateKey(date);
  return new Date(`${localDate}T00:00:00.000+07:00`);
};

export const isCronAuthorized = (authorizationHeader: string | null, secret: string | undefined) => {
  if (!secret?.trim() || !authorizationHeader) return false;
  const expected = Buffer.from(`Bearer ${secret.trim()}`);
  const actual = Buffer.from(authorizationHeader);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
};

const safeObject = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};

const missingFieldsFromRow = (row: FinancialLedgerReviewSummaryRow): Array<'category' | 'invoiceReceipt'> => {
  const provenance = safeObject(row.analysisProvenance);
  const fields = provenance.missingFields;
  if (Array.isArray(fields)) {
    const known = fields.filter((field): field is 'category' | 'invoiceReceipt' => field === 'category' || field === 'invoiceReceipt');
    if (known.length) return known;
  }

  // Older C rows may only retain the human-readable reason. Keep those rows
  // visible in the breakdown without changing the C review-state contract.
  const reason = row.reason ?? '';
  return [
    /category/i.test(reason) ? 'category' : null,
    /invoice\s*\/\s*receipt|receipt\s+required/i.test(reason) ? 'invoiceReceipt' : null
  ].filter((field): field is 'category' | 'invoiceReceipt' => field !== null);
};

const toDate = (value: Date | string) => value instanceof Date ? value : new Date(value);

export const summarizeFinancialLedgerReviews = (
  rows: readonly FinancialLedgerReviewSummaryRow[],
  now = new Date()
): FinancialLedgerReviewSummary => {
  const openRows = rows
    .map((row) => ({ ...row, received: toDate(row.receivedAt) }))
    .filter((row) => Number.isFinite(row.received.getTime()))
    .sort((a, b) => a.received.getTime() - b.received.getTime());
  const oldest = openRows[0]?.received;
  const missingFields = openRows.reduce((counts, row) => {
    for (const field of missingFieldsFromRow(row)) counts[field] += 1;
    return counts;
  }, { category: 0, invoiceReceipt: 0 });

  return {
    localDate: bangkokDateKey(now),
    asOf: now.toISOString(),
    count: openRows.length,
    oldestAt: oldest?.toISOString() ?? null,
    oldestAgeHours: oldest ? Math.max(0, Math.floor((now.getTime() - oldest.getTime()) / HOUR_MS)) : null,
    missingFields
  };
};

export const formatReviewAge = (hours: number | null) => {
  if (hours === null) return '—';
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return remainingHours ? `${days}d ${remainingHours}h` : `${days}d`;
};

const escapeHtml = (value: string) => value
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

export const renderFinancialLedgerReviewSummary = (
  summary: FinancialLedgerReviewSummary,
  managementUrl: string
) => [
  `🧾 <b>Financial Ledger review summary · ${escapeHtml(summary.localDate)}</b>`,
  `Open recorded transactions: <b>${summary.count}</b>`,
  `Oldest age: <b>${escapeHtml(formatReviewAge(summary.oldestAgeHours))}</b>`,
  `Missing: Category ${summary.missingFields.category} · Invoice / Receipt ${summary.missingFields.invoiceReceipt}`,
  `<a href="${escapeHtml(managementUrl)}">Open Financial Ledger reviews</a>`
].join('\n');
