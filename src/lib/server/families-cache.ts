import { NOTION_API_KEY } from '$env/static/private';
import { FamiliesDatabase } from '$lib/notion-sdk/dbs/families/db';
import { FamiliesResponseDTO } from '$lib/notion-sdk/dbs/families/response.dto';
import { FamilyMembersDatabase } from '$lib/notion-sdk/dbs/family-members/db';
import { FamilyMembersResponseDTO } from '$lib/notion-sdk/dbs/family-members/response.dto';
import { cachedNotionRead, invalidateNotionCacheKey, isNotionCacheEnabled } from '$lib/server/cache/notion-cache';
import { buildNotionCacheKey } from '$lib/server/cache/notion-cache-keys';
import { getNotionKeyv, type NotionCacheStore } from '$lib/server/cache/keyv';
import type { FamilyMemberSummary, FamilySummary } from '$lib/tools/families/families.shared';
import { getSearchVariations, toFamilySummary } from '$lib/tools/families/families.shared';

const FAMILIES_DB_ID = '4dd6c32d9b0244fbbed6e6b41033e598';
const FAMILY_MEMBERS_DB_ID = '31ab63b732784d59a20ae0427f1c9431';
const FAMILIES_CACHE_TTL_MS = 5 * 60 * 1000;

const normalizeSearch = (value?: string | null) => value?.trim() ?? '';

const buildFamilySearchCacheKey = (search: string) =>
	buildNotionCacheKey({
		operation: 'families.searchAggregated',
		id: FAMILIES_DB_ID,
		params: { search: normalizeSearch(search).toLowerCase() }
	});

const buildFamiliesByIdsCacheKey = (familyIds: string[]) =>
	buildNotionCacheKey({
		operation: 'families.byIds',
		id: FAMILIES_DB_ID,
		params: { ids: [...new Set(familyIds)].sort() }
	});

const buildFamilyByLoyverseCustomerIdCacheKey = (loyverseCustomerId: string) =>
	buildNotionCacheKey({
		operation: 'families.byLoyverseCustomerId',
		id: FAMILIES_DB_ID,
		params: { loyverseCustomerId: normalizeSearch(loyverseCustomerId) }
	});

const buildFamilyQueryMatchesCacheKey = (search: string) =>
	buildNotionCacheKey({
		operation: 'families.queryMatches',
		id: FAMILIES_DB_ID,
		params: { search: normalizeSearch(search).toLowerCase() }
	});

const recordToFamilyMap = (record: Record<string, FamilySummary>) => new Map(Object.entries(record));

const familyMapToRecord = (map: Map<string, FamilySummary>) => Object.fromEntries(map);

const queryFamilyMatchesUncached = async (search: string, pageSize = 50): Promise<FamiliesResponseDTO[]> => {
	const db = new FamiliesDatabase({ notionSecret: NOTION_API_KEY });
	const variations = getSearchVariations(search);

	const response = await db.query({
		page_size: pageSize,
		filter: {
			or: variations.flatMap((v) => [
				{ familyName: { contains: v } },
				{ customerNumber: { contains: v } },
				{ mainPhone: { contains: v } },
				{ mainEmail: { contains: v } }
			])
		},
		sorts: [{ property: 'familyName', direction: 'ascending' }]
	});

	return response.results.map((result) => new FamiliesResponseDTO(result as any));
};

const queryMemberMatchesUncached = async (search: string, pageSize = 50): Promise<FamilyMembersResponseDTO[]> => {
	const db = new FamilyMembersDatabase({ notionSecret: NOTION_API_KEY });
	const variations = getSearchVariations(search);

	const response = await db.query({
		page_size: pageSize,
		filter: {
			or: variations.flatMap((v) => [
				{ name: { contains: v } },
				{ phone: { contains: v } },
				{ email: { contains: v } }
			])
		}
	});

	return response.results.map((result) => new FamilyMembersResponseDTO(result as any));
};

