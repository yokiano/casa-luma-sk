import { getManagers, type ManagerDetails } from '$lib/employees.remote';

export const load = async () => {
	let managers : ManagerDetails[] = [];
	try {
		managers = await getManagers();
	} catch (e) {
		console.error('close-shift: failed to load managers', e);
	}

	return {
		managers
	};
};
