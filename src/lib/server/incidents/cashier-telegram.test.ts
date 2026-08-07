import { describe, expect, it, vi } from 'vitest';
import {
  buildCashierAlertPayload,
  collapseCashierAlertCandidates,
  collectCashierAlertCandidates,
  normalizeCashierAutomationResult,
  normalizeCashierValidationFinding,
  type CashierAlertCandidate
} from './cashier-telegram';

describe('cashier receipt alert normalization', () => {
  it('normalizes equivalent missing-customer and Flexi findings', () => {
    const missingFromValidation = normalizeCashierValidationFinding({
      code: 'FLEXI_CHECKOUT_WITHOUT_AVAILABLE_PASS',
      severity: 'warning',
      message: 'internal message',
      details: { reason: 'missing_customer' }
    }, 'R-1');
    const missingFromAutomation = normalizeCashierAutomationResult({
      code: 'FLEXI_PASS_USAGE_SKIPPED',
      status: 'skipped',
      message: 'internal automation message',
      details: {
        incidentCode: 'FLEXI_PASS_USAGE_MISSING_CUSTOMER',
        reason: 'missing_customer'
      }
    }, 'R-1');
    const invalidFromValidation = normalizeCashierValidationFinding({
      code: 'FLEXI_CHECKOUT_INVALID_VARIANT',
      severity: 'warning',
      message: 'internal message',
      details: { reason: 'invalid_checkout_variant' }
    }, 'R-1');
    const invalidFromAutomation = normalizeCashierAutomationResult({
      code: 'FLEXI_PASS_USAGE_SKIPPED',
      status: 'skipped',
      message: 'internal automation message',
      details: {
        incidentCode: 'FLEXI_PASS_USAGE_INVALID_CHECKOUT',
        reason: 'invalid_checkout_variant'
      }
    }, 'R-1');

    expect(collapseCashierAlertCandidates([
      missingFromValidation!,
      missingFromAutomation!,
      invalidFromValidation!,
      invalidFromAutomation!
    ])).toEqual([
      { receiptNumber: 'R-1', kind: 'missing_customer' },
      {
        receiptNumber: 'R-1',
        kind: 'invalid_flexi',
        details: { flexiAreas: ['Checkout'] }
      }
    ]);
  });

  it('does not route history, missing-record, refund, or manager-only issues to cashiers', () => {
    expect(normalizeCashierValidationFinding({
      code: 'FLEXI_CHECKOUT_INVALID_VARIANT',
      severity: 'warning',
      message: 'history',
      details: { reason: 'unknown_checkout_history' }
    }, 'R-1')).toBeNull();
    expect(normalizeCashierAutomationResult({
      code: 'FLEXI_PASS_USAGE_SKIPPED',
      status: 'skipped',
      message: 'records missing',
      details: { incidentCode: 'FLEXI_PASS_USAGE_NO_NOTION_RECORDS', reason: 'no_flexi_pass_records' }
    }, 'R-1')).toBeNull();
    expect(collectCashierAlertCandidates({
      receiptNumber: 'R-1',
      receiptType: 'REFUND',
      validationFindings: [{
        code: 'RECEIPT_CLOSED_WITHOUT_CUSTOMER',
        severity: 'warning',
        message: 'missing'
      }]
    })).toEqual([]);
    expect(normalizeCashierValidationFinding({
      code: 'MEMBERSHIP_ENTRY_WITHOUT_VALID_MEMBERSHIP',
      severity: 'warning',
      message: 'manager only'
    }, 'R-1')).toBeNull();
  });
});

describe('cashier receipt alert renderer', () => {
  it('uses action-first copy, receipt number, and a staff-safe link only', () => {
    const issues: CashierAlertCandidate[] = [
      { receiptNumber: 'R-1', kind: 'one_hour_not_converted', details: { durationMinutes: 105 } },
      { receiptNumber: 'R-1', kind: 'notion_usage_update_failed' }
    ];
    const payload = buildCashierAlertPayload({
      receiptNumber: 'R-1',
      receiptUrl: 'https://casa-luma.example/tools/receipts/R-1',
      issues
    });

    expect(payload.title).toBe('⚠️ Cashier action needed');
    expect(payload.body.startsWith('<b>Please check receipt <code>R-1</code></b>')).toBe(true);
    expect(payload.body).toContain('longer than 75 minutes');
    expect(payload.body).toContain('do not punch the Flexi pass again');
    expect(payload.body).toContain('<a href="https://casa-luma.example/tools/receipts/R-1">Open receipt</a>');
    expect(payload.body).not.toContain('/mgmt-dashboard/');
    expect(payload.body).not.toContain('FLEXI_PASS_USAGE_NOTION_UPDATE_FAILED');
    expect(payload.body).not.toContain('critical');
    expect(payload.body).not.toContain('stack');
  });

  it('rejects a manager receipt URL instead of rendering it for cashiers', () => {
    const payload = buildCashierAlertPayload({
      receiptNumber: 'R-2',
      receiptUrl: 'https://casa-luma.example/mgmt-dashboard/receipts/R-2',
      issues: [{ receiptNumber: 'R-2', kind: 'missing_customer' }]
    });

    expect(payload.body).not.toContain('Open receipt');
    expect(payload.body).not.toContain('/mgmt-dashboard/');
  });
});

describe('cashier receipt alert publication boundary', () => {
  it('collapses candidates before the caller publishes one message', () => {
    const candidates = collectCashierAlertCandidates({
      receiptNumber: 'R-3',
      validationFindings: [{
        code: 'RECEIPT_CLOSED_WITHOUT_CUSTOMER',
        severity: 'warning',
        message: 'missing'
      }],
      automationResults: [{
        code: 'FLEXI_PASS_USAGE_SKIPPED',
        status: 'skipped',
        message: 'missing',
        details: { incidentCode: 'FLEXI_PASS_USAGE_MISSING_CUSTOMER', reason: 'missing_customer' }
      }]
    });

    expect(candidates).toHaveLength(1);
    expect(vi.fn()).not.toHaveBeenCalled();
  });
});