const fetchFamiliesByIdsUncached = async (familyIds: string[]): Promise<Map<string, FamilySummary>> => {
	if (familyIds.length === 0) return new Map();

	const uniqueIds = Array.from(new Set(familyIds));
	const map = new Map<string, FamilySummary>();
	const db = new FamiliesDatabase({ notionSecret: NOTION_API_KEY });

	const CHUNK_SIZE = 5;
	for (let i = 0; i < uniqueIds.length; i += CHUNK_SIZE) {
		const chunk = uniqueIds.slice(i, i + CHUNK_SIZE);
		const results = await Promise.allSettled(chunk.map((id) => db.getPage(id)));

		results.forEach((result, index) => {
			if (result.status !== 'fulfilled') return;
			const id = chunk[index];
			const dto = new FamiliesResponseDTO(result.value as any);
			map.set(id, toFamilySummary(dto));
		});
	}

	return map;
};

const fetchFamilyByLoyverseCustomerIdUncached = async (
	loyverseCustomerId: string
): Promise<FamilySummary | null> => {
	const normalizedCustomerId = normalizeSearch(loyverseCustomerId);
	if (!normalizedCustomerId) return null;

	const db = new FamiliesDatabase({ notionSecret: NOTION_API_KEY });
	const response = await db.query({
		page_size: 5,
		filter: {
			loyverseCustomerId: { contains: normalizedCustomerId }
		}
	} as any);

	const familyDto = response.results
		.map((result) => new FamiliesResponseDTO(result as any))
		.find((dto) => normalizeSearch(dto.properties.loyverseCustomerId?.text) === normalizedCustomerId);

	if (!familyDto) return null;

	const membersDb = new FamilyMembersDatabase({ notionSecret: NOTION_API_KEY });
	const membersResponse = await membersDb.query({
		filter: { family: { contains: familyDto.id } }
	} as any);

	const members = membersResponse.results.map((result) => {
		const member = new FamilyMembersResponseDTO(result as any);
		return {
			id: member.id,
			name: member.properties.name?.text ?? 'Untitled Member',
			type: member.properties.memberType?.name ?? null,
			email: member.properties.email ?? null,
			phone: member.properties.phone ?? null
		};
	});

	return toFamilySummary(familyDto, members);
};

const searchFamiliesDataUncached = async (search: string) => {
	const normalizedSearch = normalizeSearch(search);
	if (!normalizedSearch) return [];

	const [familyMatches, memberMatches] = await Promise.all([
		queryFamilyMatchesUncached(normalizedSearch),
		queryMemberMatchesUncached(normalizedSearch)
	]);

	const familyMatchesMap = new Map(familyMatches.map((dto) => [dto.id, dto]));

	const extraFamilyIds = memberMatches
		.flatMap((m) => m.properties.familyIds)
		.filter((id) => !familyMatchesMap.has(id));

	const uniqueExtraIds = Array.from(new Set(extraFamilyIds)).slice(0, 20);

	let finalFamilies: FamilySummary[] = familyMatches.map((dto) => toFamilySummary(dto));

	if (uniqueExtraIds.length > 0) {
		const familiesDb = new FamiliesDatabase({ notionSecret: NOTION_API_KEY });

		const CHUNK_SIZE = 3;
		for (let i = 0; i < uniqueExtraIds.length; i += CHUNK_SIZE) {
			const chunk = uniqueExtraIds.slice(i, i + CHUNK_SIZE);
			const results = await Promise.allSettled(chunk.map((id) => familiesDb.getPage(id)));

			results.forEach((result) => {
				if (result.status !== 'fulfilled') return;
				const dto = new FamiliesResponseDTO(result.value as any);
				finalFamilies.push(toFamilySummary(dto));
			});
		}
	}

	const finalFamilyIds = finalFamilies.map((f) => f.id);
	const membersByFamilyId = new Map<string, FamilyMemberSummary[]>();

	if (finalFamilyIds.length > 0) {
		const membersDb = new FamilyMembersDatabase({ notionSecret: NOTION_API_KEY });

		const CHUNK_SIZE = 20;
		const idChunks: string[][] = [];
		for (let i = 0; i < finalFamilyIds.length; i += CHUNK_SIZE) {
			idChunks.push(finalFamilyIds.slice(i, i + CHUNK_SIZE));
		}

		for (const chunk of idChunks) {
			const res = await membersDb.query({
				filter: { or: chunk.map((id) => ({ family: { contains: id } })) }
			});

			for (const r of res.results) {
				const member = new FamilyMembersResponseDTO(r as any);
				const summary: FamilyMemberSummary = {
					id: member.id,
					name: member.properties.name?.text ?? 'Untitled Member',
					type: member.properties.memberType?.name ?? null,
					email: member.properties.email ?? null,
					phone: member.properties.phone ?? null
				};

				for (const fId of member.properties.familyIds) {
					if (!membersByFamilyId.has(fId)) {
						membersByFamilyId.set(fId, []);
					}
					membersByFamilyId.get(fId)?.push(summary);
				}
			}
		}
	}

	return finalFamilies
		.map((summary) => ({
			...summary,
			members: membersByFamilyId.get(summary.id) ?? []
		}))
		.sort((a, b) => a.familyName.localeCompare(b.familyName));
};

