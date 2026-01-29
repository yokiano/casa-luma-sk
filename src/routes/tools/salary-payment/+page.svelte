<script lang="ts">
	import { SalaryPaymentState } from './SalaryPaymentState.svelte';
	import Payslip from '$lib/components/tools/salary-payment/Payslip.svelte';
	import { LoaderCircle, Printer, ChevronRight, ChevronDown, User, CircleAlert, Info, CircleCheck } from 'lucide-svelte';

	const state = new SalaryPaymentState();

	async function selectEmployee(id: string) {
		state.selectedEmployeeId = id;
		await state.fetchData();
	}

	function handlePrint() {
		window.print();
	}

	const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
	const daysFull = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

	const statusOptions = [
		{ value: 'Completed', label: 'Worked', paid: true },
		{ value: 'Confirmed', label: 'Confirmed', paid: true },
		{ value: 'Sick Day (Paid)', label: 'Sick (Paid)', paid: true },
		{ value: 'Day Off (Paid)', label: 'Day Off (Paid)', paid: true },
		{ value: 'Business Day-Off', label: 'Business Day-Off', paid: true },
		{ value: 'Unpaid Leave', label: 'Unpaid Leave', paid: false },
		{ value: 'Absent', label: 'Absent', paid: false },
		{ value: 'No Data', label: 'No Data (Unpaid)', paid: false }
	];
</script>

<svelte:head>
	<title>Salary Payment | Casa Luma</title>
</svelte:head>

