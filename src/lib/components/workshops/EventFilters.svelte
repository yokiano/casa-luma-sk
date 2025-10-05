<script lang="ts">
	import type { EventType } from '$lib/types/workshops';

	interface Props {
		selectedType?: EventType | 'All';
		onTypeChange: (type: EventType | 'All') => void;
	}

	let { selectedType = $bindable('All'), onTypeChange }: Props = $props();

	const eventTypes: Array<EventType | 'All'> = [
		'All',
		'Workshop',
		'Retreat',
		'Yoga Class',
		'Art Session',
		'Other'
	];

	function handleTypeClick(type: EventType | 'All') {
		selectedType = type;
		onTypeChange(type);
	}
</script>

<div class="rounded-lg bg-white p-4 shadow-sm border border-gray-200">
	<h3 class="mb-3 text-sm font-semibold text-gray-900">Filter by Type</h3>
	<div class="flex flex-wrap gap-2">
		{#each eventTypes as type}
			<button
				type="button"
				onclick={() => handleTypeClick(type)}
				class="rounded-full px-4 py-2 text-sm font-medium transition {selectedType === type
					? 'bg-amber-600 text-white'
					: 'bg-gray-100 text-gray-700 hover:bg-gray-200'}"
			>
				{type}
			</button>
		{/each}
	</div>
</div>

