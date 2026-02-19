<script lang="ts">
	import { innerWidth } from 'svelte/reactivity/window';

	export type Segment =
		| { type: 'text'; content: string }
		| { type: 'image'; url: string; alt: string };

	interface Props {
		lines: Segment[][];
		scrollProgress: number;
		class?: string;
	}

	let { lines, scrollProgress, class: className }: Props = $props();

	// Flatten for global indexing of images to maintain staggered reveal across lines
	const allSegments = $derived(lines.flat());
	const imageSegments = $derived(
		allSegments.filter((s): s is Extract<Segment, { type: 'image' }> => s.type === 'image')
	);
	const N = $derived(imageSegments.length);

	/**
	 * Using 'em' units ensures the image height is relative to the text size.
	 * 0.85em matches the "cap height" of most light fonts.
	 * We use fixed height so the line-height never changes during expansion.
	 */
	const EXPANDED_W_EM = 1.6;
	const EXPANDED_H_EM = 0.85;

	function imageProgress(imageIndex: number): number {
		const offset = 0.22;
		const startAt = (imageIndex / (N || 1)) * offset;
		const duration = 0.78;
		return Math.min(1, Math.max(0, (scrollProgress - startAt) / duration));
	}

	function getGlobalImageIndex(lineIdx: number, segIdx: number): number {
		let count = 0;
		for (let i = 0; i < lineIdx; i++) {
			for (const seg of lines[i]) {
				if (seg.type === 'image') count++;
			}
		}
		for (let j = 0; j < segIdx; j++) {
			if (lines[lineIdx][j].type === 'image') count++;
		}
		return count;
	}

	function easeOut(t: number): number {
		return 1 - Math.pow(1 - t, 3);
	}
</script>

<div
	class="flex flex-col items-center text-[clamp(1.4rem,4.8vw,4.2rem)] leading-[1.4] font-light text-[#2D3A3A] {className ?? ''}"
>
	{#each lines as line, lIdx}
		<div class="whitespace-nowrap flex items-baseline justify-center">
			{#each line as segment, sIdx}
				{#if segment.type === 'text'}
					<span class="inline-block">{segment.content}</span>
				{:else}
					{@const imgIdx = getGlobalImageIndex(lIdx, sIdx)}
					{@const p = easeOut(imageProgress(imgIdx))}
					{@const w = p * EXPANDED_W_EM}
					<span
						class="inline-block overflow-hidden mx-[0.1em] relative translate-y-[0.05em]"
						style:width="{w}em"
						style:height="{EXPANDED_H_EM}em"
						style:opacity={p}
						style:border-radius="{0.15}em"
						style:vertical-align="baseline"
					>
						<img
							src={segment.url}
							alt={segment.alt}
							class="w-full h-full object-cover"
							style:transform="scale({1.4 - p * 0.4})"
						/>
					</span>
				{/if}
			{/each}
		</div>
	{/each}
</div>
