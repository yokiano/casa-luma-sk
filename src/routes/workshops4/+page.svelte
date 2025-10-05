<script lang="ts">
	import { getUpcomingEvents, getEventsByType } from '$lib/workshops.remote';
	import EventList4 from '$lib/components/workshops/EventList4.svelte';
	import type { EventType } from '$lib/types/workshops';

	let selectedType = $state<EventType | 'All'>('All');
	let events = $state(await getUpcomingEvents());

	async function handleTypeChange(type: EventType | 'All') {
		selectedType = type;
		if (type === 'All') {
			events = await getUpcomingEvents();
		} else {
			events = await getEventsByType(type);
		}
	}
</script>

<svelte:head>
	<title>Gatherings at Casa Luma</title>
	<meta name="description" content="Playful, warm, and bold events at Casa Luma – workshops, art, yoga, and more." />
</svelte:head>

<!-- Bold header: rectangles + triangle divider, no rounded chips -->
<section class="relative isolate bg-[#F9EDE8]">
	<div class="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
		<div class="grid gap-6 lg:grid-cols-12 lg:items-end">
			<div class="lg:col-span-7">
				<h1 class="text-5xl font-extrabold tracking-tight text-[#333] sm:text-6xl">
					Workshops & Events
				</h1>
				<p class="mt-4 max-w-prose text-lg text-[#333]/80">
					Warm, natural, and imaginative – a calendar of experiences for families. Bold layout. No templates.
				</p>
			</div>
			<div class="lg:col-span-5">
				<!-- Minimal filter bar without chips -->
				<div class="flex flex-wrap gap-2">
					{#each ['All','Workshop','Retreat','Yoga Class','Art Session','Other'] as type}
						<button type="button" onclick={() => handleTypeChange(type as any)} class={`px-4 py-2 text-sm font-bold uppercase tracking-wide transition border-2 ${selectedType === type ? 'bg-[#333] text-white border-[#333]' : 'border-[#333] text-[#333] hover:bg-[#333] hover:text-white'}`}>
							{type}
						</button>
					{/each}
				</div>
			</div>
		</div>
	</div>
	<!-- Triangle divider bottom -->
	<div class="absolute bottom-0 left-0 right-0 h-8 bg-[#dfbc69]" style="clip-path: polygon(0 100%,100% 0,0 0);"></div>
</section>

<section class="bg-white">
	<div class="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
		<EventList4 {events} emptyMessage={`No ${selectedType === 'All' ? '' : selectedType.toLowerCase()} events right now`} />
	</div>
</section>


