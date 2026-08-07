import { describe, expect, it } from 'vitest';
import {
  FLEXI_CARD_ITEM_IDS,
  FLEXI_CHECKOUT_ITEM_ID,
  LEGACY_FLEXI_CHECKOUT_ITEM_ID,
  LEGACY_FLEXI_SINGLE_HOUR_VARIANT_ID
} from '$lib/receipts/open-play-items';
import { classifyFlexiLineItem } from '$lib/receipts/flexi-line-items';
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
        row({ receiptKey: 'm1:R-OLD', itemId: LEGACY_FLEXI_CHECKOUT_ITEM_ID, variantId: LEGACY_FLEXI_SINGLE_HOUR_VARIANT_ID, sku: '10143', quantity: 3 }),
        row({ receiptKey: 'm1:R-OLD', itemId: LEGACY_FLEXI_CHECKOUT_ITEM_ID, variantId: LEGACY_FLEXI_SINGLE_HOUR_VARIANT_ID, sku: '10143', quantity: 2 })
      ]
    });

    expect(result.entriesUsedIncludingCurrent).toBe(7);
    expect(result.unknownVariantDiagnostics).toEqual([]);
  });

  it('keeps receipt 1-7057 modern lines valid and does not let legacy history poison its balance', () => {
    const currentEntrance = { item_id: '04f17ebd-9bf1-4bb2-85d1-535872de5622', sku: 'FLEXI-ENTRANCE-KIDS-01', quantity: 1 };
    const currentCheckout = { item_id: FLEXI_CHECKOUT_ITEM_ID, sku: 'FLEXI-CHECKOUT-HOURS-02', quantity: 1 };

    expect(classifyFlexiLineItem(currentEntrance)).toMatchObject({ kind: 'entrance', kids: 1 });
    expect(classifyFlexiLineItem(currentCheckout)).toMatchObject({ kind: 'checkout', hours: 2, legacy: false });

    const result = calculateFlexiPassBalance({
      customerId: 'cust-1',
      rows: [
        row({ itemId: FLEXI_CARD_ITEM_IDS[0], quantity: 1 }),
        row({ receiptKey: 'm1:1-4017', itemId: LEGACY_FLEXI_CHECKOUT_ITEM_ID, variantId: LEGACY_FLEXI_SINGLE_HOUR_VARIANT_ID, sku: '10143', quantity: 3 }),
        row({ receiptKey: 'm1:1-4017', itemId: LEGACY_FLEXI_CHECKOUT_ITEM_ID, variantId: LEGACY_FLEXI_SINGLE_HOUR_VARIANT_ID, sku: '10143', quantity: 2 }),
        row({ receiptKey: 'm1:1-7057', ...currentCheckout })
      ],
      currentReceiptKey: 'm1:1-7057',
      currentVisitPunches: 2
    });

    expect(result.entriesUsedIncludingCurrent).toBe(7);
    expect(result.currentVisitPunches).toBe(2);
    expect(result.unknownVariantDiagnostics).toEqual([]);
  });

  it('does not guess malformed legacy or mixed Checkout usage', () => {
    const result = calculateFlexiPassBalance({
      customerId: 'cust-1',
      rows: [
        row({ itemId: FLEXI_CARD_ITEM_IDS[0], quantity: 1 }),
        row({ receiptKey: 'm1:R-BAD-LEGACY', itemId: LEGACY_FLEXI_CHECKOUT_ITEM_ID, sku: '10143', quantity: 0 }),
        row({ receiptKey: 'm1:R-UNKNOWN-LEGACY', itemId: LEGACY_FLEXI_CHECKOUT_ITEM_ID, variantId: 'unknown-legacy', sku: '10143', quantity: 1 }),
        row({ receiptKey: 'm1:R-MIXED', itemId: LEGACY_FLEXI_CHECKOUT_ITEM_ID, variantId: LEGACY_FLEXI_SINGLE_HOUR_VARIANT_ID, sku: '10143', quantity: 1 }),
        row({ receiptKey: 'm1:R-MIXED', sku: 'FLEXI-CHECKOUT-HOURS-02', quantity: 1 })
      ]
    });

    expect(result.entriesUsedIncludingCurrent).toBe(0);
    expect(result.unknownVariantDiagnostics).toHaveLength(3);
  });

  it('does not guess malformed or multiple modern Checkout usage', () => {
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
