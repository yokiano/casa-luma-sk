<script lang="ts">
	import { getUpcomingEvents, getEventsByType } from '$lib/workshops.remote';
	import EventList from '$lib/components/workshops/EventList.svelte';
	import EventFilters from '$lib/components/workshops/EventFilters.svelte';
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

<div class="min-h-screen bg-gradient-to-b from-amber-50 to-white">
	<div class="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
		<!-- Header -->
		<div class="mb-12 text-center">
			<h1 class="mb-4 text-4xl font-bold text-gray-900 sm:text-5xl">
				Workshops & Events
			</h1>
			<p class="mx-auto max-w-2xl text-lg text-gray-600">
				Join us for transformative experiences in yoga, meditation, art, and wellness. All levels
				welcome.
			</p>
		</div>

		<!-- Filters -->
		<div class="mb-8">
			<EventFilters {selectedType} onTypeChange={handleTypeChange} />
		</div>

		<!-- Event List -->
		<EventList {events} emptyMessage="No {selectedType === 'All' ? '' : selectedType.toLowerCase()} events scheduled at the moment" />
	</div>
</div>

