<script lang="ts">
	import Reveal from '$lib/components/animations/Reveal.svelte';
	import WebsiteMediaImage from '$lib/components/media/WebsiteMediaImage.svelte';
	import { getWebsiteMediaContext } from '$lib/context/website-media';
	import { ArrowRight } from 'lucide-svelte';
	import { scrollY } from 'svelte/reactivity/window';

	const websiteMedia = getWebsiteMediaContext();
	const hasImage = $derived(websiteMedia.has('home-celebration-image'));
	const fallbackImage = 'https://images.unsplash.com/photo-1530103862676-de3c9a59af38?q=80&w=1600&auto=format&fit=crop';
	const imageY = $derived((scrollY.current ?? 0) * -0.08);
</script>

<section class="relative isolate overflow-hidden bg-[#2D3A3A] px-6 py-28 sm:px-10 lg:px-20">
	<div class="absolute inset-0">
		{#if hasImage}
			<div class="absolute inset-0" style:transform="translateY({imageY}px)">
				<WebsiteMediaImage slug="home-celebration-image" class="h-[115%] w-full" imageClass="h-full w-full object-cover" />
			</div>
		{:else}
			<img src={fallbackImage} alt="Birthday celebration at Casa Luma" class="absolute inset-0 h-full w-full object-cover" style:transform="translateY({imageY}px) scale(1.04)" />
		{/if}
		<div class="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,23,0.2),rgba(15,23,23,0.62)_55%,rgba(15,23,23,0.82))]"></div>
	</div>

	<div class="relative z-10 mx-auto flex min-h-[70vh] max-w-6xl flex-col items-center justify-center text-center text-white">
		<Reveal direction="up" delay={0} skewX={0}>
			<h2 class="text-5xl md:text-9xl font-serif uppercase tracking-tighter text-white drop-shadow-lg">
				Celebrate
			</h2>
		</Reveal>
		<Reveal direction="up" delay={120} skewX={0}>
			<p class="mt-6 max-w-2xl text-lg font-light tracking-[0.14em] text-white/90 md:text-2xl">
				Magical birthday moments crafted for your little ones.
			</p>
		</Reveal>
		<Reveal direction="up" delay={240} skewX={0}>
			<a
				href="/birthdays"
				class="mt-10 inline-flex items-center gap-4 rounded-full border border-white/80 px-8 py-4 text-sm uppercase tracking-widest text-white transition-colors duration-300 hover:bg-white hover:text-[#2D3A3A]"
			>
				Plan a Party <ArrowRight size={16} />
			</a>
		</Reveal>
	</div>
</section>
