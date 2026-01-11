import { getManagers } from '$lib/employees.remote';
import { getEmployees } from '$lib/employees.remote';
import { getShiftsForBangkokDay } from '$lib/shifts.remote';
import type { ShiftForReview } from '$lib/shifts.remote';

export const load = async () => {
	const managers = await getManagers();

	// These are auxiliary for the shifts sections — the close-shift report must still work if they fail.
	let employeesById: Record<string, string> = {};
	let todayShifts: ShiftForReview[] = [];
	let tomorrowShifts: ShiftForReview[] = [];
	let employeesLoadFailed = false;
	let shiftsLoadFailed = false;

	try {
		const employees = await getEmployees();
		employeesById = Object.fromEntries(employees.map((e) => [e.id, e.name]));
	} catch (e) {
		employeesLoadFailed = true;
		console.error('close-shift: failed to load employees for shifts UI', e);
	}

	try {
		todayShifts = await getShiftsForBangkokDay(0);
		tomorrowShifts = await getShiftsForBangkokDay(1);
	} catch (e) {
		shiftsLoadFailed = true;
		console.error('close-shift: failed to load shifts', e);
	}

	return {
		managers,
		employeesById,
		todayShifts,
		tomorrowShifts,
		employeesLoadFailed,
		shiftsLoadFailed
	};
};
