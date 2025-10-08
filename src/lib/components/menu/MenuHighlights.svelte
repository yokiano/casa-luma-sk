<script lang="ts">
	import MenuItemCard from './MenuItemCard.svelte';
	import type { MenuItem } from '$lib/types/menu';

	let { items = [] as MenuItem[] }: { items: MenuItem[] } = $props();
	const accentPalette = ['#DFBC69', '#A8C3A0', '#E07A5F'];
</script>

{#if items.length}
	<section class="highlights">
		<div class="highlights__header">
			<span class="highlights__eyebrow">Signature Picks</span>
			<h2>House Favorites</h2>
			<p>Thoughtfully crafted plates that capture our island story on every visit.</p>
		</div>
		<div class="highlights__grid">
			{#each items as item, index}
				<MenuItemCard item={item} accentColor={accentPalette[index % accentPalette.length]} />
			{/each}
		</div>
	</section>
{/if}

<style lang="postcss">
	.highlights {
		position: relative;
		display: grid;
		gap: 3rem;
		padding: clamp(2.5rem, 6vw, 5rem);
		background: radial-gradient(circle at top left, rgba(223, 188, 105, 0.18), transparent 45%),
			rgba(255, 255, 255, 0.92);
		border-radius: 48px;
		box-shadow: 0 60px 120px -80px rgba(51, 51, 51, 0.5);
	}

	.highlights::after {
		content: '';
		position: absolute;
		bottom: -6%;
		left: 10%;
		width: 45%;
		height: 30%;
		background: radial-gradient(circle, rgba(160, 192, 160, 0.35), transparent 70%);
		filter: blur(40px);
		z-index: 0;
	}

	.highlights__header {
		position: relative;
		z-index: 1;
		display: grid;
		gap: 1rem;
		max-width: 56ch;
	}

	.highlights__eyebrow {
		font-size: 0.8rem;
		letter-spacing: 0.4em;
		text-transform: uppercase;
		color: rgba(51, 51, 51, 0.6);
	}

	.highlights__header h2 {
		font-size: clamp(2.6rem, 6vw, 3.6rem);
		font-weight: 300;
		letter-spacing: -0.02em;
		color: #333;
	}

	.highlights__header p {
		font-size: 1.1rem;
		line-height: 1.9;
		color: rgba(51, 51, 51, 0.68);
	}

	.highlights__grid {
		position: relative;
		z-index: 1;
		display: grid;
		gap: 2.5rem;
	}

	@media (max-width: 640px) {
		.highlights {
			padding: 2.5rem 1.5rem;
		}
	}
</style>

