<script lang="ts">
	import type { SalaryEmployee, SalaryShift, SalaryAdjustment, SalaryResult } from '$lib/salary';

	let { 
		employee, 
		shifts, 
		adjustments, 
		result,
		startDate,
		endDate
	}: { 
		employee: SalaryEmployee; 
		shifts: SalaryShift[]; 
		adjustments: SalaryAdjustment[]; 
		result: SalaryResult;
		startDate: string;
		endDate: string;
	} = $props();

	function formatDate(dateStr: string | undefined) {
		if (!dateStr) return '';
		return new Date(dateStr).toLocaleDateString('en-GB', {
			day: '2-digit',
			month: 'short',
			year: 'numeric'
		});
	}

	const totalAdjustments = $derived(adjustments.reduce((acc, a) => {
		const amount = a.amount || 0;
		if (['Bonus', 'Reimbursement'].includes(a.type || '')) return acc + amount;
		if (['Advance', 'Deduction', 'Loan Repayment', 'Late Penalty'].includes(a.type || '')) return acc - amount;
		return acc;
	}, 0));
</script>

<div class="payslip-container bg-white p-8 text-[#2c2925] shadow-sm print:p-0 print:shadow-none" style="width: 210mm; min-height: 297mm; margin: 0 auto;">
	<div class="flex items-center justify-between border-b-2 border-[#7a6550] pb-6 mb-8">
		<div>
			<h1 class="text-3xl font-serif font-bold text-[#7a6550]">CASA LUMA</h1>
			<p class="text-sm uppercase tracking-widest text-[#7a6550]/80">Salary Payslip</p>
		</div>
		<div class="text-right text-sm">
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
			<div class="space-y-1 text-lg">
				<p class="font-bold text-2xl text-[#7a6550]">Net Pay: {result.netPay.toLocaleString()} THB</p>
			</div>
		</div>
	</div>

	<div class="mb-8">
		<h3 class="text-xs font-bold uppercase text-[#7a6550]/60 mb-2">Earnings Breakdown</h3>
		<table class="w-full text-sm">
			<thead class="bg-[#f6f1eb] text-[#7a6550]">
				<tr>
					<th class="text-left py-2 px-3">Description</th>
					<th class="text-center py-2 px-3">Details</th>
					<th class="text-right py-2 px-3">Amount (THB)</th>
				</tr>
			</thead>
			<tbody class="divide-y divide-[#d3c5b8]/30">
				<tr>
					<td class="py-2 px-3">
						Base Salary ({employee.salaryCalculation})
						<div class="text-xs text-gray-500">
							{result.totalWorkedDays} days @ {result.dailyRate.toFixed(2)} THB/day
						</div>
					</td>
					<td class="text-center py-2 px-3">
						{result.totalWorkedDays} days
					</td>
					<td class="text-right py-2 px-3">{result.basePay.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
				</tr>
				{#if result.otHours > 0}
					<tr>
						<td class="py-2 px-3">
							Overtime Pay
							<div class="text-xs text-gray-500">
								{result.otHours} hours @ {employee.otRateThBhr || 0} THB/hr
							</div>
						</td>
						<td class="text-center py-2 px-3">
							{result.otHours} hrs
						</td>
						<td class="text-right py-2 px-3">{result.otPay.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
					</tr>
				{/if}
				{#each adjustments as adj}
					<tr>
						<td class="py-2 px-3">
							{adj.title}
							{#if adj.notes}
								<div class="text-xs text-gray-500">{adj.notes}</div>
							{/if}
						</td>
						<td class="text-center py-2 px-3">{adj.type}</td>
						<td class="text-right py-2 px-3">
							{['Advance', 'Deduction', 'Loan Repayment', 'Late Penalty'].includes(adj.type || '') ? '-' : ''}
							{(adj.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
						</td>
					</tr>
				{/each}
			</tbody>
			<tfoot class="border-t-2 border-[#7a6550] font-bold">
				<tr>
					<td class="py-3 px-3" colspan="2">Total Net Salary</td>
					<td class="text-right py-3 px-3">{result.netPay.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
				</tr>
			</tfoot>
		</table>
	</div>

	<div class="mb-8">
		<h3 class="text-xs font-bold uppercase text-[#7a6550]/60 mb-2">Shift Details ({shifts.length})</h3>
		<div class="grid grid-cols-4 gap-2 text-[10px]">
			{#each shifts as shift}
				<div class="border border-[#d3c5b8]/50 p-1 rounded">
					<p class="font-bold">{formatDate(shift.date)}</p>
					<p class="text-gray-500">{shift.type?.replace(/\(.*\)/, '') || 'Shift'}</p>
					<p class={shift.status?.includes('Paid') || shift.status === 'Completed' ? 'text-green-600' : 'text-red-600'}>
						{shift.status}
					</p>
					{#if shift.ot}
						<p class="text-[#7a6550]">OT: {shift.ot}h</p>
					{/if}
				</div>
			{/each}
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
		<p>This is a computer generated payslip and does not require a physical stamp unless requested.</p>
		<p>Casa Luma · 2026</p>
	</div>
</div>

<style>
	@media print {
		:global(body) {
			background: white !important;
		}
		.payslip-container {
			margin: 0 !important;
			width: 100% !important;
			box-shadow: none !important;
			padding: 0 !important;
		}
	}
</style>
