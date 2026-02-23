<script lang="ts">
	import Reveal from '$lib/components/animations/Reveal.svelte';
	import { ArrowRight } from 'lucide-svelte';
</script>

<section class="bg-white px-6 py-24 sm:px-10 lg:px-20">
	<div class="mx-auto grid w-full max-w-7xl items-center gap-14 lg:grid-cols-[1fr_1.05fr]">
		<Reveal direction="up" class="order-2 lg:order-1 relative h-[24rem] overflow-hidden shadow-[0_20px_50px_rgb(45_58_58_/_0.15)] sm:h-[28rem]">
			<div class="absolute inset-0 bg-gradient-to-t from-[#2D3A3A]/20 via-transparent to-transparent"></div>
			<img
				src="https://images.unsplash.com/photo-1445116572660-236099ec97a0?q=80&w=1500&auto=format&fit=crop"
				alt="Cafe at Casa Luma"
				class="h-full w-full object-cover"
			/>
			<div class="absolute bottom-5 left-5 rounded-full bg-[#F9F7F2]/90 px-4 py-2 text-[10px] uppercase tracking-[0.2em] text-[#2D3A3A]">
				Coffee + family menu
			</div>
		</Reveal>

		<Reveal direction="right" skewX={-1.2} class="order-1 space-y-7 lg:order-2">
			<p class="text-[11px] uppercase tracking-[0.28em] text-[#E07A5F]">Family Cafe</p>
			<h2 class="text-4xl leading-[0.95] text-[#2D3A3A] sm:text-5xl lg:text-6xl">
				Fresh, comforting food while little ones keep exploring.
			</h2>
			<p class="max-w-xl text-base leading-relaxed text-[#2D3A3A]/70 sm:text-lg">
				From specialty coffee to nourishing dishes, our cafe lets parents slow down and recharge
				without missing the joy around them.
			</p>
			<a
				href="/cafe"
				class="inline-flex items-center gap-3 border-b border-[#2D3A3A]/35 pb-1 text-xs uppercase tracking-[0.2em] text-[#2D3A3A] transition-all hover:border-[#E07A5F] hover:text-[#E07A5F]"
			>
				See the cafe
				<ArrowRight size={14} />
			</a>
		</Reveal>
	</div>
</section>
