<script lang="ts">
	import type { Event } from '$lib/types/workshops';
	import AvailabilityBadge from './AvailabilityBadge.svelte';

	interface Props {
		event: Event;
		isReversed?: boolean;
	}

	let { event, isReversed = false }: Props = $props();

	const eventDate = $derived(new Date(event.date));
	const formattedDate = $derived(
		eventDate.toLocaleDateString('en-US', {
			weekday: 'short',
			month: 'short',
			day: 'numeric'
		})
	);
	const formattedTime = $derived(
		eventDate.toLocaleTimeString('en-US', {
			hour: 'numeric',
			minute: '2-digit',
			hour12: true
		})
	);

	const isPaid = $derived(event.price > 0);
	const priceText = $derived(isPaid ? `€${event.price.toFixed(2)}` : 'Free');

	// Color mapping for event types
	const typeColors: Record<string, string> = {
		'Workshop': '#dfbc69',
		'Retreat': '#A8C3A0',
		'Yoga Class': '#E07A5F',
		'Art Session': '#dfbc69',
		'Other': '#A8C3A0'
	};
	const eventColor = $derived(typeColors[event.eventType] || '#dfbc69');
</script>

<a
	href="/workshops/{event.slug}"
	class="group block transition-transform hover:scale-[1.02]"
>
	<!-- Asymmetric layout - alternating sides -->
	<div class="grid gap-0 overflow-hidden bg-white lg:grid-cols-2 {isReversed ? 'lg:grid-flow-dense' : ''}">
		
		<!-- Image section with geometric clip -->
		<div class="relative h-80 overflow-hidden lg:h-auto {isReversed ? 'lg:col-start-2' : ''}">
			{#if event.featuredImage}
				<img
					src={event.featuredImage}
					alt={event.eventName}
					class="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
				/>
			{:else}
				<div class="h-full w-full bg-gradient-to-br from-[#F9EDE8] to-[#dfbc69]/30 flex items-center justify-center">
					<span class="text-8xl opacity-50">{event.eventType === 'Yoga Class' ? '🧘' : event.eventType === 'Art Session' ? '🎨' : '✨'}</span>
				</div>
			{/if}
			
			<!-- Geometric overlay accent -->
			<div 
				class="absolute bottom-0 right-0 h-32 w-32 opacity-30 transition-all duration-500 group-hover:scale-125"
				style="background-color: {eventColor}; clip-path: polygon(100% 0, 0% 100%, 100% 100%);"
			></div>
		</div>

		<!-- Content section -->
		<div class="relative flex flex-col justify-center p-8 lg:p-12 {isReversed ? 'lg:col-start-1' : ''}">
			
			<!-- Circular accent -->
			<div 
				class="absolute -left-4 -top-4 h-24 w-24 rounded-full opacity-10"
				style="background-color: {eventColor};"
			></div>

			<!-- Event type bar -->
			<div class="mb-6 flex items-center gap-4">
				<div 
					class="h-1 w-16" 
					style="background-color: {eventColor};"
				></div>
				<span class="text-sm font-bold uppercase tracking-widest" style="color: {eventColor};">
					{event.eventType}
				</span>
			</div>

			<!-- Title -->
			<h2 class="mb-4 text-3xl font-extrabold leading-tight text-[#333333] transition-colors group-hover:text-[#E07A5F] lg:text-4xl">
				{event.eventName}
			</h2>

			<!-- Description -->
			<p class="mb-6 text-lg leading-relaxed text-[#333333]/80">
				{event.shortDescription}
			</p>

			<!-- Details grid -->
			<div class="mb-6 grid gap-3 sm:grid-cols-2">
				<div class="flex items-start gap-3">
					<div class="h-10 w-10 flex items-center justify-center rounded-full bg-[#dfbc69]/20">
						<span class="text-xl">📅</span>
					</div>
					<div>
						<div class="text-xs font-semibold uppercase tracking-wide text-[#333333]/60">Date</div>
						<div class="font-bold text-[#333333]">{formattedDate}</div>
					</div>
				</div>

				<div class="flex items-start gap-3">
					<div class="h-10 w-10 flex items-center justify-center rounded-full bg-[#A8C3A0]/20">
						<span class="text-xl">⏰</span>
					</div>
					<div>
						<div class="text-xs font-semibold uppercase tracking-wide text-[#333333]/60">Time</div>
						<div class="font-bold text-[#333333]">{formattedTime}</div>
					</div>
				</div>

				<div class="flex items-start gap-3">
					<div class="h-10 w-10 flex items-center justify-center rounded-full bg-[#E07A5F]/20">
						<span class="text-xl">📍</span>
					</div>
					<div>
						<div class="text-xs font-semibold uppercase tracking-wide text-[#333333]/60">Location</div>
						<div class="font-bold text-[#333333]">{event.location}</div>
					</div>
				</div>

				<div class="flex items-start gap-3">
					<div class="h-10 w-10 flex items-center justify-center rounded-full bg-[#dfbc69]/20">
						<span class="text-xl">👤</span>
					</div>
					<div>
						<div class="text-xs font-semibold uppercase tracking-wide text-[#333333]/60">Instructor</div>
						<div class="font-bold text-[#333333]">{event.instructor}</div>
					</div>
				</div>
			</div>

			<!-- Footer with price and availability -->
			<div class="flex items-center justify-between border-t-2 pt-6" style="border-color: {eventColor};">
				<div>
					<div class="text-xs font-semibold uppercase tracking-wide text-[#333333]/60">Price</div>
					<div class="text-3xl font-extrabold" style="color: {eventColor};">{priceText}</div>
				</div>
				
				<AvailabilityBadge
					availableSpots={event.availableSpots}
					capacity={event.capacity}
					registrationStatus={event.registrationStatus}
				/>
			</div>
		</div>
	</div>
</a>

