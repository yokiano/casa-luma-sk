import { describe, expect, it, vi } from 'vitest';
import type { LoyverseReceipt } from '$lib/receipts/types';
import {
  createAlwaysFailValidationRule,
  createDefaultReceiptValidationSuite,
  createDiscountTotalOverThresholdRule,
  createFlexiPassEntryRule,
  createHundredPercentDiscountRule,
  createMemberValidVisitRule,
  createMissingCustomerRule,
  createOneHourNotConvertedRule,
  createReceiptValidationSuite,
  runReceiptValidationSuite
} from '$lib/receipts/validation';
import { ONE_HOUR_ITEM_ID, ONE_HOUR_TO_DAY_ITEM_ID } from '$lib/receipts/receipt-tools';
import {
  FLEXI_SINGLE_ENTRANCE_ITEM_ID,
  MEMBER_VALID_VISIT_ITEM_ID
} from '$lib/receipts/open-play-items';

const createReceipt = (overrides: Partial<LoyverseReceipt> = {}): LoyverseReceipt => ({
  receipt_number: 'R-1000',
  receipt_type: 'SALE',
  customer_id: 'cust-1',
  created_at: '2026-01-12T11:30:00.000Z',
  order: '#501 10:00',
  total_discounts: [],
  line_items: [],
  ...overrides
});

