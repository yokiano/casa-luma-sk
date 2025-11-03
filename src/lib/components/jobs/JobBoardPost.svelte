<script lang="ts">
	import type { JobOpeningsResponseDTO } from '$lib/notion-sdk/dbs/job-openings';

	interface Props {
		opening: JobOpeningsResponseDTO;
	}

	let { opening }: Props = $props();

	let isOpen = $state(false);

	const generateBoardPost = () => {
		const parts: string[] = [];

		// Add job post if available (comes FIRST)
		const jobPostData = (opening.properties as any).jobPost;
		if (jobPostData?.text) {
			parts.push(jobPostData.text.trim());
		}

		// Add point of contact if available
		const pointOfContactData = (opening.properties as any).pointOfContact;
		if (pointOfContactData?.text) {
			parts.push(`Contact: ${pointOfContactData.text.trim()}`);
		}

		// Add employment type
		if (opening.properties.employmentType) {
			parts.push(`Employment Type: ${opening.properties.employmentType.name}`);
		}

		// Add requirements if available
		if (opening.properties.requirements?.text) {
			parts.push(`Requirements:\n${opening.properties.requirements.text.trim()}`);
		}

		// Add required skills if available
		if (opening.properties.requiredSkills.values.length > 0) {
			parts.push(`Required Skills: ${opening.properties.requiredSkills.values.join(', ')}`);
		}

		return parts.join('\n\n');
	};

	const boardPostContent = $derived(generateBoardPost());

	const copyToClipboard = async () => {
		try {
			await navigator.clipboard.writeText(boardPostContent);
		} catch (err) {
			console.error('Failed to copy:', err);
		}
	};
</script>

<div class="mt-12 pt-8 border-t border-slate-200">
	<button
		onclick={() => (isOpen = !isOpen)}
		class="w-full flex items-center justify-between px-6 py-4 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
	>
		<h2 class="text-2xl font-light text-slate-900">Job Board Post</h2>
		<span class="text-slate-500 transition-transform {isOpen ? 'rotate-180' : ''}">
			▼
		</span>
	</button>

	{#if isOpen}
		<div class="mt-4 space-y-4">
			<div class="bg-slate-50 rounded-lg p-6 border border-slate-200">
				<p class="text-sm text-slate-600 mb-4">
					Ready to copy and paste on job boards:
				</p>
				<pre class="whitespace-pre-wrap text-slate-800 text-sm leading-relaxed font-sans mb-4">{boardPostContent}</pre>
				<button
					onclick={copyToClipboard}
					class="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors font-medium text-sm"
				>
					Copy to Clipboard
				</button>
			</div>
		</div>
	{/if}
</div>
