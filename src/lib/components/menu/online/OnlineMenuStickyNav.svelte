<script lang="ts">
	import Icon from '@iconify/svelte';
	import { Search, X } from 'lucide-svelte';
	import type { DietaryTag } from '$lib/types/menu';

	interface Props {
		grandCategories: string[];
		categories: string[];
		dietaryTags: DietaryTag[];
		activeGrandCategory: string;
		activeCategory: string;
		activeDietaryFilters: Set<DietaryTag>;
		searchQuery: string;
		searchOpen: boolean;
		filteredCount: number;
		totalCount: number;
		onGrandCategoryChange: (name: string) => void;
		onCategoryChange: (name: string) => void;
		onDietaryToggle: (tag: DietaryTag) => void;
		onSearchChange: (value: string) => void;
		onSearchOpenChange: (open: boolean) => void;
	}

	let {
		grandCategories,
		categories,
		dietaryTags,
		activeGrandCategory,
		activeCategory,
		activeDietaryFilters,
		searchQuery,
		searchOpen,
		filteredCount,
		totalCount,
		onGrandCategoryChange,
		onCategoryChange,
		onDietaryToggle,
		onSearchChange,
		onSearchOpenChange
	}: Props = $props();

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

	let searchInput = $state<HTMLInputElement | null>(null);
	let grandNav = $state<HTMLDivElement | null>(null);
	let categoryNav = $state<HTMLDivElement | null>(null);
	const hasActiveFilters = $derived(
		searchQuery.trim().length > 0 || activeDietaryFilters.size > 0
	);

	$effect(() => {
		if (searchOpen && searchInput) {
			searchInput.focus();
		}
	});

	function scrollActivePill(container: HTMLDivElement | null, selector: string) {
		if (!container) return;
		const active = container.querySelector<HTMLElement>(selector);
		active?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
	}

	$effect(() => {
		activeGrandCategory;
		scrollActivePill(grandNav, '[data-grand-active="true"]');
	});

	$effect(() => {
		activeCategory;
		scrollActivePill(categoryNav, '[data-category-active="true"]');
	});

	function openSearch() {
		onSearchOpenChange(true);
	}

	function closeSearch() {
		onSearchChange('');
		onSearchOpenChange(false);
	}

	function clearFilters() {
		onSearchChange('');
		onSearchOpenChange(false);
		for (const tag of activeDietaryFilters) {
			onDietaryToggle(tag);
		}
	}
</script>

<div class="sticky top-20 z-40 border-b border-[#2D3A3A]/8 bg-[#F9F7F2]/95 backdrop-blur-md">
	<div class="mx-auto max-w-3xl px-4 sm:px-6">
		<!-- Search + dietary filters row -->
		<div class="flex items-center gap-2 py-2.5">
			{#if searchOpen}
				<div class="flex min-w-0 flex-1 items-center gap-2 rounded-full border border-[#2D3A3A]/12 bg-white px-3 py-1.5 shadow-sm">
					<Search size={16} class="shrink-0 text-[#2D3A3A]/45" />
					<input
						bind:this={searchInput}
						type="search"
						value={searchQuery}
						placeholder="Search dishes & drinks..."
						class="min-w-0 flex-1 bg-transparent text-sm text-[#2D3A3A] outline-none placeholder:text-[#2D3A3A]/40"
						oninput={(e) => onSearchChange(e.currentTarget.value)}
					/>
					<button
						type="button"
						class="shrink-0 rounded-full p-1 text-[#2D3A3A]/50 transition-colors hover:bg-[#2D3A3A]/5 hover:text-[#2D3A3A]"
						aria-label="Close search"
						onclick={closeSearch}
					>
						<X size={16} />
					</button>
				</div>
			{:else}
				<button
					type="button"
					class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#2D3A3A]/10 bg-white text-[#2D3A3A]/70 shadow-sm transition-colors hover:border-[#E07A5F]/30 hover:text-[#E07A5F]"
					aria-label="Search menu"
					onclick={openSearch}
				>
					<Search size={17} />
				</button>

				<div class="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto scrollbar-none">
					{#each dietaryTags as tag}
						{@const active = activeDietaryFilters.has(tag)}
						<button
							type="button"
							class="inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-all {active
								? 'border-[#2D3A3A] bg-[#2D3A3A] text-white'
								: 'border-[#2D3A3A]/10 bg-white text-[#2D3A3A]/70 hover:border-[#2D3A3A]/20'}"
							onclick={() => onDietaryToggle(tag)}
						>
							{#if dietaryIconMap[tag]}
								<Icon icon={dietaryIconMap[tag]} class="h-3 w-3" />
							{/if}
							{tag}
						</button>
					{/each}
				</div>
			{/if}
		</div>

		{#if hasActiveFilters}
			<div class="flex items-center justify-between gap-3 pb-2 text-[11px] text-[#2D3A3A]/55">
				<span>{filteredCount} of {totalCount} items</span>
				<button
					type="button"
					class="font-medium text-[#E07A5F] transition-colors hover:text-[#2D3A3A]"
					onclick={clearFilters}
				>
					Clear filters
				</button>
			</div>
		{/if}

		<!-- Grand categories -->
		<div bind:this={grandNav} class="flex gap-1 overflow-x-auto border-t border-[#2D3A3A]/6 py-2 scrollbar-none">
			{#each grandCategories as grand}
				{@const active = activeGrandCategory === grand}
				<button
					type="button"
					data-grand-active={active ? 'true' : undefined}
					class="shrink-0 rounded-full px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] transition-all {active
						? 'bg-[#2D3A3A] text-white'
						: 'text-[#2D3A3A]/55 hover:bg-[#2D3A3A]/5 hover:text-[#2D3A3A]'}"
					onclick={() => onGrandCategoryChange(grand)}
				>
					{grand}
				</button>
			{/each}
		</div>

		<!-- Categories within active grand category -->
		<div bind:this={categoryNav} class="flex gap-1.5 overflow-x-auto pb-2.5 pt-0.5 scrollbar-none">
			{#each categories as category}
				{@const active = activeCategory === category}
				<button
					type="button"
					data-category-active={active ? 'true' : undefined}
					class="shrink-0 rounded-full border px-3 py-1 text-[12px] font-medium transition-all {active
						? 'border-[#E07A5F] bg-[#E07A5F]/10 text-[#2D3A3A]'
						: 'border-transparent bg-white/70 text-[#2D3A3A]/65 hover:border-[#2D3A3A]/10 hover:bg-white'}"
					onclick={() => onCategoryChange(category)}
				>
					{category}
				</button>
			{/each}
		</div>
	</div>
</div>

<style>
	.scrollbar-none {
		scrollbar-width: none;
		-ms-overflow-style: none;
	}
	.scrollbar-none::-webkit-scrollbar {
		display: none;
	}
</style>
