<script lang="ts">
	import Reveal from '$lib/components/animations/Reveal.svelte';
	import PaperCard from '$lib/components/ui/PaperCard.svelte';
	import { BrandCtrl } from '$lib/utils/brand-controller.svelte';
	import { ArrowRight } from 'lucide-svelte';

	const events = [
		{
			date: 'MARCH 2026',
			title: 'Sensory Art Workshop',
			category: 'WORKSHOP',
			description: 'Explore colour, texture and form through guided sensory play.',
			image: 'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?q=80&w=400&auto=format&fit=crop'
		},
		{
			date: 'APRIL 2026',
			title: 'Family Yoga Morning',
			category: 'ACTIVITY',
			description: 'A gentle morning flow designed for parents and little ones together.',
			image: 'https://images.unsplash.com/photo-1512438248247-f0f2a5a8b7f0?q=80&w=400&auto=format&fit=crop'
		},
		{
			date: 'MAY 2026',
			title: 'Montessori at Home',
			category: 'TALK',
			description: 'Practical tools for building a Montessori-inspired home environment.',
			image: 'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?q=80&w=400&auto=format&fit=crop'
		}
	];

	// Use sage green for the paper card header
	const headerColor = BrandCtrl.getColorByIndex(2, { weight: 400 }).value; // Sage
</script>

<section class="py-24 px-8 md:px-24 bg-white overflow-hidden">
	<!-- Section header wrapped in PaperCard -->
	<Reveal direction="up" class="mb-16">
		<PaperCard color={headerColor} padding="md" class="rounded-2xl">
			<div class="flex items-end justify-between">
				<div>
					<p class="text-xs font-sans tracking-[0.3em] uppercase text-[#2D3A3A]/60 mb-3">
						What's on
					</p>
					<h2 class="text-4xl md:text-6xl font-serif text-[#2D3A3A]">ACTIVITIES</h2>
				</div>
				<a
					href="/calendar"
					class="px-6 py-2.5 border border-[#2D3A3A]/30 text-[#2D3A3A] hover:bg-[#2D3A3A] hover:text-white transition-colors text-xs uppercase tracking-widest font-sans"
					style:border-radius="2rem"
				>
					Full Calendar
				</a>
			</div>
		</PaperCard>
	</Reveal>

	<!-- Events list -->
	<div class="divide-y divide-[#2D3A3A]/10 border-t border-[#2D3A3A]/10">
		{#each events as event, i}
			<Reveal direction="up" delay={i * 80} skewX={1.5}>
				<div class="group py-10 flex flex-col md:flex-row md:items-center justify-between hover:bg-[#F9F7F2] transition-colors duration-300 px-2 -mx-2 cursor-pointer">
					<!-- Date + dot -->
					<div class="flex items-center gap-6 md:w-1/4">
						<span
							class="w-1.5 h-1.5 rounded-full bg-[#E07A5F] opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex-shrink-0"
						></span>
						<span class="font-sans text-xs tracking-widest text-[#2D3A3A]/50 uppercase">
							{event.date}
						</span>
					</div>

					<!-- Title + description -->
					<div class="md:w-5/12 mt-3 md:mt-0">
						<div class="text-2xl md:text-3xl font-serif text-[#2D3A3A] group-hover:translate-x-2 transition-transform duration-500">
							{event.title}
						</div>
						<p class="text-sm font-sans text-[#2D3A3A]/50 mt-1 max-w-xs opacity-0 group-hover:opacity-100 transition-all duration-400 translate-y-1 group-hover:translate-y-0">
							{event.description}
						</p>
					</div>

					<!-- Category + thumbnail -->
					<div class="md:w-1/4 flex justify-start md:justify-end items-center gap-6 mt-4 md:mt-0 opacity-0 group-hover:opacity-100 transition-all duration-500">
						<span
							class="text-xs font-sans tracking-widest border border-[#2D3A3A]/20 px-3 py-1 uppercase"
							style:border-radius="2rem"
						>
							{event.category}
						</span>
						<div class="w-24 h-16 overflow-hidden shadow-md flex-shrink-0" style:border-radius="0.75rem">
							<img src={event.image} alt="" class="w-full h-full object-cover scale-105 group-hover:scale-100 transition-transform duration-700" />
						</div>
					</div>
				</div>
			</Reveal>
		{/each}
	</div>
</section>
