<script lang="ts">
	import { onMount } from 'svelte';
	import type { JobOpeningsResponseDTO } from '$lib/notion-sdk/dbs/job-openings';
	import GraphicRenderer from '$lib/components/graphics/GraphicRenderer.svelte';
	import JobOpeningGraphic from '$lib/components/graphics/JobOpeningGraphic.svelte';

	interface Props {
		opening: JobOpeningsResponseDTO;
	}

	let { opening }: Props = $props();

	let isGenerating = $state(false);

	function handleGeneratingChange(generating: boolean) {
		isGenerating = generating;
	}

	const filename = `${(opening.properties.jobTitle?.text || 'job').replace(/\s+/g, '-').toLowerCase()}-hiring.png`;
</script>

<div class="w-full">
	<GraphicRenderer
		{filename}
		scale={2}
		quality={1}
		onGenerating={handleGeneratingChange}
	>
		{#snippet children()}
			<JobOpeningGraphic {opening} />
		{/snippet}
	</GraphicRenderer>
</div>
