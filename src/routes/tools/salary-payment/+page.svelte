<script lang="ts">
	import { SalaryPaymentState } from './SalaryPaymentState.svelte';
	import Payslip from '$lib/components/tools/salary-payment/Payslip.svelte';
	import { onMount } from 'svelte';
	import { Loader2, Printer, ChevronRight, User } from 'lucide-svelte';

	const state = new SalaryPaymentState();

	async function selectEmployee(id: string) {
		state.selectedEmployeeId = id;
		await state.fetchData();
	}

	function handlePrint() {
		window.print();
	}
</script>

<svelte:head>
	<title>Salary Payment | Casa Luma</title>
</svelte:head>

<div class="flex gap-8 print:block">
	<!-- Sidebar -->
	<aside class="w-64 flex-shrink-0 print:hidden">
		<div class="bg-white/50 backdrop-blur border border-[#d3c5b8] rounded-3xl overflow-hidden p-4">
			<h2 class="text-xs font-bold uppercase tracking-widest text-[#7a6550]/60 mb-4 px-2">Staff Members</h2>
			<div class="space-y-1">
				{#each state.employees as emp}
					<button
						class={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm transition-all duration-200 ${
							state.selectedEmployeeId === emp.id 
								? 'bg-[#7a6550] text-white shadow-lg shadow-[#7a6550]/20' 
								: 'hover:bg-white text-[#7a6550]/80 hover:text-[#7a6550]'
						}`}
						onclick={() => selectEmployee(emp.id)}
					>
						<div class={`p-1.5 rounded-xl ${state.selectedEmployeeId === emp.id ? 'bg-white/20' : 'bg-[#7a6550]/10'}`}>
							<User size={16} />
						</div>
						<span class="font-semibold">{emp.name}</span>
						{#if state.selectedEmployeeId === emp.id}
							<ChevronRight size={14} class="ml-auto opacity-60" />
						{/if}
					</button>
				{/each}
			</div>
		</div>
	</aside>

	<!-- Main Content -->
	<div class="flex-grow">
		<div class="mb-8 flex flex-wrap items-end gap-6 print:hidden bg-white/30 p-6 rounded-3xl border border-[#d3c5b8]/30">
			<div class="space-y-2">
				<label for="start-date" class="block text-[10px] font-bold uppercase tracking-widest text-[#7a6550]/60 ml-1">Start Date</label>
				<input 
					type="date" 
					id="start-date" 
					bind:value={state.startDate} 
					onchange={() => state.fetchData()}
					class="bg-white border border-[#d3c5b8] rounded-2xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7a6550]/20 transition-all"
				/>
			</div>
			<div class="space-y-2">
				<label for="end-date" class="block text-[10px] font-bold uppercase tracking-widest text-[#7a6550]/60 ml-1">End Date</label>
				<input 
					type="date" 
					id="end-date" 
					bind:value={state.endDate} 
					onchange={() => state.fetchData()}
					class="bg-white border border-[#d3c5b8] rounded-2xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7a6550]/20 transition-all"
				/>
			</div>
			
			<div class="flex-grow"></div>
			
			{#if state.salaryData}
				<button 
					onclick={handlePrint}
					class="bg-[#7a6550] hover:bg-[#635241] text-white flex items-center gap-2 px-6 py-3 rounded-full font-semibold shadow-lg shadow-[#7a6550]/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
				>
					<Printer size={18} />
					Print Payslip
				</button>
			{/if}
		</div>

		{#if state.isLoading}
			<div class="flex flex-col items-center justify-center py-32 text-[#7a6550]">
				<Loader2 class="animate-spin mb-4 opacity-40" size={48} />
				<p class="font-medium tracking-wide">Calculating salary data...</p>
			</div>
		{:else if state.error}
			<div class="bg-red-50 border border-red-100 rounded-3xl p-10 text-center text-red-600">
				<p class="font-bold mb-1">Calculation Error</p>
				<p class="text-sm opacity-80">{state.error}</p>
				<button 
					class="mt-6 px-6 py-2 bg-red-600 text-white rounded-full text-sm font-semibold hover:bg-red-700 transition-all"
					onclick={() => state.fetchData()}
				>
					Try Again
				</button>
			</div>
		{:else if state.salaryData && state.salaryResult}
			<div class="flex justify-center bg-white/40 rounded-[2.5rem] p-8 border border-[#d3c5b8]/40 shadow-inner print:p-0 print:bg-transparent print:border-none print:shadow-none">
				<Payslip 
					employee={state.salaryData.employee}
					shifts={state.salaryData.shifts}
					adjustments={state.salaryData.adjustments}
					result={state.salaryResult}
					startDate={state.startDate}
					endDate={state.endDate}
				/>
			</div>
		{:else if !state.selectedEmployeeId}
			<div class="flex flex-col items-center justify-center py-32 text-[#7a6550]/30 border-2 border-dashed border-[#d3c5b8] rounded-[2.5rem] bg-[#fdfbf9]/50">
				<div class="w-16 h-16 rounded-full bg-[#7a6550]/5 flex items-center justify-center mb-6">
					<User size={32} class="opacity-40" />
				</div>
				<p class="text-lg font-semibold tracking-tight text-[#7a6550]/60">Select an employee</p>
				<p class="text-sm mt-1 opacity-60">Choose a staff member from the sidebar to generate a payslip</p>
			</div>
		{:else}
			<div class="text-center py-32 text-[#7a6550]/40">
				No records found for the selected period.
			</div>
		{/if}
	</div>
</div>

<style>
	@media print {
		:global(body) {
			background-color: white !important;
		}
		:global(main) {
			max-width: none !important;
			padding: 0 !important;
			margin: 0 !important;
		}
	}
</style>
