import { getMembershipsData } from '$lib/server/memberships';

export const load = async () => {
	const result = await getMembershipsData({});

	return {
		initialMemberships: result.items,
		nextCursor: result.nextCursor,
		hasMore: result.hasMore
	};
};
