import { getMemberships } from '$lib/memberships.remote';

export const load = async () => {
	const result = await getMemberships({});

	return {
		initialMemberships: result.items,
		nextCursor: result.nextCursor,
		hasMore: result.hasMore
	};
};
