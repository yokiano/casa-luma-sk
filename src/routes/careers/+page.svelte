<script lang="ts">
	import { getOpenJobOpenings } from '$lib/careers.remote';
	import type { JobOpeningsResponseDTO } from '$lib/notion-sdk/dbs/job-openings';
  import AllJobsGraphicGenerator from '$lib/components/jobs/AllJobsGraphicGenerator.svelte';

	let openings = $state<JobOpeningsResponseDTO[]>([]);
	let isLoading = $state(true);
	let error: string | null = $state(null);

	// Fetch job openings
	async function fetchOpenings() {
		try {
			const results = await getOpenJobOpenings();
			openings = results;
		} catch (e) {
			console.error('Error fetching job openings:', e);
			error = e instanceof Error ? e.message : 'Failed to load job openings';
		} finally {
			isLoading = false;
		}
	}

	// Load on component mount
	fetchOpenings();

	const formatSalary = (salary: number): string => {
		if (salary === 0) return '';
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD',
			maximumFractionDigits: 0
		}).format(salary);
	};

	const formatDate = (dateString: string): string => {
		return new Date(dateString).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	};
</script>
<div class="min-h-screen bg-gradient-to-b from-amber-50 to-white">
	<!-- Header -->
	<div class="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
		<div class="mb-12">
			<h1 class="text-4xl font-light tracking-tight text-slate-900 mb-4">
				Join Casa Luma
			</h1>
			<p class="text-lg text-slate-600 max-w-2xl leading-relaxed">
				We're building a nurturing community where children grow, explore, and thrive. 
				If you're passionate about child development and creating welcoming spaces, we'd love to meet you.
			</p>
		</div>

		{#if isLoading}
			<div class="py-12 text-center">
				<div class="inline-flex items-center gap-3">
					<div class="h-2 w-2 bg-slate-400 rounded-full animate-pulse"></div>
					<span class="text-slate-600">Loading opportunities...</span>
				</div>
			</div>
		{:else if error}
			<div class="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
				<p class="font-medium">Unable to load job openings</p>
				<p class="text-sm">{error}</p>
			</div>
		{:else if openings.length === 0}
			<div class="rounded-lg border border-slate-200 bg-slate-50 p-8 text-center">
				<p class="text-slate-600">No open positions at this time. Check back soon!</p>
			</div>
		{:else}
			<div class="grid gap-6">
    <div class="rounded-3xl border border-amber-100 bg-white/70 p-6 shadow-sm">
      <AllJobsGraphicGenerator {openings} />
    </div>

				{#each openings as opening (opening.id)}
					<a
						href="/careers/{opening.id}"
						class="group block rounded-lg border border-slate-200 bg-white p-6 transition-all hover:shadow-md hover:border-slate-300"
					>
						<div class="mb-4 flex items-start justify-between gap-4">
							<div class="flex-1">
								<h2 class="text-2xl font-medium text-slate-900 group-hover:text-slate-700 transition-colors">
									{opening.properties.jobTitle?.text || 'Untitled'}
								</h2>
								<p class="mt-1 text-slate-600">
									{opening.properties.department?.name || 'Casa Luma'}
								</p>
							</div>
							{#if opening.properties.expectedSalary > 0}
								<div class="text-right">
									<p class="text-sm text-slate-500">Expected Salary</p>
									<p class="text-lg font-medium text-slate-900">
										{formatSalary(opening.properties.expectedSalary)}
									</p>
								</div>
							{/if}
						</div>

						<div class="mb-4 flex flex-wrap gap-2">
							{#if opening.properties.location}
								<span class="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-900">
									{opening.properties.location.name}
								</span>
							{/if}
							{#if opening.properties.employmentType}
								<span class="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-900">
									{opening.properties.employmentType.name}
								</span>
							{/if}
							{#if opening.properties.experienceLevel}
								<span class="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-900">
									{opening.properties.experienceLevel.name}
								</span>
							{/if}
						</div>

						{#if opening.properties.requiredSkills.values.length > 0}
							<div class="mb-4">
								<p class="text-xs font-semibold text-slate-500 uppercase mb-2">Required Skills</p>
								<div class="flex flex-wrap gap-1">
									{#each opening.properties.requiredSkills.values as skill}
										<span class="text-xs px-2 py-1 bg-slate-100 text-slate-700 rounded">
											{skill}
										</span>
									{/each}
								</div>
							</div>
						{/if}

						<div class="flex items-center justify-between pt-4 border-t border-slate-100">
							<div class="flex items-center gap-6 text-sm text-slate-500">
								{#if opening.properties.openingDate}
									<span>Posted {formatDate(opening.properties.openingDate.start)}</span>
								{/if}
								{#if opening.properties.openPositions > 0}
									<span>{opening.properties.openPositions} {opening.properties.openPositions === 1 ? 'position' : 'positions'} open</span>
								{/if}
							</div>
							<span class="text-slate-400 group-hover:text-slate-600 transition-colors">
								View details →
							</span>
						</div>
					</a>
				{/each}
			</div>
		{/if}
	</div>
</div>
