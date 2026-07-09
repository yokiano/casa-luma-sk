import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NotionCacheStore } from '$lib/server/cache/keyv';

const membershipsQueryMock = vi.hoisted(() => vi.fn());
const flexiPassesQueryMock = vi.hoisted(() => vi.fn());
const fetchFamiliesByIdsMock = vi.hoisted(() => vi.fn());
const queryFamilyMatchesMock = vi.hoisted(() => vi.fn());

vi.mock('$env/static/private', () => ({ NOTION_API_KEY: 'test-notion-key' }));
vi.mock('$lib/notion-sdk/dbs/memberships/db', () => ({
	MembershipsDatabase: vi.fn().mockImplementation(() => ({
		query: membershipsQueryMock
	}))
}));
vi.mock('$lib/notion-sdk/dbs/flexi-passes/db', () => ({
	FlexiPassesDatabase: vi.fn().mockImplementation(() => ({
		query: flexiPassesQueryMock
	}))
}));
vi.mock('$lib/tools/families/families.server', () => ({
	fetchFamiliesByIds: fetchFamiliesByIdsMock,
	queryFamilyMatches: queryFamilyMatchesMock,
	getSearchVariations: (search: string) => [search]
}));

class MemoryStore<T = unknown> implements NotionCacheStore<T> {
	private values = new Map<string, T>();

	async get<V = T>(key: string): Promise<V | undefined> {
		const value = this.values.get(key);
		return value === undefined ? undefined : (structuredClone(value) as unknown as V);
	}

	async set(key: string, value: T): Promise<boolean> {
		this.values.set(key, structuredClone(value));
		return true;
	}
}

const membershipPage = (id: string, createdTime: string) => ({
	id,
	created_time: createdTime,
	last_edited_time: createdTime,
	properties: {
		Name: { title: [{ plain_text: `Membership ${id}`, href: null }] },
		Type: { select: { name: 'Monthly' } },
		'Number of Kids': { number: 2 },
		'Start Date': null,
		'End Date': null,
		Status: { formula: { string: 'Active' } },
		Notes: { rich_text: [] },
		Receipt: { url: null },
		Family: { relation: [] }
	}
});

const flexiPassPage = (id: string, createdTime: string) => ({
	id,
	created_time: createdTime,
	last_edited_time: createdTime,
	properties: {
		Name: { title: [{ plain_text: `Flexi ${id}`, href: null }] },
		'Valid From': null,
		'Valid Until': null,
		'Automation Status': { select: { name: 'Active' } },
		Notes: { rich_text: [] },
		'Source Receipt URL': { url: null },
		Family: { relation: [] },
		'Card Count': { number: 1 },
		'Entries Granted': { number: 10 },
		'Entries Used': { number: 0 },
		'Entries Left': { number: 10 }
	}
});

describe('memberships Notion cache integration', () => {
	beforeEach(() => {
		membershipsQueryMock.mockReset();
		flexiPassesQueryMock.mockReset();
		fetchFamiliesByIdsMock.mockReset();
		queryFamilyMatchesMock.mockReset();
		fetchFamiliesByIdsMock.mockResolvedValue(new Map());
	});

	it('caches aggregated membership and flexi-pass list results', async () => {
		const { createGetMembershipsDataReader } = await import('$lib/server/memberships-cache');
		const store = new MemoryStore();
		const readMemberships = createGetMembershipsDataReader(store, true);
		membershipsQueryMock.mockResolvedValue({
			results: [membershipPage('membership-1', '2026-06-02T00:00:00.000Z')],
			next_cursor: null,
			has_more: false
		});
		flexiPassesQueryMock.mockResolvedValue({
			results: [flexiPassPage('flexi-1', '2026-06-01T00:00:00.000Z')],
			next_cursor: null,
			has_more: false
		});

		const first = await readMemberships({});
		const second = await readMemberships({});

		expect(first.items).toHaveLength(2);
		expect(first.items[0]?.id).toBe('membership-1');
		expect(first.items[1]?.id).toBe('flexi-1');
		expect(second).toEqual(first);
		expect(membershipsQueryMock).toHaveBeenCalledOnce();
		expect(flexiPassesQueryMock).toHaveBeenCalledOnce();
		expect(fetchFamiliesByIdsMock).toHaveBeenCalledOnce();
	});

	it('limits the default list to recent created records when no search is provided', async () => {
		const { createGetMembershipsDataReader } = await import('$lib/server/memberships-cache');
		const store = new MemoryStore();
		const readMemberships = createGetMembershipsDataReader(store, false);
		membershipsQueryMock.mockResolvedValue({
			results: [],
			next_cursor: null,
			has_more: false
		});
		flexiPassesQueryMock.mockResolvedValue({
			results: [],
			next_cursor: null,
			has_more: false
		});

		await readMemberships({});

		const recentFilter = {
			timestamp: 'created_time',
			created_time: { on_or_after: expect.any(String) }
		};
		expect(membershipsQueryMock).toHaveBeenCalledWith(
			expect.objectContaining({ filter: recentFilter })
		);
		expect(flexiPassesQueryMock).toHaveBeenCalledWith(
			expect.objectContaining({ filter: recentFilter })
		);
	});

	it('does not apply the recent created filter when searching', async () => {
		const { createGetMembershipsDataReader } = await import('$lib/server/memberships-cache');
		const store = new MemoryStore();
		const readMemberships = createGetMembershipsDataReader(store, false);
		queryFamilyMatchesMock.mockResolvedValue([]);
		membershipsQueryMock.mockResolvedValue({
			results: [],
			next_cursor: null,
			has_more: false
		});
		flexiPassesQueryMock.mockResolvedValue({
			results: [],
			next_cursor: null,
			has_more: false
		});

		await readMemberships({ search: 'smith' });

		expect(membershipsQueryMock).toHaveBeenCalledWith(
			expect.objectContaining({
				filter: expect.objectContaining({ or: expect.any(Array) })
			})
		);
		expect(flexiPassesQueryMock).toHaveBeenCalledWith(
			expect.objectContaining({
				filter: expect.objectContaining({ or: expect.any(Array) })
			})
		);
	});

	it('bypasses the persistent cache when the kill switch is disabled', async () => {
		const { createGetMembershipsDataReader } = await import('$lib/server/memberships-cache');
		const store = new MemoryStore();
		const readMemberships = createGetMembershipsDataReader(store, false);
		membershipsQueryMock.mockResolvedValue({
			results: [membershipPage('membership-1', '2026-06-02T00:00:00.000Z')],
			next_cursor: null,
			has_more: false
		});
		flexiPassesQueryMock.mockResolvedValue({
			results: [],
			next_cursor: null,
			has_more: false
		});

		await readMemberships({});
		await readMemberships({});

		expect(membershipsQueryMock).toHaveBeenCalledTimes(2);
		expect(flexiPassesQueryMock).toHaveBeenCalledTimes(2);
		expect(fetchFamiliesByIdsMock).toHaveBeenCalledTimes(2);
	});
});
