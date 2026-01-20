import type { PageServerLoad } from './$types';
import { getMenuItems } from '$lib/menu.remote';
import { getActiveModifiers } from '$lib/modifiers.remote';
import type { MenuItem, MenuModifier } from '$lib/types/menu';

const INCLUDED_GRAND_CATEGORIES = new Set(['Food', 'Desserts', 'Kids']);

type CategoryGroup = {
	category: string;
	items: MenuItem[];
};

function sortItems(items: MenuItem[]) {
	return items.slice().sort((a, b) => {
		if ((a.order ?? 0) !== (b.order ?? 0)) return (a.order ?? 0) - (b.order ?? 0);
		return a.name.localeCompare(b.name);
	});
}

function groupByCategory(items: MenuItem[]): CategoryGroup[] {
	const map = new Map<string, MenuItem[]>();
	for (const item of items) {
		const key = item.category?.trim() || 'General';
		const arr = map.get(key);
		if (arr) arr.push(item);
		else map.set(key, [item]);
	}

	return Array.from(map.entries())
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([category, items]) => ({ category, items: sortItems(items) }));
}

function sortModifiers(modifiers: MenuModifier[]) {
	return modifiers.slice().sort((a, b) => {
		if ((a.position ?? 0) !== (b.position ?? 0)) return (a.position ?? 0) - (b.position ?? 0);
		return a.name.localeCompare(b.name);
	});
}

export const load: PageServerLoad = async () => {
	const [items, modifiersMap] = await Promise.all([getMenuItems(), getActiveModifiers()]);

	const filtered = items.filter((item) => INCLUDED_GRAND_CATEGORIES.has(item.grandCategory));
	const modifiers = sortModifiers(Array.from(modifiersMap.values()));

	return {
		role: 'Kitchen' as const,
		totalItems: filtered.length,
		groups: groupByCategory(filtered),
		modifiers
	};
};

