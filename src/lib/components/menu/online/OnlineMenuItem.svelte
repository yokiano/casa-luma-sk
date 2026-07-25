<script lang="ts">
	import Icon from '@iconify/svelte';
	import menuPlaceholder from '$lib/assets/menu/restaurant_menu_placeholder.png';
	import type { MenuItem } from '$lib/types/menu';

	let {
		item,
		accentColor = '#DFBC69',
		onSelect = () => {}
	}: { item: MenuItem; accentColor?: string; onSelect?: (item: MenuItem) => void } = $props();

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

	function handleKeydown(event: KeyboardEvent) {
		if (event.key !== 'Enter' && event.key !== ' ') return;
		event.preventDefault();
		onSelect(item);
	}
</script>

<article
	class="group flex cursor-pointer gap-3.5 py-4 outline-none transition-colors hover:bg-white/45 focus-visible:rounded-2xl focus-visible:bg-white/60 focus-visible:ring-2 focus-visible:ring-[#E07A5F]/50 sm:gap-4 sm:py-5"
	role="button"
	tabindex="0"
	aria-haspopup="dialog"
	aria-label={`View details for ${item.name}`}
	onclick={() => onSelect(item)}
	onkeydown={handleKeydown}
>
	<div
		class="h-[5.4rem] w-[5.4rem] shrink-0 overflow-hidden rounded-2xl bg-[#E8E4DE] sm:h-[7.2rem] sm:w-[7.2rem]"
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
							Popular
						</span>
					{/if}
					{#if item.recommended}
						<span class="mr-1.5 inline-block rounded-full bg-[#A8C3A0]/45 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#2D3A3A]">
							Recommended
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
