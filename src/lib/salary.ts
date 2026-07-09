/**
 * Casa Luma Payroll Calculation Engine
 * 
 * This logic follows the bi-monthly independent period model.
 * See documentation for full details: docs/casa-luma/tools/payroll/logic-guide.md
 * 
 * CRITICAL: When updating this logic, ensure the documentation is updated accordingly.
 */

import { getBangkokDateStr, getBangkokDayOfWeek } from './date-utils';

export type SalaryAdjustment = {
	id: string;
	title: string;
	type: string | undefined;
	amount: number | undefined;
	date: string | undefined;
	notes: string | undefined;
};

export type SalaryShift = {
	id: string;
	date: string | undefined;
	type: string | undefined;
	status: string | undefined;
	ot: number | undefined;
	otType?: '1.5' | '1.0' | '3.0';
	hoursAbsent?: number;
};

// A "CalendarDay" represents each day in the pay period with its calculated status
export type CalendarDay = {
	id: string; // date string YYYY-MM-DD
	date: string;
	dayOfWeek: number; // 0-6
	shift?: SalaryShift; // Original shift from Notion if exists
	status: 'Completed' | 'Confirmed' | 'Planned' | 'Cancelled' | 'Sick Day (Paid)' | 'Sick Day (Unpaid)' | 'Day Off (Paid)' | 'Day Off (Unpaid)' | 'Business Day-Off' | 'No Data';
	ot: number;
	otType: '1.5' | '1.0' | '3.0';
	hoursAbsent: number;
	isExpectedWeeklyDayOff: boolean;
	isWeekend: boolean;
	hasShiftData: boolean;
};

export type SalaryEmployee = {
	id: string;
	name: string;
	fullName: string;
	salaryThb: number | undefined;
	salaryCalculation: string | undefined;
	otRateThBhr: number | undefined;
	bankAccountDetails: string | undefined;
	startDate?: string;
	resignationDate?: string;
};

export type SalaryResult = {
	dailyRate: number;
	hourlyRate: number;
	
	// Attendance Metrics
	workedShifts: number;
	paidSickDays: number;
	unpaidSickDays: number;
	paidDaysOff: number;
	businessDaysOff: number;
	unpaidLeaveDays: number;
	totalPaidDays: number;
	calendarDaysInPeriod: number;
	
	// OT Metrics
	otHours15: number;
	otHours10: number;
	otHours30: number;
	otPay: number;
	
	// Pay Components
	grossMonthlySalary: number;
	baseSalaryForPeriod: number;
	lateDeductions: number;
	unpaidLeaveDeductions: number;
	totalAdjustments: number;
	// Company policy: Casa Luma covers the full SSO contribution on the employee's behalf.
	ssfDeduction: number;
	
	// Granular Adjustment Components
	bonuses: number;
	deductions: number;
	advances: number;
	totalAttendanceDeductions: number;
	
	// Totals
	totalGrossEarned: number;
	netPay: number;
	
	// Bi-Monthly Split
	midMonthPayout: number;
	finalMonthPayout: number;
};

export const STANDARD_MONTH_DAYS = 30;
export const STANDARD_DAY_HOURS = 8;

function getWeekKey(dateStr: string): string {
	const date = new Date(`${dateStr}T00:00:00+07:00`);
	const dayOfWeek = getBangkokDayOfWeek(date);
	const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
	date.setUTCDate(date.getUTCDate() - daysSinceMonday);
	return getBangkokDateStr(date);
}

