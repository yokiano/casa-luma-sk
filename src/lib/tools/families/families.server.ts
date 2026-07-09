import {
	createFamiliesByIdsReader,
	createFamilyByLoyverseCustomerIdReader,
	createFamilyQueryMatchesReader,
	createSearchFamiliesDataReader,
	warmFamilyByIdCache
} from '$lib/server/families-cache';

export type { FamilyMemberSummary, FamilySummary } from './families.shared';
export { getSearchVariations, toFamilySummary } from './families.shared';

const readFamilyQueryMatches = createFamilyQueryMatchesReader();
const readFamiliesByIds = createFamiliesByIdsReader();
const readFamilyByLoyverseCustomerId = createFamilyByLoyverseCustomerIdReader();
const readSearchFamiliesData = createSearchFamiliesDataReader();

export const queryFamilyMatches = readFamilyQueryMatches;

export const fetchFamiliesByIds = readFamiliesByIds;

export const fetchFamilyById = async (id: string) => {
	const families = await fetchFamiliesByIds([id]);
	return families.get(id) ?? null;
};

export const fetchFamilyByLoyverseCustomerId = readFamilyByLoyverseCustomerId;

export const searchFamiliesData = readSearchFamiliesData;

export const upsertFamilyCache = (summary: import('./families.shared').FamilySummary) => {
	void warmFamilyByIdCache(summary);
};
