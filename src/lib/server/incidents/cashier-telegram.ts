import { createTelegramDestinationPublisher } from '$lib/server/alerts/destinations';
import type { AlertPublishPayload, AlertPublisher } from '$lib/server/alerts/types';
import type { ReceiptAutomationResult } from '$lib/receipts/automations/types';
import type { ReceiptValidationFinding } from '$lib/receipts/validation/types';
import { getSiteBaseUrl } from './urls';

export const CASHIER_ALERT_DESTINATION = 'cashier_receipt_alerts' as const;

export type CashierIssueKind =
  | 'missing_customer'
  | 'invalid_flexi'
  | 'insufficient_flexi_balance'
  | 'one_hour_not_converted'
  | 'notion_usage_update_failed';

export type CashierFlexiArea = 'Entrance' | 'Checkout';

export interface CashierAlertIssueDetails {
  flexiAreas?: CashierFlexiArea[];
  durationMinutes?: number;
  thresholdMinutes?: number;
}

export interface CashierAlertCandidate {
  receiptNumber: string;
  kind: CashierIssueKind;
  details?: CashierAlertIssueDetails;
}

export interface CashierTelegramAlertInput {
  receiptNumber: string;
  receiptUrl?: string | null;
  issues: CashierAlertCandidate[];
}

export interface CollectCashierAlertCandidatesInput {
  receiptNumber: string;
  receiptType?: string | null;
  cancelledAt?: string | null;
  validationFindings?: readonly ReceiptValidationFinding[];
  automationResults?: readonly ReceiptAutomationResult[];
}

const CASHIER_ISSUE_ORDER: CashierIssueKind[] = [
  'missing_customer',
  'invalid_flexi',
  'insufficient_flexi_balance',
  'one_hour_not_converted',
  'notion_usage_update_failed'
];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const getString = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() ? value.trim() : null;

const getFiniteNumber = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

const getReceiptNumber = (explicit: string | undefined, details?: Record<string, unknown>): string | null =>
  getString(explicit) ?? getString(details?.receiptNumber);

const getReason = (details?: Record<string, unknown>): string | null => getString(details?.reason);

const getFlexiArea = (code: string): CashierFlexiArea | null => {
  if (code.includes('CHECKIN') || code.includes('ENTRANCE')) return 'Entrance';
  if (code.includes('CHECKOUT') || code.includes('USAGE')) return 'Checkout';
  return null;
};

const issueDetailsFrom = (
  details: Record<string, unknown> | undefined,
  code: string
): CashierAlertIssueDetails | undefined => {
  const area = getFlexiArea(code);
  const durationMinutes = getFiniteNumber(details?.durationMinutes);
  const thresholdMinutes = getFiniteNumber(details?.thresholdMinutes);
  const result: CashierAlertIssueDetails = {};

  if (area) result.flexiAreas = [area];
  if (durationMinutes !== null && durationMinutes >= 0) result.durationMinutes = durationMinutes;
  if (thresholdMinutes !== null && thresholdMinutes > 0) result.thresholdMinutes = thresholdMinutes;

  return Object.keys(result).length ? result : undefined;
};

const candidate = (
  kind: CashierIssueKind,
  receiptNumber: string | null,
  details?: CashierAlertIssueDetails
): CashierAlertCandidate | null => {
  if (!receiptNumber) return null;
  return {
    receiptNumber,
    kind,
    ...(details ? { details } : {})
  };
};

/** Maps validation codes to the small set of issues a cashier can act on. */
export const normalizeCashierValidationFinding = (
  finding: ReceiptValidationFinding,
  receiptNumber?: string
): CashierAlertCandidate | null => {
  const details = isRecord(finding.details) ? finding.details : undefined;
  const resolvedReceiptNumber = getReceiptNumber(receiptNumber, details);
  const reason = getReason(details);

  if (finding.code === 'RECEIPT_CLOSED_WITHOUT_CUSTOMER') {
    return candidate('missing_customer', resolvedReceiptNumber);
  }

  if (finding.code === 'ONE_HOUR_NOT_CONVERTED') {
    return candidate('one_hour_not_converted', resolvedReceiptNumber, issueDetailsFrom(details, finding.code));
  }

  if (
    finding.code === 'FLEXI_CHECKIN_INVALID_VARIANT' ||
    finding.code === 'FLEXI_CHECKOUT_INVALID_VARIANT'
  ) {
    // History diagnostics are intentionally kept in the manager incident only.
    if (reason === 'unknown_checkout_history') return null;
    return candidate('invalid_flexi', resolvedReceiptNumber, issueDetailsFrom(details, finding.code));
  }

  if (
    finding.code === 'FLEXI_CHECKIN_WITHOUT_AVAILABLE_PASS' ||
    finding.code === 'FLEXI_CHECKOUT_WITHOUT_AVAILABLE_PASS'
  ) {
    if (reason === 'unknown_checkout_history') return null;
    if (reason === 'missing_customer') return candidate('missing_customer', resolvedReceiptNumber);
    return candidate(
      'insufficient_flexi_balance',
      resolvedReceiptNumber,
      issueDetailsFrom(details, finding.code)
    );
  }

  // Historical aliases, membership, discounts, and engine failures are manager-only.
  return null;
};

