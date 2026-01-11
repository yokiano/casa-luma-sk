import { command, query } from '$app/server';
import * as v from 'valibot';
import { error } from '@sveltejs/kit';
import { NOTION_API_KEY } from '$env/static/private';
import { ShiftsDatabase, ShiftsResponseDTO, type ShiftsStatusPropertyType } from '$lib/notion-sdk/dbs/shifts';
import { ShiftsPatchDTO } from '$lib/notion-sdk/dbs/shifts/patch.dto';

export type ShiftForReview = {
	id: string;
	employeeIds: string[];
	type: string | null;
	status: ShiftsStatusPropertyType | null;
	shiftTime: { start: string; end?: string | null } | null;
	shiftNoteText: string | null;
	ot: number | null;
	otApprover: string[];
};

function bangkokYmdFromDate(d: Date): string {
	const parts = new Intl.DateTimeFormat('en-CA', {
		timeZone: 'Asia/Bangkok',
		year: 'numeric',
		month: '2-digit',
		day: '2-digit'
	}).formatToParts(d);

	const year = parts.find((p) => p.type === 'year')?.value;
	const month = parts.find((p) => p.type === 'month')?.value;
	const day = parts.find((p) => p.type === 'day')?.value;
	if (!year || !month || !day) {
		// Should never happen, but don’t silently break filtering
		throw new Error('Failed to compute Bangkok date');
	}
	return `${year}-${month}-${day}`;
}

function addDaysYmd(ymd: string, days: number): string {
	const [y, m, d] = ymd.split('-').map((x) => Number(x));
	const dt = new Date(Date.UTC(y, m - 1, d));
	dt.setUTCDate(dt.getUTCDate() + days);
	return dt.toISOString().slice(0, 10);
}

function getBangkokDayRange(offsetDays: number): { start: string; endExclusive: string } {
	const todayBangkok = bangkokYmdFromDate(new Date());
	const start = addDaysYmd(todayBangkok, offsetDays);
	const endExclusive = addDaysYmd(start, 1);
	return { start, endExclusive };
}

function toShiftForReview(dto: ShiftsResponseDTO): ShiftForReview {
	return {
		id: dto.id,
		employeeIds: dto.properties.employeeIds ?? [],
		type: dto.properties.type?.name ?? null,
		status: dto.properties.status?.name ?? null,
		shiftTime: dto.properties.shiftTime
			? { start: dto.properties.shiftTime.start, end: dto.properties.shiftTime.end }
			: null,
		shiftNoteText: dto.properties.shiftNote?.text ?? null,
		ot: dto.properties.ot ?? null,
		otApprover: dto.properties.otApprover?.values ?? []
	};
}

export const getShiftsForBangkokDay = query(
	v.pipe(v.number(), v.integer()),
	async (offsetDays) => {
		const { start, endExclusive } = getBangkokDayRange(offsetDays);

		const db = new ShiftsDatabase({
			notionSecret: NOTION_API_KEY
		});

		const res = await db.query({
			filter: {
				and: [{ shiftTime: { on_or_after: start } }, { shiftTime: { before: endExclusive } }]
			},
			sorts: [
				// Stable ordering for “one-by-one” review
				{ property: 'shiftTime', direction: 'ascending' }
			]
		});

		// Remote functions must return POJOs (not DTO instances)
		return res.results.map((r) => toShiftForReview(new ShiftsResponseDTO(r)));
	}
);

const UpdateShiftSchema = v.object({
	id: v.pipe(v.string(), v.minLength(1)),
	status: v.optional(v.pipe(v.string(), v.minLength(1))),
	ot: v.optional(v.number()),
	otApprover: v.optional(v.array(v.string()))
});

export const updateShift = command(UpdateShiftSchema, async (payload) => {
	const db = new ShiftsDatabase({
		notionSecret: NOTION_API_KEY
	});

	try {
		const properties: Record<string, unknown> = {};
		if (payload.status !== undefined) {
			properties.status = { name: payload.status };
		}
		if (payload.ot !== undefined) {
			properties.ot = payload.ot;
		}
		if (payload.otApprover !== undefined) {
			properties.otApprover = payload.otApprover;
		}

		await db.updatePage(
			payload.id,
			new ShiftsPatchDTO({
				properties: {
					...(properties as any)
				}
			})
		);
		return { success: true };
	} catch (e) {
		console.error('Failed to update shift:', e);
		throw error(500, { message: 'Failed to update shift in Notion' });
	}
});

