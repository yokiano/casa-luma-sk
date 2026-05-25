import { describe, expect, it } from 'vitest';
import { buildRecipeCostVariantFields } from './menu-sync.costs';

describe('menu sync recipe cost payload fields', () => {
	it('omits all cost fields when recipe COGS is unavailable', () => {
		expect(buildRecipeCostVariantFields(undefined, true)).toEqual({});
	});

	it('sends cost only for non-stock-tracked Loyverse items', () => {
		expect(buildRecipeCostVariantFields(42.5, false)).toEqual({ cost: 42.5 });
	});

	it('includes purchase_cost only when stock tracking allows it', () => {
		expect(buildRecipeCostVariantFields(42.5, true)).toEqual({ cost: 42.5, purchase_cost: 42.5 });
	});
});