<div class="flex gap-8 print:block">
	<!-- Sidebar -->
	<aside class="w-64 flex-shrink-0 print:hidden">
		<div class="bg-white/50 backdrop-blur border border-[#d3c5b8] rounded-3xl overflow-hidden p-4 sticky top-8">
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
						<div class="text-left">
							<span class="font-semibold block leading-none mb-1">{emp.name}</span>
							<span class={`text-[10px] opacity-60 ${state.selectedEmployeeId === emp.id ? 'text-white' : 'text-[#7a6550]'}`}>
								{emp.fullName?.split(' ')[0] || ''}
							</span>
						</div>
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
		<div class="mb-8 print:hidden">
			<div class="bg-white/30 backdrop-blur p-6 rounded-[2.5rem] border border-[#d3c5b8]/30 flex flex-col gap-6">
				<div class="flex flex-wrap items-end gap-6">
					<!-- Payroll Run Selector (Primary Control) -->
					<div class="space-y-2">
						<span class="block text-[10px] font-bold uppercase tracking-widest text-[#7a6550]/60 ml-1">Payroll Run</span>
						<div class="bg-[#f6f1eb] p-1 rounded-2xl flex gap-1">
							<button 
								class={`px-5 py-2 rounded-xl text-sm font-semibold transition-all ${state.isMidMonthRun ? 'bg-white text-[#7a6550] shadow-sm' : 'text-[#7a6550]/50 hover:text-[#7a6550]'}`}
								onclick={() => state.setRunType(true)}
							>
								Mid-Month (1-15)
							</button>
							<button 
								class={`px-5 py-2 rounded-xl text-sm font-semibold transition-all ${!state.isMidMonthRun ? 'bg-white text-[#7a6550] shadow-sm' : 'text-[#7a6550]/50 hover:text-[#7a6550]'}`}
								onclick={() => state.setRunType(false)}
							>
								End of Month (16-{new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()})
							</button>
						</div>
					</div>

					<div class="h-10 w-[2px] bg-[#d3c5b8]/30 self-center mx-2"></div>

					<div class="space-y-2">
						<label for="business-day-off" class="block text-[10px] font-bold uppercase tracking-widest text-[#7a6550]/60 ml-1">Business Day-Off</label>
						<select 
							id="business-day-off"
							bind:value={state.businessDayOff}
							onchange={() => state.fetchData()}
							class="bg-white border border-[#d3c5b8] rounded-2xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7a6550]/20 transition-all"
						>
							{#each daysFull as day, i}
								<option value={i}>{day}</option>
							{/each}
						</select>
					</div>

					{#if !state.isMidMonthRun}
						<div class="flex items-center gap-3">
							<label class="flex items-center gap-2 cursor-pointer">
								<input 
									type="checkbox" 
									bind:checked={state.includeSSF}
									class="w-4 h-4 rounded border-[#d3c5b8] text-[#7a6550] focus:ring-[#7a6550]/20"
								/>
								<span class="text-sm text-[#7a6550]">Include SSF (5%)</span>
							</label>
						</div>
					{/if}
					
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

				{#if state.salaryData}
					<div class="flex gap-4 p-4 bg-[#7a6550]/5 rounded-3xl border border-[#7a6550]/10">
						<Info size={16} class="text-[#7a6550] mt-0.5 flex-shrink-0" />
						<div class="text-xs text-[#7a6550]/80 leading-relaxed">
							<p>
								<span class="font-bold">Period:</span> {state.startDate} to {state.endDate} | 
								<span class="font-bold">Daily Rate:</span> {state.salaryResult?.dailyRate.toFixed(2)} THB |
								<span class="font-bold">Business Day-Off:</span> {daysFull[state.businessDayOff]}
							</p>
						</div>
					</div>
				{/if}
			</div>
		</div>

		{#if state.isLoading}
			<div class="flex flex-col items-center justify-center py-32 text-[#7a6550] print:hidden">
				<LoaderCircle class="animate-spin mb-4 opacity-40" size={48} />
				<p class="font-medium tracking-wide">Loading data...</p>
			</div>
		{:else if state.error}
			<div class="bg-red-50 border border-red-100 rounded-[2.5rem] p-10 text-center text-red-600 print:hidden">
				<div class="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
					<CircleAlert size={32} />
				</div>
				<p class="font-bold mb-1 text-lg">Error</p>
				<p class="text-sm opacity-80 mb-6">{state.error}</p>
				<button 
					class="px-8 py-3 bg-red-600 text-white rounded-full font-semibold hover:bg-red-700 transition-all shadow-lg shadow-red-600/20"
					onclick={() => state.fetchData()}
				>
					Try Again
				</button>
			</div>
		{:else if state.salaryData && state.salaryResult}
			<div class="space-y-8">
				<!-- Collapsible Attendance Review -->
				<div class="bg-white/40 backdrop-blur rounded-[2.5rem] border border-[#d3c5b8]/40 overflow-hidden print:hidden">
					<button 
						class="w-full flex items-center justify-between p-6 hover:bg-white/30 transition-colors"
						onclick={() => state.isAttendanceExpanded = !state.isAttendanceExpanded}
					>
						<div class="flex items-center gap-4">
							<h3 class="text-sm font-bold uppercase tracking-widest text-[#7a6550]">Attendance Review</h3>
							<div class="flex gap-3">
								<div class="flex items-center gap-1.5 px-2.5 py-1 bg-green-50 text-green-700 rounded-lg border border-green-100">
									<CircleCheck size={12} />
									<span class="text-[10px] font-bold">{state.salaryResult.totalPaidDays} Paid</span>
								</div>
								{#if state.salaryResult.unpaidLeaveDays > 0}
									<div class="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 text-amber-700 rounded-lg border border-amber-100">
										<CircleAlert size={12} />
										<span class="text-[10px] font-bold">{state.salaryResult.unpaidLeaveDays} Unpaid</span>
									</div>
								{/if}
							</div>
						</div>
						<div class="text-[#7a6550]/60">
							{#if state.isAttendanceExpanded}
								<ChevronDown size={20} />
							{:else}
								<ChevronRight size={20} />
							{/if}
						</div>
					</button>

					{#if state.isAttendanceExpanded}
						<div class="px-6 pb-6">
							<p class="text-xs text-[#7a6550]/60 mb-4">Click on any day to override its status. {daysFull[state.businessDayOff]} is your business day-off (paid by default).</p>
							
							<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-2">
								{#each state.effectiveCalendarDays as day}
									{@const date = new Date(day.date)}
									{@const isPaid = ['Completed', 'Confirmed', 'Sick Day (Paid)', 'Day Off (Paid)', 'Business Day-Off'].includes(day.status)}
									{@const hasOverride = !!state.overriddenDays[day.id]}
									<div 
										class={`p-3 rounded-xl border transition-all ${
											day.isBusinessDayOff && !hasOverride ? 'bg-[#f6f1eb]/70 border-[#d3c5b8]' : 
											isPaid ? 'bg-white border-[#d3c5b8]/30' : 
											'bg-amber-50/50 border-amber-200/50'
										} ${hasOverride ? 'ring-2 ring-[#7a6550]/30' : ''}`}
									>
										<div class="flex justify-between items-start mb-2">
											<div class="text-[10px] font-bold text-[#7a6550]/70">
												{days[date.getDay()]} {date.getDate()}
											</div>
											<div class="flex gap-1">
												{#if day.isBusinessDayOff && !hasOverride}
													<div class="text-[7px] font-bold uppercase tracking-tight bg-[#7a6550] text-white px-1.5 py-0.5 rounded">Biz Off</div>
												{/if}
												{#if day.hasShiftData}
													<div class="text-[7px] font-bold uppercase tracking-tight bg-blue-500 text-white px-1.5 py-0.5 rounded">Shift</div>
												{/if}
											</div>
										</div>

										<select 
											class={`w-full text-[10px] font-semibold rounded-lg px-2 py-1.5 bg-[#f6f1eb]/50 focus:bg-white transition-colors border-none cursor-pointer ${
												isPaid ? 'text-green-700' : 'text-amber-700'
											}`}
											value={day.status}
											onchange={(e) => state.updateDayOverride(day.id, 'status', e.currentTarget.value)}
										>
											{#each statusOptions as opt}
												<option value={opt.value}>{opt.label}</option>
											{/each}
										</select>

										{#if day.status === 'Completed' || day.status === 'Confirmed'}
											<div class="flex gap-2 mt-2">
												<div class="flex-grow">
													<span class="text-[8px] font-bold opacity-40 ml-1">OT</span>
													<div class="flex gap-1">
														<select 
															class="flex-grow text-[9px] bg-transparent border-b border-[#d3c5b8] py-0.5 px-1 focus:outline-none"
															value={day.otType}
															onchange={(e) => state.updateDayOverride(day.id, 'otType', e.currentTarget.value)}
															aria-label="OT Type"
														>
															<option value="1.5">1.5x</option>
															<option value="1.0">1.0x</option>
															<option value="3.0">3.0x</option>
														</select>
														<input 
															type="number" 
															step="0.5"
															class="w-10 text-[9px] bg-transparent border-b border-[#d3c5b8] py-0.5 px-1 focus:outline-none text-center"
															value={day.ot}
															oninput={(e) => state.updateDayOverride(day.id, 'ot', parseFloat(e.currentTarget.value) || 0)}
															aria-label="OT Hours"
														/>
													</div>
												</div>
											</div>
										{/if}
									</div>
								{/each}
							</div>
						</div>
					{/if}
				</div>

				<!-- Payslip Preview -->
				<div class="flex justify-center bg-white/40 rounded-[2.5rem] p-8 border border-[#d3c5b8]/40 shadow-inner print:p-0 print:bg-transparent print:border-none print:shadow-none">
					<Payslip 
						employee={state.salaryData.employee}
						calendarDays={state.effectiveCalendarDays}
						adjustments={state.salaryData.adjustments}
						result={state.salaryResult}
						startDate={state.startDate}
						endDate={state.endDate}
						isMidMonthRun={state.isMidMonthRun}
						includeSSF={state.includeSSF}
					/>
				</div>
			</div>
		{:else if !state.selectedEmployeeId}
			<div class="flex flex-col items-center justify-center py-32 text-[#7a6550]/30 border-2 border-dashed border-[#d3c5b8] rounded-[2.5rem] bg-[#fdfbf9]/50 print:hidden">
				<div class="w-16 h-16 rounded-full bg-[#7a6550]/5 flex items-center justify-center mb-6">
					<User size={32} class="opacity-40" />
				</div>
				<p class="text-lg font-semibold tracking-tight text-[#7a6550]/60">Select an employee</p>
				<p class="text-sm mt-1 opacity-60">Choose a staff member from the sidebar to generate a payslip</p>
			</div>
		{:else}
			<div class="text-center py-32 text-[#7a6550]/40 print:hidden">
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
