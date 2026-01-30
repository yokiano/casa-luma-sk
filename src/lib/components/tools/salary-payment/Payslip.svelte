<script lang="ts">
	import type { SalaryEmployee, SalaryAdjustment, SalaryResult, CalendarDay } from '$lib/salary';

	let { 
		employee, 
		calendarDays, 
		adjustments, 
		result,
		startDate,
		endDate,
		isMidMonthRun = false,
		includeSSF = true
	}: { 
		employee: SalaryEmployee; 
		calendarDays: CalendarDay[]; 
		adjustments: SalaryAdjustment[]; 
		result: SalaryResult;
		startDate: string;
		endDate: string;
		isMidMonthRun?: boolean;
		includeSSF?: boolean;
	} = $props();

	function formatDate(dateStr: string | undefined) {
		if (!dateStr) return '';
		return new Date(dateStr).toLocaleDateString('en-GB', {
			day: '2-digit',
			month: 'short',
			year: 'numeric'
		});
	}

	// Both runs now use netPay which is attendance-based
	const displayNetPay = $derived(result.netPay);
</script>

<div class="payslip-container bg-white p-8 text-[#2c2925] shadow-sm print:shadow-none" style="width: 210mm; min-height: 297mm; margin: 0 auto;">
	<div class="flex items-center justify-between border-b-2 border-[#7a6550] pb-6 mb-8">
		<div>
			<h1 class="text-3xl font-serif font-bold text-[#7a6550]">CASA LUMA</h1>
			<p class="text-sm uppercase tracking-widest text-[#7a6550]/80">
				{isMidMonthRun ? 'Mid-Month Salary Statement' : 'End-of-Month Salary Statement'}
			</p>
		</div>
		<div class="text-right text-sm">
			<p class="font-bold">{isMidMonthRun ? 'Run 1 (1st - 15th)' : 'Run 2 (16th - End)'}</p>
			<p>Date Generated: {new Date().toLocaleDateString('en-GB')}</p>
			<p>Period: {formatDate(startDate)} - {formatDate(endDate)}</p>
		</div>
	</div>

	<div class="grid grid-cols-2 gap-8 mb-8">
		<div>
			<h3 class="text-xs font-bold uppercase text-[#7a6550]/60 mb-2">Employee Information</h3>
			<div class="space-y-1">
				<p><span class="font-semibold">Name:</span> {employee.fullName || employee.name}</p>
				<p><span class="font-semibold">Nickname:</span> {employee.name}</p>
				<p class="text-xs text-gray-500 mt-2 max-w-xs"><span class="font-semibold">Bank Details:</span> {employee.bankAccountDetails || 'N/A'}</p>
			</div>
		</div>
		<div class="text-right">
			<h3 class="text-xs font-bold uppercase text-[#7a6550]/60 mb-2">Payment Summary</h3>
			<div class="space-y-1">
				<p class="text-sm opacity-60">Net Payout for this period</p>
				<p class="font-bold text-3xl text-[#7a6550]">{displayNetPay.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} THB</p>
			</div>
		</div>
	</div>

	<div class="mb-8">
		<h3 class="text-xs font-bold uppercase text-[#7a6550]/60 mb-2">Earnings & Deductions</h3>
		<table class="w-full text-sm">
			<thead class="bg-[#f6f1eb] text-[#7a6550]">
				<tr>
					<th class="text-left py-2 px-3">Description</th>
					<th class="text-center py-2 px-3">Details</th>
					<th class="text-right py-2 px-3">Amount (THB)</th>
				</tr>
			</thead>
			<tbody class="divide-y divide-[#d3c5b8]/30">
				<!-- Earnings Section -->
				<tr>
					<td class="py-2 px-3">
						Standard Period Base (50%)
						<div class="text-[10px] text-gray-500">
							({result.grossMonthlySalary.toLocaleString()} THB monthly) / 2
						</div>
					</td>
					<td class="text-center py-2 px-3">15 days</td>
					<td class="text-right py-2 px-3">{result.baseSalaryForPeriod.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
				</tr>

				{#if result.otPay > 0}
					<tr>
						<td class="py-2 px-3">
							Overtime Pay (1.5x)
							<div class="text-[10px] text-gray-500">
								Total {(result.otHours15 + result.otHours10 + result.otHours30).toFixed(1)} hrs
							</div>
						</td>
						<td class="text-center py-2 px-3">
							{(result.otHours15 + result.otHours10 + result.otHours30).toFixed(1)} hrs
						</td>
						<td class="text-right py-2 px-3">{result.otPay.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
					</tr>
				{/if}

				{#each adjustments.filter(a => ['Bonus', 'Reimbursement'].includes(a.type || '')) as adj}
					<tr>
						<td class="py-2 px-3">
							{adj.title}
							{#if adj.notes}
								<div class="text-[10px] text-gray-500">{adj.notes}</div>
							{/if}
						</td>
						<td class="text-center py-2 px-3">{adj.type}</td>
						<td class="text-right py-2 px-3">
							{(adj.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
						</td>
					</tr>
				{/each}

				<!-- Attendance Deductions (Before Gross) -->
				{#if result.unpaidLeaveDeductions > 0}
					<tr class="text-amber-700">
						<td class="py-2 px-3">Unpaid Days Deductions</td>
						<td class="text-center py-2 px-3">{result.unpaidLeaveDays} days</td>
						<td class="text-right py-2 px-3">-{result.unpaidLeaveDeductions.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
					</tr>
				{/if}

				{#if result.lateDeductions > 0}
					<tr class="text-amber-700">
						<td class="py-2 px-3">Attendance Deductions (Late/Early)</td>
						<td class="text-center py-2 px-3">-</td>
						<td class="text-right py-2 px-3">-{result.lateDeductions.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
					</tr>
				{/if}

				<tr class="bg-[#f6f1eb]/30 font-semibold">
					<td class="py-2 px-3" colspan="2">Total Gross Earned</td>
					<td class="text-right py-2 px-3">{result.totalGrossEarned.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
				</tr>

				<!-- Post-Gross Deductions & Advances -->
				{#each adjustments.filter(a => !['Bonus', 'Reimbursement'].includes(a.type || '')) as adj}
					<tr class="text-amber-700">
						<td class="py-2 px-3">
							{adj.title}
							{#if adj.notes}
								<div class="text-[10px] text-gray-500">{adj.notes}</div>
							{/if}
						</td>
						<td class="text-center py-2 px-3">{adj.type}</td>
						<td class="text-right py-2 px-3">
							-{(adj.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
						</td>
					</tr>
				{/each}

				{#if !isMidMonthRun && result.ssfDeduction > 0 && includeSSF}
					<tr class="text-amber-700">
						<td class="py-2 px-3">Social Security (SSF) 5%</td>
						<td class="text-center py-2 px-3">Capped 750</td>
						<td class="text-right py-2 px-3">-{result.ssfDeduction.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
					</tr>
				{/if}
			</tbody>
			<tfoot class="border-t-2 border-[#7a6550] font-bold text-lg">
				<tr>
					<td class="py-4 px-3" colspan="2">NET PAYOUT (THB)</td>
					<td class="text-right py-4 px-3 text-[#7a6550]">{displayNetPay.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
				</tr>
			</tfoot>
		</table>
	</div>

	<!-- Attendance Summary - show for both runs -->
	<div class="mb-8">
		<h3 class="text-xs font-bold uppercase text-[#7a6550]/60 mb-2">Attendance Summary ({result.calendarDaysInPeriod} calendar days)</h3>
		<div class="grid grid-cols-5 gap-4 text-[10px] bg-[#fdfbf9] p-4 rounded-xl border border-[#d3c5b8]/30">
			<div>
				<p class="opacity-60 uppercase font-bold mb-1">Worked</p>
				<p class="text-sm font-bold">{result.workedShifts}</p>
			</div>
			<div>
				<p class="opacity-60 uppercase font-bold mb-1">Biz Day-Off</p>
				<p class="text-sm font-bold">{result.businessDaysOff}</p>
			</div>
			<div>
				<p class="opacity-60 uppercase font-bold mb-1">Paid Leave</p>
				<p class="text-sm font-bold">{result.paidSickDays + result.paidDaysOff}</p>
			</div>
			<div>
				<p class="opacity-60 uppercase font-bold mb-1">Unpaid</p>
				<p class="text-sm font-bold text-amber-700">{result.unpaidLeaveDays}</p>
			</div>
			<div>
				<p class="opacity-60 uppercase font-bold mb-1">OT Total</p>
				<p class="text-sm font-bold">{(result.otHours15 + result.otHours10 + result.otHours30).toFixed(1)}h</p>
			</div>
		</div>
	</div>

	<div class="mt-20 grid grid-cols-2 gap-16">
		<div class="border-t border-black pt-2 text-center">
			<p class="text-xs font-bold uppercase">Employee Signature</p>
			<p class="text-sm mt-1">{employee.fullName || employee.name}</p>
		</div>
		<div class="border-t border-black pt-2 text-center">
			<p class="text-xs font-bold uppercase">Authorized Manager</p>
			<p class="text-sm mt-1 italic">Casa Luma Management</p>
		</div>
	</div>
	
	<div class="mt-auto pt-10 text-[10px] text-gray-400 text-center">
		<p>This is a professional payroll document compliant with Thai Labor Protection Act (LPA) standards.</p>
		<p>Casa Luma · 2026</p>
	</div>
</div>

<style>
	@media print {
		@page {
			margin: 1.5cm;
			size: A4;
		}
		.payslip-container {
			margin: 0 !important;
			width: 100% !important;
			height: auto !important;
			min-height: 0 !important;
			box-shadow: none !important;
			border: none !important;
		}
	}
</style>
