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

export const toFamilySummary = (dto: FamiliesResponseDTO, members: FamilyMemberSummary[] = []): FamilySummary => ({
	id: dto.id,
	familyName: dto.properties.familyName?.text ?? 'Untitled Family',
	customerCode: dto.properties.customerNumber?.text ?? null,
	mainPhone: dto.properties.mainPhone ?? null,
	mainEmail: dto.properties.mainEmail ?? null,
	status: dto.properties.status?.name ?? null,
	members
});

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

	return response.results.map((result) => new FamiliesResponseDTO(result as any));
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
	const db = new FamiliesDatabase({ notionSecret: NOTION_API_KEY });
	const uniqueIds = Array.from(new Set(familyIds));
	const results = await Promise.allSettled(uniqueIds.map((id) => db.getPage(id)));
	const map = new Map<string, FamilySummary>();

	results.forEach((result, index) => {
		if (result.status !== 'fulfilled') return;
		const dto = new FamiliesResponseDTO(result.value as any);
		map.set(uniqueIds[index], toFamilySummary(dto));
	});

	return map;
};

export const searchFamiliesData = async (search: string) => {
	const normalizedSearch = normalizeSearch(search);
	if (!normalizedSearch) return [];

	// 1. Search Families directly
	const familyMatches = await queryFamilyMatches(normalizedSearch);
	
	// 2. Search Members
	const memberMatches = await queryMemberMatches(normalizedSearch);
	
	// 3. Collect all family IDs
	const familyIdsFromMembers = memberMatches.flatMap(m => m.properties.familyIds);
	const allFamilyIds = new Set([
		...familyMatches.map(m => m.id),
		...familyIdsFromMembers
	]);

	// 4. If we found families from members that weren't in direct family search, fetch them
	const extraFamilyIds = Array.from(allFamilyIds).filter(id => !familyMatches.find(m => m.id === id));
	
	let allFamilies = [...familyMatches];
	if (extraFamilyIds.length > 0) {
		const familiesDb = new FamiliesDatabase({ notionSecret: NOTION_API_KEY });
		// Notion getPage doesn't support batching easily, but we can query by IDs
		// or just fetch them individually if the list is small. 
		// For search results, let's limit to top 20 extra families.
		const results = await Promise.allSettled(
			extraFamilyIds.slice(0, 20).map(id => familiesDb.getPage(id))
		);
		results.forEach(r => {
			if (r.status === 'fulfilled') {
				allFamilies.push(new FamiliesResponseDTO(r.value as any));
			}
		});
	}

	// 5. Fetch ALL members for these families to show complete family profiles
	const finalFamilyIds = allFamilies.map(f => f.id);
	let membersByFamilyId = new Map<string, FamilyMemberSummary[]>();
	
	if (finalFamilyIds.length > 0) {
		const membersDb = new FamilyMembersDatabase({ notionSecret: NOTION_API_KEY });
		// Batch query members for all found families
		const membersResponse = await membersDb.query({
			filter: {
				or: finalFamilyIds.map(id => ({ family: { contains: id } }))
			}
		});
		
		const allMembers = membersResponse.results.map(r => new FamilyMembersResponseDTO(r as any));
		
		for (const member of allMembers) {
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

	return allFamilies
		.map((dto) => toFamilySummary(dto, membersByFamilyId.get(dto.id) ?? []))
		.sort((a, b) => a.familyName.localeCompare(b.familyName));
};
