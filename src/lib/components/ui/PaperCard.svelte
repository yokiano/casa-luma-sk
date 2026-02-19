<script lang="ts">
	/**
	 * PaperCard — wraps content in a warm craft-paper aesthetic.
	 * Uses a SVG feTurbulence noise filter as a background overlay to achieve
	 * a subtle 3D grain/texture feel, evoking paper bags and espresso cups.
	 */
	import { BrandCtrl } from '$lib/utils/brand-controller.svelte';

	interface Props {
		children?: import('svelte').Snippet;
		/** Brand color value (hex). Defaults to warm Yellow (#dfbc69). */
		color?: string;
		/** Additional classes for the wrapper */
		class?: string;
		/** Padding preset */
		padding?: 'sm' | 'md' | 'lg';
	}

	let {
		children,
		color = BrandCtrl.getColorByIndex(1).value, // Yellow (#dfbc69)
		class: className,
		padding = 'md'
	}: Props = $props();

	const paddingMap = {
		sm: '1.25rem',
		md: '2rem',
		lg: '3rem'
	};

	// SVG feTurbulence encoded as a data URL — no external file needed
	// Two layers: one fine grain (high frequency) and one coarser paper fiber feel
	const grainSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400">
  <filter id="grain" x="0%" y="0%" width="100%" height="100%" color-interpolation-filters="sRGB">
    <feTurbulence type="fractalNoise" baseFrequency="0.72" numOctaves="4" seed="3" stitchTiles="stitch" result="noise"/>
    <feColorMatrix type="saturate" values="0" in="noise" result="grayNoise"/>
    <feBlend in="SourceGraphic" in2="grayNoise" mode="multiply" result="blended"/>
    <feComponentTransfer in="blended">
      <feFuncR type="linear" slope="0.92" intercept="0.05"/>
      <feFuncG type="linear" slope="0.90" intercept="0.04"/>
      <feFuncB type="linear" slope="0.85" intercept="0.03"/>
    </feComponentTransfer>
  </filter>
  <rect width="400" height="400" filter="url(#grain)" opacity="0.18"/>
</svg>`;

	const grainUrl = `data:image/svg+xml;base64,${btoa(grainSvg)}`;

	// Subtle gradient to simulate slight curvature/depth (lighter top-left, darker bottom-right)
	const depthGradient = `radial-gradient(ellipse at 20% 20%, rgba(255,255,255,0.18) 0%, rgba(0,0,0,0.08) 100%)`;
</script>

<div
	class="relative overflow-hidden {className ?? ''}"
	style:background-color={color}
	style:padding={paddingMap[padding]}
>
	<!-- Depth gradient overlay for subtle 3D lighting feel -->
	<div
		class="absolute inset-0 pointer-events-none"
		style:background={depthGradient}
		style:z-index="1"
	></div>

	<!-- Grain texture overlay -->
	<div
		class="absolute inset-0 pointer-events-none"
		style:background-image="url('{grainUrl}')"
		style:background-size="300px 300px"
		style:background-repeat="repeat"
		style:mix-blend-mode="multiply"
		style:opacity="0.55"
		style:z-index="2"
	></div>

	<!-- Content sits above overlays -->
	<div class="relative" style:z-index="3">
		{@render children?.()}
	</div>
</div>
