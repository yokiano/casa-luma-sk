import { NOTION_API_KEY } from '$env/static/private';
import { MembershipsDatabase, MembershipsPatchDTO, MembershipsResponseDTO } from '$lib/notion-sdk/dbs/memberships';
import { 
	queryFamilyMatches, 
	fetchFamiliesByIds, 
	fetchFamilyById,
	toFamilySummary as toFamilySummaryInternal, 
	searchFamiliesData as searchFamiliesDataInternal,
	type FamilySummary,
	getSearchVariations
} from '$lib/tools/families/families.server';

type MembershipItem = {
	id: string;
	name: string;
	type: 'Weekly' | 'Monthly' | null;
	numberOfKids: number | null;
	startDate: string | null;
	endDate: string | null;
	status: string | null;
	notes: string | null;
	createdTime: string;
	family: FamilySummary | null;
};

const DEFAULT_PAGE_SIZE = 50;
const MAX_FAMILY_IDS_FOR_SEARCH = 10; // Notion OR filter limit is 20 total conditions

const normalizeSearch = (value?: string | null) => value?.trim() ?? '';

const getFormulaText = (formula: unknown) => {
	if (!formula || typeof formula !== 'object') return null;
	const value = formula as { string?: string | null; number?: number | null; boolean?: boolean | null };
	if (typeof value.string === 'string') return value.string;
	if (typeof value.number === 'number') return String(value.number);
	if (typeof value.boolean === 'boolean') return value.boolean ? 'Yes' : 'No';
	return null;
};

// Parse family name from membership name format: "FamilyName - Type - X kids"
const parseFamilyNameFromMembership = (name: string | null): string => {
	if (!name) return 'Unknown Family';
	const parts = name.split(' - ');
	return parts[0] || 'Unknown Family';
};

const toMembershipItem = (
	dto: MembershipsResponseDTO, 
	familiesById: Map<string, FamilySummary> | null = null
): MembershipItem => {
	const familyId = dto.properties.familyIds?.[0] ?? null;
	
	// If we have pre-fetched family data, use it
	// Otherwise, create a minimal family object with parsed name
	let family: FamilySummary | null = null;
	if (familiesById && familyId) {
		family = familiesById.get(familyId) ?? null;
	}
	
	// If no family data but we have a familyId, create minimal placeholder
	if (!family && familyId) {
		family = {
			id: familyId,
			familyName: parseFamilyNameFromMembership(dto.properties.name?.text ?? null),
			customerCode: null,
			mainPhone: null,
			mainEmail: null,
			status: null,
			members: []
		};
	}

	return {
		id: dto.id,
		name: dto.properties.name?.text ?? 'Untitled Membership',
		type: dto.properties.type?.name ?? null,
		numberOfKids: dto.properties.numberOfKids ?? null,
		startDate: dto.properties.startDate?.start ?? null,
		endDate: dto.properties.endDate?.start ?? null,
		status: getFormulaText(dto.properties.status) ?? null,
		notes: dto.properties.notes?.text ?? null,
		createdTime: dto.createdTime,
		family
	};
};

const buildMembershipsResponse = async (rawResults: Array<unknown>, fetchFamilies = false) => {
	const dtos = rawResults.map((result) => new MembershipsResponseDTO(result as any));
	
	// Only fetch family data if explicitly requested (e.g., for single membership operations)
	// For list views, we use the parsed family name from membership.name to avoid N+1 queries
	let familiesById: Map<string, FamilySummary> | null = null;
	if (fetchFamilies) {
		const familyIds = dtos.flatMap((dto) => dto.properties.familyIds ?? []);
		familiesById = await fetchFamiliesByIds(familyIds);
	}
	
	return dtos.map((dto) => toMembershipItem(dto, familiesById));
};

