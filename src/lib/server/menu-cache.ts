import { NOTION_DBS, notion, validateNotionConfig } from '$lib/server/notion';
import { cachedNotionRead } from '$lib/server/cache/notion-cache';
import { buildNotionCacheKey } from '$lib/server/cache/notion-cache-keys';
import type { NotionCacheStore } from '$lib/server/cache/keyv';

const MENU_CACHE_TTL_MS = 5 * 60 * 1000;
const MENU_PROPERTIES = {
	name: 'Name',
	section: 'Section',
	category: 'Category',
	status: 'Status'
} as const;
const ACTIVE_MENU_QUERY = {
	filter: {
		property: MENU_PROPERTIES.status,
		status: { equals: 'Active' }
	},
	sorts: [{ property: MENU_PROPERTIES.name, direction: 'ascending' }],
	page_size: 100
} as const;
const buildMenuPagesCacheKey = (dataSourceId: string) => buildNotionCacheKey({
	operation: 'menu.queryActivePages',
	id: dataSourceId,
	params: ACTIVE_MENU_QUERY
});
const buildMenuCategoryOrderCacheKey = (dataSourceId: string) => buildNotionCacheKey({
	operation: 'menu.retrieveCategoryOrder',
	id: dataSourceId,
	params: { properties: [MENU_PROPERTIES.section, MENU_PROPERTIES.category] }
});

const getMenuDataSourceId = () => {
	validateNotionConfig();
	const dataSourceId = NOTION_DBS.MENU;
	if (!dataSourceId) {
		throw new Error('NOTION_MENU_DB_ID is not defined');
	}
	return dataSourceId;
};

const fetchMenuPagesFromNotion = async () => {
	const dataSourceId = getMenuDataSourceId();
	// Notion queries are paginated (max 100 results per request).
	// Without pagination, items can "disappear" from the menu once there are enough Active entries.
	const allResults: any[] = [];
	let startCursor: string | undefined = undefined;

	// eslint-disable-next-line no-constant-condition
	while (true) {
		const response: any = await (notion as any).dataSources.query({
			data_source_id: dataSourceId,
			...ACTIVE_MENU_QUERY,
			...(startCursor ? { start_cursor: startCursor } : {})
		});

		allResults.push(...(response.results ?? []));

		if (!response.has_more || !response.next_cursor) break;
		startCursor = response.next_cursor;
	}

	return allResults;
};

export const createMenuPagesReader = (cacheStore?: NotionCacheStore<any[]>, cacheEnabled?: boolean) =>
	async () => {
		const dataSourceId = getMenuDataSourceId();
		return cachedNotionRead({
			key: buildMenuPagesCacheKey(dataSourceId),
			op: 'menu.queryActivePages',
			ttlMs: MENU_CACHE_TTL_MS,
			store: cacheStore,
			enabled: cacheEnabled,
			fetcher: fetchMenuPagesFromNotion
		});
	};

const fetchMenuDataSourceFromNotion = async () => {
	const dataSourceId = getMenuDataSourceId();
	// Use dataSources.retrieve since NOTION_DBS.MENU is a Data Source ID.
	return (notion as any).dataSources.retrieve({ data_source_id: dataSourceId });
};

const toCategoryOrderMap = (ds: any): Map<string, number> => {
	const props = ds.properties;
	const categoryProp = props[MENU_PROPERTIES.section] || props[MENU_PROPERTIES.category];

	if (categoryProp && categoryProp.type === 'select' && categoryProp.select?.options) {
		const orderMap = new Map<string, number>();
		categoryProp.select.options.forEach((opt: any, index: number) => {
			orderMap.set(opt.name, index);
		});
		return orderMap;
	}

	return new Map();
};

export const createCategoryOrderMapReader = (cacheStore?: NotionCacheStore<any>, cacheEnabled?: boolean) =>
	async (): Promise<Map<string, number>> => {
		try {
			const dataSourceId = getMenuDataSourceId();
			const dataSource = await cachedNotionRead({
				key: buildMenuCategoryOrderCacheKey(dataSourceId),
				op: 'menu.retrieveCategoryOrder',
				ttlMs: MENU_CACHE_TTL_MS,
				store: cacheStore,
				enabled: cacheEnabled,
				fetcher: fetchMenuDataSourceFromNotion
			});
			return toCategoryOrderMap(dataSource);
		} catch (e) {
			console.error('Failed to fetch category order from Notion:', e);
		}
		return new Map();
	};
