import { Buffer } from 'node:buffer';
import { NOTION_API_KEY } from '$env/static/private';
import { MEMBERSHIP_REFUND_NOTE_PREFIX } from '$lib/receipts/automations/membership-creation';
import { MembershipsDatabase } from '$lib/notion-sdk/dbs/memberships/db';
import type { MembershipsTypePropertyType } from '$lib/notion-sdk/dbs/memberships/types';
import { MembershipsResponseDTO } from '$lib/notion-sdk/dbs/memberships/response.dto';
import { FlexiPassesDatabase } from '$lib/notion-sdk/dbs/flexi-passes/db';
import { FlexiPassesResponseDTO } from '$lib/notion-sdk/dbs/flexi-passes/response.dto';
import { cachedNotionRead } from '$lib/server/cache/notion-cache';
import { buildNotionCacheKey } from '$lib/server/cache/notion-cache-keys';
import type { NotionCacheStore } from '$lib/server/cache/keyv';
import { MEMBERSHIPS_RECENT_LIST_MONTHS } from '$lib/memberships.shared';
import {
	fetchFamiliesByIds,
	getSearchVariations,
	queryFamilyMatches,
	type FamilySummary
} from '$lib/tools/families/families.server';

const MEMBERSHIPS_DB_ID = '4267d8b54c9343b39b0b6941ccf79145';
const FLEXI_PASSES_DB_ID = 'b1e1d005eaf04dc39d258d7df3404b36';
const MEMBERSHIPS_LIST_CACHE_ID = `${MEMBERSHIPS_DB_ID}+${FLEXI_PASSES_DB_ID}`;
const MEMBERSHIPS_LIST_CACHE_TTL_MS = 5 * 60 * 1000;

const EXHAUSTED_CURSOR = '__done';
const DEFAULT_PAGE_SIZE = 50;
const MAX_FAMILY_IDS_FOR_SEARCH = 10;

export type MembershipItem = {
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

export type MembershipsListResult = {
	items: MembershipItem[];
	nextCursor: string | null;
	hasMore: boolean;
};

type MembershipCursor = {
	memberships?: string | null;
	flexiPasses?: string | null;
};

type MembershipsListInput = {
	cursor?: string;
	search?: string;
	pageSize?: number;
};

const normalizeSearch = (value?: string | null) => value?.trim() ?? '';

const getRecentCreatedAfterIso = () => {
	const date = new Date();
	date.setMonth(date.getMonth() - MEMBERSHIPS_RECENT_LIST_MONTHS);
	return date.toISOString();
};

const buildRecentCreatedFilter = (createdAfter: string) => ({
	timestamp: 'created_time',
	created_time: { on_or_after: createdAfter }
});

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
	if (notes.includes(MEMBERSHIP_REFUND_NOTE_PREFIX)) return 'Refund';
	return getFormulaText(dto.properties.status) ?? null;
};

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
	if (
		(!cursor.memberships || cursor.memberships === EXHAUSTED_CURSOR) &&
		(!cursor.flexiPasses || cursor.flexiPasses === EXHAUSTED_CURSOR)
	) {
		return null;
	}
	return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url');
};

export const toMembershipItem = (
	dto: MembershipsResponseDTO,
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

const buildMembershipsListCacheKey = (input: MembershipsListInput) =>
	buildNotionCacheKey({
		operation: 'memberships.listAggregated',
		id: MEMBERSHIPS_LIST_CACHE_ID,
		params: {
			search: normalizeSearch(input.search).toLowerCase(),
			cursor: input.cursor ?? '',
			pageSize: input.pageSize ?? DEFAULT_PAGE_SIZE,
			recentOnly: normalizeSearch(input.search) ? false : true
		}
	});

const getMembershipsDataUncached = async (input: MembershipsListInput): Promise<MembershipsListResult> => {
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
				...variations.flatMap((v) => [{ name: { contains: v } }, { notes: { contains: v } }]),
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
	} else {
		const recentFilter = buildRecentCreatedFilter(getRecentCreatedAfterIso());
		membershipQueryBody.filter = recentFilter;
		flexiQueryBody.filter = recentFilter;
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

export const createGetMembershipsDataReader = (
	cacheStore?: NotionCacheStore<MembershipsListResult>,
	cacheEnabled?: boolean
) =>
	async (input: MembershipsListInput): Promise<MembershipsListResult> =>
		cachedNotionRead({
			key: buildMembershipsListCacheKey(input),
			op: 'memberships.listAggregated',
			ttlMs: MEMBERSHIPS_LIST_CACHE_TTL_MS,
			store: cacheStore,
			enabled: cacheEnabled,
			fetcher: () => getMembershipsDataUncached(input)
		});
