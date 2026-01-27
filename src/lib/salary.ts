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
};

export type SalaryEmployee = {
	id: string;
	name: string;
	fullName: string;
	salaryThb: number | undefined;
	salaryCalculation: string | undefined;
	otRateThBhr: number | undefined;
	bankAccountDetails: string | undefined;
};

export type SalaryResult = {
	workedShifts: number;
	paidSickDays: number;
	paidDaysOff: number;
	totalWorkedDays: number;
	otHours: number;
	basePay: number;
	otPay: number;
	totalAdjustments: number;
	netPay: number;
	dailyRate: number;
};

export function calculateSalary(
	employee: SalaryEmployee,
	shifts: SalaryShift[],
	adjustments: SalaryAdjustment[],
	startDate: string
): SalaryResult {
	const workedShiftsList = shifts.filter(s => s.status === 'Completed' || s.status === 'Confirmed');
	const paidSickDaysList = shifts.filter(s => s.status === 'Sick Day (Paid)');
	const paidDaysOffList = shifts.filter(s => s.status === 'Day Off (Paid)');

	const workedShifts = workedShiftsList.length;
	const paidSickDays = paidSickDaysList.length;
	const paidDaysOff = paidDaysOffList.length;
	const totalWorkedDays = workedShifts + paidSickDays + paidDaysOff;

	const otHours = shifts.reduce((acc, s) => acc + (s.ot || 0), 0);

	const date = new Date(startDate);
	const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
	const monthlySalary = employee.salaryThb || 0;
	const dailyRate = monthlySalary / daysInMonth;

	let basePay = 0;
	if (employee.salaryCalculation === 'Monthly') {
		basePay = dailyRate * totalWorkedDays;
	} else if (employee.salaryCalculation === 'Daily') {
		basePay = (employee.salaryThb || 0) * totalWorkedDays;
	}

	const otPay = otHours * (employee.otRateThBhr || 0);

	const totalAdjustments = adjustments.reduce((acc, a) => {
		const amount = a.amount || 0;
		if (['Bonus', 'Reimbursement'].includes(a.type || '')) {
			return acc + amount;
		}
		if (['Advance', 'Deduction', 'Loan Repayment', 'Late Penalty'].includes(a.type || '')) {
			return acc - amount;
		}
		return acc;
	}, 0);

	const netPay = basePay + otPay + totalAdjustments;

	return {
		workedShifts,
		paidSickDays,
		paidDaysOff,
		totalWorkedDays,
		otHours,
		basePay,
		otPay,
		totalAdjustments,
		netPay,
		dailyRate
	};
}
