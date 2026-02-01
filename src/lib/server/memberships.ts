import { NOTION_API_KEY } from '$env/static/private';
import { MembershipsDatabase, MembershipsPatchDTO, MembershipsResponseDTO } from '$lib/notion-sdk/dbs/memberships';
import { FamiliesDatabase, FamiliesResponseDTO } from '$lib/notion-sdk/dbs/families';
import { 
	queryFamilyMatches, 
	fetchFamiliesByIds, 
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
	const familySummary = toFamilySummaryInternal(familyDto);

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
	const familySummary = toFamilySummaryInternal(familyDto);

	return {
		item: toMembershipItem(updatedDto, new Map([[familySummary.id, familySummary]]))
	};
};

export const deleteMembershipData = async (input: { id: string }) => {
	const membershipsDb = new MembershipsDatabase({ notionSecret: NOTION_API_KEY });
	await membershipsDb.updatePage(input.id, new MembershipsPatchDTO({ archived: true }));
	return { success: true };
};
