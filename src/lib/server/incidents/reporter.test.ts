import { describe, expect, it } from 'vitest';
import { shouldNotifyByDefault } from './reporter';

describe('incident notification defaults', () => {
  it('does not notify warning-only receipt validation incidents', () => {
    expect(
      shouldNotifyByDefault('warning', {
        source: 'receipt-webhook',
        code: 'RECEIPT_WEBHOOK_VALIDATION_RULES_FAILED',
        severity: 'warning',
        message: 'warning-only validation'
      })
    ).toBe(false);
  });

  it('keeps critical receipt validation alerts enabled', () => {
    expect(
      shouldNotifyByDefault('critical', {
        source: 'receipt-webhook',
        code: 'RECEIPT_WEBHOOK_VALIDATION_RULES_FAILED',
        severity: 'critical',
        message: 'critical validation'
      })
    ).toBe(true);
  });

  it('honors explicit replay notification suppression', () => {
    expect(
      shouldNotifyByDefault('critical', {
        source: 'receipt-webhook',
        code: 'RECEIPT_WEBHOOK_PROCESSING_FAILED',
        severity: 'critical',
        message: 'replay failure',
        notify: false
      })
    ).toBe(false);
  });
});
