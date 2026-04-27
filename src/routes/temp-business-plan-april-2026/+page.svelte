<script lang="ts">
	import { BusinessPlanState } from './BusinessPlanState.svelte';
	import { assumptions, formatMonths, formatThb, sumCosts } from './assumptions';

	const bp = new BusinessPlanState();

	const inputClass =
		'w-[5.5rem] rounded-md border border-[#c9b8a5] bg-white/90 px-2 py-1 text-right text-sm tabular-nums text-[#34261d] shadow-inner outline-none focus:border-[#a56b3f] focus:ring-1 focus:ring-[#a56b3f]';
	const inputClassWide = inputClass.replace('w-[5.5rem]', 'w-[6.5rem]');

	const nailBase = sumCosts(assumptions.nailPolish.initialCosts);
	const workshopBase = sumCosts(assumptions.workshopRoom.initialCosts);

	const monthlySalaryLoad = $derived(bp.salaryPerPayment * 2);
	const baseCaseNail = $derived(bp.nailRows[1] ?? null);
	const baseCaseWorkshop = $derived(bp.workshopRows[1] ?? null);
</script>

<svelte:head>
	<title>Temporary Business Plan — April 2026</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="min-h-screen bg-[#fbf6ee] text-[#34261d]">
	<section class="mx-auto max-w-7xl px-6 py-10 lg:px-10">
		<div class="mb-8 rounded-[2rem] bg-[#fffcf7] p-8 shadow-sm ring-1 ring-[#e5d2bf]">
			<p class="mb-2 text-sm font-semibold uppercase tracking-[0.22em] text-[#a56b3f]">
				Draft / editable assumptions
			</p>
			<div class="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
				<div>
					<h1 class="text-4xl font-bold tracking-tight lg:text-5xl">Business Plan — April 2026</h1>
					<p class="mt-3 max-w-3xl text-lg text-[#6f5b4a]">
						Interactive model for nail services, pool fence, workshop renovation, and near-term cash.
						Adjust values in each block; numbers recompute in place.
					</p>
				</div>
				<div
					class="flex flex-col items-stretch gap-3 rounded-2xl bg-[#fff4df] p-5 text-right ring-1 ring-[#efd4a7] sm:min-w-[14rem] sm:items-end"
				>
					<div class="flex items-center justify-end gap-2 text-sm text-[#7b6048]">
						<span class="whitespace-nowrap">Contingency (nail + room)</span>
						<input
							type="number"
							min="0"
							max="50"
							step="1"
							class={inputClass}
							bind:value={bp.contingencyPercent}
							aria-label="Contingency percent on nail and workshop builds"
						/>
						<span class="text-[#5d4636]">%</span>
					</div>
					<div>
						<p class="text-sm text-[#7b6048]">Total initial investment (incl. buffer)</p>
						<p class="text-3xl font-bold text-[#7a3f20]">{formatThb(bp.totalInitialAllProjects)}</p>
						<p class="mt-1 text-xs text-[#7b6048]">Nails + fence + workshop (fence has no buffer here)</p>
					</div>
				</div>
			</div>
		</div>

		<div class="grid gap-5 md:grid-cols-3">
			{@render Card('Nail polish section', formatThb(bp.nailInvestment), 'With buffer on build', 'nail')}
			{@render Card('Pool safety fence', formatThb(bp.poolFenceTotalThb), 'Safety / risk', 'pool')}
			{@render Card('Workshop room', formatThb(bp.workshopInvestment), 'With buffer on build', 'workshop')}
		</div>

		<section class="mt-8 grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
			<div class="rounded-[1.5rem] bg-[#fff7f0] p-6 shadow-sm ring-1 ring-[#e8d0c0]">
				<h2 class="text-2xl font-bold">1) Nail polish section ROI</h2>
				<p class="mt-2 text-[#6f5b4a]">
					Revenue and consumables are editable below; scenarios keep the same session cadence.
				</p>
				<div class="mt-4 flex flex-wrap items-end gap-4 text-sm text-[#5d4636]">
					<label class="grid gap-1">
						<span class="text-xs uppercase tracking-wider text-[#8a7565]">Avg revenue / session</span>
						<span class="flex items-baseline gap-1">
							<input
								type="number"
								min="0"
								step="50"
								class={inputClassWide}
								bind:value={bp.nailAvgRevenue}
							/>
							<span class="text-xs">THB</span>
						</span>
					</label>
					<label class="grid gap-1">
						<span class="text-xs uppercase tracking-wider text-[#8a7565]">Materials / session</span>
						<span class="flex items-baseline gap-1">
							<input
								type="number"
								min="0"
								step="10"
								class={inputClassWide}
								bind:value={bp.nailMaterials}
							/>
							<span class="text-xs">THB</span>
						</span>
					</label>
					<label class="grid gap-1">
						<span class="text-xs uppercase tracking-wider text-[#8a7565]">Staff / session</span>
						<span class="flex items-baseline gap-1">
							<input
								type="number"
								min="0"
								step="10"
								class={inputClassWide}
								bind:value={bp.nailStaffCost}
							/>
							<span class="text-xs">THB</span>
						</span>
					</label>
				</div>
				<div class="mt-5 overflow-hidden rounded-2xl ring-1 ring-[#e6cfc0]">
					<table class="w-full text-left text-sm">
						<thead class="bg-[#f0e4d6] text-[#5d4636]">
							<tr>
								<th class="p-3">Scenario</th>
								<th class="p-3 text-right">Sessions / month</th>
								<th class="p-3 text-right">Revenue / month</th>
								<th class="p-3 text-right">Variable costs / month</th>
								<th class="p-3 text-right">Contribution / month</th>
								<th class="p-3 text-right">Payback</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-[#e6cfc0]">
							{#each bp.nailRows as row}
								<tr>
									<td class="p-3 font-medium">{row.label}</td>
									<td class="p-3 text-right tabular-nums">{row.sessionsPerMonth.toFixed(1)}</td>
									<td class="p-3 text-right tabular-nums">{formatThb(row.monthlyRevenue)}</td>
									<td class="p-3 text-right tabular-nums text-red-800/90">{formatThb(row.monthlyVariableCost)}</td>
									<td class="p-3 text-right font-semibold tabular-nums text-emerald-900">{formatThb(row.monthlyContribution)}</td>
									<td class="p-3 text-right text-sm font-bold tabular-nums">{formatMonths(row.roiMonths)}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>

			{@render CostBreakdown('Nail startup costs', assumptions.nailPolish.initialCosts, nailBase, bp.nailInvestment, bp.contingencyPercent)}
		</section>

		<section class="mt-8 grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
			<div class="rounded-[1.5rem] bg-[#f0faf4] p-6 shadow-sm ring-1 ring-[#c5ddd0]">
				<h2 class="text-2xl font-bold">2) Pool safety fence</h2>
				<p class="mt-2 text-[#6f5b4a]">Safety and compliance, not a revenue line item. Adjust total if quotes move.</p>
				<div class="mt-4 text-sm text-[#3d5a45]">
					<label class="inline-flex flex-col gap-1">
						<span class="text-xs uppercase tracking-wider text-[#5a6f5f]">Estimated installed cost</span>
						<span class="flex items-baseline gap-1">
							<input
								type="number"
								min="0"
								step="1000"
								class="w-32 min-w-0 rounded-md border border-[#c9b8a5] bg-white/90 px-2 py-1 text-right text-sm tabular-nums text-[#34261d] shadow-inner outline-none focus:border-[#a56b3f] focus:ring-1 focus:ring-[#a56b3f]"
								bind:value={bp.poolFenceTotalThb}
							/>
							<span class="text-xs">THB</span>
						</span>
					</label>
				</div>
				<div class="mt-5 rounded-2xl bg-white/50 p-5 ring-1 ring-[#b9dcc4]">
					<p class="text-sm text-[#3d5a45]">Using</p>
					<p class="text-3xl font-bold text-[#25552e]">{formatThb(bp.poolFenceTotalThb)}</p>
				</div>
				<ul class="mt-5 space-y-2 text-sm text-[#4a6352]">
					{#each assumptions.poolFence.decisionNotes as note}
						<li>• {note}</li>
					{/each}
				</ul>
			</div>

			<div class="rounded-[1.5rem] bg-[#f5f0ff] p-6 shadow-sm ring-1 ring-[#d8cfe8]">
				<h2 class="text-2xl font-bold">3) Workshop room ROI</h2>
				<p class="mt-2 text-[#6f5b4a]">Pricing, materials, and facilitator cost drive contribution per scenario.</p>
				<div class="mt-4 flex flex-wrap items-end gap-4 text-sm text-[#4b3f5c]">
					<label class="grid gap-1">
						<span class="text-xs uppercase tracking-wider text-[#7a6b8a]">Price / child</span>
						<span class="flex items-baseline gap-1">
							<input type="number" min="0" step="25" class={inputClassWide} bind:value={bp.wsPricePerChild} />
							<span class="text-xs">THB</span>
						</span>
					</label>
					<label class="grid gap-1">
						<span class="text-xs uppercase tracking-wider text-[#7a6b8a]">Materials / child</span>
						<span class="flex items-baseline gap-1">
							<input type="number" min="0" step="10" class={inputClassWide} bind:value={bp.wsMaterialsPerChild} />
							<span class="text-xs">THB</span>
						</span>
					</label>
					<label class="grid gap-1">
						<span class="text-xs uppercase tracking-wider text-[#7a6b8a]">Facilitator / workshop</span>
						<span class="flex items-baseline gap-1">
							<input type="number" min="0" step="50" class={inputClassWide} bind:value={bp.wsFacilitator} />
							<span class="text-xs">THB</span>
						</span>
					</label>
				</div>
				<div class="mt-5 overflow-hidden rounded-2xl ring-1 ring-[#d3c8e4]">
					<table class="w-full text-left text-sm">
						<thead class="bg-[#ebe4f7] text-[#4a3d5c]">
							<tr>
								<th class="p-3">Scenario</th>
								<th class="p-3 text-right">Children / month</th>
								<th class="p-3 text-right">Revenue</th>
								<th class="p-3 text-right">Costs</th>
								<th class="p-3 text-right">Contribution</th>
								<th class="p-3 text-right">Payback</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-[#d3c8e4]">
							{#each bp.workshopRows as row}
								<tr>
									<td class="p-3 font-medium">{row.label}</td>
									<td class="p-3 text-right tabular-nums">{row.monthlyChildren}</td>
									<td class="p-3 text-right tabular-nums">{formatThb(row.monthlyRevenue)}</td>
									<td class="p-3 text-right tabular-nums text-red-800/90">{formatThb(row.monthlyMaterials + row.monthlyFacilitator)}</td>
									<td class="p-3 text-right font-semibold tabular-nums text-emerald-900">{formatThb(row.monthlyContribution)}</td>
									<td class="p-3 text-right text-sm font-bold tabular-nums">{formatMonths(row.roiMonths)}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>
		</section>

		<section class="mt-8 rounded-[1.5rem] bg-[#f8f4ff] p-6 shadow-sm ring-1 ring-[#d8cfe8]">
			<h2 class="text-2xl font-bold">Workshop operation models compared</h2>
			<p class="mt-2 text-[#6f5b4a]">
				Same room, three ways to run it. Adjust the shared assumptions and per-model levers to see
				which structure works best at your expected utilization.
			</p>

			<div class="mt-5 flex flex-wrap items-end gap-4 text-sm text-[#4b3f5c]">
				<label class="grid gap-1">
					<span class="text-xs uppercase tracking-wider text-[#7a6b8a]">Avg children / session</span>
					<span class="flex items-baseline gap-1">
						<input type="number" min="1" max="30" step="1" class={inputClass} bind:value={bp.wsAvgChildren} />
					</span>
				</label>
				<label class="grid gap-1">
					<span class="text-xs uppercase tracking-wider text-[#7a6b8a]">Sessions / month</span>
					<span class="flex items-baseline gap-1">
						<input type="number" min="1" max="60" step="1" class={inputClass} bind:value={bp.wsSessionsPerMonth} />
					</span>
				</label>
				<label class="grid gap-1">
					<span class="text-xs uppercase tracking-wider text-[#7a6b8a]">Price / child</span>
					<span class="flex items-baseline gap-1">
						<input type="number" min="0" step="25" class={inputClass} bind:value={bp.wsPricePerChild} />
						<span class="text-xs">THB</span>
					</span>
				</label>
				<label class="grid gap-1">
					<span class="text-xs uppercase tracking-wider text-[#7a6b8a]">Materials / child</span>
					<span class="flex items-baseline gap-1">
						<input type="number" min="0" step="10" class={inputClass} bind:value={bp.wsMaterialsPerChild} />
						<span class="text-xs">THB</span>
					</span>
				</label>
			</div>

			<p class="mt-3 text-xs text-[#8a7a9a]">
				Assumes {bp.wsAvgChildren} children x {bp.wsSessionsPerMonth} sessions = {bp.wsAvgChildren * bp.wsSessionsPerMonth} total children / month.
				Gross potential revenue at {formatThb(bp.wsPricePerChild)} / child = {formatThb(bp.wsPricePerChild * bp.wsAvgChildren * bp.wsSessionsPerMonth)} / month.
			</p>

			<div class="mt-5 overflow-hidden rounded-2xl ring-1 ring-[#d3c8e4]">
				<table class="w-full text-left text-sm">
					<thead class="bg-[#ebe4f7] text-[#4a3d5c]">
						<tr>
							<th class="p-3">Operation model</th>
							<th class="p-3 text-right">Monthly revenue</th>
							<th class="p-3 text-right">Materials</th>
							<th class="p-3 text-right">Host cost</th>
							<th class="p-3 text-right">Monthly contribution</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-[#d3c8e4]">
						{#each [bp.wsOperationModels] as m}
						<tr>
							<td class="p-3">
								<p class="font-medium">{m[0].label}</p>
								<label class="mt-1.5 inline-flex items-center gap-1.5 text-xs text-[#7a6b8a]">
									<span class="whitespace-nowrap">Host pay / session</span>
									<input type="number" min="0" step="100" class="w-20 rounded border border-[#d3c8e4] bg-white/80 px-1.5 py-0.5 text-right text-xs tabular-nums text-[#34261d] outline-none focus:border-[#a56b3f] focus:ring-1 focus:ring-[#a56b3f]" bind:value={bp.wsInternalHostPay} />
									<span>THB</span>
								</label>
							</td>
							<td class="p-3 text-right tabular-nums">{formatThb(m[0].monthlyRevenue)}</td>
							<td class="p-3 text-right tabular-nums text-red-800/90">{formatThb(m[0].monthlyMaterials)}</td>
							<td class="p-3 text-right tabular-nums text-red-800/90">{formatThb(m[0].monthlyHostCost)}</td>
							<td class="p-3 text-right font-semibold tabular-nums" class:text-emerald-900={m[0].monthlyContribution > 0} class:text-red-800={m[0].monthlyContribution <= 0}>{formatThb(m[0].monthlyContribution)}</td>
						</tr>
						<tr>
							<td class="p-3">
								<p class="font-medium">{m[1].label}</p>
								<label class="mt-1.5 inline-flex items-center gap-1.5 text-xs text-[#7a6b8a]">
									<span class="whitespace-nowrap">They pay us / session</span>
									<input type="number" min="0" step="100" class="w-20 rounded border border-[#d3c8e4] bg-white/80 px-1.5 py-0.5 text-right text-xs tabular-nums text-[#34261d] outline-none focus:border-[#a56b3f] focus:ring-1 focus:ring-[#a56b3f]" bind:value={bp.wsExternalHostFee} />
									<span>THB</span>
								</label>
							</td>
							<td class="p-3 text-right tabular-nums">{formatThb(m[1].monthlyRevenue)}</td>
							<td class="p-3 text-right tabular-nums text-red-800/90">—</td>
							<td class="p-3 text-right tabular-nums text-red-800/90">—</td>
							<td class="p-3 text-right font-semibold tabular-nums" class:text-emerald-900={m[1].monthlyContribution > 0} class:text-red-800={m[1].monthlyContribution <= 0}>{formatThb(m[1].monthlyContribution)}</td>
						</tr>
						<tr>
							<td class="p-3">
								<p class="font-medium">{m[2].label}</p>
								<label class="mt-1.5 inline-flex items-center gap-1.5 text-xs text-[#7a6b8a]">
									<span class="whitespace-nowrap">Our cut</span>
									<input type="number" min="0" max="100" step="5" class="w-16 rounded border border-[#d3c8e4] bg-white/80 px-1.5 py-0.5 text-right text-xs tabular-nums text-[#34261d] outline-none focus:border-[#a56b3f] focus:ring-1 focus:ring-[#a56b3f]" bind:value={bp.wsRevenueSharePercent} />
									<span>%</span>
								</label>
							</td>
							<td class="p-3 text-right tabular-nums">{formatThb(m[2].monthlyRevenue)}</td>
							<td class="p-3 text-right tabular-nums text-red-800/90">{formatThb(m[2].monthlyMaterials)}</td>
							<td class="p-3 text-right tabular-nums text-red-800/90">—</td>
							<td class="p-3 text-right font-semibold tabular-nums" class:text-emerald-900={m[2].monthlyContribution > 0} class:text-red-800={m[2].monthlyContribution <= 0}>{formatThb(m[2].monthlyContribution)}</td>
						</tr>
						{/each}
					</tbody>
				</table>
			</div>

			<div class="mt-4 rounded-2xl bg-white/40 p-4 text-sm text-[#5d4d54] ring-1 ring-[#d8cfe8]">
				<p class="font-medium text-[#4b3f5c]">How to read this</p>
				<ul class="mt-2 space-y-1.5 text-[#6f5b6a]">
					<li><strong>Internal host</strong> — highest revenue ceiling but you carry materials + host salary risk. Best when sessions are consistently full.</li>
					<li><strong>External host (fixed)</strong> — zero variable cost, predictable income. Downside: you don't benefit from high attendance.</li>
					<li><strong>Revenue share</strong> — middle ground. You provide the room and materials, no host salary. Scales with attendance but you absorb material cost.</li>
				</ul>
			</div>
		</section>

		<section class="mt-8 grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
			{@render CostBreakdown('Workshop room setup costs', assumptions.workshopRoom.initialCosts, workshopBase, bp.workshopInvestment, bp.contingencyPercent)}

			<div class="rounded-[1.5rem] bg-[#f0f4f8] p-6 shadow-sm ring-1 ring-[#c5d0dc]">
				<h2 class="text-2xl font-bold">4) Funds projection</h2>
				<p class="mt-2 text-[#4a5560]">
					Dates are fixed from the original sheet: {assumptions.fundsProjection.startingDate} through 2026-07-30. Salary is
					twice monthly at <span class="tabular-nums">{formatThb(bp.salaryPerPayment)}</span> per run; rent
					<span class="tabular-nums">{formatThb(bp.rentThb)}</span> on 2026-06-15. Starting balance:
					<strong class="tabular-nums">{formatThb(bp.fundsStart)}</strong>.
				</p>
				<div class="mt-4 flex flex-wrap items-end gap-4 text-sm text-[#3d4a55]">
					<label class="grid gap-1">
						<span class="text-xs uppercase tracking-wider text-[#6a7784]">Starting balance</span>
						<span class="flex items-baseline gap-1">
							<input
									type="number"
									min="0"
									step="10000"
									class="w-36 min-w-0 rounded-md border border-[#c9b8a5] bg-white/90 px-2 py-1 text-right text-sm tabular-nums text-[#34261d] shadow-inner outline-none focus:border-[#a56b3f] focus:ring-1 focus:ring-[#a56b3f]"
									bind:value={bp.fundsStart}
								/>
							<span class="text-xs">THB</span>
						</span>
					</label>
					<label class="grid gap-1">
						<span class="text-xs uppercase tracking-wider text-[#6a7784]">Salary (each run)</span>
						<span class="flex items-baseline gap-1">
							<input
									type="number"
									min="0"
									step="5000"
									class="w-32 min-w-0 rounded-md border border-[#c9b8a5] bg-white/90 px-2 py-1 text-right text-sm tabular-nums text-[#34261d] shadow-inner outline-none focus:border-[#a56b3f] focus:ring-1 focus:ring-[#a56b3f]"
									bind:value={bp.salaryPerPayment}
								/>
							<span class="text-xs">THB</span>
						</span>
					</label>
					<label class="grid gap-1">
						<span class="text-xs uppercase tracking-wider text-[#6a7784]">June rent</span>
						<span class="flex items-baseline gap-1">
							<input
									type="number"
									min="0"
									step="10000"
									class="w-32 min-w-0 rounded-md border border-[#c9b8a5] bg-white/90 px-2 py-1 text-right text-sm tabular-nums text-[#34261d] shadow-inner outline-none focus:border-[#a56b3f] focus:ring-1 focus:ring-[#a56b3f]"
									bind:value={bp.rentThb}
								/>
							<span class="text-xs">THB</span>
						</span>
					</label>
				</div>
				<p class="mt-2 text-xs text-[#5c6570]">
					Implied salary load: {formatThb(monthlySalaryLoad)} / month (two pays). Cash minimum on this path:
					<span class="font-semibold tabular-nums" class:text-red-800={bp.minCashBalance < 0} class:text-[#2d4a2f]={bp.minCashBalance >= 0}>{formatThb(bp.minCashBalance)}</span>
				</p>
				<div class="mt-5 overflow-hidden rounded-2xl ring-1 ring-[#c5d0dc]">
					<table class="w-full text-left text-sm">
						<thead class="bg-[#e2eaf1] text-[#3d4a55]">
							<tr>
								<th class="p-3">Date</th>
								<th class="p-3">Event</th>
								<th class="p-3 text-right">Change</th>
								<th class="p-3 text-right">Balance</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-[#c5d0dc]">
							{#each bp.cashRows as row}
								<tr class={row.balance < 0 ? 'bg-red-50/80' : ''}>
									<td class="p-3 font-medium tabular-nums">{row.date}</td>
									<td class="p-3">{row.label}</td>
									<td class="p-3 text-right tabular-nums text-red-800/90">{formatThb(row.amountThb)}</td>
									<td class="p-3 text-right text-sm font-bold tabular-nums" class:text-red-800={row.balance < 0}>{formatThb(row.balance)}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>
		</section>

		<section class="mt-8 rounded-[1.5rem] bg-[#faf6ef] p-6 shadow-sm ring-1 ring-[#e0d4c2]">
			<h2 class="text-2xl font-bold">Missing info to improve the decision</h2>
			<div class="mt-5 grid gap-6 md:grid-cols-3">
				{@render MissingList('Nails', assumptions.nailPolish.missingInfo)}
				{@render MissingList('Pool fence', assumptions.poolFence.missingInfo)}
				{@render MissingList('Workshop room', assumptions.workshopRoom.missingInfo)}
			</div>
		</section>

		<section class="mt-8 rounded-[1.5rem] bg-[#1f1814] p-7 text-[#f4ebe0] shadow-sm ring-1 ring-[#3d3229]">
			<h2 class="text-2xl font-bold text-white">Conclusion: how the pieces read together</h2>
			<div class="mt-5 grid gap-6 border-t border-white/10 pt-5 lg:grid-cols-2">
				<div>
					<h3 class="text-sm font-semibold uppercase tracking-[0.2em] text-[#c9a882]">Payback (best scenario in each build)</h3>
					<ul class="mt-3 space-y-2 text-[#e8d9cc]">
						<li>
							<strong class="text-[#f0dcc8]">Nails:</strong> fastest case ≈
							<span class="tabular-nums">{formatMonths(bp.bestNailPaybackMonths)}</span>
							<span class="text-[#b0a090]"> (lowest in table)</span>
						</li>
						<li>
							<strong class="text-[#f0dcc8]">Workshop room:</strong> fastest case ≈
							<span class="tabular-nums">{formatMonths(bp.bestWorkshopPaybackMonths)}</span>
						</li>
						<li>
							<strong class="text-[#f0dcc8]">Pool fence:</strong> no payback; treat as risk and parent trust, not margin recovery.
						</li>
					</ul>
					<p class="mt-4 text-sm text-[#b0a090]">
						Base case spot check (1 nail session / day, 2 workshops / week in the model): contribution ≈
						{formatThb((baseCaseNail?.monthlyContribution ?? 0) + (baseCaseWorkshop?.monthlyContribution ?? 0))} / month combined variable-profit (before
						allocating staff overhead).
					</p>
				</div>
				<div>
					<h3 class="text-sm font-semibold uppercase tracking-[0.2em] text-[#c9a882]">Cash vs projects</h3>
					<ul class="mt-3 space-y-2 text-[#e8d9cc]">
						<li>
							<strong class="text-[#f0dcc8]">Path minimum:</strong>
							<span class="tabular-nums" class:text-red-300={bp.minCashBalance < 0} class:text-[#a8c9a0]={bp.minCashBalance >= 0}>{formatThb(bp.minCashBalance)}</span>
							{#if bp.cashNegativeBeforeProjects}
								— operating schedule alone pushes you below zero before you book any project spend.
							{:else}
								— you stay non-negative on this salary/rent path with these inputs.
							{/if}
						</li>
						<li>
							<strong class="text-[#f0dcc8]">End of table:</strong> {formatThb(bp.cashEndBalance)} after listed events.
						</li>
						<li>
							<strong class="text-[#f0dcc8]">Rule-of-thumb “room”:</strong> end balance minus total build-out shown above =
							<span
								class="font-semibold tabular-nums"
								class:text-red-300={bp.headroomAfterSchedule < 0}
								class:text-[#a8c9a0]={bp.headroomAfterSchedule >= 0}
							>
								{formatThb(bp.headroomAfterSchedule)}
							</span>
							<span class="text-[#b0a090]"> (not timing-matched; use as a sanity line only)</span>
						</li>
					</ul>
				</div>
			</div>
			<div
				class="mt-6 border-t border-white/10 pt-5 text-sm leading-relaxed text-[#d2c3b2]"
			>
				<p>
					<strong class="text-[#e8d4c0]">If you need one line:</strong> the fence is a safety and positioning decision; the nail and
					room builds compete on how fast you believe utilization will reach the “base” rows. The cash section is the gating
					constraint: with default salary and rent, the model shows a structural squeeze on liquidity unless starting cash,
					rent, or salary timing/shape improves—or projects are funded from outside this runway. Raise starting cash or lower
					outflows in the model to see the headroom number turn green, then re-check the combined contribution line.
				</p>
			</div>
		</section>
		<section
			class="mt-5 rounded-2xl border border-[#d9cbb8] bg-[#fffdf9] p-4 text-sm text-[#5d4d40]"
		>
			<p>
				<strong class="text-[#7a3f20]">Model notes (unchanged rules):</strong>
				{assumptions.general.notes.join(' ')}
			</p>
		</section>
	</section>
</div>

{#snippet Card(title: string, value: string, subtitle: string, _tone: 'nail' | 'pool' | 'workshop')}
	<div
		class="rounded-[1.5rem] p-6 shadow-sm ring-1"
		class:bg-[#fff4ec]={_tone === 'nail'}
		class:ring-[#e8c9b0]={_tone === 'nail'}
		class:bg-[#ecfaf1]={_tone === 'pool'}
		class:ring-[#b9dcc4]={_tone === 'pool'}
		class:bg-[#f3ebff]={_tone === 'workshop'}
		class:ring-[#d0c0e4]={_tone === 'workshop'}
	>
		<p class="text-sm font-semibold uppercase tracking-[0.16em] text-[#a56b3f]">{title}</p>
		<p class="mt-3 text-3xl font-bold tabular-nums">{value}</p>
		<p class="mt-2 text-sm text-[#6f5b4a]">{subtitle}</p>
	</div>
{/snippet}

{#snippet CostBreakdown(
	title: string,
	items: { label: string; amountThb: number; note?: string }[],
	baseTotal: number,
	totalWithContingency: number,
	contingencyPercent: number
)}
	<div class="rounded-[1.5rem] bg-[#fbf4e8] p-6 shadow-sm ring-1 ring-[#e2d0bc]">
		<h2 class="text-2xl font-bold">{title}</h2>
		<div class="mt-5 space-y-3">
			{#each items as item}
				<div class="flex items-start justify-between gap-4 border-b border-[#e8d8c4] pb-3 last:border-0">
					<div>
						<p class="font-medium">{item.label}</p>
						{#if item.note}<p class="mt-1 text-xs text-[#7b6048]">{item.note}</p>{/if}
					</div>
					<p class="whitespace-nowrap font-semibold tabular-nums">{formatThb(item.amountThb)}</p>
				</div>
			{/each}
		</div>
		<div class="mt-5 rounded-2xl bg-white/50 p-4 text-sm ring-1 ring-[#e0d0bc]">
			<div class="flex justify-between tabular-nums">
				<span>Base subtotal</span>
				<strong>{formatThb(baseTotal)}</strong>
			</div>
			<div class="mt-2 flex justify-between tabular-nums">
				<span>With contingency ({contingencyPercent}%)</span>
				<strong>{formatThb(totalWithContingency)}</strong>
			</div>
		</div>
	</div>
{/snippet}

{#snippet MissingList(title: string, items: string[])}
	<div>
		<h3 class="font-bold text-[#7a3f20]">{title}</h3>
		<ul class="mt-3 space-y-2 text-sm text-[#6f5b4a]">
			{#each items as item}
				<li>• {item}</li>
			{/each}
		</ul>
	</div>
{/snippet}