const hasRefundMarker = (values: Array<string | null>): boolean =>
  values.some((value) => value?.toLowerCase().includes('refund'));

/** Maps automation outcomes without exposing automation internals to the cashier renderer. */
export const normalizeCashierAutomationResult = (
  result: ReceiptAutomationResult,
  receiptNumber?: string
): CashierAlertCandidate | null => {
  const details = isRecord(result.details) ? result.details : undefined;
  const incidentCode = getString(details?.incidentCode);
  const reason = getReason(details);
  const resolvedReceiptNumber = getReceiptNumber(receiptNumber, details);

  if (hasRefundMarker([result.code, incidentCode, reason])) return null;
  if (reason === 'unknown_checkout_history') return null;

  if (reason === 'missing_customer') {
    return candidate('missing_customer', resolvedReceiptNumber);
  }

  if (
    incidentCode === 'FLEXI_PASS_USAGE_INVALID_CHECKOUT' ||
    (result.code === 'FLEXI_PASS_USAGE_SKIPPED' && reason === 'invalid_checkout_variant')
  ) {
    return candidate('invalid_flexi', resolvedReceiptNumber, issueDetailsFrom(details, incidentCode ?? result.code));
  }

  if (
    incidentCode === 'FLEXI_PASS_USAGE_NOTION_UPDATE_FAILED' ||
    reason === 'notion_usage_update_failed'
  ) {
    return candidate('notion_usage_update_failed', resolvedReceiptNumber);
  }

  // Missing Notion records, refunds, successful updates, and unrelated automation failures stay manager-only.
  return null;
};

const mergeDetails = (
  first: CashierAlertIssueDetails | undefined,
  second: CashierAlertIssueDetails | undefined
): CashierAlertIssueDetails | undefined => {
  const areas = [...new Set([...(first?.flexiAreas ?? []), ...(second?.flexiAreas ?? [])])];
  const result: CashierAlertIssueDetails = {};

  if (areas.length) {
    result.flexiAreas = CASHIER_ISSUE_ORDER.length
      ? (['Entrance', 'Checkout'] as CashierFlexiArea[]).filter((area) => areas.includes(area))
      : areas;
  }

  const durationMinutes = second?.durationMinutes ?? first?.durationMinutes;
  const thresholdMinutes = second?.thresholdMinutes ?? first?.thresholdMinutes;
  if (durationMinutes !== undefined) result.durationMinutes = durationMinutes;
  if (thresholdMinutes !== undefined) result.thresholdMinutes = thresholdMinutes;

  return Object.keys(result).length ? result : undefined;
};

/** Collapses validation and automation representations of the same cashier issue. */
export const collapseCashierAlertCandidates = (
  candidates: readonly CashierAlertCandidate[]
): CashierAlertCandidate[] => {
  const collapsed = new Map<string, CashierAlertCandidate>();

  for (const item of candidates) {
    const receiptNumber = item.receiptNumber.trim();
    if (!receiptNumber) continue;
    const key = `${receiptNumber}\u0000${item.kind}`;
    const existing = collapsed.get(key);
    if (!existing) {
      collapsed.set(key, { ...item, receiptNumber });
      continue;
    }

    collapsed.set(key, {
      ...existing,
      details: mergeDetails(existing.details, item.details)
    });
  }

  return [...collapsed.values()].sort((a, b) => {
    const receiptOrder = a.receiptNumber.localeCompare(b.receiptNumber);
    if (receiptOrder !== 0) return receiptOrder;
    return CASHIER_ISSUE_ORDER.indexOf(a.kind) - CASHIER_ISSUE_ORDER.indexOf(b.kind);
  });
};

/** Collects and deduplicates only cashier-actionable outcomes from both processing stages. */
export const collectCashierAlertCandidates = (
  input: CollectCashierAlertCandidatesInput
): CashierAlertCandidate[] => {
  if (input.receiptType?.toUpperCase() === 'REFUND' || input.cancelledAt) return [];

  const candidates = [
    ...(input.validationFindings ?? []).map((finding) =>
      normalizeCashierValidationFinding(finding, input.receiptNumber)
    ),
    ...(input.automationResults ?? []).map((result) =>
      normalizeCashierAutomationResult(result, input.receiptNumber)
    )
  ].filter((item): item is CashierAlertCandidate => item !== null);

  return collapseCashierAlertCandidates(candidates);
};

