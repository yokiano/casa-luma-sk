import type { MenuGrandCategory, MenuItem, MenuSummary, StructuredMenuSection } from '$lib/types/menu';

/** Normalized section keys hidden from the public online menu. */
export const EXCLUDED_MENU_SECTION_KEYS = new Set([
	'kitchen extras',
	'bar extras',
	'staff only',
	'modifiers'
]);

/** Strip bracketed text and parenthetical suffixes for display/grouping. */
export function cleanMenuLabel(value: string | undefined): string {
	if (!value) return '';
	return value
		.replace(/\[.*?\]/g, '')
		.replace(/\s*\([^)]*\)\s*/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
}

export function normalizeSectionKey(value: string | undefined): string {
	return cleanMenuLabel(value).toLowerCase();
}

export function isPublicMenuItem(item: MenuItem): boolean {
	return item.status === 'Active' && item.isAvailable && !item.excludeFromMenu;
}

function sortItems(items: MenuItem[]) {
	return items.slice().sort((a, b) => {
		if (a.order !== b.order) return a.order - b.order;
		return a.name.localeCompare(b.name);
	});
}

function prepareMenuItem(item: MenuItem): MenuItem {
	return {
		...item,
		name: cleanMenuLabel(item.name),
		description: item.description ? cleanMenuLabel(item.description) : '',
		section: cleanMenuLabel(item.section),
		category: cleanMenuLabel(item.category),
		grandCategory: cleanMenuLabel(item.grandCategory)
	};
}

function mergeSections(sections: StructuredMenuSection[]): StructuredMenuSection[] {
	const merged = new Map<string, StructuredMenuSection>();

	for (const section of sections) {
		const displayName = cleanMenuLabel(section.name);
		const key = normalizeSectionKey(displayName);
		if (!displayName || EXCLUDED_MENU_SECTION_KEYS.has(key)) continue;

		const items = sortItems(section.items.filter(isPublicMenuItem).map(prepareMenuItem));
		if (items.length === 0) continue;

		const existing = merged.get(key);
		if (!existing) {
			merged.set(key, {
				...section,
				id: key.replace(/[^a-z0-9]+/g, '-'),
				name: displayName,
				intro: section.intro ? cleanMenuLabel(section.intro) : undefined,
				items
			});
			continue;
		}

		existing.items = sortItems([...existing.items, ...items]);
		if (!existing.intro && section.intro) {
			existing.intro = cleanMenuLabel(section.intro);
		}
	}

	return Array.from(merged.values()).sort((a, b) => {
		if (a.order !== b.order) return a.order - b.order;
		return a.name.localeCompare(b.name);
	});
}

/** Shape menu data for the public online menu page. */
export function preparePublicMenuSummary(menu: MenuSummary): MenuSummary {
	const grandCategories: MenuGrandCategory[] = menu.grandCategories
		.map((grand) => {
			const name = cleanMenuLabel(grand.name);
			const sections = mergeSections(grand.sections);
			if (sections.length === 0) return null;

			return {
				...grand,
				id: normalizeSectionKey(name).replace(/[^a-z0-9]+/g, '-'),
				name,
				sections
			};
		})
		.filter((grand): grand is MenuGrandCategory => grand !== null);

	const highlights = sortItems(
		menu.highlights.filter(isPublicMenuItem).map(prepareMenuItem)
	);

	const publicItems = grandCategories.flatMap((grand) => grand.sections.flatMap((section) => section.items));
	const tags = Array.from(new Set(publicItems.flatMap((item) => item.tags))).sort();
	const dietaryTags = Array.from(new Set(publicItems.flatMap((item) => item.dietaryTags))).sort() as MenuSummary['dietaryTags'];

	return {
		...menu,
		grandCategories,
		sections: grandCategories.flatMap((grand) => grand.sections),
		highlights,
		tags,
		dietaryTags
	};
}
