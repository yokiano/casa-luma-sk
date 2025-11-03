<script lang="ts">
	import { page } from '$app/state';
	import { getJobOpening } from '$lib/careers.remote';
	import type { JobOpeningsResponseDTO } from '$lib/notion-sdk/dbs/job-openings';
	import JobBoardPost from '$lib/components/jobs/JobBoardPost.svelte';
	import JobGraphicGenerator from '$lib/components/jobs/JobGraphicGenerator.svelte';

	let opening = $state<JobOpeningsResponseDTO | null>(null);
	let isLoading = $state(true);
	let error: string | null = $state(null);

	// Fetch job opening - will run initially
	async function loadJobOpening() {
		try {
			isLoading = true;
			const id = page.params?.id;
			if (!id) throw new Error('Job ID is required');
			const result = await getJobOpening(id);
			opening = result;
			error = null;
		} catch (e) {
			console.error('[DETAIL] Error fetching job opening:', e);
			error = e instanceof Error ? e.message : 'Failed to load job opening';
			opening = null;
		} finally {
			isLoading = false;
		}
	}

	// Load on component mount
	loadJobOpening();

	const formatSalary = (salary: number): string => {
		if (salary === 0) return 'Negotiable';
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD',
			maximumFractionDigits: 0
		}).format(salary);
	};

	const formatDate = (dateString: string): string => {
		return new Date(dateString).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		});
	};
</script>

<svelte:head>
	<title>{opening?.properties.jobTitle?.text || 'Job Opening'} - Casa Luma Careers</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-b from-amber-50 to-white">
	<!-- Back Navigation -->
	<div class="mx-auto max-w-4xl px-4 py-4 sm:px-6 lg:px-8">
		<a
			href="/careers"
			class="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
		>
			← Back to opportunities
		</a>
	</div>

	<!-- Main Content -->
	<div class="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
		{#if isLoading}
			<div class="py-16 text-center">
				<div class="inline-flex items-center gap-3">
					<div class="h-2 w-2 bg-slate-400 rounded-full animate-pulse"></div>
					<span class="text-slate-600">Loading job details...</span>
				</div>
			</div>
		{:else if error}
			<div class="rounded-lg border border-red-200 bg-red-50 p-6">
				<h2 class="text-lg font-medium text-red-900 mb-2">Unable to load job opening</h2>
				<p class="text-red-800">{error}</p>
				<a href="/careers" class="mt-4 inline-block text-red-700 hover:text-red-900 font-medium">
					Return to careers
				</a>
			</div>
		{:else if opening}
			<!-- Job Header -->
			<div class="mb-8 border-b border-slate-200 pb-8">
				<h1 class="text-4xl font-light tracking-tight text-slate-900 mb-2">
					{opening.properties.jobTitle?.text || 'Untitled'}
				</h1>
				<p class="text-lg text-slate-600 mb-6">
					{opening.properties.department?.name || 'Casa Luma'}
				</p>

				<!-- Key Details Grid -->
				<div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
					{#if opening.properties.location}
						<div>
							<p class="text-sm font-semibold text-slate-500 uppercase mb-1">Location</p>
							<p class="text-lg text-slate-900">{opening.properties.location.name}</p>
						</div>
					{/if}
					{#if opening.properties.employmentType}
						<div>
							<p class="text-sm font-semibold text-slate-500 uppercase mb-1">Employment Type</p>
							<p class="text-lg text-slate-900">{opening.properties.employmentType.name}</p>
						</div>
					{/if}
					{#if opening.properties.experienceLevel}
						<div>
							<p class="text-sm font-semibold text-slate-500 uppercase mb-1">Experience Level</p>
							<p class="text-lg text-slate-900">{opening.properties.experienceLevel.name}</p>
						</div>
					{/if}
					<div>
						<p class="text-sm font-semibold text-slate-500 uppercase mb-1">Salary</p>
						<p class="text-lg text-slate-900">{formatSalary(opening.properties.expectedSalary ?? 0)}</p>
					</div>
				</div>

				{#if (opening.properties.openPositions ?? 0) > 0}
					<div class="inline-flex items-center px-4 py-2 bg-green-50 border border-green-200 rounded-lg">
						<span class="text-sm font-medium text-green-900">
							{opening.properties.openPositions} {opening.properties.openPositions === 1 ? 'position' : 'positions'} available
						</span>
					</div>
				{/if}
			</div>

			<!-- Responsibilities Section -->
			{#if opening.properties.responsibilities?.text}
				<div class="mb-8">
					<h2 class="text-2xl font-light text-slate-900 mb-4">Responsibilities</h2>
					<div class="prose prose-sm max-w-none text-slate-700 leading-relaxed whitespace-pre-wrap">
						{opening.properties.responsibilities.text}
					</div>
				</div>
			{/if}

			<!-- Requirements Section -->
			{#if opening.properties.requirements?.text}
				<div class="mb-8">
					<h2 class="text-2xl font-light text-slate-900 mb-4">Requirements</h2>
					<div class="prose prose-sm max-w-none text-slate-700 leading-relaxed whitespace-pre-wrap">
						{opening.properties.requirements.text}
					</div>
				</div>
			{/if}

			<!-- Required Skills Section -->
			{#if opening.properties.requiredSkills.values.length > 0}
				<div class="mb-8">
					<h2 class="text-2xl font-light text-slate-900 mb-4">Required Skills</h2>
					<div class="flex flex-wrap gap-3">
						{#each opening.properties.requiredSkills.values as skill}
							<span class="px-4 py-2 bg-slate-100 text-slate-900 rounded-lg text-sm font-medium">
								{skill}
							</span>
						{/each}
					</div>
				</div>
			{/if}

			<!-- Job Board Post Section -->
			{#if (opening.properties as any).jobPost?.text || opening.properties.employmentType || opening.properties.requirements?.text || opening.properties.requiredSkills.values.length > 0}
				<JobBoardPost {opening} />
			{/if}

			<!-- Application Section -->
			<div class="mt-12 pt-8 border-t border-slate-200">
				<div class="rounded-lg bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 p-8">
					<h2 class="text-2xl font-light text-slate-900 mb-4">Interested?</h2>
					<p class="text-slate-700 mb-6">
						We'd love to hear from you! Please reach out to our team with your resume and a brief introduction.
					</p>
					<a
						href="mailto:careers@casaluma.com?subject=Application for {opening.properties.jobTitle?.text || 'Job'}"
						class="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors font-medium"
					>
						Apply Now
						<span>→</span>
					</a>
					<p class="text-sm text-slate-600 mt-4">
						Email: <a href="mailto:careers@casaluma.com" class="text-slate-900 hover:underline">careers@casaluma.com</a>
					</p>
				</div>
			</div>

			<!-- Social Graphic Section -->
			<div class="mt-12 pt-8 border-t border-slate-200">
				<h2 class="text-2xl font-light text-slate-900 mb-6">Share This Opening</h2>
				<p class="text-slate-600 mb-6">Generate a social media graphic to promote this job opening.</p>
				<JobGraphicGenerator {opening} />
			</div>

			{#if opening.properties.openingDate}
				<div class="mt-8 text-center text-sm text-slate-500">
					Posted on {formatDate(opening.properties.openingDate.start)}
				</div>
			{/if}
		{:else}
			<div class="rounded-lg border border-slate-200 bg-slate-50 p-8 text-center">
				<p class="text-slate-600">Job opening not found</p>
				<a href="/careers" class="mt-4 inline-block text-slate-900 hover:text-slate-600 font-medium">
					Return to careers
				</a>
			</div>
		{/if}
	</div>
</div>
