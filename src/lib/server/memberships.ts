import { NOTION_API_KEY } from '$env/static/private';
import { MembershipsDatabase, MembershipsPatchDTO, MembershipsResponseDTO } from '$lib/notion-sdk/dbs/memberships';
import { FamiliesDatabase, FamiliesResponseDTO } from '$lib/notion-sdk/dbs/families';

type FamilySummary = {
	id: string;
	familyName: string;
	customerCode: string | null;
	mainPhone: string | null;
};

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

const toFamilySummary = (dto: FamiliesResponseDTO): FamilySummary => ({
	id: dto.id,
	familyName: dto.properties.familyName?.text ?? 'Untitled Family',
	customerCode: dto.properties.customerNumber?.text ?? null,
	mainPhone: dto.properties.mainPhone ?? null
});

const toMembershipItem = (dto: MembershipsResponseDTO, familiesById: Map<string, FamilySummary>): MembershipItem => {
	const familyId = dto.properties.familyIds?.[0];
	const family = familyId ? familiesById.get(familyId) ?? null : null;

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

const fetchFamiliesByIds = async (familyIds: string[]): Promise<Map<string, FamilySummary>> => {
	if (familyIds.length === 0) return new Map();
	const db = new FamiliesDatabase({ notionSecret: NOTION_API_KEY });
	const uniqueIds = Array.from(new Set(familyIds));
	const results = await Promise.allSettled(uniqueIds.map((id) => db.getPage(id)));
	const map = new Map<string, FamilySummary>();

	results.forEach((result, index) => {
		if (result.status !== 'fulfilled') return;
		const dto = new FamiliesResponseDTO(result.value);
		map.set(uniqueIds[index], toFamilySummary(dto));
	});

	return map;
};

const queryFamilyMatches = async (search: string, pageSize = 100): Promise<FamiliesResponseDTO[]> => {
	const db = new FamiliesDatabase({ notionSecret: NOTION_API_KEY });
	const matches: FamiliesResponseDTO[] = [];
	let cursor: string | undefined = undefined;

	const searchLower = search.toLowerCase();
	const searchUpper = search.toUpperCase();
	const searchCapitalized = search.charAt(0).toUpperCase() + search.slice(1).toLowerCase();

	// Combine unique search variations to handle Notion's case-sensitive 'contains' filter
	const variations = Array.from(new Set([search, searchLower, searchUpper, searchCapitalized]));

	// eslint-disable-next-line no-constant-condition
	while (true) {
		const response = await db.query({
			page_size: pageSize,
			...(cursor ? { start_cursor: cursor } : {}),
			filter: {
				or: variations.flatMap((v) => [
					{ familyName: { contains: v } },
					{ customerNumber: { contains: v } },
					{ mainPhone: { contains: v } }
				])
			},
			sorts: [{ property: 'familyName', direction: 'ascending' }]
		});

		response.results.forEach((result) => matches.push(new FamiliesResponseDTO(result)));

		if (!response.has_more || !response.next_cursor) break;
		cursor = response.next_cursor;
	}

	return matches;
};

const buildMembershipsResponse = async (rawResults: Array<unknown>) => {
	const dtos = rawResults.map((result) => new MembershipsResponseDTO(result as any));
	const familyIds = dtos.flatMap((dto) => dto.properties.familyIds ?? []);
	const familiesById = await fetchFamiliesByIds(familyIds);
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

		const searchLower = normalizedSearch.toLowerCase();
		const searchUpper = normalizedSearch.toUpperCase();
		const searchCapitalized =
			normalizedSearch.charAt(0).toUpperCase() + normalizedSearch.slice(1).toLowerCase();
		const variations = Array.from(
			new Set([normalizedSearch, searchLower, searchUpper, searchCapitalized])
		);

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

export const searchFamiliesData = async (search: string) => {
	const normalizedSearch = normalizeSearch(search);
	const matches = await queryFamilyMatches(normalizedSearch, 25);
	return matches.map((dto) => toFamilySummary(dto));
};

export const createMembershipData = async (input: {
	familyId: string;
	type: 'Weekly' | 'Monthly';
	numberOfKids: number;
	startDate?: string;
	endDate?: string;
	notes?: string;
}) => {
	const membershipsDb = new MembershipsDatabase({ notionSecret: NOTION_API_KEY });
	const familiesDb = new FamiliesDatabase({ notionSecret: NOTION_API_KEY });

	const familyPage = await familiesDb.getPage(input.familyId);
	const familyDto = new FamiliesResponseDTO(familyPage);
	const familyName = familyDto.properties.familyName?.text ?? 'Family';
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
	const familySummary = toFamilySummary(familyDto);

	return {
		item: toMembershipItem(createdDto, new Map([[familySummary.id, familySummary]]))
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
	const familiesDb = new FamiliesDatabase({ notionSecret: NOTION_API_KEY });

	const familyPage = await familiesDb.getPage(input.familyId);
	const familyDto = new FamiliesResponseDTO(familyPage);
	const familyName = familyDto.properties.familyName?.text ?? 'Family';
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
	const familySummary = toFamilySummary(familyDto);

	return {
		item: toMembershipItem(updatedDto, new Map([[familySummary.id, familySummary]]))
	};
};

export const deleteMembershipData = async (input: { id: string }) => {
	const membershipsDb = new MembershipsDatabase({ notionSecret: NOTION_API_KEY });
	await membershipsDb.updatePage(input.id, new MembershipsPatchDTO({ archived: true }));
	return { success: true };
};
