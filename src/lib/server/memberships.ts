import { Buffer } from 'node:buffer';
import { NOTION_API_KEY } from '$env/static/private';
import { MEMBERSHIP_REFUND_NOTE_PREFIX } from '$lib/receipts/automations/membership-creation';
import { MembershipsDatabase } from '$lib/notion-sdk/dbs/memberships/db';
import type { MembershipsTypePropertyType } from '$lib/notion-sdk/dbs/memberships/types';
import { MembershipsPatchDTO } from '$lib/notion-sdk/dbs/memberships/patch.dto';
import { MembershipsResponseDTO } from '$lib/notion-sdk/dbs/memberships/response.dto';
import { FlexiPassesDatabase } from '$lib/notion-sdk/dbs/flexi-passes/db';
import { FlexiPassesResponseDTO } from '$lib/notion-sdk/dbs/flexi-passes/response.dto';
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
	kind: 'membership' | 'flexi-pass';
	name: string;
	type: MembershipsTypePropertyType | string | null;
	numberOfKids: number | null;
	startDate: string | null;
	endDate: string | null;
	status: string | null;
	notes: string | null;
	receipt: string | null;
	createdTime: string;
	family: FamilySummary | null;
	cardCount?: number | null;
	entriesGranted?: number | null;
	entriesUsed?: number | null;
	entriesLeft?: number | null;
};

type MembershipCursor = {
	memberships?: string | null;
	flexiPasses?: string | null;
};

const EXHAUSTED_CURSOR = '__done';
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

const getMembershipStatus = (dto: MembershipsResponseDTO) => {
	const notes = dto.properties.notes?.text ?? '';
	// Notion Status is a formula and cannot be updated directly from automation. This marker makes
	// refunded automated memberships display with the intended status until the Notion formula supports it.
	if (notes.includes(MEMBERSHIP_REFUND_NOTE_PREFIX)) return 'Refund';
	return getFormulaText(dto.properties.status) ?? null;
};

// Parse family name from membership name format: "FamilyName - Type - X kids"
const parseFamilyNameFromMembership = (name: string | null): string => {
	if (!name) return 'Unknown Family';
	const parts = name.split(' - ');
	return parts[0] || 'Unknown Family';
};

const decodeCursor = (cursor?: string): MembershipCursor => {
	if (!cursor) return {};
	try {
		const parsed = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as MembershipCursor;
		return typeof parsed === 'object' && parsed ? parsed : { memberships: cursor };
	} catch {
		return { memberships: cursor };
	}
};

const encodeCursor = (cursor: MembershipCursor) => {
	if ((!cursor.memberships || cursor.memberships === EXHAUSTED_CURSOR) &&
		(!cursor.flexiPasses || cursor.flexiPasses === EXHAUSTED_CURSOR)) return null;
	return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url');
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
			loyverseCustomerId: null,
			mainPhone: null,
			mainEmail: null,
			status: null,
			members: []
		};
	}

	return {
		id: dto.id,
		kind: 'membership',
		name: dto.properties.name?.text ?? 'Untitled Membership',
		type: (dto.properties.type?.name as string | undefined) ?? null,
		numberOfKids: dto.properties.numberOfKids ?? null,
		startDate: dto.properties.startDate?.start ?? null,
		endDate: dto.properties.endDate?.start ?? null,
		status: getMembershipStatus(dto),
		notes: dto.properties.notes?.text ?? null,
		receipt: dto.properties.receipt ?? null,
		createdTime: dto.createdTime,
		family
	};
};

