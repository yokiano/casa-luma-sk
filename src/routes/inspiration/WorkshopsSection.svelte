<script lang="ts">
	import Reveal from '$lib/components/animations/Reveal.svelte';
	import WebsiteMediaImage from '$lib/components/media/WebsiteMediaImage.svelte';
	import { getWebsiteMediaContext } from '$lib/context/website-media';
	import { ArrowRight } from 'lucide-svelte';

	const websiteMedia = getWebsiteMediaContext();
	const hasImage = $derived(websiteMedia.has('home-birthday-image'));
</script>

<section class="bg-[#F9F7F2] px-8 py-32 md:px-24">
	<div class="mx-auto flex w-full max-w-7xl flex-col items-center justify-between gap-16 md:flex-row">
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

	<Reveal direction="up" delay={150} class="w-full md:w-5/12">
		<div class="relative h-[520px] overflow-hidden rounded-[2rem] border border-[#2D3A3A]/8 bg-white shadow-[0_24px_60px_rgb(45_58_58_/_0.16)]">
			{#if hasImage}
				<WebsiteMediaImage slug="home-birthday-image" class="h-full w-full bg-[#F7F0E6]" imageClass="h-full w-full object-contain" showPagination={false} />
			{:else}
				<div class="flex h-full w-full items-center justify-center bg-[linear-gradient(160deg,#dbe4d2,#f7efe3_60%,#e6c9ba)] px-8 text-center text-sm uppercase tracking-[0.25em] text-[#2D3A3A]/55">
					Upload `home-birthday-image`
				</div>
			{/if}
			<div class="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#2D3A3A]/8 to-transparent"></div>
		</div>

		<div
			class="mx-auto mt-6 w-fit rounded-full bg-white/90 px-5 py-2 text-xs font-sans tracking-widest uppercase text-[#2D3A3A] shadow-lg"
		>
			Private events
		</div>
	</Reveal>
	</div>
</section>
