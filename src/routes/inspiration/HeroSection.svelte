<script lang="ts">
	import { getWebsiteMediaContext } from '$lib/context/website-media';
	import WebsiteMediaImage from '$lib/components/media/WebsiteMediaImage.svelte';
	import { scrollY } from 'svelte/reactivity/window';

	const websiteMedia = getWebsiteMediaContext();
	const heroImage = $derived(websiteMedia.get('home-page-hero-image'));

	// Derived parallax values using reactive scrollY
	let heroParallax = $derived((scrollY.current ?? 0) * 0.5);
	let heroOpacity = $derived(Math.max(0, 1 - (scrollY.current ?? 0) / 600));
	let shapeRotate = $derived((scrollY.current ?? 0) * 0.1);
	let shapeY = $derived((scrollY.current ?? 0) * -0.2);
	let scrollIndicatorH = $derived(Math.max(0, 64 - (scrollY.current ?? 0) * 0.3));

	const fallbackHeroImage = {
		src: 'https://images.unsplash.com/photo-1544776193-352d25ca82cd?q=80&w=800&auto=format&fit=crop',
		alt: 'Child in natural play space'
	};

	const heroImageSrc = $derived(heroImage?.src || fallbackHeroImage.src);
	const heroImageAlt = $derived(heroImage?.alt || fallbackHeroImage.alt);
</script>

<section class="relative h-screen flex flex-col items-center justify-center overflow-hidden">
	<!-- Ambient floating blobs -->
	<div class="absolute inset-0 pointer-events-none z-0" style:transform="translateY({shapeY}px)">
		<div
			class="absolute top-1/4 left-1/5 w-64 h-64 rounded-full bg-accent/15 blur-3xl"
			style:transform="rotate({shapeRotate}deg)"
		></div>
		<div
			class="absolute top-1/3 right-1/4 w-48 h-48 rounded-full bg-primary/20 blur-2xl"
			style:transform="rotate({-shapeRotate * 0.7}deg)"
		></div>
		<div
			class="absolute bottom-1/4 left-1/3 w-80 h-56 bg-secondary/15 blur-3xl"
			style:transform="rotate({shapeRotate * 0.5}deg)"
			style:border-radius="40% 60% 60% 40% / 40% 40% 60% 60%"
		></div>
	</div>

	<!-- Big type behind the image -->
	<div
		class="relative z-10 text-center will-change-transform pointer-events-none select-none"
		style:opacity={heroOpacity}
		style:transform="translateY({heroParallax}px)"
	>
		<h1 class="text-[13vw] leading-[0.82] tracking-tighter text-foreground font-light">
			<span class="block">NATURAL</span>
			<span class="block italic text-accent" style="font-variation-settings: 'ital' 1">PLAY</span>
			<span class="block">IN HARMONY</span>
		</h1>
	</div>

	<!-- Floating center image — rotates and floats upward as you scroll -->
	<div
		class="absolute z-20 w-56 h-72 md:w-72 md:h-96 overflow-hidden shadow-2xl will-change-transform"
		style:top="42%"
		style:border-radius="40% 60% 55% 45% / 45% 45% 55% 55%"
		style:transform="translateY({(scrollY.current ?? 0) * -0.38}px) rotate({(scrollY.current ?? 0) * 0.04}deg)"
	>
		{#if heroImage}
			<WebsiteMediaImage slug="home-page-hero-image" alt={heroImageAlt} class="h-full w-full" imageClass="w-full h-full object-cover" showPagination={false} />
		{:else}
			<img src={heroImageSrc} alt={heroImageAlt} class="w-full h-full object-cover" />
		{/if}
	</div>

	<!-- Scroll indicator — shrinks as user scrolls down -->
	<div class="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-60">
		<span class="text-[10px] tracking-[0.25em] uppercase text-foreground font-sans">Scroll</span>
		<div
			class="w-[1px] bg-foreground transition-none"
			style:height="{scrollIndicatorH}px"
		></div>
	</div>
</section>
