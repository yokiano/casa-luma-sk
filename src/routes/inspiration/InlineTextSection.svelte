<script lang="ts">
	import { getWebsiteMediaContext } from '$lib/context/website-media';
	import { scrollY, innerHeight } from 'svelte/reactivity/window';
	import InlineImageText from '$lib/components/animations/InlineImageText.svelte';
	import type { Segment } from '$lib/components/animations/InlineImageText.svelte';
	import { BrandCtrl } from '$lib/utils/brand-controller.svelte';

	const websiteMedia = getWebsiteMediaContext();

	let wrapperEl = $state<HTMLElement | undefined>();

	function computeProgress(vh: number, el: HTMLElement | undefined, sy: number): number {
		if (!el) return 0;
		const rect = el.getBoundingClientRect();
		const stickyDistance = el.offsetHeight - vh;
		if (stickyDistance <= 0) return 0;
		return Math.min(1, Math.max(0, -rect.top / stickyDistance));
	}

	let scrollProgress = $derived(
		computeProgress(innerHeight.current ?? 800, wrapperEl, scrollY.current ?? 0)
	);

	let scaleText = $derived(1 + scrollProgress * 0.03);
	let translateY = $derived(scrollProgress * -25);

	const playgroundColor = BrandCtrl.getColorByIndex(3, { weight: 500 }).value;
	const cafeColor = BrandCtrl.getColorByIndex(1, { weight: 700 }).value;
	const gardenColor = BrandCtrl.getColorByIndex(2, { weight: 600 }).value;

	const fallbackInlineImages = {
		playground: {
			src: 'https://images.unsplash.com/photo-1472162072942-cd5147eb3902?q=80&w=900&auto=format&fit=crop',
			alt: 'Indoor playground'
		},
		cafe: {
			src: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?q=80&w=900&auto=format&fit=crop',
			alt: 'Family cafe'
		},
		nature: {
			src: 'https://images.unsplash.com/photo-1448375240586-882707db888b?q=80&w=900&auto=format&fit=crop',
			alt: 'Garden'
		}
	};

	const lines = $derived.by<Segment[][]>(() => {
		const playgroundImage = websiteMedia.get('home-inline-playground-image');
		const cafeImage = websiteMedia.get('home-inline-cafe-image');
		const natureImage = websiteMedia.get('home-inline-nature-image');

		return [
			[
				{ type: 'text', content: 'Timeless' },
				{ type: 'text', content: 'playground', color: playgroundColor },
				{
					type: 'image',
					url: playgroundImage?.src || fallbackInlineImages.playground.src,
					alt: playgroundImage?.alt || fallbackInlineImages.playground.alt
				},
				{ type: 'text', content: 'experience,' }
			],
			[
				{ type: 'text', content: 'Café', color: cafeColor },
				{
					type: 'image',
					url: cafeImage?.src || fallbackInlineImages.cafe.src,
					alt: cafeImage?.alt || fallbackInlineImages.cafe.alt
				},
				{ type: 'text', content: 'that everyones loves,' }
			],
			[
				{ type: 'text', content: 'a touch of' },
				{ type: 'text', content: 'nature', color: gardenColor },
				{
					type: 'image',
					url: natureImage?.src || fallbackInlineImages.nature.src,
					alt: natureImage?.alt || fallbackInlineImages.nature.alt
				}
			],
			[{ type: 'text', content: 'and more...' }]
		];
	});
</script>

<div bind:this={wrapperEl} class="relative w-full" style="height: 250vh;">
	<section
		class="sticky top-0 h-screen w-full flex flex-col items-center justify-center bg-[#F9F7F2] overflow-hidden px-4 md:px-20"
	>
		<div
			class="absolute -right-12 top-1/2 -translate-y-1/2 text-[35vw] font-light text-[#2D3A3A]/[0.03] pointer-events-none select-none leading-none"
		>
			P
		</div>

		<div
			class="max-w-7xl w-full text-center relative z-10 will-change-transform"
			style:transform="translate3d(0, {translateY}px, 0) scale({scaleText})"
		>
			<InlineImageText {lines} {scrollProgress} imageStagger={0.28} />

			<div
				class="mt-20 transition-all duration-1000"
				style:opacity={scrollProgress > 0.88 ? 1 : 0}
				style:transform="translateY({scrollProgress > 0.88 ? 0 : 20}px)"
			>
				<p class="text-[10px] md:text-xs text-[#2D3A3A]/40 font-sans tracking-[0.5em] uppercase">
					Designed for everyday family moments
				</p>
			</div>
		</div>
	</section>
</div>

<style>
	:global(body) {
		overflow-x: hidden;
	}
</style>