export const buildCashierReceiptUrl = (receiptNumber: string): string | null => {
  const base = getSiteBaseUrl();
  const normalizedReceiptNumber = receiptNumber.trim();
  if (!base || !normalizedReceiptNumber) return null;
  return `${base}/tools/receipts/${encodeURIComponent(normalizedReceiptNumber)}`;
};

const escapeHtml = (value: string): string =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

const isStaffSafeReceiptUrl = (value: string | null | undefined): value is string => {
  if (!value) return false;
  try {
    const url = new URL(value);
    return (url.protocol === 'http:' || url.protocol === 'https:') &&
      url.pathname.startsWith('/tools/receipts/');
  } catch {
    return false;
  }
};

const formatNumber = (value: number): string =>
  Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, '');

const flexiLabel = (areas: CashierFlexiArea[] | undefined): string => {
  if (areas?.length === 1) return `Flexi ${areas[0]}`;
  return 'Flexi Entrance/Checkout';
};

const renderIssue = (issue: CashierAlertCandidate): string => {
  switch (issue.kind) {
    case 'missing_customer':
      return 'Attach the customer to this receipt when possible. A customer is needed to finish the membership and pass checks. If you cannot edit it, send the customer name to a manager. No automatic pass usage was changed.';
    case 'invalid_flexi':
      return `Correct the ${flexiLabel(issue.details?.flexiAreas)} selection. For Entrance, choose the correct 1 to 5 kid option; for Checkout, choose one option for the total holes used and keep quantity at 1. Do not guess the child count or use elapsed time. The pass usage was not updated.`;
    case 'insufficient_flexi_balance':
      return 'Check the customer\'s Flexi balance before continuing. The selected visit is not covered by a usable balance. Stop and ask a manager rather than guessing or punching another pass.';
    case 'one_hour_not_converted': {
      const duration = issue.details?.durationMinutes;
      const durationText = duration !== undefined ? ` It shows ${formatNumber(duration)} minutes.` : '';
      return `Check the 1-hour play ticket. It ran longer than 75 minutes without a day-pass conversion being shown.${durationText} If the family stayed, add or correct the conversion. If the time looks wrong, tell a manager.`;
    }
    case 'notion_usage_update_failed':
      return 'Please do not punch the Flexi pass again for this receipt. The pass usage could not be updated safely. Send the receipt number to a manager so it can be corrected once.';
  }
};

/** Renders a cashier-only alert. It deliberately has no fallback to the manager incident renderer. */
export const buildCashierAlertPayload = (
  input: CashierTelegramAlertInput
): AlertPublishPayload => {
  const issues = collapseCashierAlertCandidates(input.issues);
  const receiptNumber = input.receiptNumber.trim() || 'unknown';
  const safeReceiptUrl = isStaffSafeReceiptUrl(input.receiptUrl) ? input.receiptUrl : null;
  const body = [
    `<b>Please check receipt <code>${escapeHtml(receiptNumber)}</code></b>`,
    ...issues.map((issue) => `• ${escapeHtml(renderIssue(issue))}`),
    safeReceiptUrl ? `🔎 <a href="${escapeHtml(safeReceiptUrl)}">Open receipt</a>` : null
  ]
    .filter((line): line is string => Boolean(line))
    .join('\n\n');

  return {
    title: '⚠️ Cashier action needed',
    body,
    parseMode: 'HTML'
  };
};

export const renderCashierTelegramAlert = buildCashierAlertPayload;

export const createCashierAlertPublisher = (): AlertPublisher | null =>
  createTelegramDestinationPublisher(CASHIER_ALERT_DESTINATION);

/** Publishes only to the dedicated cashier destination. Missing configuration is a no-op, never a fallback. */
export const publishCashierReceiptAlert = async (
  input: CashierTelegramAlertInput,
  publisher?: AlertPublisher | null
): Promise<boolean> => {
  const issues = collapseCashierAlertCandidates(input.issues);
  if (!issues.length) return false;

  const resolvedPublisher = publisher === undefined ? createCashierAlertPublisher() : publisher;
  if (!resolvedPublisher) return false;

  await resolvedPublisher.publish(buildCashierAlertPayload({ ...input, issues }));
  return true;
};

export const normalizeCashierValidationIssue = normalizeCashierValidationFinding;
export const normalizeCashierAutomationIssue = normalizeCashierAutomationResult;
export const dedupeCashierAlertCandidates = collapseCashierAlertCandidates;
