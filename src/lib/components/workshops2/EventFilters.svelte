<script lang="ts">
	import type { EventType } from '$lib/types/workshops';

	interface Props {
		selectedType?: EventType | 'All';
		onTypeChange: (type: EventType | 'All') => void;
	}

	let { selectedType = $bindable('All'), onTypeChange }: Props = $props();

	const eventTypes: Array<{ value: EventType | 'All'; label: string; color: string }> = [
		{ value: 'All', label: 'All Events', color: '#333333' },
		{ value: 'Workshop', label: 'Workshops', color: '#dfbc69' },
		{ value: 'Retreat', label: 'Retreats', color: '#A8C3A0' },
		{ value: 'Yoga Class', label: 'Yoga', color: '#E07A5F' },
		{ value: 'Art Session', label: 'Art', color: '#dfbc69' },
		{ value: 'Other', label: 'Other', color: '#A8C3A0' }
	];

	function handleTypeClick(type: EventType | 'All') {
		selectedType = type;
		onTypeChange(type);
	}
</script>

<div class="flex flex-col gap-6">
	<h2 class="text-2xl font-bold text-[#333333]">What are you looking for?</h2>
	
	<!-- Creative filter buttons - no boring chips -->
	<div class="flex flex-wrap gap-4">
		{#each eventTypes as type}
			<button
				type="button"
				onclick={() => handleTypeClick(type.value)}
				class="group relative overflow-hidden px-8 py-4 text-lg font-bold transition-all duration-300 {selectedType === type.value
					? 'text-white scale-105'
					: 'text-[#333333] hover:scale-105'}"
				style="background-color: {selectedType === type.value ? type.color : 'transparent'}; 
				       border: 3px solid {type.color};"
			>
				<!-- Triangle accent on hover/active -->
				{#if selectedType === type.value}
					<div 
						class="absolute -right-2 -top-2 h-8 w-8 transition-transform"
						style="background-color: {type.color}; clip-path: polygon(100% 0, 0 0, 100% 100%); filter: brightness(1.2);"
					></div>
				{/if}
				<span class="relative z-10">{type.label}</span>
			</button>
		{/each}
	</div>
</div>

