<script lang="ts">
	import { innerHeight } from 'svelte/reactivity/window';
	import Reveal from '$lib/components/animations/Reveal.svelte';
	import { ArrowRight } from 'lucide-svelte';

	let sectionEl = $state<HTMLElement>();

	// Image parallax: moves at different rate from text
	let imgParallax = $derived.by(() => {
		if (!sectionEl) return 0;
		const rect = sectionEl.getBoundingClientRect();
		const vh = innerHeight.current ?? window.innerHeight;
		const center = rect.top + rect.height / 2 - vh / 2;
		return center * -0.12;
	});
</script>

<section
	bind:this={sectionEl}
	class="py-32 flex flex-col md:flex-row items-center justify-between px-8 md:px-24 gap-16 overflow-hidden bg-[#F9F7F2]"
>
	<Reveal direction="left" class="w-full md:w-1/2 space-y-8" skewX={2}>
		<span class="text-xs font-sans tracking-[0.3em] uppercase text-[#E07A5F]">Birthday Events</span>
		<h3 class="text-5xl md:text-7xl font-serif leading-none text-[#2D3A3A]">
			BIRTHDAY <br />
			<span class="italic text-[#A8C3A0]">AT CASA LUMA</span>
		</h3>
		<p class="text-xl text-[#2D3A3A]/65 max-w-md font-sans leading-relaxed">
			Host a chic, playful celebration with curated setups, warm hospitality, and room for children
			to explore freely while the grown-ups enjoy the moment.
		</p>
		<a
			href="/birthday-parties"
			class="inline-flex items-center gap-3 border-b border-[#2D3A3A]/40 pb-1 hover:text-[#E07A5F] hover:border-[#E07A5F] transition-all duration-300 uppercase tracking-wider text-sm group"
		>
			Plan your celebration
			<ArrowRight size={16} class="transition-transform duration-300 group-hover:translate-x-1" />
		</a>
	</Reveal>

	<!-- Vertical image with inner parallax -->
	<Reveal direction="up" delay={150} class="w-full md:w-5/12 relative h-[580px] overflow-hidden shadow-2xl" skewX={1}>
		<div
			style:border-radius="8rem 8rem 2rem 2rem"
			class="absolute inset-0 overflow-hidden"
		>
			<img
				src="https://images.unsplash.com/photo-1464349153735-7db50ed83c84?q=80&w=1000&auto=format&fit=crop"
				alt="Birthday celebration at Casa Luma"
				class="absolute inset-0 w-full h-[130%] object-cover will-change-transform"
				style:transform="translateY({imgParallax}px)"
			/>
			<!-- Subtle tint overlay -->
			<div class="absolute inset-0 bg-[#A8C3A0]/10 pointer-events-none"></div>
		</div>

		<!-- Small floating label -->
		<div class="absolute bottom-8 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-sm px-5 py-2 text-xs font-sans tracking-widest uppercase text-[#2D3A3A] shadow-lg"
			 style:border-radius="2rem"
		>
			Private events
		</div>
	</Reveal>
</section>
