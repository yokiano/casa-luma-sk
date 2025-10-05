<script lang="ts">
	import type { Event } from '$lib/types/workshops';
	import EventCard from './EventCard.svelte';

	interface Props {
		events: Event[];
		emptyMessage?: string;
	}

	let { events, emptyMessage = 'No events found' }: Props = $props();
</script>

{#if events.length === 0}
	<div class="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-12 text-center">
		<span class="mb-2 text-4xl">📅</span>
		<p class="text-lg text-gray-600">{emptyMessage}</p>
		<p class="mt-2 text-sm text-gray-500">Check back soon for new events!</p>
	</div>
{:else}
	<div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
		{#each events as event (event.id)}
			<EventCard {event} />
		{/each}
	</div>
{/if}

