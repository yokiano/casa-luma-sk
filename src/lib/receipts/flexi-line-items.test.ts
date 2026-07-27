import { describe, expect, it } from 'vitest';
import type { LoyverseReceiptLineItem } from '$lib/receipts/types';
import {
  FLEXI_CHECKOUT_ITEM_ID,
  LEGACY_FLEXI_SINGLE_HOUR_VARIANT_ID
} from '$lib/receipts/open-play-items';
import {
  classifyFlexiLineItem,
  summarizeFlexiCheckout,
  summarizeFlexiEntrance
} from './flexi-line-items';

const line = (overrides: Partial<LoyverseReceiptLineItem>): LoyverseReceiptLineItem => ({ quantity: 1, ...overrides });

describe('Flexi line item classification', () => {
  it('maps Checkout SKU variants to holes punched for this visit', () => {
    expect(classifyFlexiLineItem(line({
      item_id: FLEXI_CHECKOUT_ITEM_ID,
      variant_id: 'new-variant',
      sku: 'FLEXI-CHECKOUT-HOURS-03'
    }))).toEqual({ kind: 'checkout', hours: 3, quantity: 1, legacy: false, variantId: 'new-variant' });
  });

  it('preserves historical one-punch-per-quantity receipts', () => {
    expect(classifyFlexiLineItem(line({
      item_id: FLEXI_CHECKOUT_ITEM_ID,
      variant_id: LEGACY_FLEXI_SINGLE_HOUR_VARIANT_ID,
      sku: '10143',
      quantity: 3
    }))).toEqual({ kind: 'checkout', hours: 3, quantity: 1, legacy: true, variantId: LEGACY_FLEXI_SINGLE_HOUR_VARIANT_ID });
  });

  it('preserves the explicitly supported missing-variant legacy shape', () => {
    expect(classifyFlexiLineItem(line({
      item_id: FLEXI_CHECKOUT_ITEM_ID,
      sku: '10143',
      quantity: 2
    }))).toMatchObject({ kind: 'checkout', hours: 2, legacy: true });
  });

  it('requires quantity one for new Checkout variants', () => {
    const result = classifyFlexiLineItem(line({
      item_id: FLEXI_CHECKOUT_ITEM_ID,
      sku: 'FLEXI-CHECKOUT-HOURS-02',
      quantity: 2
    }));
    expect(result.kind).toBe('invalid-checkout');
  });

  it('maps Entrance SKUs independently of the not-yet-created Loyverse item ID', () => {
    expect(classifyFlexiLineItem(line({
      item_id: 'created-after-sync',
      sku: 'FLEXI-ENTRANCE-KIDS-05'
    }))).toEqual({ kind: 'entrance', kids: 5, quantity: 1, variantId: undefined });
  });

  it('rejects out-of-range variants', () => {
    expect(classifyFlexiLineItem(line({ item_id: FLEXI_CHECKOUT_ITEM_ID, sku: 'FLEXI-CHECKOUT-HOURS-09' })).kind).toBe('invalid-checkout');
    expect(classifyFlexiLineItem(line({ sku: 'FLEXI-ENTRANCE-KIDS-06' })).kind).toBe('invalid-entrance');
  });

  it('rejects a Flexi SKU attached to another known item and a missing variant', () => {
    expect(classifyFlexiLineItem(line({ item_id: 'other-item', sku: 'FLEXI-CHECKOUT-HOURS-02' }))).toMatchObject({
      kind: 'invalid-checkout'
    });
    expect(classifyFlexiLineItem(line({ item_id: FLEXI_CHECKOUT_ITEM_ID, quantity: 1 }))).toMatchObject({
      kind: 'invalid-checkout'
    });
  });

  it('sums visit punches and child count without using names or elapsed time', () => {
    expect(summarizeFlexiCheckout([
      line({ item_id: FLEXI_CHECKOUT_ITEM_ID, sku: 'FLEXI-CHECKOUT-HOURS-02' })
    ])).toMatchObject({ matched: true, hours: 2, invalid: [] });
    expect(summarizeFlexiEntrance([
      line({ item_id: 'entrance', sku: 'FLEXI-ENTRANCE-KIDS-03' })
    ])).toMatchObject({ matched: true, kids: 3, invalid: [] });
  });
});
