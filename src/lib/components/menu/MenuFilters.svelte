<script lang="ts">
	import Icon from '@iconify/svelte';

	interface Props {
		sections: string[];
		activeSection: string;
		onSectionChange?: (section: string) => void;
	}

	let { sections = [], activeSection = 'All', onSectionChange = () => {} }: Props = $props();

	const palette = ['#DFBC69', '#A8C3A0', '#E07A5F', '#8E8FB5', '#C7A4A1', '#9EC5CF'];

	const iconMap: Record<string, string> = {
		All: 'mdi:compass-outline',
		Drinks: 'mdi:cup-water',
		Beverages: 'mdi:glass-mug-variant',
		Beverage: 'mdi:glass-mug-variant',
		Coffee: 'mdi:coffee-outline',
		Breakfast: 'mdi:croissant',
		'Open Toasts': 'mdi:bread-slice-outline',
		Sandwiches: 'mdi:food-hot-dog',
		'Personal Pizzas': 'mdi:pizza',
		Salads: 'mdi:leaf-circle-outline',
		'Drop-In & Play': 'mdi:party-popper',
		'Sweet Treats': 'mdi:candy-outline',
		Dessert: 'mdi:cupcake',
		Sides: 'mdi:chef-hat',
		Lunch: 'mdi:food-outline',
		Dinner: 'mdi:food-steak',
		'Kid’s Menu': 'mdi:human-child'
	};

	const navItems = $derived.by(() => {
		const labels = sections.length ? sections : ['All'];
		return labels.map((label, index) => ({
			label,
			color: palette[index % palette.length],
			shape: (index + 1) % 3,
			icon: iconMap[label] || 'mdi:star-four-points-outline'
		}));
	});

	function selectSection(section: string) {
		if (section === activeSection) return;
		onSectionChange(section);
	}
</script>

<div class="filters">
	<div class="filters__halo"></div>
	<div class="filters__label">Navigate menu</div>
	<div class="filters__chips">
		{#each navItems as item}
			<button
				type="button"
				class="chip {item.label === activeSection ? 'chip--active' : ''}"
				style={`--chip-color: ${item.color};`}
				data-shape={item.shape}
				onclick={() => selectSection(item.label)}
			>
				<span class="chip__accent"></span>
				<Icon icon={item.icon} class="chip__icon" />
				<span class="chip__label">{item.label}</span>
			</button>
		{/each}
	</div>
</div>

<style lang="postcss">
.filters {
	position: sticky;
	top: clamp(1rem, 5vw, 2.5rem);
	z-index: 50;
	display: grid;
	gap: 0.85rem;
	padding: clamp(0.85rem, 2.3vw, 1.35rem) clamp(1rem, 3vw, 1.8rem);
	background: rgba(255, 255, 255, 0.92);
	border-radius: 999px;
	box-shadow: 0 30px 70px -45px rgba(51, 51, 51, 0.55);
	backdrop-filter: blur(12px);
	border: 1px solid rgba(255, 255, 255, 0.75);
	position: sticky;
	overflow: hidden;
}

.filters__halo {
	position: absolute;
	inset: -30%;
	background: radial-gradient(circle at 18% 20%, rgba(223, 188, 105, 0.18), transparent 60%),
		radial-gradient(circle at 78% 80%, rgba(168, 195, 160, 0.28), transparent 65%);
	pointer-events: none;
	z-index: 0;
}

	.filters__label {
		font-size: 0.7rem;
		letter-spacing: 0.35em;
		text-transform: uppercase;
		color: rgba(51, 51, 51, 0.55);
	padding-left: 0.35rem;
	position: relative;
	z-index: 1;
	}

	.filters__chips {
		display: flex;
		gap: 0.5rem;
		overflow-x: auto;
		scrollbar-width: none;
	padding-bottom: 0.35rem;
	position: relative;
	z-index: 1;
	}

	.filters__chips::-webkit-scrollbar {
		display: none;
	}

	.chip {
		appearance: none;
		border: none;
		display: inline-flex;
		align-items: center;
		gap: 0.65rem;
		padding: 0.55rem 1.4rem 0.5rem 1rem;
		border-radius: 999px;
		background: rgba(255, 255, 255, 0.65);
		color: #333;
		font-size: 0.9rem;
		font-weight: 300;
		letter-spacing: 0.03em;
		transition: transform 0.25s ease, background 0.25s ease, color 0.25s ease, box-shadow 0.25s ease;
		box-shadow: 0 12px 28px -24px rgba(51, 51, 51, 0.4);
		cursor: pointer;
	}

	.chip:hover {
		transform: translateY(-3px);
		box-shadow: 0 20px 34px -26px rgba(51, 51, 51, 0.4);
	}

	.chip--active {
		background: linear-gradient(135deg, rgba(51, 51, 51, 0.94), rgba(51, 51, 51, 0.85));
		color: #fff;
		box-shadow: 0 26px 45px -28px rgba(51, 51, 51, 0.55);
	}

	.chip__accent {
		width: 0.65rem;
		height: 0.65rem;
		border-radius: 50%;
		background: var(--chip-color);
		flex-shrink: 0;
		position: relative;
	}

	.chip[data-shape='1'] .chip__accent {
		border-radius: 35% 65% 55% 45% / 45% 40% 60% 55%;
	}

	.chip[data-shape='2'] .chip__accent {
		clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%);
	}

	.chip--active .chip__accent {
		box-shadow: 0 0 0 6px color-mix(in srgb, var(--chip-color) 35%, transparent);
	}

	.chip__icon {
		width: 1.1rem;
		height: 1.1rem;
		opacity: 0.7;
	}

	.chip--active .chip__icon {
		opacity: 1;
	}

	.chip__label {
		white-space: nowrap;
	}

	.chip--active .chip__label {
		font-weight: 400;
		letter-spacing: 0.06em;
	}

	@media (max-width: 640px) {
		.filters {
			padding: 0.85rem 1rem 0.95rem;
		}

		.chip {
			padding: 0.5rem 1.15rem 0.45rem 0.9rem;
			font-size: 0.85rem;
			gap: 0.55rem;
		}
	}
</style>

