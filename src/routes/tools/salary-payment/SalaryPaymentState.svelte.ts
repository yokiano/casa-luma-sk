import { getSalaryData } from '$lib/salary.remote';
import { calculateSalary, type SalaryEmployee, type SalaryShift, type SalaryAdjustment, type SalaryResult } from '$lib/salary';
import { getEmployees, type PublicEmployee } from '$lib/employees.remote';

export class SalaryPaymentState {
	employees = $state<PublicEmployee[]>([]);
	selectedEmployeeId = $state<string | null>(null);
	
	// Default to current bi-weekly period (simplification: 1st-15th or 16th-end)
	startDate = $state<string>(this.getDefaultStartDate());
	endDate = $state<string>(this.getDefaultEndDate());
	
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

	private getDefaultStartDate(): string {
		const now = new Date();
		const day = now.getDate();
		const month = now.getMonth() + 1;
		const year = now.getFullYear();
		const monthStr = month.toString().padStart(2, '0');
		
		if (day <= 15) {
			return `${year}-${monthStr}-01`;
		} else {
			return `${year}-${monthStr}-16`;
		}
	}

	private getDefaultEndDate(): string {
		const now = new Date();
		const day = now.getDate();
		const month = now.getMonth() + 1;
		const year = now.getFullYear();
		const monthStr = month.toString().padStart(2, '0');
		
		if (day <= 15) {
			return `${year}-${monthStr}-15`;
		} else {
			const lastDay = new Date(year, month, 0).getDate();
			return `${year}-${monthStr}-${lastDay}`;
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

	salaryResult = $derived.by(() => {
		if (!this.salaryData) return null;
		return calculateSalary(
			this.salaryData.employee,
			this.salaryData.shifts,
			this.salaryData.adjustments,
			this.startDate
		);
	});
}
