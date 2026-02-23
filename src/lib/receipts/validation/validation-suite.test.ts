import { describe, expect, it } from 'vitest';
import type { LoyverseReceipt } from '$lib/server/loyverse';
import {
  createAlwaysFailValidationRule,
  createDefaultReceiptValidationSuite,
  createHundredPercentDiscountRule,
  createOneHourNotConvertedRule,
  createReceiptValidationSuite,
  runReceiptValidationSuite
} from '$lib/receipts/validation';
import { ONE_HOUR_ITEM_ID, ONE_HOUR_TO_DAY_ITEM_ID } from '$lib/receipts/receipt-tools';

const createReceipt = (overrides: Partial<LoyverseReceipt> = {}): LoyverseReceipt => ({
  receipt_number: 'R-1000',
  receipt_type: 'SALE',
  created_at: '2026-01-12T11:30:00.000Z',
  order: '#501 10:00',
  total_discounts: [],
  line_items: [],
  ...overrides
});

describe('receipt validation suite', () => {
  it('returns no findings for a healthy receipt', () => {
    const suite = createDefaultReceiptValidationSuite();
    const receipt = createReceipt({
      line_items: [
        {
          item_id: ONE_HOUR_ITEM_ID,
          item_name: 'Open Play 1H',
          quantity: 1
        },
        {
          item_id: ONE_HOUR_TO_DAY_ITEM_ID,
          item_name: 'Convert to Day Pass',
          quantity: 1
        }
      ]
    });

    const result = runReceiptValidationSuite(suite, receipt, { receiptKey: 'm1:R-1000' });

    expect(result.hasFailures).toBe(false);
    expect(result.findings).toHaveLength(0);
  });

  it('finds receipt-level 100 percent discounts', () => {
    const suite = createDefaultReceiptValidationSuite();
    const receipt = createReceipt({
      total_discounts: [{ id: 'disc-1', name: 'Comp', percentage: 100 }]
    });

    const result = runReceiptValidationSuite(suite, receipt);

    expect(result.hasFailures).toBe(true);
    expect(result.findings.some((finding) => finding.code === 'DISCOUNT_100_PRESENT')).toBe(true);
  });

  it('finds line-level 100 percent discounts', () => {
    const suite = createDefaultReceiptValidationSuite();
    const receipt = createReceipt({
      line_items: [
        {
          item_id: 'item-1',
          item_name: 'Party Room',
          quantity: 1,
          line_discounts: [{ id: 'disc-line', name: 'Manual 100', percentage: 100 }]
        }
      ]
    });

    const result = runReceiptValidationSuite(suite, receipt);

    expect(result.findings).toHaveLength(1);
    expect(result.findings[0].code).toBe('DISCOUNT_100_PRESENT');
  });

  it('does not flag discount percentages below threshold', () => {
    const suite = createReceiptValidationSuite([
      createHundredPercentDiscountRule({ minPercentage: 100 })
    ]);
    const receipt = createReceipt({
      total_discounts: [{ name: 'Almost free', percentage: 99.99 }]
    });

    const result = runReceiptValidationSuite(suite, receipt);

    expect(result.hasFailures).toBe(false);
  });

  it('finds one-hour tickets not converted after threshold', () => {
    const suite = createReceiptValidationSuite([createOneHourNotConvertedRule()]);
    const receipt = createReceipt({
      order: '#777 09:30',
      created_at: '2026-01-12T11:15:00.000Z',
      line_items: [
        {
          item_id: ONE_HOUR_ITEM_ID,
          item_name: 'Open Play 1H',
          quantity: 1
        }
      ]
    });

    const result = runReceiptValidationSuite(suite, receipt);

    expect(result.hasFailures).toBe(true);
    expect(result.findings[0].code).toBe('ONE_HOUR_NOT_CONVERTED');
    expect(result.findings[0].details?.durationMinutes).toBeGreaterThan(75);
  });

  it('skips one-hour validation for refunds by default', () => {
    const suite = createReceiptValidationSuite([createOneHourNotConvertedRule()]);
    const receipt = createReceipt({
      receipt_type: 'REFUND',
      order: '#778 09:30',
      created_at: '2026-01-12T11:15:00.000Z',
      line_items: [{ item_id: ONE_HOUR_ITEM_ID, quantity: 1 }]
    });

    const result = runReceiptValidationSuite(suite, receipt);

    expect(result.hasFailures).toBe(false);
  });

  it('supports extra rules for controlled alert pipeline tests', () => {
    const suite = createDefaultReceiptValidationSuite({
      extraRules: [createAlwaysFailValidationRule({ message: 'test pipeline' })]
    });
    const receipt = createReceipt();

    const result = runReceiptValidationSuite(suite, receipt);

    expect(result.hasFailures).toBe(true);
    expect(result.findings.some((finding) => finding.code === 'FORCED_TEST_FAILURE')).toBe(true);
  });
});
