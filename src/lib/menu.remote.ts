import { query } from '$app/server';
import { NOTION_DBS, notion, validateNotionConfig } from '$lib/server/notion';
import {
	getCheckboxValue,
	getFilesUrls,
	getFormulaValue,
	getMultiSelectValues,
	getNumberValue,
	getSelectValue,
	getTextContent,
	getUrlValue
} from '$lib/server/notion';
import type { MenuGrandCategory, MenuItem, MenuSummary, StructuredMenuSection } from '$lib/types/menu';
import * as v from 'valibot';

const MENU_PROPERTIES = {
	name: 'Name',
	slug: 'Slug',
	section: 'Section',
	category: 'Category',
	grandCategory: 'Grand Category',
	description: 'Description',
	price: 'Price',
	secondaryPrice: 'Secondary Price',
	currency: 'Currency',
	dietary: 'Dietary Options',
	allergens: 'Allergens',
	highlight: 'Highlight',
	available: 'Available',
	archived: 'Archived',
	availabilityWindow: 'Availability',
	image: 'Image',
	gallery: 'Gallery',
	tags: 'Ingridients',
	order: 'Order',
	sectionIntro: 'Section Intro',
	sectionAccent: 'Section Accent Color',
	sectionBackground: 'Section Background'
} as const;

const ensureMenuConfigured = () => {
	validateNotionConfig();
	if (!NOTION_DBS.MENU) {
		throw new Error('NOTION_MENU_DB_ID is not defined');
	}
};

const fallbackCurrency = 'THB';

const getCurrency = (price: number, currencyRaw: string) => {
	if (currencyRaw) return currencyRaw;
	if (price >= 1000) return 'THB';
	return fallbackCurrency;
};

const toMenuItem = (page: any): MenuItem => {
	const props = page.properties ?? {};

	const price = getNumberValue(props[MENU_PROPERTIES.price]);
	const secondPrice = getNumberValue(props[MENU_PROPERTIES.secondaryPrice]);

	const slugCandidate = props[MENU_PROPERTIES.slug]
		? (getFormulaValue(props[MENU_PROPERTIES.slug]) as string)
		: '';

	const gallery = getFilesUrls(props[MENU_PROPERTIES.gallery], page.id);
	const sectionValue = getSelectValue(props[MENU_PROPERTIES.section]);
	const categoryValue = getSelectValue(props[MENU_PROPERTIES.category]) || 'General';
	const grandCategoryValue = getSelectValue(props[MENU_PROPERTIES.grandCategory]) || 'Menu';
	const availabilityValue = getSelectValue(props[MENU_PROPERTIES.availabilityWindow]);

	return {
		id: page.id,
		name: getTextContent(props[MENU_PROPERTIES.name]) || 'Untitled Item',
		slug: slugCandidate || page.id,
		section: sectionValue || categoryValue,
		grandCategory: grandCategoryValue,
		category: categoryValue,
		description: getTextContent(props[MENU_PROPERTIES.description]),
		price,
		secondaryPrice: secondPrice > 0 ? secondPrice : undefined,
		currency: getCurrency(price, getSelectValue(props[MENU_PROPERTIES.currency])),
		dietaryTags: getMultiSelectValues(props[MENU_PROPERTIES.dietary]) as MenuItem['dietaryTags'],
		allergens: getMultiSelectValues(props[MENU_PROPERTIES.allergens]),
		highlight: getCheckboxValue(props[MENU_PROPERTIES.highlight]),
		isAvailable: props[MENU_PROPERTIES.available]
			? getCheckboxValue(props[MENU_PROPERTIES.available])
			: true,
		archived: getCheckboxValue(props[MENU_PROPERTIES.archived]),
		availabilityWindow: availabilityValue
			? (availabilityValue as MenuItem['availabilityWindow'])
			: undefined,
		image: getFilesUrls(props[MENU_PROPERTIES.image], page.id)[0],
		gallery: gallery.length > 0 ? gallery : undefined,
		tags: getMultiSelectValues(props[MENU_PROPERTIES.tags]),
		order: getNumberValue(props[MENU_PROPERTIES.order]) || 0
	};
};

const sectionMetadata = (sections: Map<string, StructuredMenuSection>, item: MenuItem, props: any) => {
	const name = item.section;
	if (!sections.has(name)) {
		sections.set(name, {
			id: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
			name,
		intro: getTextContent(props[MENU_PROPERTIES.sectionIntro]),
		accentColor: getTextContent(props[MENU_PROPERTIES.sectionAccent]) || undefined,
		backgroundImage:
			getFilesUrls(props[MENU_PROPERTIES.sectionBackground])[0] ||
			getUrlValue(props[MENU_PROPERTIES.sectionBackground]) ||
			undefined,
			order: getNumberValue(props[MENU_PROPERTIES.order]) || 0,
			items: []
		});
	}
	return sections.get(name)!;
};

