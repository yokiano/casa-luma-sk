import { query } from '$app/server';
import * as v from 'valibot';
import { searchFamiliesData } from './families.server';

const SearchFamiliesSchema = v.object({
	search: v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(80))
});

export const searchFamilies = query(SearchFamiliesSchema, async ({ search }) => {
	return searchFamiliesData(search);
});