const toFlexiPassItem = (
	dto: FlexiPassesResponseDTO,
	familiesById: Map<string, FamilySummary> | null = null
): MembershipItem => {
	const familyId = dto.properties.familyIds?.[0] ?? null;
	let family: FamilySummary | null = null;
	if (familiesById && familyId) {
		family = familiesById.get(familyId) ?? null;
	}

	if (!family && familyId) {
		family = {
			id: familyId,
			familyName: parseFamilyNameFromMembership(dto.properties.name?.text ?? null),
			customerCode: null,
			loyverseCustomerId: null,
			mainPhone: null,
			mainEmail: null,
			status: null,
			members: []
		};
	}

	return {
		id: dto.id,
		kind: 'flexi-pass',
		name: dto.properties.name?.text ?? 'Untitled Flexi Pass',
		type: 'Flexi Pass',
		numberOfKids: null,
		startDate: dto.properties.validFrom?.start ?? null,
		endDate: dto.properties.validUntil?.start ?? null,
		status: dto.properties.automationStatus?.name ?? null,
		notes: dto.properties.notes?.text ?? null,
		receipt: dto.properties.sourceReceiptUrl ?? null,
		createdTime: dto.createdTime,
		family,
		cardCount: dto.properties.cardCount ?? null,
		entriesGranted: dto.properties.entriesGranted ?? null,
		entriesUsed: dto.properties.entriesUsed ?? null,
		entriesLeft: dto.properties.entriesLeft ?? null
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
	const membershipsDb = new MembershipsDatabase({ notionSecret: NOTION_API_KEY });
	const flexiPassesDb = new FlexiPassesDatabase({ notionSecret: NOTION_API_KEY });
	const normalizedSearch = normalizeSearch(input.search);
	const decodedCursor = decodeCursor(input.cursor);
	const pageSize = input.pageSize ?? DEFAULT_PAGE_SIZE;
	const baseQueryBody: Record<string, unknown> = {
		page_size: pageSize,
		sorts: [{ timestamp: 'created_time', direction: 'descending' }]
	};
	const membershipQueryBody: Record<string, unknown> = {
		...baseQueryBody,
		...(decodedCursor.memberships ? { start_cursor: decodedCursor.memberships } : {})
	};
	const flexiQueryBody: Record<string, unknown> = {
		...baseQueryBody,
		...(decodedCursor.flexiPasses ? { start_cursor: decodedCursor.flexiPasses } : {})
	};

	if (normalizedSearch) {
		const familyMatches = await queryFamilyMatches(normalizedSearch);
		const familyIds = familyMatches.map((dto) => dto.id).slice(0, MAX_FAMILY_IDS_FOR_SEARCH);
		const relationFilters = familyIds.map((id) => ({ family: { contains: id } }));

		const variations = getSearchVariations(normalizedSearch);

		membershipQueryBody.filter = {
			or: [
				...variations.flatMap((v) => [
					{ name: { contains: v } },
					{ notes: { contains: v } }
				]),
				...relationFilters
			]
		};

		flexiQueryBody.filter = {
			or: [
				...variations.flatMap((v) => [
					{ name: { contains: v } },
					{ notes: { contains: v } },
					{ loyverseCustomerId: { contains: v } },
					{ sourceReceiptNumber: { contains: v } }
				]),
				...relationFilters
			]
		};
	}

	const shouldQueryMemberships = decodedCursor.memberships !== EXHAUSTED_CURSOR;
	const shouldQueryFlexiPasses = decodedCursor.flexiPasses !== EXHAUSTED_CURSOR;
	const [membershipResponse, flexiResponse] = await Promise.all([
		shouldQueryMemberships
			? membershipsDb.query(membershipQueryBody as any)
			: Promise.resolve({ results: [], next_cursor: null, has_more: false }),
		shouldQueryFlexiPasses
			? flexiPassesDb.query(flexiQueryBody as any)
			: Promise.resolve({ results: [], next_cursor: null, has_more: false })
	]);
	const membershipDtos = membershipResponse.results.map((result) => new MembershipsResponseDTO(result as any));
	const flexiDtos = flexiResponse.results.map((result) => new FlexiPassesResponseDTO(result as any));
	const familiesById = await fetchFamiliesByIds([
		...membershipDtos.flatMap((dto) => dto.properties.familyIds ?? []),
		...flexiDtos.flatMap((dto) => dto.properties.familyIds ?? [])
	]);
	const memberships = membershipDtos.map((dto) => toMembershipItem(dto, familiesById));
	const flexiPasses = flexiDtos.map((dto) => toFlexiPassItem(dto, familiesById));
	const items = [...memberships, ...flexiPasses].sort((a, b) => b.createdTime.localeCompare(a.createdTime));
	const nextCursor = encodeCursor({
		memberships: membershipResponse.has_more ? membershipResponse.next_cursor : EXHAUSTED_CURSOR,
		flexiPasses: flexiResponse.has_more ? flexiResponse.next_cursor : EXHAUSTED_CURSOR
	});

	return {
		items,
		nextCursor,
		hasMore: membershipResponse.has_more || flexiResponse.has_more
	};
};

export const searchFamiliesData = searchFamiliesDataInternal;

export const createMembershipData = async (input: {
	familyId: string;
	type: MembershipsTypePropertyType;
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
	type: MembershipsTypePropertyType;
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
