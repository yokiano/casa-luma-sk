import { getManagers } from '$lib/employees.remote';

export const load = async () => {
	return {
		managers: await getManagers()
	};
};
