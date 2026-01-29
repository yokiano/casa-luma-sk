import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ cookies }) => {
	const role = cookies.get('casa_luma_tools_auth');
	return {
		role
	};
};
