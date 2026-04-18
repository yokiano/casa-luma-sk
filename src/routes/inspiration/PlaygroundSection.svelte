<script lang="ts">
	import Reveal from '$lib/components/animations/Reveal.svelte';
	import WebsiteMediaImage from '$lib/components/media/WebsiteMediaImage.svelte';
	import { getWebsiteMediaContext } from '$lib/context/website-media';
	import { ArrowRight } from 'lucide-svelte';

	const websiteMedia = getWebsiteMediaContext();
	const hasImage = $derived(websiteMedia.has('home-playground-image'));
</script>

<section class="bg-background px-6 py-24 sm:px-10 lg:px-20">
	<div class="mx-auto grid w-full max-w-7xl items-center gap-14 lg:grid-cols-[1.05fr_1fr]">
		<Reveal direction="left" skewX={1.2} class="space-y-7">
			<p class="text-[11px] uppercase tracking-[0.28em] text-foreground/55">What You'll Find</p>
			<h2 class="text-4xl leading-[0.95] text-foreground sm:text-5xl lg:text-6xl">
				<span class="block text-accent">Indoor Playground</span>
				<span class="block">made for movement, wonder, and confidence.</span>
			</h2>
			<p class="max-w-xl text-base leading-relaxed text-foreground/70 sm:text-lg">
				Three distinct rooms - Main Hall, Game Room, and Art Room - so every child can find their
				own way to play.
			</p>
			<a
				href="/open-play"
				class="inline-flex items-center gap-3 border-b border-foreground/35 pb-1 text-xs uppercase tracking-[0.2em] text-foreground transition-all hover:border-accent hover:text-accent"
			>
				Explore open play
				<ArrowRight size={14} />
			</a>
		</Reveal>

		<Reveal direction="up" delay={120} class="relative h-[24rem] overflow-hidden shadow-[0_20px_50px_foreground/18] sm:h-[28rem]">
			{#if hasImage}
				<div class="absolute inset-0 bg-gradient-to-t from-foreground/20 via-transparent to-transparent"></div>
				<WebsiteMediaImage slug="home-playground-image" class="h-full w-full" imageClass="rounded-xl h-full w-full object-cover" />
			{:else}
				<div class="flex h-full w-full items-center justify-center bg-[linear-gradient(135deg,#dfe8d7,#f5ecda_58%,#f1d7c9)] px-8 text-center text-sm uppercase tracking-[0.25em] text-foreground/55">
					Upload `home-playground-image`
				</div>4
			{/if}
		</Reveal>
	</div>
</section>
