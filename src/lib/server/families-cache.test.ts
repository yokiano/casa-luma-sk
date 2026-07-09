import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NotionCacheStore } from '$lib/server/cache/keyv';

const familiesQueryMock = vi.hoisted(() => vi.fn());
const familiesGetPageMock = vi.hoisted(() => vi.fn());
const membersQueryMock = vi.hoisted(() => vi.fn());

vi.mock('$env/static/private', () => ({ NOTION_API_KEY: 'test-notion-key' }));
vi.mock('$lib/notion-sdk/dbs/families/db', () => ({
	FamiliesDatabase: vi.fn().mockImplementation(() => ({
		query: familiesQueryMock,
		getPage: familiesGetPageMock
	}))
}));
vi.mock('$lib/notion-sdk/dbs/family-members/db', () => ({
	FamilyMembersDatabase: vi.fn().mockImplementation(() => ({
		query: membersQueryMock
	}))
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

const familyPage = (id: string, familyName: string) => ({
	id,
	created_time: '2026-01-01T00:00:00.000Z',
	last_edited_time: '2026-01-01T00:00:00.000Z',
	properties: {
		'Family Name': { title: [{ plain_text: familyName, href: null }] },
		'Customer Code': { rich_text: [] },
		'Loyverse Customer ID': { rich_text: [] },
		'Main Phone': null,
		'Main Email': null,
		Status: { select: { name: 'Active' } }
	}
});

describe('families Notion cache integration', () => {
	beforeEach(() => {
		familiesQueryMock.mockReset();
		familiesGetPageMock.mockReset();
		membersQueryMock.mockReset();
	});

	it('caches families fetched by id', async () => {
		const { createFamiliesByIdsReader } = await import('$lib/server/families-cache');
		const store = new MemoryStore<Record<string, unknown>>();
		const readFamilies = createFamiliesByIdsReader(store, true);
		familiesGetPageMock.mockResolvedValue(familyPage('family-1', 'Nguyen Family'));

		const first = await readFamilies(['family-1']);
		const second = await readFamilies(['family-1']);

		expect(first.get('family-1')?.familyName).toBe('Nguyen Family');
		expect(second.get('family-1')).toEqual(first.get('family-1'));
		expect(familiesGetPageMock).toHaveBeenCalledOnce();
	});

	it('caches aggregated family search results', async () => {
		const { createSearchFamiliesDataReader } = await import('$lib/server/families-cache');
		const store = new MemoryStore<unknown[]>();
		const readSearch = createSearchFamiliesDataReader(store, true);
		familiesQueryMock.mockResolvedValue({ results: [familyPage('family-1', 'Nguyen Family')] });
		membersQueryMock.mockResolvedValue({ results: [] });

		const first = await readSearch('nguyen');
		const second = await readSearch('nguyen');

		expect(first).toHaveLength(1);
		expect(first[0]?.familyName).toBe('Nguyen Family');
		expect(second).toEqual(first);
		expect(familiesQueryMock).toHaveBeenCalledOnce();
		// Member search plus member attachment for matched families.
		expect(membersQueryMock).toHaveBeenCalledTimes(2);
	});

	it('bypasses the persistent cache when the kill switch is disabled', async () => {
		const { createFamiliesByIdsReader } = await import('$lib/server/families-cache');
		const store = new MemoryStore<Record<string, unknown>>();
		const readFamilies = createFamiliesByIdsReader(store, false);
		familiesGetPageMock.mockResolvedValue(familyPage('family-1', 'Nguyen Family'));

		await readFamilies(['family-1']);
		await readFamilies(['family-1']);

		expect(familiesGetPageMock).toHaveBeenCalledTimes(2);
	});
});
