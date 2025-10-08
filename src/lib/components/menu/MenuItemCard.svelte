<script lang="ts">
	import Icon from '@iconify/svelte';
import type { MenuItem } from '$lib/types/menu';

let { item, accentColor = '#dfbc69', index = 0 }: { item: MenuItem; accentColor?: string; index?: number } = $props();

	const fallbackImages: Record<string, string> = {
		Beverage: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&q=80',
		Breakfast: 'https://images.unsplash.com/photo-1517586979033-4e4eb5695d43?w=800&q=80',
		Dessert: 'https://images.unsplash.com/photo-1541167760496-1628856ab772?w=800&q=80',
		Sides: 'https://images.unsplash.com/photo-1502998070258-dc1338445ac2?w=800&q=80',
		Appetizer: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80',
		Lunch: 'https://images.unsplash.com/photo-1498654896293-37aacf113fd9?w=800&q=80',
		Dinner: 'https://images.unsplash.com/photo-1484723091739-30a097e8f929?w=800&q=80',
		Default: 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=800&q=80'
	};

	const dietaryIconMap: Record<string, string> = {
		Vegan: 'mdi:leaf',
		Vegetarian: 'mdi:sprout',
		'Gluten-Free': 'mdi:wheat-off',
		'Dairy-Free': 'mdi:glass-mug-variant-off',
		'Nut-Free': 'mdi:peanut-off',
		'Kid-Friendly': 'mdi:human-child',
		Keto: 'mdi:fire-circle',
		Paleo: 'mdi:corn-off',
		'Low-Carb': 'mdi:scale-bathroom'
	};

const accentPalette = ['#DFBC69', '#A8C3A0', '#E07A5F', '#8E8FB5', '#C7A4A1'];

const accent = $derived(accentColor || accentPalette[index % accentPalette.length]);

const itemImage = item.image || fallbackImages[item.category] || fallbackImages.Default;

const displayCurrency = item.currency || 'THB';

const priceFormatter = new Intl.NumberFormat('en-US', {
	style: 'currency',
	currency: displayCurrency,
	signDisplay: 'auto',
	maximumFractionDigits: item.price % 1 ? 2 : 0
});

const formatPrice = (value: number) => priceFormatter.format(value);
</script>