// Generate all calendar days for the period
export function generateCalendarDays(
	startDate: string,
	endDate: string,
	shifts: SalaryShift[]
): CalendarDay[] {
	const days: CalendarDay[] = [];
	
	// Create a map of shifts by date for quick lookup
	const shiftsByDate = new Map<string, SalaryShift>();
	shifts.forEach(s => {
		if (s.date) {
			const dateKey = getBangkokDateStr(s.date); // Use Bangkok date string
			shiftsByDate.set(dateKey, s);
		}
	});
	
	const current = new Date(`${startDate}T00:00:00+07:00`);
	const endLimit = new Date(`${endDate}T00:00:00+07:00`);
	
	while (current <= endLimit) {
		const dateStr = getBangkokDateStr(current);
		const dayOfWeek = getBangkokDayOfWeek(current);
		const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
		const shift = shiftsByDate.get(dateStr);
		const hasShiftData = !!shift;
		
		let status: CalendarDay['status'];
		let ot = 0;
		let otType: CalendarDay['otType'] = '1.5';
		let hoursAbsent = 0;
		
		if (shift) {
			// Use shift data from Notion as-is; managers keep per-person days off up to date there.
			status = (shift.status as CalendarDay['status']) || 'Completed';
			ot = shift.ot || 0;
			otType = shift.otType || '1.5';
			hoursAbsent = shift.hoursAbsent || 0;
		} else {
			// Missing shifts start unpaid; one missing day per week is converted below
			// to the expected weekly day off so a 6-day week is not deducted.
			status = 'No Data';
		}
		
		days.push({
			id: dateStr,
			date: dateStr,
			dayOfWeek,
			shift,
			status,
			ot,
			otType,
			hoursAbsent,
			isExpectedWeeklyDayOff: false,
			isWeekend,
			hasShiftData
		});
		
		current.setUTCDate(current.getUTCDate() + 1);
	}

	const weeks = new Map<string, CalendarDay[]>();
	for (const day of days) {
		const weekKey = getWeekKey(day.date);
		weeks.set(weekKey, [...(weeks.get(weekKey) || []), day]);
	}

	for (const weekDays of weeks.values()) {
		const hasPaidDayOff = weekDays.some((day) => day.status === 'Day Off (Paid)' || day.status === 'Business Day-Off');
		if (hasPaidDayOff) continue;

		const expectedDayOff = weekDays.find((day) => !day.hasShiftData && day.status === 'No Data');
		if (expectedDayOff) {
			expectedDayOff.status = 'Day Off (Paid)';
			expectedDayOff.isExpectedWeeklyDayOff = true;
		}
	}
	
	return days;
}

