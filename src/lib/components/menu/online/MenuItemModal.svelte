<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import menuPlaceholder from '$lib/assets/menu/restaurant_menu_placeholder.png';
	import { ChevronLeft, ChevronRight, Clock, Sparkles, Star } from 'lucide-svelte';
	import Icon from '@iconify/svelte';
	import type { MenuItem } from '$lib/types/menu';

	let {
		item,
		open = false,
		onClose = () => {}
	}: { item: MenuItem; open?: boolean; onClose?: () => void } = $props();

	let activeImageIndex = $state(0);

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

	const imageSources = $derived.by(() => {
		const sources = [item.image, ...(item.gallery ?? [])].filter(
			(source): source is string => Boolean(source)
		);
		return sources.length ? [...new Set(sources)] : [menuPlaceholder];
	});

	const currentImage = $derived(imageSources[activeImageIndex] ?? imageSources[0]);
	const isPlaceholder = $derived(!item.image && imageSources.length === 1);
	const displayCurrency = $derived(item.currency || 'THB');

	$effect(() => {
		item.id;
		activeImageIndex = 0;
	});

	function formatPrice(value: number) {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: displayCurrency,
			maximumFractionDigits: value % 1 ? 2 : 0
		}).format(value);
	}

	function showPreviousImage() {
		activeImageIndex = (activeImageIndex - 1 + imageSources.length) % imageSources.length;
	}

	function showNextImage() {
		activeImageIndex = (activeImageIndex + 1) % imageSources.length;
	}
</script>

<Dialog.Root {open} onOpenChange={(value) => !value && onClose()}>
	<Dialog.Content class="max-h-[90vh] max-w-3xl overflow-y-auto rounded-[2rem] border-[#2D3A3A]/10 bg-[#F9F7F2] p-0 text-[#2D3A3A] shadow-2xl">
		<div class="grid sm:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
			<div class="bg-[#E8E4DE] p-4 sm:p-6">
				<div class="relative overflow-hidden rounded-[1.5rem] bg-white shadow-sm">
					<img
						src={currentImage}
						alt={item.name}
						class="aspect-square w-full {isPlaceholder ? 'object-contain p-10 opacity-75' : 'object-cover'}"
					/>

					{#if imageSources.length > 1}
						<button
							type="button"
							class="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-[#2D3A3A] shadow-sm transition hover:bg-white"
							aria-label="Previous image"
							onclick={showPreviousImage}
						>
							<ChevronLeft size={18} />
						</button>
						<button
							type="button"
							class="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-[#2D3A3A] shadow-sm transition hover:bg-white"
							aria-label="Next image"
							onclick={showNextImage}
						>
							<ChevronRight size={18} />
						</button>
					{/if}
				</div>

				{#if imageSources.length > 1}
					<div class="mt-3 flex gap-2 overflow-x-auto pb-1">
						{#each imageSources as image, index}
							<button
								type="button"
								class="h-14 w-14 shrink-0 overflow-hidden rounded-xl border-2 transition {activeImageIndex === index
									? 'border-[#E07A5F]'
									: 'border-transparent opacity-65 hover:opacity-100'}"
								aria-label={`Show image ${index + 1}`}
								onclick={() => (activeImageIndex = index)}
							>
								<img src={image} alt="" class="h-full w-full object-cover" />
							</button>
						{/each}
					</div>
				{/if}
			</div>

			<div class="p-6 sm:p-8">
				<Dialog.Header class="p-0">
					<div class="flex flex-wrap gap-2">
						{#if item.highlight}
							<span class="inline-flex items-center gap-1 rounded-full bg-[#DFBC69]/35 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#2D3A3A]">
								<Star size={13} class="fill-current" />
								Popular
							</span>
						{/if}
						{#if item.recommended}
							<span class="inline-flex items-center gap-1 rounded-full bg-[#A8C3A0]/45 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#2D3A3A]">
								<Sparkles size={13} />
								Recommended
							</span>
						{/if}
					</div>
					<Dialog.Title class="mt-3 font-heading text-3xl font-medium leading-tight tracking-tight sm:text-4xl">
						{item.name}
					</Dialog.Title>
					{#if item.thaiName}
						<p class="mt-1 text-base text-[#2D3A3A]/55">{item.thaiName}</p>
					{/if}
					<Dialog.Description class="sr-only">Details for {item.name}</Dialog.Description>
				</Dialog.Header>

				<div class="mt-5 flex flex-wrap items-baseline gap-x-4 gap-y-1">
					<span class="text-xl font-semibold tabular-nums">{formatPrice(item.price)}</span>
					{#if item.secondaryPrice}
						<span class="text-sm tabular-nums text-[#2D3A3A]/55">or {formatPrice(item.secondaryPrice)}</span>
					{/if}
					<span class="text-xs uppercase tracking-[0.14em] text-[#2D3A3A]/45">{item.category}</span>
				</div>

				{#if item.description || item.thaiDescription}
					<div class="mt-6 space-y-2 text-sm leading-relaxed text-[#2D3A3A]/75">
						{#if item.description}<p>{item.description}</p>{/if}
						{#if item.thaiDescription}<p class="text-[#2D3A3A]/55">{item.thaiDescription}</p>{/if}
					</div>
				{/if}

				<div class="mt-6 space-y-5 border-t border-[#2D3A3A]/10 pt-5">
					{#if item.dietaryTags.length}
						<section>
							<h3 class="text-xs font-semibold uppercase tracking-[0.16em] text-[#2D3A3A]/50">Dietary</h3>
							<div class="mt-2 flex flex-wrap gap-1.5">
								{#each item.dietaryTags as tag}
									<span class="inline-flex items-center gap-1.5 rounded-full bg-[#2D3A3A]/[0.06] px-2.5 py-1 text-xs text-[#2D3A3A]/75">
										{#if dietaryIconMap[tag]}<Icon icon={dietaryIconMap[tag]} class="h-3.5 w-3.5 opacity-75" />{/if}
										{tag}
									</span>
								{/each}
							</div>
						</section>
					{/if}

					{#if item.tags.length}
						<section>
							<h3 class="text-xs font-semibold uppercase tracking-[0.16em] text-[#2D3A3A]/50">Ingredients</h3>
							<p class="mt-2 text-sm text-[#2D3A3A]/70">{item.tags.join(' · ')}</p>
						</section>
					{/if}

					{#if item.allergens.length}
						<section>
							<h3 class="text-xs font-semibold uppercase tracking-[0.16em] text-[#2D3A3A]/50">Allergens</h3>
							<p class="mt-2 text-sm text-[#2D3A3A]/70">Contains {item.allergens.join(', ')}</p>
						</section>
					{/if}

					{#if item.availabilityWindow}
						<p class="inline-flex items-center gap-2 text-sm text-[#2D3A3A]/65">
							<Clock size={15} class="text-[#E07A5F]" />
							Available {item.availabilityWindow.replace('-', ' ')}
						</p>
					{/if}

					{#if item.modifiers?.length}
						<section>
							<h3 class="text-xs font-semibold uppercase tracking-[0.16em] text-[#2D3A3A]/50">Options</h3>
							<div class="mt-2 space-y-3">
								{#each item.modifiers as modifier}
									<div>
										<p class="text-sm font-medium">{modifier.name}</p>
										<div class="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm text-[#2D3A3A]/65">
											{#each modifier.options as option}
												<span>{option.name}{option.price > 0 ? ` (+${formatPrice(option.price)})` : ''}</span>
											{/each}
										</div>
									</div>
								{/each}
							</div>
						</section>
					{/if}
				</div>
			</div>
		</div>
	</Dialog.Content>
</Dialog.Root>
