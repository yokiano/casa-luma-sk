import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	return {
		selectedId: url.searchParams.get('id')
	};
};
