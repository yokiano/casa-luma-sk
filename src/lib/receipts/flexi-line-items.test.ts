import { describe, expect, it } from 'vitest';
import type { LoyverseReceiptLineItem } from '$lib/receipts/types';
import {
  FLEXI_CHECKOUT_ITEM_ID,
  FLEXI_CHECKOUT_ITEM_IDS,
  FLEXI_CHECKOUT_VARIANT_HOURS_BY_ID,
  FLEXI_ENTRANCE_ITEM_ID,
  FLEXI_ENTRANCE_VARIANT_KIDS_BY_ID,
  LEGACY_FLEXI_CHECKOUT_ITEM_ID,
  LEGACY_FLEXI_SINGLE_HOUR_VARIANT_ID,
  OPEN_PLAY_CUSTOMER_REQUIRED_ITEM_IDS
} from '$lib/receipts/open-play-items';
import {
  classifyFlexiLineItem,
  summarizeFlexiCheckout,
  summarizeFlexiEntrance
} from './flexi-line-items';

const line = (overrides: Partial<LoyverseReceiptLineItem>): LoyverseReceiptLineItem => ({ quantity: 1, ...overrides });

describe('Flexi line item classification', () => {
  it('pins the captured active, historical, and variant identity contracts', () => {
    expect(FLEXI_CHECKOUT_ITEM_ID).toBe('cf3ea669-d995-4d46-8d31-d2d6e3f91410');
    expect(FLEXI_ENTRANCE_ITEM_ID).toBe('04f17ebd-9bf1-4bb2-85d1-535872de5622');
    expect(FLEXI_CHECKOUT_ITEM_IDS).toEqual([
      'cf3ea669-d995-4d46-8d31-d2d6e3f91410',
      'a94027fa-dd55-43d2-a031-b358877f4752'
    ]);
    expect(FLEXI_CHECKOUT_VARIANT_HOURS_BY_ID).toEqual({
      '1ac06b7d-7b94-4f7b-98d3-be0b93a5f930': 1,
      '6febcd90-5c06-4351-b542-a40862daab1b': 1,
      'b0b10716-0713-4310-a6a9-258a8ea6a8a3': 2,
      '0e66f590-adab-4278-a789-9027ec63ada4': 3,
      '7b39776a-7819-4ea1-9be9-07bd000c0def': 4,
      '82177af3-61e8-4d44-bc0a-e72ceaa82b94': 5,
      '26e35731-9a0c-48db-ab09-e00a122bb070': 6,
      '9da91388-9fc0-43a6-ae77-f09e5a045a6b': 7,
      '9cdcbe55-46d1-4346-b6fd-e82c1cf0b666': 8
    });
    expect(FLEXI_ENTRANCE_VARIANT_KIDS_BY_ID).toEqual({
      '858c90fe-9fe1-4169-b3af-c3bbc954654f': 1,
      '37ebf38c-9da5-4ad4-b84b-a7e3a3711fb9': 2,
      'bf22be0e-19ef-40fa-825f-ad2cd7720873': 3,
      '8ac2c629-c00a-4696-b1af-cf8dac5b9534': 4,
      'd89752ee-15f9-4f81-aab7-68604b501936': 5
    });
    expect(OPEN_PLAY_CUSTOMER_REQUIRED_ITEM_IDS).toEqual(expect.arrayContaining([
      FLEXI_CHECKOUT_ITEM_ID,
      LEGACY_FLEXI_CHECKOUT_ITEM_ID,
      FLEXI_ENTRANCE_ITEM_ID
    ]));
  });

  it('maps Checkout SKU variants to holes punched for this visit', () => {
    const variantId = Object.entries(FLEXI_CHECKOUT_VARIANT_HOURS_BY_ID).find(([, hours]) => hours === 3)?.[0];
    expect(classifyFlexiLineItem(line({
      item_id: FLEXI_CHECKOUT_ITEM_ID,
      variant_id: variantId,
      sku: 'FLEXI-CHECKOUT-HOURS-03'
    }))).toEqual({ kind: 'checkout', hours: 3, quantity: 1, legacy: false, variantId });
  });

  it('preserves historical one-punch-per-quantity receipts', () => {
    expect(classifyFlexiLineItem(line({
      item_id: LEGACY_FLEXI_CHECKOUT_ITEM_ID,
      variant_id: LEGACY_FLEXI_SINGLE_HOUR_VARIANT_ID,
      sku: '10143',
      quantity: 3
    }))).toEqual({ kind: 'checkout', hours: 3, quantity: 1, legacy: true, variantId: LEGACY_FLEXI_SINGLE_HOUR_VARIANT_ID });
  });

  it('preserves the explicitly supported missing-variant legacy shape', () => {
    expect(classifyFlexiLineItem(line({
      item_id: LEGACY_FLEXI_CHECKOUT_ITEM_ID,
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

  it('maps Entrance variants by their captured item, variant, and SKU identities', () => {
    const variantId = Object.entries(FLEXI_ENTRANCE_VARIANT_KIDS_BY_ID).find(([, kids]) => kids === 5)?.[0];
    expect(classifyFlexiLineItem(line({
      item_id: FLEXI_ENTRANCE_ITEM_ID,
      variant_id: variantId,
      sku: 'FLEXI-ENTRANCE-KIDS-05'
    }))).toEqual({ kind: 'entrance', kids: 5, quantity: 1, variantId });
  });

  it('rejects out-of-range variants', () => {
    expect(classifyFlexiLineItem(line({ item_id: FLEXI_CHECKOUT_ITEM_ID, sku: 'FLEXI-CHECKOUT-HOURS-09' })).kind).toBe('invalid-checkout');
    expect(classifyFlexiLineItem(line({ item_id: FLEXI_ENTRANCE_ITEM_ID, sku: 'FLEXI-ENTRANCE-KIDS-06' })).kind).toBe('invalid-entrance');
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
      line({ item_id: FLEXI_ENTRANCE_ITEM_ID, sku: 'FLEXI-ENTRANCE-KIDS-03' })
    ])).toMatchObject({ matched: true, kids: 3, invalid: [] });
  });
});
