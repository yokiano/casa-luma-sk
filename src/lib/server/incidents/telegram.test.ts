import { describe, expect, it } from 'vitest';
import { buildIncidentAlertPayload } from './telegram';

describe('incident telegram payload formatter', () => {
  it('formats validation incidents with concise failed checks list', () => {
    const payload = buildIncidentAlertPayload({
      source: 'receipt-webhook',
      code: 'RECEIPT_WEBHOOK_VALIDATION_RULES_FAILED',
      severity: 'critical',
      message: 'fallback message',
      merchantId: 'merchant-1',
      receiptKey: 'merchant-1:R-1',
      context: {
        receiptNumber: 'R-1',
        failedChecks: ['DISCOUNT_100_PRESENT', 'FORCED_TEST_FAILURE']
      }
    });

    expect(payload.parseMode).toBe('HTML');
    expect(payload.body).toContain('Receipt processed, but one or more validation checks failed.');
    expect(payload.body).toContain('<b>Failed checks</b>');
    expect(payload.body).toContain('DISCOUNT_100_PRESENT');
    expect(payload.body).not.toContain('Merchant:');
    expect(payload.body).not.toContain('Receipt key:');
  });

  it('falls back to incident message when code summary is unknown', () => {
    const payload = buildIncidentAlertPayload({
      source: 'other-system',
      code: 'UNKNOWN_CODE',
      severity: 'critical',
      message: 'Custom fallback summary'
    });

    expect(payload.body).toContain('Custom fallback summary');
  });

  it('uses dedicated summary for invalid JSON incidents', () => {
    const payload = buildIncidentAlertPayload({
      source: 'receipt-webhook',
      code: 'RECEIPT_WEBHOOK_INVALID_JSON',
      severity: 'warning',
      message: 'fallback message'
    });

    expect(payload.body).toContain('Webhook body is not valid JSON and could not be parsed.');
  });
});