describe('receipt validation suite', () => {
  it('returns no findings for a healthy receipt', async () => {
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

    const result = await runReceiptValidationSuite(suite, receipt, { receiptKey: 'm1:R-1000' });

    expect(result.hasFailures).toBe(false);
    expect(result.findings).toHaveLength(0);
  });

  it('finds receipt-level 100 percent discounts', async () => {
    const suite = createDefaultReceiptValidationSuite();
    const receipt = createReceipt({
      total_discounts: [{ id: 'disc-1', name: 'Comp', percentage: 100 }]
    });

    const result = await runReceiptValidationSuite(suite, receipt);

    expect(result.hasFailures).toBe(true);
    expect(result.findings.some((finding) => finding.code === 'DISCOUNT_100_PRESENT')).toBe(true);
  });

  it('finds line-level 100 percent discounts', async () => {
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

    const result = await runReceiptValidationSuite(suite, receipt);

    expect(result.findings).toHaveLength(1);
    expect(result.findings[0].code).toBe('DISCOUNT_100_PRESENT');
  });

  it('does not flag discount percentages below threshold', async () => {
    const suite = createReceiptValidationSuite([
      createHundredPercentDiscountRule({ minPercentage: 100 })
    ]);
    const receipt = createReceipt({
      total_discounts: [{ name: 'Almost free', percentage: 99.99 }]
    });

    const result = await runReceiptValidationSuite(suite, receipt);

    expect(result.hasFailures).toBe(false);
  });

  it('finds total receipt discounts strictly over 400 baht', async () => {
    const suite = createDefaultReceiptValidationSuite();
    const receipt = createReceipt({ total_discount: 401 });

    const result = await runReceiptValidationSuite(suite, receipt);

    expect(result.hasFailures).toBe(true);
    expect(result.findings.some((finding) => finding.code === 'DISCOUNT_TOTAL_OVER_THRESHOLD')).toBe(true);
  });

  it('does not flag total receipt discounts equal to 400 baht', async () => {
    const suite = createReceiptValidationSuite([createDiscountTotalOverThresholdRule()]);
    const receipt = createReceipt({ total_discount: 400 });

    const result = await runReceiptValidationSuite(suite, receipt);

    expect(result.hasFailures).toBe(false);
  });

  it('skips total discount validation for refunds by default', async () => {
    const suite = createReceiptValidationSuite([createDiscountTotalOverThresholdRule()]);
    const receipt = createReceipt({ receipt_type: 'REFUND', total_discount: 999 });

    const result = await runReceiptValidationSuite(suite, receipt);

    expect(result.hasFailures).toBe(false);
  });

  it('includes total discount validation in the default suite', () => {
    const suite = createDefaultReceiptValidationSuite();

    expect(suite.rules.some((rule) => rule.code === 'DISCOUNT_TOTAL_OVER_THRESHOLD')).toBe(true);
  });

  it('allows the 15-minute grace period before flagging one-hour tickets', async () => {
    const suite = createReceiptValidationSuite([createOneHourNotConvertedRule()]);
    const receipt = createReceipt({
      order: '#776 10:00',
      created_at: '2026-01-12T04:05:00.000Z',
      line_items: [
        {
          item_id: ONE_HOUR_ITEM_ID,
          item_name: 'Open Play 1H',
          quantity: 1
        }
      ]
    });

    const result = await runReceiptValidationSuite(suite, receipt);

    expect(result.hasFailures).toBe(false);
    expect(result.findings).toHaveLength(0);
  });

  it('does not use the server timezone when calculating one-hour duration', async () => {
    const suite = createReceiptValidationSuite([createOneHourNotConvertedRule()]);
    const receipt = createReceipt({
      receipt_number: '1-4595',
      order: 'Epelbon [EP1] - 4:32 PM',
      created_at: '2026-05-19T10:20:05.000Z',
      receipt_date: '2026-05-19T10:19:49.000Z',
      line_items: [
        {
          item_id: ONE_HOUR_ITEM_ID,
          item_name: '1 Hour',
          quantity: 1
        }
      ]
    });

    const result = await runReceiptValidationSuite(suite, receipt);

    expect(result.hasFailures).toBe(false);
    expect(result.findings).toHaveLength(0);
  });

  it('finds one-hour tickets not converted after threshold', async () => {
    const suite = createReceiptValidationSuite([createOneHourNotConvertedRule()]);
    const receipt = createReceipt({
      order: '#777 09:30',
      created_at: '2026-01-12T04:15:00.000Z',
      line_items: [
        {
          item_id: ONE_HOUR_ITEM_ID,
          item_name: 'Open Play 1H',
          quantity: 1
        }
      ]
    });

    const result = await runReceiptValidationSuite(suite, receipt);

    expect(result.hasFailures).toBe(true);
    expect(result.findings[0].code).toBe('ONE_HOUR_NOT_CONVERTED');
    expect(result.findings[0].details?.durationMinutes).toBeGreaterThan(75);
    expect(result.findings[0].details?.gracePeriodMinutes).toBe(15);
    expect(result.findings[0].details?.thresholdMinutes).toBe(75);
    expect(result.findings[0].details?.timeZone).toBe('Asia/Bangkok');
  });

  it('skips one-hour validation for refunds by default', async () => {
    const suite = createReceiptValidationSuite([createOneHourNotConvertedRule()]);
    const receipt = createReceipt({
      receipt_type: 'REFUND',
      order: '#778 09:30',
      created_at: '2026-01-12T04:15:00.000Z',
      line_items: [{ item_id: ONE_HOUR_ITEM_ID, quantity: 1 }]
    });

    const result = await runReceiptValidationSuite(suite, receipt);

    expect(result.hasFailures).toBe(false);
  });

  it('supports async rules and converts async rule errors into findings', async () => {
    const suite = createReceiptValidationSuite([
      {
        code: 'ASYNC_FAIL',
        description: 'async test rule',
        validate: async () => ({
          code: 'ASYNC_FAIL',
          severity: 'warning',
          message: 'async finding'
        })
      },
      {
        code: 'ASYNC_THROW',
        description: 'async throwing test rule',
        validate: async () => {
          throw new Error('async boom');
        }
      }
    ]);

    const result = await runReceiptValidationSuite(suite, createReceipt());

    expect(result.findings.map((finding) => finding.code)).toEqual([
      'ASYNC_FAIL',
      'RULE_EXECUTION_ERROR:ASYNC_THROW'
    ]);
  });

  it('finds missing customers on non-refund closed receipts', async () => {
    const suite = createReceiptValidationSuite([createMissingCustomerRule()]);
    const receipt = createReceipt({ customer_id: undefined });

    const result = await runReceiptValidationSuite(suite, receipt);

    expect(result.findings[0].code).toBe('RECEIPT_CLOSED_WITHOUT_CUSTOMER');
  });

  it('skips missing customer validation for refunds', async () => {
    const suite = createReceiptValidationSuite([createMissingCustomerRule()]);
    const receipt = createReceipt({ receipt_type: 'REFUND', customer_id: undefined });

    const result = await runReceiptValidationSuite(suite, receipt);

    expect(result.hasFailures).toBe(false);
  });

  it('finds member visits without attached customers before calling Notion lookup', async () => {
    const lookupMembership = vi.fn();
    const suite = createReceiptValidationSuite([createMemberValidVisitRule({ lookupMembership })]);
    const receipt = createReceipt({
      customer_id: undefined,
      line_items: [{ item_id: MEMBER_VALID_VISIT_ITEM_ID, item_name: 'Member Valid Visit', quantity: 1 }]
    });

    const result = await runReceiptValidationSuite(suite, receipt);

    expect(lookupMembership).not.toHaveBeenCalled();
    expect(result.findings[0].code).toBe('MEMBERSHIP_ENTRY_WITHOUT_VALID_MEMBERSHIP');
    expect(result.findings[0].details?.reason).toBe('missing_customer');
  });

  it('finds member visits without active memberships', async () => {
    const lookupMembership = vi.fn().mockResolvedValue({
      matchedFamily: { id: 'fam-1', name: 'Test Family', loyverseCustomerId: 'cust-1', status: 'Active' },
      activeMemberships: [],
      checkedDate: '2026-01-12'
    });
    const suite = createReceiptValidationSuite([createMemberValidVisitRule({ lookupMembership })]);
    const receipt = createReceipt({
      line_items: [{ item_id: MEMBER_VALID_VISIT_ITEM_ID, item_name: 'Member Valid Visit', quantity: 1 }]
    });

    const result = await runReceiptValidationSuite(suite, receipt);

    expect(lookupMembership).toHaveBeenCalledOnce();
    expect(result.findings[0].code).toBe('MEMBERSHIP_ENTRY_WITHOUT_VALID_MEMBERSHIP');
    expect(result.findings[0].details?.reason).toBe('no_active_membership');
  });

  it('allows member visits with active memberships', async () => {
    const lookupMembership = vi.fn().mockResolvedValue({
      matchedFamily: { id: 'fam-1', name: 'Test Family', loyverseCustomerId: 'cust-1', status: 'Active' },
      activeMemberships: [{ id: 'mem-1', name: 'Test', type: 'Monthly', startDate: '2026-01-01', endDate: '2026-01-31', numberOfKids: 1, status: 'Active' }],
      checkedDate: '2026-01-12'
    });
    const suite = createReceiptValidationSuite([createMemberValidVisitRule({ lookupMembership })]);
    const receipt = createReceipt({
      line_items: [{ item_id: MEMBER_VALID_VISIT_ITEM_ID, item_name: 'Member Valid Visit', quantity: 1 }]
    });

    const result = await runReceiptValidationSuite(suite, receipt);

    expect(result.hasFailures).toBe(false);
  });

  it('finds flexi entries without attached customers before calling Neon lookup', async () => {
    const lookupFlexiBalance = vi.fn();
    const suite = createReceiptValidationSuite([createFlexiPassEntryRule({ lookupFlexiBalance })]);
    const receipt = createReceipt({
      customer_id: undefined,
      line_items: [{ item_id: FLEXI_SINGLE_ENTRANCE_ITEM_ID, item_name: 'Flexi Single Entrance', quantity: 1 }]
    });

    const result = await runReceiptValidationSuite(suite, receipt);

    expect(lookupFlexiBalance).not.toHaveBeenCalled();
    expect(result.findings[0].code).toBe('FLEXI_ENTRY_WITHOUT_AVAILABLE_PASS');
    expect(result.findings[0].details?.reason).toBe('missing_customer');
  });

  it('allows flexi entries when enough passes remain', async () => {
    const lookupFlexiBalance = vi.fn().mockResolvedValue({
      customerId: 'cust-1',
      passEntriesPerCard: 11,
      cardsPurchased: 1,
      entriesPurchased: 11,
      entriesUsedIncludingCurrent: 3,
      currentReceiptEntries: 1,
      remainingBeforeCurrentReceipt: 9,
      remainingAfterCurrentReceipt: 8,
      firstPurchaseAt: '2026-01-01T00:00:00.000Z',
      lastPurchaseAt: '2026-01-01T00:00:00.000Z'
    });
    const suite = createReceiptValidationSuite([createFlexiPassEntryRule({ lookupFlexiBalance })]);
    const receipt = createReceipt({
      line_items: [{ item_id: FLEXI_SINGLE_ENTRANCE_ITEM_ID, item_name: 'Flexi Single Entrance', quantity: 1 }]
    });

    const result = await runReceiptValidationSuite(suite, receipt, { receiptKey: 'rk-1' });

    expect(result.hasFailures).toBe(false);
    expect(lookupFlexiBalance).toHaveBeenCalledWith(expect.objectContaining({ currentReceiptEntries: 1 }));
  });

  it('finds flexi entries when no passes remain', async () => {
    const lookupFlexiBalance = vi.fn().mockResolvedValue({
      customerId: 'cust-1',
      passEntriesPerCard: 11,
      cardsPurchased: 1,
      entriesPurchased: 11,
      entriesUsedIncludingCurrent: 12,
      currentReceiptEntries: 1,
      remainingBeforeCurrentReceipt: 0,
      remainingAfterCurrentReceipt: -1,
      firstPurchaseAt: '2026-01-01T00:00:00.000Z',
      lastPurchaseAt: '2026-01-01T00:00:00.000Z'
    });
    const suite = createReceiptValidationSuite([createFlexiPassEntryRule({ lookupFlexiBalance })]);
    const receipt = createReceipt({
      line_items: [{ item_id: FLEXI_SINGLE_ENTRANCE_ITEM_ID, item_name: 'Flexi Single Entrance', quantity: 1 }]
    });

    const result = await runReceiptValidationSuite(suite, receipt);

    expect(result.findings[0].code).toBe('FLEXI_ENTRY_WITHOUT_AVAILABLE_PASS');
    expect(result.findings[0].details?.reason).toBe('insufficient_remaining_entries');
  });

  it('supports extra rules for controlled alert pipeline tests', async () => {
    const suite = createDefaultReceiptValidationSuite({
      extraRules: [createAlwaysFailValidationRule({ message: 'test pipeline' })]
    });
    const receipt = createReceipt();

    const result = await runReceiptValidationSuite(suite, receipt);

    expect(result.hasFailures).toBe(true);
    expect(result.findings.some((finding) => finding.code === 'FORCED_TEST_FAILURE')).toBe(true);
  });
});
