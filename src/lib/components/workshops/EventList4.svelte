<script lang="ts">
	import type { Event } from '$lib/types/workshops';
	import EventCard4 from './EventCard4.svelte';

	interface Props {
		events: Event[];
		emptyMessage?: string;
	}

	let { events, emptyMessage = 'No events found' }: Props = $props();
</script>

{#if events.length === 0}
	<div class="grid place-items-center min-h-[40vh] bg-[#F9EDE8] text-gray-700">
		<div class="text-center">
			<div class="mb-2 text-7xl">📅</div>
			<p class="text-lg font-semibold">{emptyMessage}</p>
			<p class="mt-1 text-sm opacity-70">New gatherings are added regularly.</p>
		</div>
	</div>
{:else}
	<!-- Irregular mosaic grid (no templatey card grid) -->
	<div class="grid auto-rows-[14rem] gap-3 sm:gap-4 lg:gap-6 lg:grid-cols-5">
		{#each events as event, i (event.id)}
			<div>
				<EventCard4 {event} index={i} />
			</div>
		{/each}
	</div>
{/if}


