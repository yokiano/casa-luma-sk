import { describe, expect, it, vi } from 'vitest';
import type { LoyverseReceipt } from '$lib/receipts/types';
import type { FlexiPassBalance } from '$lib/server/db/flexi-pass-queries';
import { createFlexiCheckinRule } from './flexi-checkin';
import { createFlexiCheckoutRule } from './flexi-checkout';
import { runReceiptValidationSuite, createReceiptValidationSuite } from '../engine';
import { FLEXI_CHECKOUT_ITEM_ID, FLEXI_ENTRANCE_ITEM_ID } from '$lib/receipts/open-play-items';

const balance = (overrides: Partial<FlexiPassBalance> = {}): FlexiPassBalance => ({
  customerId: 'cust-1',
  passEntriesPerCard: 11,
  cardsPurchased: 1,
  entriesPurchased: 11,
  entriesUsedIncludingCurrent: 2,
  currentVisitPunches: 2,
  currentReceiptEntries: 2,
  remainingBeforeCurrentReceipt: 9,
  remainingAfterCurrentReceipt: 7,
  unknownVariantDiagnostics: [],
  firstPurchaseAt: null,
  lastPurchaseAt: null,
  ...overrides
});

const receipt = (lineItems: LoyverseReceipt['line_items'], overrides: Partial<LoyverseReceipt> = {}): LoyverseReceipt => ({
  receipt_number: 'R-FLEXI-1',
  receipt_type: 'SALE',
  customer_id: 'cust-1',
  receipt_date: '2026-07-27T10:00:00.000Z',
  line_items: lineItems,
  ...overrides
});

describe('Flexi check-in and checkout validation', () => {
  it('requires a customer for Entrance without querying balance', async () => {
    const lookup = vi.fn();
    const result = await runReceiptValidationSuite(
      createReceiptValidationSuite([createFlexiCheckinRule({ lookupFlexiBalance: lookup })]),
      receipt([{ item_id: FLEXI_ENTRANCE_ITEM_ID, sku: 'FLEXI-ENTRANCE-KIDS-02', quantity: 1 }], { customer_id: undefined })
    );

    expect(result.findings[0]).toMatchObject({
      code: 'FLEXI_CHECKIN_WITHOUT_AVAILABLE_PASS',
      details: { reason: 'missing_customer', childCount: 2 }
    });
    expect(lookup).not.toHaveBeenCalled();
  });

  it('validates Entrance without consuming a punch', async () => {
    const lookup = vi.fn().mockResolvedValue(balance({ currentVisitPunches: 0, currentReceiptEntries: 0 }));
    const result = await runReceiptValidationSuite(
      createReceiptValidationSuite([createFlexiCheckinRule({ lookupFlexiBalance: lookup })]),
      receipt([{ item_id: FLEXI_ENTRANCE_ITEM_ID, sku: 'FLEXI-ENTRANCE-KIDS-05', quantity: 1 }])
    );

    expect(result.hasFailures).toBe(false);
    expect(lookup).toHaveBeenCalledWith(expect.objectContaining({
      currentVisitPunches: 0,
      currentReceiptEntries: 0,
      excludeCurrentReceiptUsage: true
    }));
  });

  it('checks Checkout against the selected holes punched for this visit', async () => {
    const lookup = vi.fn().mockResolvedValue(balance({
      currentVisitPunches: 2,
      currentReceiptEntries: 2,
      remainingBeforeCurrentReceipt: 2,
      remainingAfterCurrentReceipt: 0
    }));
    const result = await runReceiptValidationSuite(
      createReceiptValidationSuite([createFlexiCheckoutRule({ lookupFlexiBalance: lookup })]),
      receipt([{ item_id: FLEXI_CHECKOUT_ITEM_ID, sku: 'FLEXI-CHECKOUT-HOURS-02', quantity: 1 }])
    );

    expect(result.hasFailures).toBe(false);
    expect(lookup).toHaveBeenCalledWith(expect.objectContaining({ currentVisitPunches: 2, currentReceiptEntries: 2 }));
  });

  it('rejects non-one Checkout quantity without querying balance', async () => {
    const lookup = vi.fn();
    const result = await runReceiptValidationSuite(
      createReceiptValidationSuite([createFlexiCheckoutRule({ lookupFlexiBalance: lookup })]),
      receipt([{ item_id: FLEXI_CHECKOUT_ITEM_ID, sku: 'FLEXI-CHECKOUT-HOURS-02', quantity: 2 }])
    );

    expect(result.findings[0]).toMatchObject({ code: 'FLEXI_CHECKOUT_INVALID_VARIANT' });
    expect(result.findings[0].details?.reason).toBe('invalid_checkout_variant');
    expect(lookup).not.toHaveBeenCalled();
  });

  it('rejects multiple Checkout lines instead of summing them', async () => {
    const lookup = vi.fn();
    const result = await runReceiptValidationSuite(
      createReceiptValidationSuite([createFlexiCheckoutRule({ lookupFlexiBalance: lookup })]),
      receipt([
        { item_id: FLEXI_CHECKOUT_ITEM_ID, sku: 'FLEXI-CHECKOUT-HOURS-01', quantity: 1 },
        { item_id: FLEXI_CHECKOUT_ITEM_ID, sku: 'FLEXI-CHECKOUT-HOURS-02', quantity: 1 }
      ])
    );

    expect(result.findings[0]).toMatchObject({
      code: 'FLEXI_CHECKOUT_INVALID_VARIANT',
      details: { reason: 'multiple_checkout_lines' }
    });
    expect(lookup).not.toHaveBeenCalled();
  });
});