export const createFamilyQueryMatchesReader = (
	cacheStore?: NotionCacheStore<FamiliesResponseDTO[]>,
	cacheEnabled?: boolean
) =>
	async (search: string, pageSize = 50) => {
		const normalizedSearch = normalizeSearch(search);
		if (!normalizedSearch) return [];

		return cachedNotionRead({
			key: buildFamilyQueryMatchesCacheKey(normalizedSearch),
			op: 'families.queryMatches',
			ttlMs: FAMILIES_CACHE_TTL_MS,
			store: cacheStore,
			enabled: cacheEnabled,
			fetcher: () => queryFamilyMatchesUncached(normalizedSearch, pageSize)
		});
	};

export const createFamiliesByIdsReader = (
	cacheStore?: NotionCacheStore<Record<string, FamilySummary>>,
	cacheEnabled?: boolean
) =>
	async (familyIds: string[]): Promise<Map<string, FamilySummary>> => {
		const uniqueIds = Array.from(new Set(familyIds));
		if (uniqueIds.length === 0) return new Map();

		const record = await cachedNotionRead({
			key: buildFamiliesByIdsCacheKey(uniqueIds),
			op: 'families.byIds',
			ttlMs: FAMILIES_CACHE_TTL_MS,
			store: cacheStore,
			enabled: cacheEnabled,
			fetcher: async () => familyMapToRecord(await fetchFamiliesByIdsUncached(uniqueIds))
		});

		return recordToFamilyMap(record);
	};

export const createFamilyByLoyverseCustomerIdReader = (
	cacheStore?: NotionCacheStore<FamilySummary | null>,
	cacheEnabled?: boolean
) =>
	async (loyverseCustomerId: string): Promise<FamilySummary | null> =>
		cachedNotionRead({
			key: buildFamilyByLoyverseCustomerIdCacheKey(loyverseCustomerId),
			op: 'families.byLoyverseCustomerId',
			ttlMs: FAMILIES_CACHE_TTL_MS,
			store: cacheStore,
			enabled: cacheEnabled,
			fetcher: () => fetchFamilyByLoyverseCustomerIdUncached(loyverseCustomerId)
		});

export const createSearchFamiliesDataReader = (
	cacheStore?: NotionCacheStore<FamilySummary[]>,
	cacheEnabled?: boolean
) =>
	async (search: string) => {
		const normalizedSearch = normalizeSearch(search);
		if (!normalizedSearch) return [];

		return cachedNotionRead({
			key: buildFamilySearchCacheKey(normalizedSearch),
			op: 'families.searchAggregated',
			ttlMs: FAMILIES_CACHE_TTL_MS,
			store: cacheStore,
			enabled: cacheEnabled,
			fetcher: () => searchFamiliesDataUncached(normalizedSearch)
		});
	};

export const warmFamilyByIdCache = async (
	summary: FamilySummary,
	cacheStore?: NotionCacheStore<Record<string, FamilySummary>>,
	cacheEnabled = isNotionCacheEnabled()
) => {
	if (!cacheEnabled) return;

	try {
		const store = cacheStore ?? (getNotionKeyv() as NotionCacheStore<Record<string, FamilySummary>>);
		const key = buildFamiliesByIdsCacheKey([summary.id]);
		await store.set(key, { [summary.id]: summary }, FAMILIES_CACHE_TTL_MS);
	} catch {
		// Fail open after Loyverse sync; TTL will refresh on next read.
	}
};

export const invalidateFamilyByIdCache = async (
	familyId: string,
	cacheStore?: NotionCacheStore<Record<string, FamilySummary>>
) => invalidateNotionCacheKey(buildFamiliesByIdsCacheKey([familyId]), cacheStore);