const grandCategoryMetadata = (grandCategories: Map<string, MenuGrandCategory>, item: MenuItem) => {
	const name = item.grandCategory || 'Menu';
	if (!grandCategories.has(name)) {
		grandCategories.set(name, {
			id: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
			name,
			sections: []
		});
	}
	return grandCategories.get(name)!;
};

const sortItems = (items: MenuItem[]) =>
	items
		.slice()
		.sort((a, b) => {
			if (a.order !== b.order) return a.order - b.order;
			return a.name.localeCompare(b.name);
		});

const sortSections = (sections: StructuredMenuSection[]) =>
	sections
		.slice()
		.sort((a, b) => {
			if (a.order !== b.order) return a.order - b.order;
			return a.name.localeCompare(b.name);
		});

const GRAND_CATEGORY_ORDER: Record<string, number> = {
	Food: 10,
	Drinks: 20,
	Kids: 30,
	Desserts: 40
};

const sortGrandCategories = (categories: MenuGrandCategory[]) =>
	categories
		.slice()
		.sort((a, b) => {
			const aOrder = GRAND_CATEGORY_ORDER[a.name] ?? 999;
			const bOrder = GRAND_CATEGORY_ORDER[b.name] ?? 999;
			if (aOrder !== bOrder) return aOrder - bOrder;
			return a.name.localeCompare(b.name);
		});

const buildSummary = (pages: any[]): MenuSummary => {
	const sections = new Map<string, StructuredMenuSection>();
	const grandCategories = new Map<string, MenuGrandCategory>();
	const sectionsByGrand = new Map<string, Map<string, StructuredMenuSection>>();
	const highlights: MenuItem[] = [];
	const tags = new Set<string>();
	const dietary = new Set<string>();

	for (const page of pages) {
		const props = page.properties ?? {};
		const item = toMenuItem(page);
		if (item.archived) continue;
		const section = sectionMetadata(sections, item, props);
		section.items.push(item);

		const grandCategory = grandCategoryMetadata(grandCategories, item);
		if (!sectionsByGrand.has(grandCategory.name)) {
			sectionsByGrand.set(grandCategory.name, new Map<string, StructuredMenuSection>());
		}
		const grandSections = sectionsByGrand.get(grandCategory.name)!;
		const grandSection = sectionMetadata(grandSections, item, props);
		grandSection.items.push(item);

		if (item.highlight) {
			highlights.push(item);
		}
		item.tags.forEach((tag) => tags.add(tag));
		item.dietaryTags.forEach((tag) => dietary.add(tag));
	}

	const structuredSections = sortSections(
		Array.from(sections.values()).map((section) => ({
			...section,
			items: sortItems(section.items)
		}))
	);

	const structuredGrandCategories = sortGrandCategories(
		Array.from(grandCategories.values()).map((category) => {
			const grandSections = sectionsByGrand.get(category.name) ?? new Map<string, StructuredMenuSection>();
			const sections = sortSections(
				Array.from(grandSections.values()).map((section) => ({
					...section,
					items: sortItems(section.items)
				}))
			);
			return {
				...category,
				sections
			};
		})
	);

	return {
		grandCategories: structuredGrandCategories,
		sections: structuredSections,
		highlights: sortItems(highlights),
		tags: Array.from(tags).sort(),
		dietaryTags: Array.from(dietary).sort() as MenuSummary['dietaryTags']
	};
};

const queryMenuPages = async () => {
	ensureMenuConfigured();
	const response = await notion.dataSources.query({
		data_source_id: NOTION_DBS.MENU,
		filter: {
			property: MENU_PROPERTIES.archived,
			checkbox: { equals: false }
		},
		sorts: [{ property: MENU_PROPERTIES.name, direction: 'ascending' }]
	});
	return response.results ?? [];
};

export const getMenuSummary = query(async () => {
	const pages = await queryMenuPages();
	return buildSummary(pages);
});

export const getMenuItems = query(async () => {
	const pages = await queryMenuPages();
	return pages.map(toMenuItem);
});

export const getMenuSection = query(
	v.pipe(v.string(), v.minLength(1)),
	async (sectionName) => {
		const pages = await queryMenuPages();
		const summary = buildSummary(pages);
		return summary.sections.find((section) => section.name === sectionName);
	}
);

