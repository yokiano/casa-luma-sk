import { command, query } from '$app/server';
import { syncExistingFamilyToLoyverse } from '$lib/server/intake-actions';
import * as v from 'valibot';
import { searchFamiliesData, upsertFamilyCache } from './families.server';

const SearchFamiliesSchema = v.object({
	search: v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(80))
});

export const searchFamilies = query(SearchFamiliesSchema, async ({ search }) => {
	return searchFamiliesData(search);
});

const SyncFamilyToLoyverseSchema = v.object({
	familyId: v.pipe(v.string(), v.trim(), v.minLength(1))
});

export const syncFamilyToLoyverse = command(SyncFamilyToLoyverseSchema, async ({ familyId }) => {
	const result = await syncExistingFamilyToLoyverse(familyId);

	upsertFamilyCache({
		id: result.familyId,
		familyName: result.familyName,
		customerCode: result.customerCode ?? null,
		loyverseCustomerId: result.loyverseCustomerId,
		mainPhone: result.mainPhone,
		mainEmail: result.mainEmail,
		status: result.status,
		members: []
	});

	return result;
});
