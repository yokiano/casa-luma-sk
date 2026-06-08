<script lang="ts">
	import Icon from '@iconify/svelte';
	import menuPlaceholder from '$lib/assets/menu/restaurant_menu_placeholder.png';
	import type { MenuItem } from '$lib/types/menu';

	let { item, accentColor = '#DFBC69' }: { item: MenuItem; accentColor?: string } = $props();

	const dietaryIconMap: Record<string, string> = {
		Vegan: 'mdi:leaf',
		Vegetarian: 'mdi:sprout',
		'Vegan Option': 'mdi:leaf-circle',
		'Gluten-Free': 'mdi:wheat-off',
		'Dairy-Free': 'mdi:glass-mug-variant-off',
		'Nut-Free': 'mdi:peanut-off',
		'Kid-Friendly': 'mdi:human-child',
		Keto: 'mdi:fire-circle',
		Paleo: 'mdi:corn-off',
		'Low-Carb': 'mdi:scale-bathroom'
	};

	const displayCurrency = item.currency || 'THB';
	const priceFormatter = new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: displayCurrency,
		signDisplay: 'auto',
		maximumFractionDigits: item.price % 1 ? 2 : 0
	});
	const formatPrice = (value: number) => priceFormatter.format(value);
	const imageSrc = $derived(item.image || menuPlaceholder);
	const isPlaceholder = $derived(!item.image);
</script>

<article class="group flex gap-3.5 py-4 sm:gap-4 sm:py-5">
	<div
		class="h-[4.5rem] w-[4.5rem] shrink-0 overflow-hidden rounded-2xl bg-[#E8E4DE] sm:h-24 sm:w-24"
		style={isPlaceholder ? undefined : `box-shadow: inset 0 0 0 1px color-mix(in srgb, ${accentColor} 25%, transparent);`}
	>
		<img
			src={imageSrc}
			alt=""
			class="h-full w-full {isPlaceholder ? 'object-contain p-2 opacity-80' : 'object-cover'}"
			loading="lazy"
		/>
	</div>

	<div class="min-w-0 flex-1">
		<div class="flex items-start justify-between gap-3">
			<div class="min-w-0 space-y-1">
				<h3 class="text-[15px] font-medium leading-snug text-[#2D3A3A] sm:text-base">
					{#if item.highlight}
						<span
							class="mr-1.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#2D3A3A]"
							style={`background: color-mix(in srgb, ${accentColor} 35%, white);`}
						>
							Pick
						</span>
					{/if}
					{item.name}
				</h3>
				{#if item.description}
					<p class="line-clamp-2 text-[13px] leading-relaxed text-[#2D3A3A]/65 sm:text-sm">
						{item.description}
					</p>
				{/if}
			</div>

			<div class="shrink-0 text-right">
				<p class="text-[15px] font-semibold tabular-nums text-[#2D3A3A] sm:text-base">
					{formatPrice(item.price)}
				</p>
				{#if item.secondaryPrice}
					<p class="text-[11px] tabular-nums text-[#2D3A3A]/55 sm:text-xs">
						{formatPrice(item.secondaryPrice)}
					</p>
				{/if}
			</div>
		</div>

		{#if item.dietaryTags.length || item.allergens.length}
			<div class="mt-2 flex flex-wrap items-center gap-1.5">
				{#each item.dietaryTags as tag}
					<span
						class="inline-flex items-center gap-1 rounded-full bg-[#2D3A3A]/[0.06] px-2 py-0.5 text-[11px] text-[#2D3A3A]/75"
					>
						{#if dietaryIconMap[tag]}
							<Icon icon={dietaryIconMap[tag]} class="h-3 w-3 opacity-70" />
						{/if}
						{tag}
					</span>
				{/each}
				{#if item.allergens.length}
					<span class="text-[11px] text-[#2D3A3A]/45">
						Contains {item.allergens.join(', ')}
					</span>
				{/if}
			</div>
		{/if}
	</div>
</article>
