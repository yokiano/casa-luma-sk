import { NOTION_API_KEY } from '$env/static/private';
import { MembershipsDatabase } from '$lib/notion-sdk/dbs/memberships/db';
import type { MembershipsTypePropertyType } from '$lib/notion-sdk/dbs/memberships/types';
import { MembershipsPatchDTO } from '$lib/notion-sdk/dbs/memberships/patch.dto';
import { MembershipsResponseDTO } from '$lib/notion-sdk/dbs/memberships/response.dto';
import {
	createGetMembershipsDataReader,
	toMembershipItem
} from '$lib/server/memberships-cache';
import {
	fetchFamiliesByIds,
	fetchFamilyById,
	searchFamiliesData as searchFamiliesDataInternal,
	type FamilySummary
} from '$lib/tools/families/families.server';

const readMembershipsData = createGetMembershipsDataReader();

export const getMembershipsData = readMembershipsData;

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

export const getFamilyDetailsData = async (input: { familyId: string }): Promise<FamilySummary | null> => {
	return fetchFamilyById(input.familyId);
};
