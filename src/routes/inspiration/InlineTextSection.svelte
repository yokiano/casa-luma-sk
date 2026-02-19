<script lang="ts">
	import { scrollY, innerHeight } from 'svelte/reactivity/window';
	import InlineImageText from '$lib/components/animations/InlineImageText.svelte';
	import type { Segment } from '$lib/components/animations/InlineImageText.svelte';

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

	// Structured into fixed rows to prevent dynamic line breaks
	const lines: Segment[][] = [
		[
			{ type: 'text', content: 'With our' },
			{
				type: 'image',
				url: 'https://images.unsplash.com/photo-1544776193-352d25ca82cd?q=80&w=800&auto=format&fit=crop',
				alt: 'Open Play Space'
			},
			{ type: 'text', content: 'open play space,' }
		],
		[{ type: 'text', content: 'we nurture everything that makes' }],
		[
			{
				type: 'image',
				url: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?q=80&w=800&auto=format&fit=crop',
				alt: 'Childhood moments'
			},
			{ type: 'text', content: 'childhood exceptional.' }
		]
	];
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
			<InlineImageText {lines} {scrollProgress} />

			<div
				class="mt-20 transition-all duration-1000"
				style:opacity={scrollProgress > 0.88 ? 1 : 0}
				style:transform="translateY({scrollProgress > 0.88 ? 0 : 20}px)"
			>
				<p class="text-[10px] md:text-xs text-[#2D3A3A]/40 font-sans tracking-[0.5em] uppercase">
					Growing together &mdash; since 2024
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