<article class="card {item.highlight ? 'card--highlight' : ''}">
	<div class="card__media">
		<div class="card__image" style={`background-image: url(${itemImage});`}>
			<div class="card__overlay"></div>
			<div class="card__price" style={`--accent:${accent};`}>
				<span class="card__price-primary">{formatPrice(item.price)}</span>
				{#if item.secondaryPrice}
					<span class="card__price-secondary">
						{formatPrice(item.secondaryPrice)}
					</span>
				{/if}
			</div>
		</div>
	</div>

	<div class="card__content">
		<header class="card__header">
			<div class="card__category" style={`color: ${accent};`}>
				{item.category}
				{#if item.tags.length}
					<span class="card__divider">•</span>
					{item.tags.join(' · ')}
				{/if}
			</div>
			<h3>{item.name}</h3>
		</header>

		{#if item.description}
			<p class="card__description">{item.description}</p>
		{/if}

		{#if item.dietaryTags.length || item.allergens.length}
			<div class="card__meta">
				{#if item.dietaryTags.length}
					<ul class="card__dietary">
						{#each item.dietaryTags as tag}
							<li>
								{#if dietaryIconMap[tag]}
									<Icon icon={dietaryIconMap[tag]} class="card__icon" />
								{/if}
								{tag}
							</li>
						{/each}
					</ul>
				{/if}
				{#if item.allergens.length}
					<div class="card__allergens">
						<span class="card__allergens-label">Contains</span>
						<span class="card__allergens-values">{item.allergens.join(', ')}</span>
					</div>
				{/if}
			</div>
		{/if}
	</div>
</article>

<style lang="postcss">
		.card {
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
		gap: 2rem;
		padding: 2rem;
		background: rgba(255, 255, 255, 0.8);
		border-radius: 36px;
		position: relative;
		box-shadow: 0 40px 80px -60px rgba(51, 51, 51, 0.5);
		backdrop-filter: blur(10px);
		transition: transform 0.3s ease, box-shadow 0.3s ease;
	}

	.card::after {
		content: '';
		position: absolute;
		inset: 0;
		border-radius: 36px;
		border: 1px solid rgba(255, 255, 255, 0.55);
		pointer-events: none;
	}

	.card:hover {
		transform: translateY(-8px);
		box-shadow: 0 50px 90px -55px rgba(51, 51, 51, 0.45);
	}

	.card--highlight {
		background: linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(232, 210, 188, 0.75));
		box-shadow: 0 60px 110px -70px rgba(208, 150, 87, 0.55);
	}

	.card__media {
		position: relative;
	}

	.card__image {
		position: relative;
		padding-top: 75%;
		border-radius: 30px;
		overflow: hidden;
		background-size: cover;
		background-position: center;
	}

	.card__overlay {
		position: absolute;
		inset: 0;
		background: linear-gradient(135deg, rgba(0, 0, 0, 0.15), rgba(0, 0, 0, 0));
	}

	.card__price {
		position: absolute;
		bottom: 1.35rem;
		right: clamp(1rem, 3vw, 1.75rem);
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 0.25rem;
		padding: 0.85rem 1.4rem;
		color: #333;
		background: #fff;
		border-radius: 18px;
		box-shadow: 0 18px 28px -20px rgba(51, 51, 51, 0.38);
		transform: rotate(-2.5deg);
	}

	.card__price::before {
		content: '';
		position: absolute;
		inset: -3px;
		border-radius: 20px;
		background: linear-gradient(135deg, color-mix(in srgb, var(--accent) 55%, transparent), transparent 65%);
		z-index: -1;
	}

	.card__price-primary {
		font-size: 1.35rem;
		letter-spacing: 0.08em;
		font-weight: 400;
	}

	.card__price-secondary {
		font-size: 0.85rem;
		opacity: 0.78;
		letter-spacing: 0.05em;
	}

	.card__content {
		display: grid;
		gap: 1.25rem;
	}

	.card__header {
		display: grid;
		gap: 0.75rem;
	}

	.card__category {
		font-size: 0.85rem;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		font-weight: 500;
		opacity: 0.7;
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
	}

	.card__divider {
		opacity: 0.6;
	}

	.card h3 {
		font-size: clamp(1.8rem, 5vw, 2.6rem);
		font-weight: 300;
		letter-spacing: -0.01em;
		color: #333;
	}

	.card__description {
		font-size: 1rem;
		line-height: 1.8;
		color: rgba(51, 51, 51, 0.8);
	}

	.card__meta {
		display: flex;
		flex-wrap: wrap;
		gap: 1rem;
		align-items: center;
	}

	.card__dietary {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.card__dietary li {
		padding: 0.4rem 0.75rem;
		border-radius: 999px;
		background: rgba(51, 51, 51, 0.08);
		font-size: 0.85rem;
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		text-transform: capitalize;
	}

	.card__icon {
		width: 16px;
		height: 16px;
	}

	.card__allergens {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		align-items: baseline;
		font-size: 0.85rem;
		color: rgba(51, 51, 51, 0.65);
	}

	.card__allergens-label {
		text-transform: uppercase;
		letter-spacing: 0.2em;
	}

	.card__allergens-values {
		font-weight: 300;
	}

	@media (max-width: 1024px) {
		.card {
			grid-template-columns: 1fr;
		}

		.card__image {
			padding-top: 60%;
		}
	}

	@media (max-width: 640px) {
		.card {
			padding: 1.5rem;
			gap: 1.5rem;
		}

		.card__category {
			font-size: 0.75rem;
			letter-spacing: 0.15em;
		}

		.card__dietary li {
			font-size: 0.75rem;
		}

		.card__price {
			padding: 0.7rem 1.1rem;
		}
	}
</style>