export const getMembershipsData = async (input: {
	cursor?: string;
	search?: string;
	pageSize?: number;
}) => {
	const db = new MembershipsDatabase({ notionSecret: NOTION_API_KEY });
	const normalizedSearch = normalizeSearch(input.search);
	const queryBody: Record<string, unknown> = {
		page_size: input.pageSize ?? DEFAULT_PAGE_SIZE,
		...(input.cursor ? { start_cursor: input.cursor } : {}),
		sorts: [{ timestamp: 'created_time', direction: 'descending' }]
	};

	if (normalizedSearch) {
		const familyMatches = await queryFamilyMatches(normalizedSearch);
		const familyIds = familyMatches.map((dto) => dto.id).slice(0, MAX_FAMILY_IDS_FOR_SEARCH);
		const relationFilters = familyIds.map((id) => ({ family: { contains: id } }));

		const variations = getSearchVariations(normalizedSearch);

		queryBody.filter = {
			or: [
				...variations.flatMap((v) => [
					{ name: { contains: v } },
					{ notes: { contains: v } }
				]),
				...relationFilters
			]
		};
	}

	const response = await db.query(queryBody as any);
	const items = await buildMembershipsResponse(response.results);

	return {
		items,
		nextCursor: response.next_cursor,
		hasMore: response.has_more
	};
};

export const searchFamiliesData = searchFamiliesDataInternal;

export const createMembershipData = async (input: {
	familyId: string;
	type: 'Weekly' | 'Monthly';
	numberOfKids: number;
	startDate?: string;
	endDate?: string;
	notes?: string;
}) => {
	const membershipsDb = new MembershipsDatabase({ notionSecret: NOTION_API_KEY });
	
	const family = await fetchFamilyById(input.familyId);
	if (!family) throw new Error('Family not found');

	const familyName = family.familyName;
	const kidsLabel = input.numberOfKids === 1 ? 'kid' : 'kids';
	const name = `${familyName} - ${input.type} - ${input.numberOfKids} ${kidsLabel}`;

	const patch = new MembershipsPatchDTO({
		properties: {
			name,
			type: input.type,
			numberOfKids: input.numberOfKids,
			family: [{ id: input.familyId }],
			startDate: input.startDate ? { start: input.startDate } : undefined,
			endDate: input.endDate ? { start: input.endDate } : undefined,
			notes: input.notes?.length ? input.notes : undefined
		}
	});

	const created = await membershipsDb.createPage(patch);
	const createdDto = new MembershipsResponseDTO(created);

	return {
		item: toMembershipItem(createdDto, new Map([[family.id, family]]))
	};
};

export const updateMembershipData = async (input: {
	id: string;
	familyId: string;
	type: 'Weekly' | 'Monthly';
	numberOfKids: number;
	startDate?: string;
	endDate?: string;
	notes?: string;
}) => {
	const membershipsDb = new MembershipsDatabase({ notionSecret: NOTION_API_KEY });

	const family = await fetchFamilyById(input.familyId);
	if (!family) throw new Error('Family not found');

	const familyName = family.familyName;
	const kidsLabel = input.numberOfKids === 1 ? 'kid' : 'kids';
	const name = `${familyName} - ${input.type} - ${input.numberOfKids} ${kidsLabel}`;

	const patch = new MembershipsPatchDTO({
		properties: {
			name,
			type: input.type,
			numberOfKids: input.numberOfKids,
			family: [{ id: input.familyId }],
			startDate: input.startDate ? { start: input.startDate } : undefined,
			endDate: input.endDate ? { start: input.endDate } : undefined,
			notes: input.notes?.length ? input.notes : undefined
		}
	});

	const updated = await membershipsDb.updatePage(input.id, patch);
	const updatedDto = new MembershipsResponseDTO(updated);

	return {
		item: toMembershipItem(updatedDto, new Map([[family.id, family]]))
	};
};

export const deleteMembershipData = async (input: { id: string }) => {
	const membershipsDb = new MembershipsDatabase({ notionSecret: NOTION_API_KEY });
	await membershipsDb.updatePage(input.id, new MembershipsPatchDTO({ archived: true }));
	return { success: true };
};

// Fetch full family details for a specific family ID (used for lazy loading in UI)
export const getFamilyDetailsData = async (input: { familyId: string }): Promise<FamilySummary | null> => {
	return fetchFamilyById(input.familyId);
};
