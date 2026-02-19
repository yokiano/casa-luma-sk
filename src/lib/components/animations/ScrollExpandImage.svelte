<script lang="ts">
	/**
	 * A section that contains an image starting as a centered rectangle.
	 * As the user scrolls through the sticky container, the image expands to full width.
	 * Uses a Spring to smooth the scroll-driven progress for a luxurious, deliberate feel.
	 */
	import { Spring } from 'svelte/motion';
	import { scrollY } from 'svelte/reactivity/window';

	interface Props {
		src: string;
		alt: string;
		/** Content overlaid on the image at full expansion */
		children?: import('svelte').Snippet;
		/** How many viewport heights the scroll section spans (more = slower expansion) */
		scrollLength?: number;
	}

	let { src, alt, children, scrollLength = 1.5 }: Props = $props();

	let sectionEl = $state<HTMLElement>();

	// Raw scroll progress 0→1 as user scrolls through the section
	let rawProgress = $derived.by(() => {
		const el = sectionEl;
		if (!el) return 0;
		const rect = el.getBoundingClientRect();
		const sectionH = rect.height;
		// Progress starts when top of section hits viewport top, ends when bottom exits
		const scrolled = -rect.top;
		return Math.min(1, Math.max(0, scrolled / (sectionH - window.innerHeight)));
	});

	// Spring smooths the raw scroll progress for a buttery feel
	const progressSpring = new Spring(0, { stiffness: 0.06, damping: 0.88 });

	$effect(() => {
		progressSpring.target = rawProgress;
	});

	// Map spring value → visual properties
	let imageWidthPct = $derived(60 + progressSpring.current * 40); // 60% → 100%
	let borderRadius = $derived((1 - progressSpring.current) * 24); // 24px → 0px
	let overlayOpacity = $derived(progressSpring.current * 0.5); // fade in dark overlay
	let contentOpacity = $derived(Math.max(0, (progressSpring.current - 0.6) * 2.5)); // appear near end
	let scale = $derived(1 + progressSpring.current * 0.04); // subtle inner zoom
</script>

<!-- Outer section: tall enough to scroll through -->
<section
	bind:this={sectionEl}
	class="relative"
	style:height="{scrollLength * 100}vh"
>
	<!-- Sticky container holds the visual while user scrolls -->
	<div class="sticky top-0 h-screen flex items-center justify-center overflow-hidden">
		<!-- Expanding image wrapper -->
		<div
			class="relative overflow-hidden will-change-transform"
			style:width="{imageWidthPct}%"
			style:height="70vh"
			style:border-radius="{borderRadius}px"
			style:transition="none"
		>
			<img
				{src}
				{alt}
				class="absolute inset-0 w-full h-full object-cover"
				style:transform="scale({scale})"
			/>

			<!-- Dark overlay that fades in as image expands -->
			<div
				class="absolute inset-0 bg-black pointer-events-none"
				style:opacity={overlayOpacity}
			></div>

			<!-- Slot content: overlaid text, CTAs etc. -->
			{#if children}
				<div
					class="absolute inset-0 flex flex-col items-center justify-center text-white text-center p-8 z-10"
					style:opacity={contentOpacity}
				>
					{@render children()}
				</div>
			{/if}
		</div>
	</div>
</section>