export function calculateSalary(
	employee: SalaryEmployee,
	calendarDays: CalendarDay[],
	adjustments: SalaryAdjustment[],
	periodStartDate: string,
	periodEndDate: string,
	options: {
		isMidMonthRun?: boolean;
		sickDaysUsedYearToDate?: number;
	} = {}
): SalaryResult {
	const isDaily = employee.salaryCalculation === 'Daily';
	const monthlySalary = !isDaily ? (employee.salaryThb || 0) : 0;
	const dailyRate = isDaily ? (employee.salaryThb || 0) : (monthlySalary / STANDARD_MONTH_DAYS);
	const hourlyRate = dailyRate / STANDARD_DAY_HOURS;

	const calendarDaysInPeriod = calendarDays.length;

	// Process Calendar Days
	let workedShifts = 0;
	let paidSickDays = 0;
	let unpaidSickDays = 0;
	let paidDaysOff = 0;
	let businessDaysOff = 0;
	let unpaidLeaveDays = 0;
	let lateDeductions = 0;
	let otHours15 = 0;
	let otHours10 = 0;
	let otHours30 = 0;

	let sickDaysThisPeriod = 0;
	const sickDaysBefore = options.sickDaysUsedYearToDate || 0;

	calendarDays.forEach(day => {
		lateDeductions += day.hoursAbsent * hourlyRate;

		if (day.status === 'Completed' || day.status === 'Confirmed') {
			workedShifts++;
		} else if (day.status === 'Sick Day (Paid)') {
			if (!isDaily && (sickDaysBefore + sickDaysThisPeriod < 30)) {
				paidSickDays++;
				sickDaysThisPeriod++;
			} else {
				unpaidSickDays++;
			}
		} else if (day.status === 'Day Off (Paid)') {
			if (!isDaily) {
				paidDaysOff++;
			} else {
				unpaidLeaveDays++;
			}
		} else if (day.status === 'Business Day-Off') {
			// Legacy status kept compatible, but new payroll uses per-employee weekly days off.
			if (!isDaily) {
				businessDaysOff++;
			} else {
				// Daily workers don't get paid for a non-worked day.
				unpaidLeaveDays++;
			}
		} else if (
			day.status === 'Planned' || 
			day.status === 'Cancelled' || 
			day.status === 'No Data' ||
			day.status === 'Sick Day (Unpaid)' ||
			day.status === 'Day Off (Unpaid)'
		) {
			unpaidLeaveDays++;
		}

		// OT Calculation
		const ot = day.ot || 0;
		if (day.otType === '1.0') otHours10 += ot;
		else if (day.otType === '3.0') otHours30 += ot;
		else otHours15 += ot;
	});

	const totalPaidDays = workedShifts + paidSickDays + paidDaysOff + businessDaysOff;
	
	// OT Calculation: Fixed at 1.5x for all hours per business rule
	const totalOtHours = otHours15 + otHours10 + otHours30;
	const otPay = totalOtHours * hourlyRate * 1.5;

	// Adjustments
	let bonuses = 0;
	let deductions = 0;
	let advances = 0;

	adjustments.forEach(a => {
		const amount = a.amount || 0;
		if (['Bonus', 'Reimbursement'].includes(a.type || '')) {
			bonuses += amount;
		} else if (['Advance'].includes(a.type || '')) {
			advances += amount;
		} else if (['Deduction', 'Loan Repayment', 'Late Penalty', 'Uniform', 'Damages'].includes(a.type || '')) {
			deductions += amount;
		}
	});

	const totalAdjustments = bonuses - deductions - advances;

	// 1. Base salary calculation
	// For daily employees, it's strictly worked shifts * daily rate
	// For monthly employees, it's 50% of monthly salary
	const baseSalaryForPeriod = isDaily ? (workedShifts * dailyRate) : (monthlySalary / 2);

	// 2. Subtract deductions for unpaid days in THIS period
	// Daily workers don't have unpaid leave deductions because they are only paid for what they worked.
	const unpaidLeaveDeductions = isDaily ? 0 : (unpaidLeaveDays * dailyRate);
	const unpaidSickDeductions = isDaily ? 0 : (unpaidSickDays * dailyRate);
	const totalAttendanceDeductions = unpaidLeaveDeductions + unpaidSickDeductions + lateDeductions;

	// 3. Total gross for this period
	// Net = Base + OT + Bonuses - Attendance Deductions
	const totalGrossEarned = baseSalaryForPeriod + otPay + bonuses - totalAttendanceDeductions;
	
	const ssfDeduction = 0; // Kept for compatibility; SSO is company-paid.

	// Net payout for this period
	const netPay = totalGrossEarned - advances - deductions;

	// Both runs now calculate based on their period's attendance
	const midMonthPayout = options.isMidMonthRun ? netPay : (isDaily ? 0 : (monthlySalary / 2));
	const finalMonthPayout = netPay;

	return {
		dailyRate,
		hourlyRate,
		workedShifts,
		paidSickDays,
		unpaidSickDays,
		paidDaysOff,
		businessDaysOff,
		unpaidLeaveDays,
		totalPaidDays,
		calendarDaysInPeriod,
		otHours15,
		otHours10,
		otHours30,
		otPay,
		grossMonthlySalary: isDaily ? (dailyRate * STANDARD_MONTH_DAYS) : monthlySalary,
		baseSalaryForPeriod,
		lateDeductions,
		unpaidLeaveDeductions: unpaidLeaveDeductions + unpaidSickDeductions,
		totalAdjustments,
		ssfDeduction,
		bonuses,
		deductions,
		advances,
		totalAttendanceDeductions,
		totalGrossEarned,
		netPay,
		midMonthPayout,
		finalMonthPayout
	};
}
