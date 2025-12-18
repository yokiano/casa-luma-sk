import { getMenuSummary } from '$lib/menu.remote';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const menu = await getMenuSummary();
	return { menu };
};
