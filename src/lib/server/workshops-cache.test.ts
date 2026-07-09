import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NotionCacheStore } from '$lib/server/cache/keyv';

const notionQueryMock = vi.hoisted(() => vi.fn());

vi.mock('$lib/server/notion', () => ({
	NOTION_DBS: { EVENTS: 'events-ds' },
	notion: { dataSources: { query: notionQueryMock } },
	validateNotionConfig: vi.fn()
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

describe('workshops Notion cache integration', () => {
	beforeEach(() => {
		notionQueryMock.mockReset();
	});

	it('caches upcoming published event pages', async () => {
		const { createUpcomingEventPagesReader } = await import('$lib/server/workshops-cache');
		const store = new MemoryStore<unknown[]>();
		const readPages = createUpcomingEventPagesReader(store, true);
		notionQueryMock.mockResolvedValue({ results: [{ id: 'event-1' }] });

		const first = await readPages();
		const second = await readPages();

		expect(first).toEqual([{ id: 'event-1' }]);
		expect(second).toEqual(first);
		expect(notionQueryMock).toHaveBeenCalledOnce();
	});

	it('caches event pages looked up by slug', async () => {
		const { createEventPagesBySlugReader } = await import('$lib/server/workshops-cache');
		const store = new MemoryStore<unknown[]>();
		const readPages = createEventPagesBySlugReader(store, true);
		notionQueryMock.mockResolvedValue({ results: [{ id: 'event-slug-1' }] });

		const first = await readPages('fermentation-101');
		const second = await readPages('fermentation-101');

		expect(first).toEqual([{ id: 'event-slug-1' }]);
		expect(second).toEqual(first);
		expect(notionQueryMock).toHaveBeenCalledOnce();
	});

	it('caches event pages filtered by date range', async () => {
		const { createEventPagesByDateRangeReader } = await import('$lib/server/workshops-cache');
		const store = new MemoryStore<unknown[]>();
		const readPages = createEventPagesByDateRangeReader(store, true);
		notionQueryMock.mockResolvedValue({ results: [{ id: 'event-range-1' }] });

		const params = {
			startDate: '2026-06-01T00:00:00.000Z',
			endDate: '2026-07-01T00:00:00.000Z',
			eventType: 'Workshop'
		};
		const first = await readPages(params);
		const second = await readPages(params);

		expect(first).toEqual([{ id: 'event-range-1' }]);
		expect(second).toEqual(first);
		expect(notionQueryMock).toHaveBeenCalledOnce();
	});

	it('bypasses the persistent cache when the kill switch is disabled', async () => {
		const { createUpcomingEventPagesReader } = await import('$lib/server/workshops-cache');
		const store = new MemoryStore<unknown[]>();
		const readPages = createUpcomingEventPagesReader(store, false);
		notionQueryMock.mockResolvedValue({ results: [{ id: 'event-1' }] });

		await readPages();
		await readPages();

		expect(notionQueryMock).toHaveBeenCalledTimes(2);
	});
});
