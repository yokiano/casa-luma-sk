import type { AlertPublishPayload } from '$lib/server/alerts/types';
import type { ReportIncidentInput } from './types';

const INCIDENT_SUMMARY_BY_CODE: Record<string, string> = {
  RECEIPT_WEBHOOK_VALIDATION_RULES_FAILED:
    'Receipt processed, but one or more validation checks failed.',
  RECEIPT_WEBHOOK_VALIDATION_ENGINE_ERROR:
    'Validation engine failed while executing one of the rules.',
  RECEIPT_WEBHOOK_PROCESSING_FAILED: 'Receipt webhook processing crashed before completion.',
  RECEIPT_WEBHOOK_INVALID_JSON: 'Webhook body is not valid JSON and could not be parsed.',
  RECEIPT_WEBHOOK_INVALID_PAYLOAD_SHAPE: 'Webhook payload shape did not match expected format.',
  RECEIPT_WEBHOOK_NO_VALID_RECEIPTS: 'Webhook batch had no valid receipts to process.'
};

const escapeHtml = (value: string): string => {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
};

const toPrintableValue = (value: unknown): string => {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  try {
    return JSON.stringify(value);
  } catch {
    return '[unserializable]';
  }
};

export const buildIncidentAlertPayload = (input: ReportIncidentInput): AlertPublishPayload => {
  const failedChecks = Array.isArray(input.context?.failedChecks)
    ? input.context.failedChecks
        .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
        .slice(0, 10)
    : [];
  const summary = INCIDENT_SUMMARY_BY_CODE[input.code] ?? input.message;
  const reportUrl = typeof input.context?.reportUrl === 'string' ? input.context.reportUrl : null;
  const receiptNumber = typeof input.context?.receiptNumber === 'string' ? input.context.receiptNumber : null;
  const contextEntries = Object.entries(input.context ?? {})
    .filter(([key, value]) => !['failedChecks', 'reportUrl', 'receiptNumber'].includes(key) && value !== undefined)
    .slice(0, 4)
    .map(([key, value]) => `• <code>${escapeHtml(key)}</code>: ${escapeHtml(toPrintableValue(value))}`);

  const title = `🚨 ${escapeHtml(input.source)} incident`;
  const body = [
    `<b>${escapeHtml(summary)}</b>`,
    `🧷 Code: <b>${escapeHtml(input.code)}</b>`,
    `🔥 Severity: <b>${escapeHtml(input.severity.toUpperCase())}</b>`,
    receiptNumber ? `🧾 Receipt: <code>${escapeHtml(receiptNumber)}</code>` : null,
    failedChecks.length ? ['<b>Failed checks</b>', ...failedChecks.map((code) => `• ${escapeHtml(code)}`)].join('\n') : null,
    contextEntries.length ? ['<b>Context</b>', ...contextEntries].join('\n') : null,
    reportUrl ? `🔎 Report: ${escapeHtml(reportUrl)}` : null
  ]
    .filter((line): line is string => Boolean(line))
    .join('\n');

  return {
    title,
    body,
    parseMode: 'HTML'
  };
};
