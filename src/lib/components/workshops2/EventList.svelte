<script lang="ts">
	import type { Event } from '$lib/types/workshops';
	import EventCard from './EventCard.svelte';

	interface Props {
		events: Event[];
		selectedType?: string;
	}

	let { events, selectedType = 'All' }: Props = $props();
</script>

{#if events.length === 0}
	<!-- Empty state with geometric design -->
	<div class="relative mx-auto max-w-2xl overflow-hidden bg-white p-16 text-center">
		<!-- Decorative shapes -->
		<div class="absolute left-4 top-4 h-16 w-16 rounded-full bg-[#dfbc69] opacity-20"></div>
		<div class="absolute bottom-4 right-4 h-20 w-20 bg-[#A8C3A0] opacity-20" style="clip-path: polygon(50% 0%, 0% 100%, 100% 100%)"></div>
		
		<div class="relative">
			<div class="mb-6 text-6xl">🌿</div>
			<h3 class="mb-3 text-2xl font-bold text-[#333333]">
				No {selectedType === 'All' ? '' : selectedType.toLowerCase()} events right now
			</h3>
			<p class="text-lg text-[#333333]/70">
				New adventures are always around the corner. Check back soon!
			</p>
		</div>
	</div>
{:else}
	<!-- Asymmetric grid layout -->
	<div class="grid gap-8 sm:gap-12">
		{#each events as event, i (event.id)}
			<EventCard {event} isReversed={i % 2 !== 0} />
		{/each}
	</div>
{/if}

