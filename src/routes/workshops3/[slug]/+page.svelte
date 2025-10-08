<script lang="ts">
	import type { Event as WorkshopEvent } from '$lib/types/workshops';
	import { getEvent } from '$lib/workshops.remote';
	import { page } from '$app/stores';
	import RSVPForm from '$lib/components/workshops/RSVPForm.svelte';
	import AvailabilityBadge from '$lib/components/workshops/AvailabilityBadge.svelte';

	const slug = $page.params.slug;
	
	if (!slug) {
		throw new Error('Event slug is required');
	}
	
	const workshopEvent: WorkshopEvent = await getEvent(slug);

	const eventDate = $derived(new Date(workshopEvent.date));
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

	const isPaid = $derived(workshopEvent.price > 0);
	const priceText = $derived(isPaid ? `€${workshopEvent.price.toFixed(2)}` : 'Free Event');

	const hasEndDate = $derived(workshopEvent.endDate !== undefined && workshopEvent.endDate !== null);
	const endDate = $derived(hasEndDate ? new Date(workshopEvent.endDate!) : null);
	const formattedEndDate = $derived(
		endDate
			? endDate.toLocaleDateString('en-US', {
					weekday: 'long',
					year: 'numeric',
					month: 'long',
					day: 'numeric'
				})
			: null
	);
</script>

<svelte:head>
	<title>{workshopEvent.eventName} - Casa Luma</title>
	<meta name="description" content={workshopEvent.shortDescription} />
</svelte:head>

<div class="min-h-screen bg-gradient-to-b from-amber-50 to-white">
	<div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
		<!-- Back Button -->
		<a
			href="/workshops"
			class="mb-6 inline-flex items-center gap-2 text-amber-600 hover:text-amber-700"
		>
			<span>←</span>
			<span>Back to all events</span>
		</a>

		<div class="grid gap-8 lg:grid-cols-3">
			<!-- Main Content -->
			<div class="lg:col-span-2">
				<!-- Featured Image -->
				{#if workshopEvent.featuredImage}
					<div class="mb-6 overflow-hidden rounded-lg shadow-lg">
						<img
							src={workshopEvent.featuredImage}
							alt={workshopEvent.eventName}
							class="h-auto w-full object-cover"
						/>
					</div>
				{:else}
					<div
						class="mb-6 aspect-video rounded-lg bg-gradient-to-br from-amber-100 to-amber-200 shadow-lg"
					>
						<div class="flex h-full items-center justify-center">
							<span class="text-6xl">{workshopEvent.eventType === 'Yoga Class' ? '🧘' : '✨'}</span>
						</div>
					</div>
				{/if}

				<!-- Event Header -->
				<div class="mb-6">
					<div class="mb-3 flex flex-wrap items-center gap-3">
						<span
							class="inline-block rounded-lg bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-800"
						>
							{workshopEvent.eventType}
						</span>
						<span class="text-2xl font-bold text-amber-600">{priceText}</span>
					</div>

					<h1 class="mb-4 text-4xl font-bold text-gray-900 sm:text-5xl">
						{workshopEvent.eventName}
					</h1>

					<p class="text-xl text-gray-600">
						{workshopEvent.shortDescription}
					</p>
				</div>

				<!-- Event Details Grid -->
				<div class="mb-8 grid gap-4 rounded-lg bg-white p-6 shadow-sm border border-gray-200 sm:grid-cols-2">
					<div class="flex items-start gap-3">
						<span class="text-2xl">📅</span>
						<div>
							<p class="text-sm font-medium text-gray-500">Date</p>
							<p class="text-gray-900">{formattedDate}</p>
							{#if formattedEndDate}
								<p class="text-sm text-gray-600">to {formattedEndDate}</p>
							{/if}
						</div>
					</div>

					<div class="flex items-start gap-3">
						<span class="text-2xl">⏰</span>
						<div>
							<p class="text-sm font-medium text-gray-500">Time</p>
							<p class="text-gray-900">{formattedTime}</p>
						</div>
					</div>

					<div class="flex items-start gap-3">
						<span class="text-2xl">📍</span>
						<div>
							<p class="text-sm font-medium text-gray-500">Location</p>
							<p class="text-gray-900">{event.location}</p>
						</div>
					</div>

					<div class="flex items-start gap-3">
						<span class="text-2xl">👤</span>
						<div>
							<p class="text-sm font-medium text-gray-500">Instructor</p>
							<p class="text-gray-900">{event.instructor}</p>
						</div>
					</div>

					<div class="flex items-start gap-3">
						<span class="text-2xl">🗣️</span>
						<div>
							<p class="text-sm font-medium text-gray-500">Language</p>
							<p class="text-gray-900">{event.language}</p>
						</div>
					</div>

					<div class="flex items-start gap-3">
						<span class="text-2xl">👥</span>
						<div>
							<p class="text-sm font-medium text-gray-500">Capacity</p>
							<p class="text-gray-900">{event.capacity} people</p>
						</div>
					</div>
				</div>

				<!-- Availability Badge -->
				<div class="mb-8">
					<AvailabilityBadge
						availableSpots={event.availableSpots}
						capacity={event.capacity}
						registrationStatus={event.registrationStatus}
					/>
				</div>

				<!-- Description -->
				<div class="mb-8">
					<h2 class="mb-4 text-2xl font-bold text-gray-900">About This Event</h2>
					<div class="prose prose-amber max-w-none">
						<p class="whitespace-pre-wrap text-gray-700">{event.description}</p>
					</div>
				</div>

				<!-- Requirements -->
				{#if event.requirements}
					<div class="mb-8 rounded-lg bg-blue-50 border border-blue-200 p-6">
						<h3 class="mb-2 text-lg font-semibold text-blue-900">What to Bring</h3>
						<p class="whitespace-pre-wrap text-blue-800">{event.requirements}</p>
					</div>
				{/if}

				<!-- Tags -->
				{#if event.tags && event.tags.length > 0}
					<div class="mb-8">
						<h3 class="mb-3 text-lg font-semibold text-gray-900">Topics</h3>
						<div class="flex flex-wrap gap-2">
							{#each event.tags as tag}
								<span class="rounded-full bg-amber-100 px-4 py-2 text-sm font-medium text-amber-800">
									{tag}
								</span>
							{/each}
						</div>
					</div>
				{/if}

				<!-- Gallery -->
				{#if event.gallery && event.gallery.length > 0}
					<div class="mb-8">
						<h3 class="mb-4 text-2xl font-bold text-gray-900">Gallery</h3>
						<div class="grid gap-4 sm:grid-cols-2">
							{#each event.gallery as image}
								<div class="overflow-hidden rounded-lg shadow-md">
									<img src={image} alt="Event gallery" class="h-auto w-full object-cover" />
								</div>
							{/each}
						</div>
					</div>
				{/if}
			</div>

			<!-- Sidebar - RSVP Form -->
			<div class="lg:col-span-1">
				<div class="sticky top-8">
					<RSVPForm {event} />
				</div>
			</div>
		</div>
	</div>
</div>

