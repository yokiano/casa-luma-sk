import { describe, expect, it } from 'vitest';
import { calculateSalary, generateCalendarDays, type SalaryEmployee, type SalaryShift } from './salary';

const monthlyEmployee: SalaryEmployee = {
	id: 'emp-1',
	name: 'Test',
	fullName: 'Test Employee',
	salaryThb: 30000,
	salaryCalculation: 'Monthly',
	otRateThBhr: undefined,
	bankAccountDetails: undefined
};

function completedShift(date: string): SalaryShift {
	return {
		id: date,
		date,
		type: 'Regular',
		status: 'Completed',
		ot: 0
	};
}

describe('generateCalendarDays', () => {
	it('does not apply a fixed Wednesday business day off anymore', () => {
		const shifts = [
			'2026-06-01',
			'2026-06-02',
			'2026-06-03',
			'2026-06-04',
			'2026-06-05',
			'2026-06-06'
		].map(completedShift);

		const days = generateCalendarDays('2026-06-01', '2026-06-07', shifts);

		expect(days.find((day) => day.date === '2026-06-03')?.status).toBe('Completed');
		expect(days.find((day) => day.date === '2026-06-07')?.status).toBe('Day Off (Paid)');
		expect(days.find((day) => day.date === '2026-06-07')?.isExpectedWeeklyDayOff).toBe(true);
	});

	it('treats only one missing shift per week as the expected paid day off', () => {
		const shifts = [
			'2026-06-01',
			'2026-06-02',
			'2026-06-03',
			'2026-06-04',
			'2026-06-05'
		].map(completedShift);

		const days = generateCalendarDays('2026-06-01', '2026-06-07', shifts);
		const result = calculateSalary(monthlyEmployee, days, [], '2026-06-01', '2026-06-07');

		expect(days.find((day) => day.date === '2026-06-06')?.status).toBe('Day Off (Paid)');
		expect(days.find((day) => day.date === '2026-06-07')?.status).toBe('No Data');
		expect(result.paidDaysOff).toBe(1);
		expect(result.unpaidLeaveDays).toBe(1);
	});
});
