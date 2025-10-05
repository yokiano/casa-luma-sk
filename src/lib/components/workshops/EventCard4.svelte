<script lang="ts">
	import type { Event } from '$lib/types/workshops';

	interface Props {
		event: Event;
		index?: number;
	}

	let { event, index = 0 }: Props = $props();

	const eventDate = $derived(new Date(event.date));
	const day = $derived(eventDate.toLocaleDateString('en-US', { day: '2-digit' }));
	const month = $derived(
		eventDate.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()
	);
	const time = $derived(
		eventDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
	);

	const isPaid = $derived(event.price > 0);
	const priceText = $derived(isPaid ? `€${event.price.toFixed(0)}` : 'FREE');

	// Mosaic layout variants by index
	const variantClass = $derived.by(() => {
		const mod = index % 6;
		if (mod === 0) return 'lg:col-span-3 lg:row-span-2 aspect-[4/5]';
		if (mod === 1) return 'lg:col-span-2 lg:row-span-2 aspect-[4/5]';
		if (mod === 2) return 'lg:col-span-3 lg:row-span-1 aspect-video';
		if (mod === 3) return 'lg:col-span-2 lg:row-span-1 aspect-video';
		if (mod === 4) return 'lg:col-span-3 lg:row-span-2 aspect-[4/5]';
		return 'lg:col-span-2 lg:row-span-1 aspect-video';
	});
</script>

<a href="/workshops4/{event.slug}" class="group block w-full">
	<!-- Card container: hard edges, no rounded; bold overlays -->
	<div class={`relative isolate overflow-hidden bg-[#F9EDE8] ${variantClass}`}>
		<!-- Background image / fallback -->
		{#if event.featuredImage}
			<img
				src={event.featuredImage}
				alt={event.eventName}
				class="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-[1.04]"
			/>
		{:else}
			<div class="absolute inset-0 grid place-items-center bg-gradient-to-br from-amber-100 to-amber-200">
				<span class="text-6xl">{event.eventType === 'Yoga Class' ? '🧘' : '✨'}</span>
			</div>
		{/if}

		<!-- Amber gradient veil for readability -->
		<div class="absolute inset-0 bg-gradient-to-t from-black/55 via-black/20 to-black/0"></div>

		<!-- Geometric accents: triangle + circle -->
		<div class="pointer-events-none absolute -left-10 -bottom-10 h-40 w-56 bg-[#dfbc69] opacity-90"
			style="clip-path: polygon(0% 100%, 100% 100%, 0% 0%);"></div>
		<div class="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-[#E07A5F] opacity-60 blur-[2px]"></div>

		<!-- Content -->
		<div class="relative z-10 flex h-full flex-col justify-end p-6 sm:p-8 text-white">
			<!-- Top row: Date circle + price tag (rectangular) -->
			<div class="mb-4 flex items-center justify-between">
				<div class="grid place-items-center bg-white/95 text-gray-900 h-16 w-16 rounded-full shadow">
					<div class="text-[10px] tracking-widest">{month}</div>
					<div class="text-2xl font-extrabold leading-none">{day}</div>
				</div>
				<div class="bg-[#dfbc69] px-3 py-2 text-sm font-bold uppercase tracking-wide text-gray-900">
					{priceText}
				</div>
			</div>

			<h3 class="mb-2 text-2xl font-extrabold leading-tight sm:text-3xl">
				{event.eventName}
			</h3>
			<p class="mb-4 max-w-prose text-sm/6 text-white/90 line-clamp-3">
				{event.shortDescription}
			</p>

			<!-- Meta row: time • location • instructor -->
			<div class="mt-auto flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-semibold tracking-wide">
				<span class="inline-flex items-center gap-2">
					<span>⏰</span>
					<span>{time}</span>
				</span>
				<span class="inline-flex items-center gap-2">
					<span>📍</span>
					<span>{event.location}</span>
				</span>
				<span class="inline-flex items-center gap-2">
					<span>👤</span>
					<span>{event.instructor}</span>
				</span>
			</div>
		</div>

		<!-- Corner ribbon for availability (no chips) -->
		{#if event.availableSpots === 0}
			<div class="absolute left-0 top-0 -translate-x-10 -translate-y-4 rotate-[-35deg] bg-[#E07A5F] px-10 py-1 text-xs font-black uppercase text-white shadow-md">
				Sold Out
			</div>
		{:else if event.registrationStatus === 'Waitlist'}
			<div class="absolute left-0 top-0 -translate-x-10 -translate-y-4 rotate-[-35deg] bg-[#A8C3A0] px-10 py-1 text-xs font-black uppercase text-gray-900 shadow-md">
				Waitlist
			</div>
		{:else if event.registrationStatus === 'Closed'}
			<div class="absolute left-0 top-0 -translate-x-10 -translate-y-4 rotate-[-35deg] bg-gray-800 px-10 py-1 text-xs font-black uppercase text-white shadow-md">
				Closed
			</div>
		{/if}
	</div>
</a>


