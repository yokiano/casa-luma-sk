<script lang="ts">
	import Reveal from '$lib/components/animations/Reveal.svelte';
	import { ArrowRight } from 'lucide-svelte';
</script>

<section class="bg-[#F9F7F2] px-6 py-24 sm:px-10 lg:px-20">
	<div class="mx-auto grid w-full max-w-7xl items-center gap-14 lg:grid-cols-[1.05fr_1fr]">
		<Reveal direction="left" skewX={1.2} class="space-y-7">
			<p class="text-[11px] uppercase tracking-[0.28em] text-[#E07A5F]">Indoor Playground</p>
			<h2 class="text-4xl leading-[0.95] text-[#2D3A3A] sm:text-5xl lg:text-6xl">
				A playful world made for movement, wonder, and confidence.
			</h2>
			<p class="max-w-xl text-base leading-relaxed text-[#2D3A3A]/70 sm:text-lg">
				Thoughtfully designed zones for climbing, sensory play, and free exploration, all inside a
				calm and beautiful setting for families.
			</p>
			<a
				href="/open-play"
				class="inline-flex items-center gap-3 border-b border-[#2D3A3A]/35 pb-1 text-xs uppercase tracking-[0.2em] text-[#2D3A3A] transition-all hover:border-[#E07A5F] hover:text-[#E07A5F]"
			>
				Explore open play
				<ArrowRight size={14} />
			</a>
		</Reveal>

		<Reveal direction="up" delay={120} class="relative h-[24rem] overflow-hidden shadow-[0_20px_50px_rgb(45_58_58_/_0.18)] sm:h-[28rem]">
			<div class="absolute inset-0 bg-gradient-to-t from-[#2D3A3A]/20 via-transparent to-transparent"></div>
			<img
				src="https://images.unsplash.com/photo-1503919005314-30d93d07d823?q=80&w=1500&auto=format&fit=crop"
				alt="Children enjoying Casa Luma indoor playground"
				class="h-full w-full object-cover"
			/>
			<div class="absolute bottom-5 left-5 rounded-full bg-[#F9F7F2]/90 px-4 py-2 text-[10px] uppercase tracking-[0.2em] text-[#2D3A3A]">
				Soft play + sensory zones
			</div>
		</Reveal>
	</div>
</section>
