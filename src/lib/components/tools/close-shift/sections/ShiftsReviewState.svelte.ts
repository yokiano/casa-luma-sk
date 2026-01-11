import { updateShift } from '$lib/shifts.remote';

export type ShiftsReviewMode = 'today' | 'tomorrow';

export type ShiftsReviewEmployeeMap = Record<string, string>;

export type ShiftsReviewShift = {
	id: string;
	employeeIds: string[];
	type: string | null;
	status: string | null;
	shiftTime: { start: string; end?: string | null } | null;
	shiftNoteText: string | null;
	ot: number | null;
	otApprover: string[];
};

export class ShiftsReviewState {
	mode: ShiftsReviewMode;
	shifts: ShiftsReviewShift[];
	employeesById: ShiftsReviewEmployeeMap;

	saving = $state(false);
	error = $state<string | null>(null);

	// Edits per shift
	private otByShiftId = $state<Record<string, number>>({});
	private approverByShiftId = $state<Record<string, string>>({});
	private otOpenByShiftId = $state<Record<string, boolean>>({});
	private statusByShiftId = $state<Record<string, string>>({});

	constructor(opts: {
		mode: ShiftsReviewMode;
		shifts: ShiftsReviewShift[];
		employeesById: ShiftsReviewEmployeeMap;
	}) {
		this.mode = opts.mode;
		this.shifts = opts.shifts;
		this.employeesById = opts.employeesById;

		// Seed edit state from initial shifts
		for (const s of this.shifts) {
			this.otByShiftId[s.id] = typeof s.ot === 'number' ? s.ot : 0;
			this.approverByShiftId[s.id] = (s.otApprover ?? [])[0] ?? '';
			this.otOpenByShiftId[s.id] = false;
			this.statusByShiftId[s.id] = s.status ?? '';
		}
	}

	hasShifts = $derived(this.shifts.length > 0);

	employeeNames(shiftId: string) {
		const s = this.shifts.find((x) => x.id === shiftId);
		return (s?.employeeIds ?? []).map((id) => this.employeesById[id] ?? id);
	}

	getOt(shiftId: string) {
		return this.otByShiftId[shiftId] ?? 0;
	}

	setOt(shiftId: string, value: number) {
		const safe = Number.isFinite(value) ? value : 0;
		this.otByShiftId[shiftId] = Math.max(0, safe);
	}

	getApprover(shiftId: string) {
		return this.approverByShiftId[shiftId] ?? '';
	}

	setApprover(shiftId: string, name: string) {
		this.approverByShiftId[shiftId] = name ?? '';
	}

	isOtOpen(shiftId: string) {
		return this.otOpenByShiftId[shiftId] ?? false;
	}

	toggleOtOpen(shiftId: string) {
		this.otOpenByShiftId[shiftId] = !this.isOtOpen(shiftId);
	}

	getStatus(shiftId: string) {
		return this.statusByShiftId[shiftId] ?? '';
	}

	async setShiftStatus(shiftId: string, status: 'Planned' | 'Confirmed' | 'Completed' | 'Cancelled') {
		const prev = this.statusByShiftId[shiftId] ?? '';
		this.statusByShiftId[shiftId] = status;

		this.saving = true;
		this.error = null;
		try {
			await updateShift({
				id: shiftId,
				status
			});
		} catch (e: any) {
			// Revert optimistic update
			this.statusByShiftId[shiftId] = prev;
			this.error = e?.message ?? 'Failed to update shift';
			throw e;
		} finally {
			this.saving = false;
		}
	}

	async saveOt(shiftId: string) {
		const ot = this.getOt(shiftId);
		const approver = this.getApprover(shiftId);

		this.saving = true;
		this.error = null;

		try {
			await updateShift({
				id: shiftId,
				ot,
				otApprover: approver ? [approver] : []
			});
		} catch (e: any) {
			this.error = e?.message ?? 'Failed to update shift';
			throw e;
		} finally {
			this.saving = false;
		}
	}

	async clearOt(shiftId: string) {
		// Local reset first so UI reflects intent immediately
		const prevOt = this.otByShiftId[shiftId] ?? 0;
		const prevApprover = this.approverByShiftId[shiftId] ?? '';
		this.otByShiftId[shiftId] = 0;
		this.approverByShiftId[shiftId] = '';

		this.saving = true;
		this.error = null;
		try {
			await updateShift({
				id: shiftId,
				ot: 0,
				otApprover: []
			});
		} catch (e: any) {
			// Revert optimistic update
			this.otByShiftId[shiftId] = prevOt;
			this.approverByShiftId[shiftId] = prevApprover;
			this.error = e?.message ?? 'Failed to update OT';
			throw e;
		} finally {
			this.saving = false;
		}
	}

	async markShiftCompleted(shiftId: string) {
		const ot = this.getOt(shiftId);
		const approver = this.getApprover(shiftId);
		const prevStatus = this.statusByShiftId[shiftId] ?? '';
		this.statusByShiftId[shiftId] = 'Completed';

		this.saving = true;
		this.error = null;
		try {
			await updateShift({ id: shiftId, status: 'Completed', ot, otApprover: approver ? [approver] : [] });
		} catch (e: any) {
			// Revert optimistic update
			this.statusByShiftId[shiftId] = prevStatus;
			this.error = e?.message ?? 'Failed to update shift';
			throw e;
		} finally {
			this.saving = false;
		}
	}

	async markShiftConfirmed(shiftId: string) {
		return await this.setShiftStatus(shiftId, 'Confirmed');
	}
}

