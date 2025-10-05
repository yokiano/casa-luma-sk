<script lang="ts">
	import type { Event } from '$lib/types/workshops';
	import AvailabilityBadge3 from './AvailabilityBadge3.svelte';
	import Icon from '@iconify/svelte';

	interface Props {
		event: Event;
		isReversed?: boolean;
		index: number;
	}

	let { event, isReversed = false, index }: Props = $props();

	const eventDate = $derived(new Date(event.date));
	const formattedDate = $derived(
		eventDate.toLocaleDateString('en-US', {
			weekday: 'long',
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
	const priceText = $derived(isPaid ? `${event.price.toFixed(0)} ฿` : 'Free');
	
	// Different colors for different event types
	const typeColors = {
		'Workshop': '#dfbc69',
		'Retreat': '#A8C3A0',
		'Yoga Class': '#E07A5F',
		'Art Session': '#dfbc69',
		'Other': '#A8C3A0'
	};
	
	const accentColor = $derived(typeColors[event.eventType] || '#dfbc69');
	
	// Unsplash collections for different event types
	const unsplashImages = {
		'Workshop': [
			'https://images.unsplash.com/photo-1528605105345-5344ea20e269?w=800&h=800&fit=crop',
			'https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=800&h=800&fit=crop',
			'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=800&h=800&fit=crop',
		],
		'Retreat': [
			'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=800&fit=crop',
			'https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=800&h=800&fit=crop',
			'https://images.unsplash.com/photo-1551632811-561732d1e306?w=800&h=800&fit=crop',
		],
		'Yoga Class': [
			'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&h=800&fit=crop',
			'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&h=800&fit=crop',
			'https://images.unsplash.com/photo-1588286840104-8957b019727f?w=800&h=800&fit=crop',
		],
		'Art Session': [
			'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=800&h=800&fit=crop',
			'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=800&h=800&fit=crop',
			'https://images.unsplash.com/photo-1452860606245-08befc0ff44b?w=800&h=800&fit=crop',
		],
		'Other': [
			'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800&h=800&fit=crop',
			'https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?w=800&h=800&fit=crop',
			'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=800&h=800&fit=crop',
		]
	};
	
	const fallbackImage = $derived(() => {
		const images = unsplashImages[event.eventType] || unsplashImages['Other'];
		return images[index % images.length];
	});
</script>

<a
	href="/workshops/{event.slug}"
	class="group block relative"
>
	<div class="flex flex-col lg:flex-row {isReversed ? 'lg:flex-row-reverse' : ''} gap-8 items-center">
		<!-- Image Section with Geometric Shape -->
		<div class="w-full lg:w-1/2 relative">
			{#if index % 3 === 0}
				<!-- Circle shape -->
				<div class="aspect-square overflow-hidden rounded-full relative">
					<img
						src={event.featuredImage || fallbackImage()}
						alt={event.eventName}
						class="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
					/>
				</div>
			{:else if index % 3 === 1}
				<!-- Diamond shape -->
				<div class="aspect-square overflow-hidden rotate-45 relative">
					<div class="absolute inset-0 -rotate-45 scale-150">
						<img
							src={event.featuredImage || fallbackImage()}
							alt={event.eventName}
							class="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
						/>
					</div>
				</div>
			{:else}
				<!-- Organic blob shape -->
				<div 
					class="aspect-square overflow-hidden relative"
					style="border-radius: 30% 70% 70% 30% / 30% 30% 70% 70%;"
				>
					<img
						src={event.featuredImage || fallbackImage()}
						alt={event.eventName}
						class="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
					/>
				</div>
			{/if}
			
			<!-- Floating price tag -->
			<div 
				class="absolute -bottom-4 {isReversed ? 'left-8' : 'right-8'} bg-white px-6 py-3 transform -rotate-2 shadow-lg"
			>
				<span class="text-lg font-light text-[#333333] tracking-wide">{priceText}</span>
			</div>
		</div>

		<!-- Content Section -->
		<div class="w-full lg:w-1/2 relative">
			<!-- Event Type with unique styling -->
			<div class="mb-6">
				<span 
					class="inline-block text-lg font-light tracking-widest uppercase"
					style="color: {accentColor}; border-bottom: 2px solid {accentColor}; padding-bottom: 4px;"
				>
					{event.eventType}
				</span>
			</div>

			<h3 class="mb-4 text-4xl lg:text-5xl font-light text-[#333333] leading-tight group-hover:text-[{accentColor}] transition-colors duration-300">
				{event.eventName}
			</h3>

			<p class="mb-8 text-xl text-[#333333] opacity-80 font-light leading-relaxed">
				{event.shortDescription}
			</p>

			<!-- Event Details with Creative Layout -->
			<div class="space-y-4 mb-8">
				<div class="flex items-start gap-4">
					<div class="flex-shrink-0">
						<Icon 
							icon="streamline-ultimate-color:time-clock-circle" 
							width="48" 
							height="48"
							class="text-[{accentColor}]"
						/>
					</div>
					<div>
						<p class="text-lg font-medium text-[#333333]">{formattedDate}</p>
						<p class="text-[{accentColor}]">{formattedTime}</p>
					</div>
				</div>
				
				<div class="flex items-center gap-4">
					<div class="flex-shrink-0">
						<Icon 
							icon="streamline-ultimate-color:style-one-pin-check" 
							width="48" 
							height="48"
							class="text-[{accentColor}]"
						/>
					</div>
					<p class="text-lg text-[#333333]">{event.location}</p>
				</div>
				
				<div class="flex items-center gap-4">
					<div class="flex-shrink-0">
						<Icon 
							icon="streamline-ultimate-color:award-trophy-1" 
							width="48" 
							height="48"
							class="text-[{accentColor}]"
						/>
					</div>
					<p class="text-lg text-[#333333]">Guided by {event.instructor}</p>
				</div>
			</div>

			<!-- Availability and Tags -->
			<div class="flex flex-wrap items-center gap-6">
				<AvailabilityBadge3
					availableSpots={event.availableSpots}
					capacity={event.capacity}
					registrationStatus={event.registrationStatus}
				/>
				
				{#if event.tags && event.tags.length > 0}
					<div class="flex flex-wrap gap-3">
						{#each event.tags as tag}
							<span 
								class="text-sm font-light italic text-[#333333] opacity-70"
							>
								#{tag}
							</span>
						{/each}
					</div>
				{/if}
			</div>

			<!-- CTA Button -->
			<div class="mt-8">
				<div class="inline-flex items-center gap-3 bg-[#333333] text-white px-8 py-4 group-hover:bg-[#dfbc69] group-hover:text-[#333333] transition-all duration-300 transform group-hover:translate-x-2">
					<span class="text-lg font-light tracking-wide">Explore Event</span>
					<svg class="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3"></path>
					</svg>
				</div>
			</div>
		</div>
	</div>
</a>
