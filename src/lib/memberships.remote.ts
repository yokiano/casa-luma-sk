import { command, query } from '$app/server';
import * as v from 'valibot';
import { MEMBERSHIPS_PROP_VALUES } from '$lib/notion-sdk/dbs/memberships/constants';
import {
	createMembershipData,
	deleteMembershipData,
	getMembershipsData,
	searchFamiliesData,
	updateMembershipData
} from '$lib/server/memberships';

const MembershipsQuerySchema = v.object({
	cursor: v.optional(v.pipe(v.string(), v.trim(), v.minLength(1))),
	search: v.optional(v.pipe(v.string(), v.trim(), v.maxLength(80))),
	pageSize: v.optional(v.pipe(v.number(), v.minValue(1), v.maxValue(100)))
});

export const getMemberships = query(MembershipsQuerySchema, getMembershipsData);

const SearchFamiliesSchema = v.object({
	search: v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(80))
});

export const searchFamilies = query(SearchFamiliesSchema, async ({ search }) => searchFamiliesData(search));

const CreateMembershipSchema = v.object({
	familyId: v.pipe(v.string(), v.trim(), v.minLength(1)),
	type: v.picklist([...MEMBERSHIPS_PROP_VALUES.type]),
	numberOfKids: v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(20)),
	startDate: v.optional(v.pipe(v.string(), v.trim(), v.minLength(1))),
	endDate: v.optional(v.pipe(v.string(), v.trim(), v.minLength(1))),
	notes: v.optional(v.pipe(v.string(), v.trim(), v.maxLength(500)))
});

export const createMembership = command(CreateMembershipSchema, createMembershipData);

const UpdateMembershipSchema = v.object({
	id: v.pipe(v.string(), v.trim(), v.minLength(1)),
	familyId: v.pipe(v.string(), v.trim(), v.minLength(1)),
	type: v.picklist([...MEMBERSHIPS_PROP_VALUES.type]),
	numberOfKids: v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(20)),
	startDate: v.optional(v.pipe(v.string(), v.trim(), v.minLength(1))),
	endDate: v.optional(v.pipe(v.string(), v.trim(), v.minLength(1))),
	notes: v.optional(v.pipe(v.string(), v.trim(), v.maxLength(500)))
});

export const updateMembership = command(UpdateMembershipSchema, updateMembershipData);

const DeleteMembershipSchema = v.object({
	id: v.pipe(v.string(), v.trim(), v.minLength(1))
});

export const deleteMembership = command(DeleteMembershipSchema, deleteMembershipData);
