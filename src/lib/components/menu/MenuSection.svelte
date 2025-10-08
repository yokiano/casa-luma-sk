<script lang="ts">
	import MenuItemCard from './MenuItemCard.svelte';
	import type { StructuredMenuSection } from '$lib/types/menu';

let { section, accentFallback = '#A8C3A0' }: { section: StructuredMenuSection; accentFallback?: string } = $props();

const accentColor = section.accentColor || accentFallback;
const visibleItems = $derived(section.items.filter((item) => item.isAvailable));
</script>

<section class="section" style={`--accent: ${accentColor};`}>
	<div class="section__header">
		<h2>{section.name}</h2>
		{#if section.intro}
			<p class="section__intro">{section.intro}</p>
		{/if}
	</div>

{#if visibleItems.length === 0}
		<div class="section__empty">
		<span>Currently resting. New dishes coming soon.</span>
		</div>
	{:else}
		<div class="section__grid">
			{#each visibleItems as item, index}
				<MenuItemCard {item} accentColor={accentColor} index={index} />
			{/each}
		</div>
	{/if}
</section>

<style lang="postcss">
	.section {
		position: relative;
		display: grid;
		gap: 2.5rem;
		padding: clamp(3rem, 6vw, 4.2rem) clamp(1rem, 3vw, 3rem);
		background: rgba(255, 255, 255, 0.82);
		border-radius: 42px;
		box-shadow: 0 45px 90px -60px rgba(51, 51, 51, 0.45);
		border: 1px solid rgba(255, 255, 255, 0.55);
		overflow: hidden;
	}

	.section::before {
		content: '';
		position: absolute;
		top: 10%;
		right: -6%;
		width: clamp(220px, 32vw, 360px);
		height: clamp(220px, 32vw, 360px);
		background: radial-gradient(circle at top right, color-mix(in srgb, var(--accent) 35%, transparent) 0%, transparent 70%);
		filter: blur(0.5px);
		z-index: 0;
	}

	.section::after {
		content: '';
		position: absolute;
		bottom: -18%;
		left: -10%;
		width: clamp(260px, 38vw, 400px);
		height: clamp(260px, 38vw, 400px);
		background: radial-gradient(circle at bottom left, color-mix(in srgb, var(--accent) 20%, rgba(255, 255, 255, 0.6)), transparent 68%);
		filter: blur(1px);
		opacity: 0.8;
		z-index: 0;
	}

	.section__header {
		position: relative;
		z-index: 1;
		display: grid;
		gap: 1.25rem;
	}

	.section__header h2 {
		font-size: clamp(2.2rem, 5vw, 3.4rem);
		font-weight: 300;
		letter-spacing: -0.02em;
		color: #333;
	}

	.section__intro {
		font-size: 1.1rem;
		color: rgba(51, 51, 51, 0.7);
		max-width: 48ch;
		line-height: 1.8;
	}

	.section__grid {
		display: grid;
		gap: 2rem;
		position: relative;
		z-index: 1;
	}

	.section__empty {
		padding: 2.5rem;
		border-radius: 32px;
		background: rgba(51, 51, 51, 0.04);
		color: rgba(51, 51, 51, 0.6);
		font-size: 1rem;
		text-align: center;
	}

	@media (max-width: 640px) {
		.section {
			padding: 2.5rem 1.25rem;
		}

		.section__intro {
			font-size: 1rem;
		}
	}
</style>

