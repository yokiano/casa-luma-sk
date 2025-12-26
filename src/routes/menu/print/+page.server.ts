import { getMenuSummaryWithModifiers } from '$lib/menu.remote';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const menu = await getMenuSummaryWithModifiers();
	return { menu };
};
