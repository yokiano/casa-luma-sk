import { describe, expect, it } from 'vitest';
import {
  FLEXI_CARD_ITEM_IDS,
  FLEXI_CHECKOUT_ITEM_ID,
  LEGACY_FLEXI_CHECKOUT_ITEM_ID,
  LEGACY_FLEXI_SINGLE_HOUR_VARIANT_ID
} from '$lib/receipts/open-play-items';
import { calculateFlexiPassBalance, type FlexiBalanceRow } from './flexi-pass-queries';

const row = (overrides: Partial<FlexiBalanceRow>): FlexiBalanceRow => ({
  receiptKey: 'm1:R-1',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  receiptDate: new Date('2026-01-01T00:00:00.000Z'),
  itemId: FLEXI_CHECKOUT_ITEM_ID,
  variantId: null,
  variantName: null,
  sku: null,
  quantity: 1,
  ...overrides
});

describe('Flexi balance calculation', () => {
  it('uses the selected Checkout visit punches exactly once', () => {
    const result = calculateFlexiPassBalance({
      customerId: 'cust-1',
      rows: [
        row({ receiptKey: 'm1:P-1', itemId: FLEXI_CARD_ITEM_IDS[0], quantity: 1 }),
        row({ receiptKey: 'm1:R-1', sku: 'FLEXI-CHECKOUT-HOURS-02', quantity: 1 })
      ],
      currentReceiptKey: 'm1:R-1',
      currentVisitPunches: 2
    });

    expect(result).toMatchObject({
      cardsPurchased: 1,
      entriesPurchased: 11,
      entriesUsedIncludingCurrent: 2,
      currentVisitPunches: 2,
      remainingBeforeCurrentReceipt: 11,
      remainingAfterCurrentReceipt: 9
    });
  });

  it('lets same-ticket check-in inspect balance before Checkout usage', () => {
    const result = calculateFlexiPassBalance({
      customerId: 'cust-1',
      rows: [
        row({ receiptKey: 'm1:P-1', itemId: FLEXI_CARD_ITEM_IDS[0], quantity: 1 }),
        row({ receiptKey: 'm1:R-SAME', sku: 'FLEXI-CHECKOUT-HOURS-08', quantity: 1 })
      ],
      currentReceiptKey: 'm1:R-SAME',
      currentVisitPunches: 0,
      excludeCurrentReceiptUsage: true
    });

    expect(result.remainingBeforeCurrentReceipt).toBe(11);
    expect(result.entriesUsedIncludingCurrent).toBe(0);
  });

  it('applies a missing current receipt fallback once', () => {
    const result = calculateFlexiPassBalance({
      customerId: 'cust-1',
      rows: [row({ receiptKey: 'm1:P-1', itemId: FLEXI_CARD_ITEM_IDS[0], quantity: 1 })],
      currentReceiptKey: 'm1:R-NEW',
      currentVisitPunches: 3
    });

    expect(result.entriesUsedIncludingCurrent).toBe(3);
    expect(result.remainingBeforeCurrentReceipt).toBe(11);
    expect(result.remainingAfterCurrentReceipt).toBe(8);
  });

  it('aggregates active Checkout variants with historical quantity receipts while excluding Entrance', () => {
    const result = calculateFlexiPassBalance({
      customerId: 'cust-1',
      rows: [
        row({ itemId: FLEXI_CARD_ITEM_IDS[0], quantity: 1 }),
        row({ itemId: 'entrance-item', sku: 'FLEXI-ENTRANCE-KIDS-05', quantity: 1 }),
        row({ receiptKey: 'm1:R-NEW', sku: 'FLEXI-CHECKOUT-HOURS-02', quantity: 1 }),
        row({ receiptKey: 'm1:R-OLD', itemId: LEGACY_FLEXI_CHECKOUT_ITEM_ID, variantId: LEGACY_FLEXI_SINGLE_HOUR_VARIANT_ID, sku: '10143', quantity: 3 })
      ]
    });

    expect(result.entriesUsedIncludingCurrent).toBe(5);
    expect(result.unknownVariantDiagnostics).toEqual([]);
  });

  it('does not guess malformed or multiple Checkout usage', () => {
    const result = calculateFlexiPassBalance({
      customerId: 'cust-1',
      rows: [
        row({ itemId: FLEXI_CARD_ITEM_IDS[0], quantity: 1 }),
        row({ receiptKey: 'm1:R-BAD', sku: 'FLEXI-CHECKOUT-HOURS-02', quantity: 2 }),
        row({ receiptKey: 'm1:R-MULTI', sku: 'FLEXI-CHECKOUT-HOURS-01', quantity: 1 }),
        row({ receiptKey: 'm1:R-MULTI', sku: 'FLEXI-CHECKOUT-HOURS-03', quantity: 1 })
      ]
    });

    expect(result.entriesUsedIncludingCurrent).toBe(0);
    expect(result.unknownVariantDiagnostics).toHaveLength(2);
  });
});
