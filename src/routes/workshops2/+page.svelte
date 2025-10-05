<script lang="ts">
	import { getUpcomingEvents, getEventsByType } from '$lib/workshops.remote';
	import EventList from '$lib/components/workshops2/EventList.svelte';
	import EventFilters from '$lib/components/workshops2/EventFilters.svelte';
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
	<title>Workshops & Events - Casa Luma</title>
	<meta
		name="description"
		content="Discover upcoming yoga classes, workshops, retreats, and art sessions at Casa Luma. Join our community for transformative experiences."
	/>
</svelte:head>

<!-- Hero with geometric background -->
<div class="relative overflow-hidden bg-[#F9EDE8] py-24 sm:py-32">
	<!-- Geometric decorations -->
	<div class="absolute left-10 top-10 h-32 w-32 rounded-full bg-[#dfbc69] opacity-20"></div>
	<div class="absolute right-20 top-32 h-24 w-24 bg-[#A8C3A0] opacity-30" style="clip-path: polygon(50% 0%, 0% 100%, 100% 100%)"></div>
	<div class="absolute bottom-10 left-1/4 h-40 w-40 bg-[#E07A5F] opacity-20" style="clip-path: circle(50%)"></div>
	
	<div class="relative mx-auto max-w-7xl px-6 lg:px-8">
		<div class="mx-auto max-w-3xl text-center">
			<h1 class="text-5xl font-extrabold tracking-tight text-[#333333] sm:text-7xl mb-6">
				Workshops & Events
			</h1>
			<p class="text-xl leading-relaxed text-[#333333]/80">
				Dive into creative play, mindful moments, and joyful learning.<br />
				For little explorers and their grown-ups.
			</p>
		</div>
	</div>
</div>

<!-- Filters Section -->
<div class="bg-white py-8 border-b-4 border-[#dfbc69]">
	<div class="mx-auto max-w-7xl px-6 lg:px-8">
		<EventFilters {selectedType} onTypeChange={handleTypeChange} />
	</div>
</div>

<!-- Events Section -->
<div class="bg-gradient-to-b from-white to-[#F9EDE8] py-16">
	<div class="mx-auto max-w-7xl px-6 lg:px-8">
		<EventList {events} {selectedType} />
	</div>
</div>

