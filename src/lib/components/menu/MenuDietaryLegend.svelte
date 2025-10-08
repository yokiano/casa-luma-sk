<script lang="ts">
	import Icon from '@iconify/svelte';

	const legend = [
		{ label: 'Vegetarian', icon: 'mdi:sprout', color: '#A8C3A0' },
		{ label: 'Vegan', icon: 'mdi:leaf', color: '#79A86E' },
		{ label: 'Gluten-Free', icon: 'mdi:wheat-off', color: '#DFBC69' },
		{ label: 'Dairy-Free', icon: 'mdi:glass-mug-variant-off', color: '#E07A5F' },
		{ label: 'Nut-Free', icon: 'mdi:peanut-off', color: '#B5838D' },
		{ label: 'Low-Carb', icon: 'mdi:scale-bathroom', color: '#8DA1B9' }
	];
</script>

<div class="legend">
	{#each legend as item}
		<div class="legend__item">
			<div class="legend__icon" style={`background: ${item.color};`}>
				<Icon icon={item.icon} />
			</div>
			<span>{item.label}</span>
		</div>
	{/each}
</div>

<style lang="postcss">
	.legend {
		display: flex;
		flex-wrap: wrap;
		gap: 1rem;
		justify-content: flex-start;
		align-items: center;
	}

	.legend__item {
		display: inline-flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem 1rem;
		border-radius: 999px;
		background: rgba(255, 255, 255, 0.75);
		box-shadow: 0 20px 40px -30px rgba(51, 51, 51, 0.4);
		font-size: 0.95rem;
		color: rgba(51, 51, 51, 0.7);
		letter-spacing: 0.02em;
	}

	.legend__icon {
		width: 36px;
		height: 36px;
		border-radius: 50%;
		display: grid;
		place-items: center;
		color: #333;
	}

	.legend__icon :global(svg) {
		width: 1.2rem;
		height: 1.2rem;
	}

	@media (max-width: 640px) {
		.legend {
			gap: 0.75rem;
		}

		.legend__item {
			padding: 0.6rem 0.85rem;
			font-size: 0.85rem;
		}

		.legend__icon {
			width: 30px;
			height: 30px;
		}
	}
</style>

