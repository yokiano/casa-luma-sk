import { getSalaryData } from '$lib/salary.remote';
import { calculateSalary, generateCalendarDays, type SalaryEmployee, type SalaryShift, type SalaryAdjustment, type SalaryResult, type CalendarDay } from '$lib/salary';
import { getEmployees, type PublicEmployee } from '$lib/employees.remote';

export class SalaryPaymentState {
	employees = $state<PublicEmployee[]>([]);
	selectedEmployeeId = $state<string | null>(null);
	
	// Payroll Run Type - this drives the date range
	isMidMonthRun = $state(this.detectDefaultRun());
	
	// Derived dates based on run type
	startDate = $state<string>(this.getStartDateForRun(this.isMidMonthRun));
	endDate = $state<string>(this.getEndDateForRun(this.isMidMonthRun));
	
	// Payroll Options
	businessDayOff = $state(3); // Wednesday
	sickDaysUsedYearToDate = $state(0);
	includeSSF = $state(true); // SSF checkbox, on by default
	
	// Manual Overrides for Calendar Days (keyed by date string YYYY-MM-DD)
	overriddenDays = $state<Record<string, Partial<CalendarDay>>>({});
	
	// UI State
	isAttendanceExpanded = $state(true);
	isSaveDialogOpen = $state(false);
	
	salaryData = $state<{
		employee: SalaryEmployee;
		shifts: SalaryShift[];
		adjustments: SalaryAdjustment[];
	} | null>(null);
	
	isLoading = $state(false);
	error = $state<string | null>(null);

	constructor() {
		this.loadEmployees();
	}

	private detectDefaultRun(): boolean {
		const day = new Date().getDate();
		return day <= 15;
	}

	private getStartDateForRun(isMid: boolean): string {
		const now = new Date();
		const month = now.getMonth() + 1;
		const year = now.getFullYear();
		const monthStr = month.toString().padStart(2, '0');
		
		if (isMid) {
			return `${year}-${monthStr}-01`;
		} else {
			return `${year}-${monthStr}-16`;
		}
	}

	private getEndDateForRun(isMid: boolean): string {
		const now = new Date();
		const month = now.getMonth() + 1;
		const year = now.getFullYear();
		const monthStr = month.toString().padStart(2, '0');
		
		if (isMid) {
			return `${year}-${monthStr}-15`;
		} else {
			const lastDay = new Date(year, month, 0).getDate();
			return `${year}-${monthStr}-${lastDay}`;
		}
	}

	// When run type changes, update dates automatically
	setRunType(isMid: boolean) {
		this.isMidMonthRun = isMid;
		this.startDate = this.getStartDateForRun(isMid);
		this.endDate = this.getEndDateForRun(isMid);
		this.overriddenDays = {}; // Reset overrides
		if (this.selectedEmployeeId) {
			this.fetchData();
		}
	}

	async loadEmployees() {
		try {
			this.employees = await getEmployees();
		} catch (e: any) {
			console.error('Failed to load employees', e);
			this.error = 'Failed to load employees';
		}
	}

	async fetchData() {
		if (!this.selectedEmployeeId) return;
		
		this.isLoading = true;
		this.error = null;
		this.salaryData = null;
		this.overriddenDays = {}; // Reset overrides on new fetch
		
		try {
			const data = await getSalaryData({
				employeeId: this.selectedEmployeeId,
				startDate: this.startDate,
				endDate: this.endDate
			});
			this.salaryData = data;
		} catch (e: any) {
			console.error('Failed to fetch salary data', e);
			this.error = 'Failed to fetch salary data';
		} finally {
			this.isLoading = false;
		}
	}

	// Generate all calendar days for the period
	calendarDays = $derived.by(() => {
		if (!this.salaryData) return [];
		return generateCalendarDays(
			this.startDate,
			this.endDate,
			this.salaryData.shifts,
			this.businessDayOff
		);
	});

	// Apply overrides to calendar days
	effectiveCalendarDays = $derived.by(() => {
		return this.calendarDays.map(day => {
			const override = this.overriddenDays[day.id];
			if (override) {
				return { ...day, ...override };
			}
			return day;
		});
	});

	salaryResult = $derived.by(() => {
		if (!this.salaryData || this.effectiveCalendarDays.length === 0) return null;
		return calculateSalary(
			this.salaryData.employee,
			this.effectiveCalendarDays,
			this.salaryData.adjustments,
			this.startDate,
			this.endDate,
			{
				isMidMonthRun: this.isMidMonthRun,
				sickDaysUsedYearToDate: this.sickDaysUsedYearToDate,
				includeSSF: this.includeSSF
			}
		);
	});

	updateDayOverride(dateId: string, property: keyof CalendarDay, value: any) {
		if (!this.overriddenDays[dateId]) {
			this.overriddenDays[dateId] = {};
		}
		(this.overriddenDays[dateId] as any)[property] = value;
		// Force reactivity by reassigning
		this.overriddenDays = { ...this.overriddenDays };
	}
}
