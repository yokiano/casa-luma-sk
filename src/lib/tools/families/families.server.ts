import { NOTION_API_KEY } from '$env/static/private';
import { FamiliesDatabase, FamiliesResponseDTO } from '$lib/notion-sdk/dbs/families';
import { FamilyMembersDatabase, FamilyMembersResponseDTO } from '$lib/notion-sdk/dbs/family-members';

export type FamilyMemberSummary = {
	id: string;
	name: string;
	type: string | null;
	email: string | null;
	phone: string | null;
};

export type FamilySummary = {
	id: string;
	familyName: string;
	customerCode: string | null;
	mainPhone: string | null;
	mainEmail: string | null;
	status: string | null;
	members: FamilyMemberSummary[];
};

const normalizeSearch = (value?: string | null) => value?.trim() ?? '';

// Simple in-memory cache for families to avoid redundant getPage calls
const familyCache = new Map<string, { summary: FamilySummary, timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 5; // 5 minutes

export const toFamilySummary = (dto: FamiliesResponseDTO, members: FamilyMemberSummary[] = []): FamilySummary => {
	const summary = {
		id: dto.id,
		familyName: dto.properties.familyName?.text ?? 'Untitled Family',
		customerCode: dto.properties.customerNumber?.text ?? null,
		mainPhone: dto.properties.mainPhone ?? null,
		mainEmail: dto.properties.mainEmail ?? null,
		status: dto.properties.status?.name ?? null,
		members
	};
	
	// Only cache if there are no members (or update cache)
	// Actually, let's cache everything but the members can be dynamic
	// For memberships view, members are not needed usually
	return summary;
};

export const getSearchVariations = (search: string) => {
	const searchLower = search.toLowerCase();
	const searchUpper = search.toUpperCase();
	const searchCapitalized = search.charAt(0).toUpperCase() + search.slice(1).toLowerCase();
	return Array.from(new Set([search, searchLower, searchUpper, searchCapitalized]));
};

export const queryFamilyMatches = async (search: string, pageSize = 50): Promise<FamiliesResponseDTO[]> => {
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

	const dtos = response.results.map((result) => new FamiliesResponseDTO(result as any));
	
	// Seed cache with results
	dtos.forEach(dto => {
		familyCache.set(dto.id, {
			summary: toFamilySummary(dto),
			timestamp: Date.now()
		});
	});

	return dtos;
};

export const queryMemberMatches = async (search: string, pageSize = 50): Promise<FamilyMembersResponseDTO[]> => {
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

export const fetchFamiliesByIds = async (familyIds: string[]): Promise<Map<string, FamilySummary>> => {
	if (familyIds.length === 0) return new Map();
	
	const uniqueIds = Array.from(new Set(familyIds));
	const map = new Map<string, FamilySummary>();
	const idsToFetch: string[] = [];

	// Check cache first
	const now = Date.now();
	uniqueIds.forEach(id => {
		const cached = familyCache.get(id);
		if (cached && (now - cached.timestamp < CACHE_TTL)) {
			map.set(id, cached.summary);
		} else {
			idsToFetch.push(id);
		}
	});

	if (idsToFetch.length === 0) return map;

	const db = new FamiliesDatabase({ notionSecret: NOTION_API_KEY });
	
	// Notion doesn't support batch get, so we still use getPage but it's now throttled 
	// and only for non-cached IDs.
	// We chunk the requests to avoid overwhelming the throttler with too many concurrent promises
	const CHUNK_SIZE = 5;
	for (let i = 0; i < idsToFetch.length; i += CHUNK_SIZE) {
		const chunk = idsToFetch.slice(i, i + CHUNK_SIZE);
		const results = await Promise.allSettled(chunk.map((id) => db.getPage(id)));

		results.forEach((result, index) => {
			if (result.status !== 'fulfilled') return;
			const id = chunk[index];
			const dto = new FamiliesResponseDTO(result.value as any);
			const summary = toFamilySummary(dto);
			
			map.set(id, summary);
			familyCache.set(id, {
				summary,
				timestamp: now
			});
		});
	}

	return map;
};

export const fetchFamilyById = async (id: string): Promise<FamilySummary | null> => {
	const families = await fetchFamiliesByIds([id]);
	return families.get(id) ?? null;
};

export const searchFamiliesData = async (search: string) => {
	const normalizedSearch = normalizeSearch(search);
	if (!normalizedSearch) return [];

	// Run family and member searches in parallel
	const [familyMatches, memberMatches] = await Promise.all([
		queryFamilyMatches(normalizedSearch),
		queryMemberMatches(normalizedSearch)
	]);
	
	// Build a map of family IDs we already have from direct search
	const familyMatchesMap = new Map(familyMatches.map(dto => [dto.id, dto]));
	
	// Collect extra family IDs from member search results
	const extraFamilyIds = memberMatches
		.flatMap(m => m.properties.familyIds)
		.filter(id => !familyMatchesMap.has(id));
	
	// Dedupe and limit
	const uniqueExtraIds = Array.from(new Set(extraFamilyIds)).slice(0, 20);

	// For extra families, check cache first, then fetch remaining via getPage
	// (Notion doesn't support querying by page ID, so getPage is unavoidable here)
	const now = Date.now();
	const cachedFamilies: FamilySummary[] = [];
	const idsToFetch: string[] = [];
	
	uniqueExtraIds.forEach(id => {
		const cached = familyCache.get(id);
		if (cached && (now - cached.timestamp < CACHE_TTL)) {
			cachedFamilies.push(cached.summary);
		} else {
			idsToFetch.push(id);
		}
	});

	// Build initial families list
	let finalFamilies: FamilySummary[] = [
		...familyMatches.map(dto => toFamilySummary(dto)),
		...cachedFamilies
	];

	// Fetch uncached extra families (throttled in smaller chunks to avoid rate limits)
	if (idsToFetch.length > 0) {
		const familiesDb = new FamiliesDatabase({ notionSecret: NOTION_API_KEY });
		
		// Sequential chunks of 3 to stay well under rate limit
		const CHUNK_SIZE = 3;
		for (let i = 0; i < idsToFetch.length; i += CHUNK_SIZE) {
			const chunk = idsToFetch.slice(i, i + CHUNK_SIZE);
			const results = await Promise.allSettled(chunk.map(id => familiesDb.getPage(id)));
			
			results.forEach(r => {
				if (r.status === 'fulfilled') {
					const dto = new FamiliesResponseDTO(r.value as any);
					const summary = toFamilySummary(dto);
					finalFamilies.push(summary);
					familyCache.set(dto.id, { summary, timestamp: now });
				}
			});
		}
	}

	// Fetch members for all found families in a single query (chunked if needed)
	const finalFamilyIds = finalFamilies.map(f => f.id);
	const membersByFamilyId = new Map<string, FamilyMemberSummary[]>();
	
	if (finalFamilyIds.length > 0) {
		const membersDb = new FamilyMembersDatabase({ notionSecret: NOTION_API_KEY });
		
		// Notion OR filter limit is ~100, but we chunk at 20 for safety
		const CHUNK_SIZE = 20;
		const idChunks: string[][] = [];
		for (let i = 0; i < finalFamilyIds.length; i += CHUNK_SIZE) {
			idChunks.push(finalFamilyIds.slice(i, i + CHUNK_SIZE));
		}

		// Run member queries sequentially to avoid overwhelming the API
		for (const chunk of idChunks) {
			const res = await membersDb.query({
				filter: { or: chunk.map(id => ({ family: { contains: id } })) }
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
