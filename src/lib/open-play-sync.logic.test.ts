import { describe, expect, it } from 'vitest';
import type { LoyverseItem, LoyverseVariant } from '$lib/server/loyverse';
import {
  buildOpenPlayDescription,
  compareOpenPlayVariants,
  parseOpenPlayVariants,
  reconcileOpenPlayVariants,
  writeBackVariantIds
} from './open-play-sync.logic';

const variant = (overrides: Partial<LoyverseVariant> = {}): LoyverseVariant => ({
  variant_id: 'variant-1',
  item_id: 'item-1',
  default_price: 0,
  default_pricing_type: 'FIXED',
  ...overrides
});

const item = (overrides: Partial<LoyverseItem> = {}): LoyverseItem => ({
  id: 'item-1',
  handle: 'item',
  item_name: 'Item',
  option1_name: 'Hours punched this visit',
  variants: [],
  ...overrides
});

describe('Open Play variant sync logic', () => {
  it('strictly parses configured variants and preserves explicit IDs', () => {
    const result = parseOpenPlayVariants(JSON.stringify([
      { variant_id: 'old-id', option1_value: '1 hour', price: 0, sku: 'FLEXI-01' },
      { option1_value: '2 hours', price: 0, sku: 'FLEXI-02' }
    ]), ['Hours punched this visit']);

    expect(result).toEqual([
      { variant_id: 'old-id', option1_value: '1 hour', option2_value: undefined, option3_value: undefined, price: 0, sku: 'FLEXI-01', barcode: undefined },
      { variant_id: undefined, option1_value: '2 hours', option2_value: undefined, option3_value: undefined, price: 0, sku: 'FLEXI-02', barcode: undefined }
    ]);
  });

  it.each([
    ['invalid JSON', '{'],
    ['empty list', '[]'],
    ['duplicate options', JSON.stringify([{ option1_value: '1 hour' }, { option1_value: '1 hour' }])],
    ['duplicate SKU', JSON.stringify([{ option1_value: '1 hour', price: 0, sku: 'same' }, { option1_value: '2 hours', price: 0, sku: 'SAME' }])],
    ['missing price', JSON.stringify([{ option1_value: '1 hour' }])],
    ['invalid price', JSON.stringify([{ option1_value: '1 hour', price: 'nope' }])],
    ['invalid SKU type', JSON.stringify([{ option1_value: '1 hour', price: 0, sku: 42 }])]
  ])('rejects %s before an external write', (_label, json) => {
    expect(() => parseOpenPlayVariants(json, ['Hours'])).toThrow();
  });

  it('preserves the old optionless variant as the first configured variant', () => {
    const configured = parseOpenPlayVariants(JSON.stringify([
      { option1_value: '1 hour', price: 0, sku: 'FLEXI-01' },
      { option1_value: '2 hours', price: 0, sku: 'FLEXI-02' }
    ]), ['Hours']);

    const payload = reconcileOpenPlayVariants(configured, [variant({ variant_id: 'legacy-id' })]);
    expect(payload[0].variant_id).toBe('legacy-id');
    expect(payload[1].variant_id).toBeUndefined();
  });

  it('rejects an explicit variant ID that is not on the linked item', () => {
    const configured = parseOpenPlayVariants(JSON.stringify([
      { variant_id: 'wrong-id', option1_value: '1 hour', price: 0 }
    ]), ['Hours']);
    expect(() => reconcileOpenPlayVariants(configured, [variant({ variant_id: 'legacy-id' })])).toThrow(/does not belong/);
  });

  it('writes returned Loyverse IDs back by stable SKU', () => {
    const configured = parseOpenPlayVariants(JSON.stringify([
      { option1_value: '1 hour', price: 0, sku: 'FLEXI-01' }
    ]), ['Hours']);
    const result = writeBackVariantIds(configured, [variant({ variant_id: 'new-id', sku: 'FLEXI-01', option1_value: '1 hour' })]);
    expect(result[0].variant_id).toBe('new-id');
  });

  it('builds a bilingual Unicode-safe staff description', () => {
    expect(buildOpenPlayDescription({ description: 'CHECKOUT', thaiDescription: 'เช็กเอาต์' }))
      .toBe('EN\nCHECKOUT\n\nไทย\nเช็กเอาต์');
  });

  it('compares every variant rather than only the first', () => {
    const configured = parseOpenPlayVariants(JSON.stringify([
      { variant_id: 'one', option1_value: '1 hour', price: 0, sku: 'FLEXI-01' },
      { variant_id: 'two', option1_value: '2 hours', price: 0, sku: 'FLEXI-02' }
    ]), ['Hours punched this visit']);
    const loyverse = item({ variants: [
      variant({ variant_id: 'one', option1_value: '1 hour', sku: 'FLEXI-01' }),
      variant({ variant_id: 'two', option1_value: '2 hours', sku: 'WRONG' })
    ] });

    expect(compareOpenPlayVariants(configured, loyverse, ['Hours punched this visit', undefined, undefined]))
      .toContain('Variant SKU mismatch for 2 hours');
  });
});
