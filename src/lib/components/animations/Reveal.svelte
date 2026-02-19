<script lang="ts">
	import { Spring } from 'svelte/motion';
	import { cn } from '$lib/utils';
	import { inview } from '$lib/actions/inview';

	interface Props {
		children?: import('svelte').Snippet;
		direction?: 'up' | 'down' | 'left' | 'right';
		delay?: number;
		duration?: number;
		trigger?: 'scroll' | 'load';
		amount?: number;
		skewX?: number;
		class?: string;
	}

	let {
		children,
		direction = 'up',
		delay = 0,
		duration = 800,
		trigger = 'scroll',
		amount = 40,
		skewX = 3,
		class: className
	}: Props = $props();

	let visible = $state(false);

	// Spring drives a 0→1 progress value with physical feel
	const progress = new Spring(0, { stiffness: 0.06, damping: 0.8 });

	$effect(() => {
		if (visible) {
			// Small delay before triggering spring so it doesn't fire during initial render
			const t = setTimeout(() => {
				progress.target = 1;
			}, delay);
			return () => clearTimeout(t);
		}
	});

	// Map spring progress to transform values
	let translateX = $derived(
		direction === 'left' ? (1 - progress.current) * -amount :
		direction === 'right' ? (1 - progress.current) * amount : 0
	);
	let translateY = $derived(
		direction === 'up' ? (1 - progress.current) * amount :
		direction === 'down' ? (1 - progress.current) * -amount : 0
	);
	let currentSkewX = $derived((1 - progress.current) * skewX);
	let opacity = $derived(progress.current);

	function handleEnter() {
		if (trigger === 'scroll' || trigger === 'load') {
			visible = true;
		}
	}

	// Load trigger fires immediately
	$effect(() => {
		if (trigger === 'load') {
			visible = true;
		}
	});
</script>

<div
	use:inview={{ onEnter: handleEnter, threshold: 0.1 }}
	class={cn('will-change-transform', className)}
	style:opacity={opacity}
	style:transform="translateY({translateY}px) translateX({translateX}px) skewX({currentSkewX}deg)"
>
	{@render children?.()}
</div>
