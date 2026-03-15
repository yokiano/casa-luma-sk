<script lang="ts">
	import Reveal from '$lib/components/animations/Reveal.svelte';
	import WebsiteMediaImage from '$lib/components/media/WebsiteMediaImage.svelte';
	import { getWebsiteMediaContext } from '$lib/context/website-media';
	import { ArrowRight } from 'lucide-svelte';

	const websiteMedia = getWebsiteMediaContext();
	const hasImage = $derived(websiteMedia.has('home-cafe-image'));
</script>

<section class="bg-white px-6 py-24 sm:px-10 lg:px-20">
	<div class="mx-auto grid w-full max-w-7xl items-center gap-14 lg:grid-cols-[1fr_1.05fr]">
		<Reveal direction="up" class="order-2 lg:order-1 relative h-[24rem] overflow-hidden shadow-[0_20px_50px_rgb(45_58_58_/_0.15)] sm:h-[28rem]">
			{#if hasImage}
				<div class="absolute inset-0 bg-gradient-to-t from-[#2D3A3A]/20 via-transparent to-transparent"></div>
				<WebsiteMediaImage slug="home-cafe-image" class="h-full w-full " imageClass="rounded-xl h-full w-full object-cover" />
			{:else}
				<div class="flex h-full w-full items-center justify-center bg-[linear-gradient(135deg,#f4e7d4,#efe0c3_58%,#dcc3a5)] px-8 text-center text-sm uppercase tracking-[0.25em] text-[#2D3A3A]/55">
					Upload `home-cafe-image`
				</div>
			{/if}
		</Reveal>

		<Reveal direction="right" skewX={-1.2} class="order-1 space-y-7 lg:order-2">
			<p class="text-[11px] uppercase tracking-[0.28em] text-[#2D3A3A]/55">What You'll Find</p>
			<h2 class="text-4xl leading-[0.95] text-[#2D3A3A] sm:text-5xl lg:text-6xl">
				<span class="block text-[#E07A5F]">Cafe &amp; Restaurant</span>
				<span class="block">with fresh, comforting food while little ones keep exploring.</span>
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
