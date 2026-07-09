import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NotionCacheStore } from '$lib/server/cache/keyv';

const notionQueryMock = vi.hoisted(() => vi.fn());
const notionRetrieveMock = vi.hoisted(() => vi.fn());

vi.mock('$lib/server/notion', () => ({
	NOTION_DBS: { MENU: 'menu-ds' },
	notion: { dataSources: { query: notionQueryMock, retrieve: notionRetrieveMock } },
	validateNotionConfig: vi.fn(),
	getCheckboxValue: vi.fn(),
	getFilesUrls: vi.fn(),
	getFormulaValue: vi.fn(),
	getMultiSelectValues: vi.fn(),
	getNumberValue: vi.fn(),
	getSelectValue: vi.fn(),
	getStatusValue: vi.fn(),
	getTextContent: vi.fn(),
	getUrlValue: vi.fn(),
	getRelationIds: vi.fn()
}));

class MemoryStore<T = unknown> implements NotionCacheStore<T> {
	private values = new Map<string, T>();

	async get<V = T>(key: string): Promise<V | undefined> {
		const value = this.values.get(key);
		return value === undefined ? undefined : structuredClone(value) as unknown as V;
	}

	async set(key: string, value: T): Promise<boolean> {
		this.values.set(key, structuredClone(value));
		return true;
	}
}

describe('menu Notion cache integration', () => {
	beforeEach(() => {
		notionQueryMock.mockReset();
		notionRetrieveMock.mockReset();
	});

	it('caches the full aggregated active menu pagination result', async () => {
		const { createMenuPagesReader } = await import('$lib/server/menu-cache');
		const store = new MemoryStore<any[]>();
		const readPages = createMenuPagesReader(store, true);
		notionQueryMock
			.mockResolvedValueOnce({ results: [{ id: 'page-1' }], has_more: true, next_cursor: 'cursor-2' })
			.mockResolvedValueOnce({ results: [{ id: 'page-2' }], has_more: false, next_cursor: null });

		const first = await readPages();
		const second = await readPages();

		expect(first).toEqual([{ id: 'page-1' }, { id: 'page-2' }]);
		expect(second).toEqual(first);
		expect(notionQueryMock).toHaveBeenCalledTimes(2);
		expect(notionQueryMock.mock.calls[1]?.[0]).toMatchObject({ start_cursor: 'cursor-2' });
	});

	it('caches the menu data source used for category order', async () => {
		const { createCategoryOrderMapReader } = await import('$lib/server/menu-cache');
		const store = new MemoryStore<Record<string, unknown>>();
		const readCategoryOrder = createCategoryOrderMapReader(store, true);
		notionRetrieveMock.mockResolvedValue({
			properties: {
				Section: {
					type: 'select',
					select: { options: [{ name: 'Coffee' }, { name: 'Food' }] }
				}
			}
		});

		const first = await readCategoryOrder();
		const second = await readCategoryOrder();

		expect(Array.from(first.entries())).toEqual([
			['Coffee', 0],
			['Food', 1]
		]);
		expect(Array.from(second.entries())).toEqual(Array.from(first.entries()));
		expect(notionRetrieveMock).toHaveBeenCalledOnce();
	});
});
