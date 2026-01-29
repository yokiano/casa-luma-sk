import { query } from '$app/server';
import * as v from 'valibot';
import { NOTION_API_KEY } from '$env/static/private';
import { ShiftsDatabase, ShiftsResponseDTO } from '$lib/notion-sdk/dbs/shifts';
import { SalaryAdjustmentsDatabase, SalaryAdjustmentsResponseDTO } from '$lib/notion-sdk/dbs/salary-adjustments';
import { EmployeesDatabase, EmployeesResponseDTO } from '$lib/notion-sdk/dbs/employees';
import type { SalaryEmployee, SalaryShift, SalaryAdjustment } from './salary';

const SalaryDataSchema = v.object({
	employeeId: v.string(),
	startDate: v.string(), // ISO date string (YYYY-MM-DD)
	endDate: v.string()    // ISO date string (YYYY-MM-DD)
});

export const getSalaryData = query(SalaryDataSchema, async ({ employeeId, startDate, endDate }) => {
	const shiftsDb = new ShiftsDatabase({ notionSecret: NOTION_API_KEY });
	const adjustmentsDb = new SalaryAdjustmentsDatabase({ notionSecret: NOTION_API_KEY });
	const employeesDb = new EmployeesDatabase({ notionSecret: NOTION_API_KEY });

	// Add one day to endDate to make the filter inclusive
	// Notion's "before" filter is exclusive, so we need to add a day
	const endDateInclusive = new Date(endDate);
	endDateInclusive.setDate(endDateInclusive.getDate() + 1);
	const endDateInclusiveStr = endDateInclusive.toISOString().substring(0, 10);

	const [shiftsRes, adjustmentsRes, employeeRes] = await Promise.all([
		shiftsDb.query({
			filter: {
				and: [
					{ employee: { contains: employeeId } },
					{ shiftTime: { on_or_after: startDate } },
					{ shiftTime: { before: endDateInclusiveStr } }
				]
			},
			sorts: [{ property: 'shiftTime', direction: 'ascending' }]
		}),
		adjustmentsDb.query({
			filter: {
				and: [
					{ employee: { contains: employeeId } },
					{ date: { on_or_after: startDate } },
					{ date: { before: endDateInclusiveStr } }
				]
			},
			sorts: [{ property: 'date', direction: 'ascending' }]
		}),
		employeesDb.getPage(employeeId)
	]);

	const employeeDto = new EmployeesResponseDTO(employeeRes as any);
	const otFormula = employeeDto.properties.otRateThBhr;
	const otRateValue = otFormula && 'number' in otFormula ? otFormula.number : undefined;
	
	const employee: SalaryEmployee = {
		id: employeeDto.id,
		name: employeeDto.properties.nickname.text || '',
		fullName: employeeDto.properties.fullName.text || '',
		salaryThb: employeeDto.properties.salaryThb ?? undefined,
		salaryCalculation: employeeDto.properties.salaryCalculation?.name,
		otRateThBhr: otRateValue ?? undefined,
		bankAccountDetails: employeeDto.properties.bankAccountDetails.text,
		startDate: employeeDto.properties.startDate?.start,
		resignationDate: employeeDto.properties.endDate?.start
	};

	const shifts = shiftsRes.results.map((r) => {
		const dto = new ShiftsResponseDTO(r);
		return {
			id: dto.id,
			date: dto.properties.shiftTime?.start,
			type: dto.properties.type?.name,
			status: dto.properties.status?.name,
			ot: dto.properties.ot
		};
	});

	const adjustments = adjustmentsRes.results.map((r) => {
		const dto = new SalaryAdjustmentsResponseDTO(r);
		return {
			id: dto.id,
			title: dto.properties.adjustmentTitle.text || 'Adjustment',
			type: dto.properties.adjustmentType?.name,
			amount: dto.properties.amountThb,
			date: dto.properties.date?.start,
			notes: dto.properties.notes.text
		};
	});

	return {
		employee,
		shifts,
		adjustments
	};
});
