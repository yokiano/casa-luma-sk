import { describe, expect, it } from 'vitest';
import { cleanMenuLabel, normalizeSectionKey, preparePublicMenuSummary } from './menu-display';
import type { MenuSummary } from './types/menu';

describe('cleanMenuLabel', () => {
	it('removes brackets and parenthetical suffixes', () => {
		expect(cleanMenuLabel('Pizza (One)')).toBe('Pizza');
		expect(cleanMenuLabel('Croissant [Vegan]')).toBe('Croissant');
		expect(cleanMenuLabel('Light & Fresh  (Kitchen )')).toBe('Light & Fresh');
	});
});

describe('normalizeSectionKey', () => {
	it('normalizes merged category names', () => {
		expect(normalizeSectionKey('Pizza (Two)')).toBe('pizza');
		expect(normalizeSectionKey('Pizza (One)')).toBe('pizza');
	});
});

describe('preparePublicMenuSummary', () => {
	it('merges parenthetical categories and keeps only active available items', () => {
		const menu: MenuSummary = {
			grandCategories: [
				{
					id: 'food',
					name: 'Food',
					sections: [
						{
							id: 'pizza-one',
							name: 'Pizza (One)',
							order: 1,
							items: [
								{
									id: '1',
									name: 'Margherita [Classic]',
									slug: 'margherita',
									section: 'Pizza (One)',
									grandCategory: 'Food',
									category: 'Pizza (One)',
									description: '',
									price: 100,
									dietaryTags: [],
									allergens: [],
									highlight: false,
									recommended: false,
									isAvailable: true,
									status: 'Active',
									tags: [],
									order: 1
								}
							]
						},
						{
							id: 'pizza-two',
							name: 'Pizza (Two)',
							order: 2,
							items: [
								{
									id: '2',
									name: 'Pepperoni',
									slug: 'pepperoni',
									section: 'Pizza (Two)',
									grandCategory: 'Food',
									category: 'Pizza (Two)',
									description: '',
									price: 120,
									dietaryTags: [],
									allergens: [],
									highlight: false,
									recommended: false,
									isAvailable: true,
									status: 'Active',
									tags: [],
									order: 2
								}
							]
						},
						{
							id: 'kitchen-extras',
							name: 'Kitchen Extras',
							order: 3,
							items: [
								{
									id: '3',
									name: 'Extra Egg',
									slug: 'extra-egg',
									section: 'Kitchen Extras',
									grandCategory: 'Food',
									category: 'Kitchen Extras',
									description: '',
									price: 30,
									dietaryTags: [],
									allergens: [],
									highlight: false,
									recommended: false,
									isAvailable: true,
									status: 'Active',
									tags: [],
									order: 1
								}
							]
						}
					]
				}
			],
			sections: [],
			highlights: [],
			tags: [],
			dietaryTags: [],
			allModifiers: []
		};

		const prepared = preparePublicMenuSummary(menu);
		expect(prepared.grandCategories[0].sections).toHaveLength(1);
		expect(prepared.grandCategories[0].sections[0].name).toBe('Pizza');
		expect(prepared.grandCategories[0].sections[0].items).toHaveLength(2);
		expect(prepared.grandCategories[0].sections[0].items[0].name).toBe('Margherita');
	});

	it('excludes items marked excludeFromMenu in Notion', () => {
		const menu: MenuSummary = {
			grandCategories: [
				{
					id: 'food',
					name: 'Food',
					sections: [
						{
							id: 'pizza',
							name: 'Pizza',
							order: 1,
							items: [
								{
									id: '1',
									name: 'Visible Pizza',
									slug: 'visible-pizza',
									section: 'Pizza',
									grandCategory: 'Food',
									category: 'Pizza',
									description: '',
									price: 100,
									dietaryTags: [],
									allergens: [],
									highlight: false,
									recommended: false,
									isAvailable: true,
									excludeFromMenu: false,
									status: 'Active',
									tags: ['public'],
									order: 1
								},
								{
									id: '2',
									name: 'Hidden Pizza',
									slug: 'hidden-pizza',
									section: 'Pizza',
									grandCategory: 'Food',
									category: 'Pizza',
									description: '',
									price: 120,
									dietaryTags: [],
									allergens: [],
									highlight: false,
									recommended: false,
									isAvailable: true,
									excludeFromMenu: true,
									status: 'Active',
									tags: ['internal'],
									order: 2
								}
							]
						}
					]
				}
			],
			sections: [],
			highlights: [],
			tags: ['internal', 'public'],
			dietaryTags: [],
			allModifiers: []
		};

		const prepared = preparePublicMenuSummary(menu);
		expect(prepared.grandCategories[0].sections[0].items).toHaveLength(1);
		expect(prepared.grandCategories[0].sections[0].items[0].name).toBe('Visible Pizza');
		expect(prepared.tags).toEqual(['public']);
	});
});
