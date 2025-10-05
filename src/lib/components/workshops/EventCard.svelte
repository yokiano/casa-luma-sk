<script lang="ts">
	import type { Event } from '$lib/types/workshops';
	import AvailabilityBadge from './AvailabilityBadge.svelte';

	interface Props {
		event: Event;
	}

	let { event }: Props = $props();

	const eventDate = $derived(new Date(event.date));
	const formattedDate = $derived(
		eventDate.toLocaleDateString('en-US', {
			weekday: 'long',
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		})
	);
	const formattedTime = $derived(
		eventDate.toLocaleTimeString('en-US', {
			hour: 'numeric',
			minute: '2-digit'
		})
	);

	const isPaid = $derived(event.price > 0);
	const priceText = $derived(isPaid ? `€${event.price.toFixed(2)}` : 'Free');
</script>

<a
	href="/workshops/{event.slug}"
	class="group block overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition hover:shadow-lg"
>
	{#if event.featuredImage}
		<div class="aspect-video overflow-hidden bg-gray-100">
			<img
				src={event.featuredImage}
				alt={event.eventName}
				class="h-full w-full object-cover transition group-hover:scale-105"
			/>
		</div>
	{:else}
		<div class="aspect-video bg-gradient-to-br from-amber-100 to-amber-200">
			<div class="flex h-full items-center justify-center">
				<span class="text-4xl">{event.eventType === 'Yoga Class' ? '🧘' : '✨'}</span>
			</div>
		</div>
	{/if}

	<div class="p-5">
		<div class="mb-3 flex items-start justify-between gap-2">
			<div>
				<span
					class="inline-block rounded bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800"
				>
					{event.eventType}
				</span>
			</div>
			<span class="text-lg font-bold text-amber-600">{priceText}</span>
		</div>

		<h3 class="mb-2 text-xl font-bold text-gray-900 group-hover:text-amber-600">
			{event.eventName}
		</h3>

		<p class="mb-4 line-clamp-2 text-sm text-gray-600">
			{event.shortDescription}
		</p>

		<div class="mb-4 space-y-2 text-sm text-gray-700">
			<div class="flex items-center gap-2">
				<span>📅</span>
				<span>{formattedDate}</span>
			</div>
			<div class="flex items-center gap-2">
				<span>⏰</span>
				<span>{formattedTime}</span>
			</div>
			<div class="flex items-center gap-2">
				<span>📍</span>
				<span>{event.location}</span>
			</div>
			<div class="flex items-center gap-2">
				<span>👤</span>
				<span>{event.instructor}</span>
			</div>
		</div>

		<div class="flex items-center justify-between gap-2">
			<AvailabilityBadge
				availableSpots={event.availableSpots}
				capacity={event.capacity}
				registrationStatus={event.registrationStatus}
			/>
			{#if event.tags && event.tags.length > 0}
				<div class="flex flex-wrap gap-1">
					{#each event.tags.slice(0, 2) as tag}
						<span class="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
							{tag}
						</span>
					{/each}
				</div>
			{/if}
		</div>
	</div>
</a>

