<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { toast } from 'svelte-sonner';
	import { LoaderCircle } from 'lucide-svelte';
	import type { PageData } from './$types';
	import InstructionBlock from './InstructionBlock.svelte';
	import { getRecipeDetail, getRecipeMenuIndex, translateRecipeInstructions, updateRecipeInstructions } from '$lib/tools/recipes/recipes.remote';
	import type { MenuGrandCategoryGroup, MenuItemSummary, RecipeDetail } from '$lib/tools/recipes/recipes.types';

	let { data }: { data: PageData } = $props();
	let search = $state('');
	let activeGrandCategory = $state('All');
	let activeCategoryKey = $state('All');
	let coverageFilter = $state<'all' | 'needsWork'>('all');
	let isMenuBrowserCollapsed = $state(false);
	let menuGroups = $state<MenuGrandCategoryGroup[]>([]);
	let selectedRecipe = $state<RecipeDetail | null>(null);
	let isLoadingList = $state(true);
	let isLoadingDetail = $state(false);
	let listError = $state<string | null>(null);
	let detailError = $state<string | null>(null);
	let englishInstructionsDraft = $state('');
	let thaiInstructionsDraft = $state('');
	let translationMessage = $state<string | null>(null);
	let translationError = $state<string | null>(null);
	let isTranslating = $state<'english-to-thai' | 'thai-to-english' | null>(null);
	let isSavingInstructions = $state<'english' | 'thai' | null>(null);
	let recipeCount = $state(0);
	let detailRequestId = 0;

	const selectedMenuItemId = $derived(page.url.searchParams.get('menuItemId'));
	const legacyRecipeId = $derived(page.url.searchParams.get('id') ?? data.selectedId);
	const money = new Intl.NumberFormat('en-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 });
	const number = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });

	const notionIdKey = (id: string) => id.replaceAll('-', '').toLowerCase();
	const allMenuItems = $derived(menuGroups.flatMap((grand) => grand.categories.flatMap((category) => category.items)));
	const selectedMenuItem = $derived(
		selectedMenuItemId ? (allMenuItems.find((item) => notionIdKey(item.id) === notionIdKey(selectedMenuItemId)) ?? null) : null
	);
	const selectedRecipeId = $derived(legacyRecipeId ?? selectedMenuItem?.primaryRecipeId ?? null);

	const categoryKey = (grandCategory: string, category: string) => `${grandCategory}::${category}`;
	const categoryOptions = $derived.by(() =>
		menuGroups
			.filter((grand) => activeGrandCategory === 'All' || grand.grandCategory === activeGrandCategory)
			.flatMap((grand) =>
				grand.categories.map((category) => ({
					key: categoryKey(grand.grandCategory, category.category),
					grandCategory: grand.grandCategory,
					category: category.category,
					totalItems: category.items.length,
					recipeCount: category.recipeCount
				}))
			)
	);
	const visibleMenuItems = $derived.by(() => {
		const term = search.trim().toLowerCase();
		return menuGroups
			.filter((grand) => activeGrandCategory === 'All' || grand.grandCategory === activeGrandCategory)
			.flatMap((grand) =>
				grand.categories
					.filter(
						(category) =>
							activeCategoryKey === 'All' || activeCategoryKey === categoryKey(grand.grandCategory, category.category)
					)
					.flatMap((category) => category.items)
			)
			.filter((item) => coverageFilter === 'all' || item.recipeStatus !== 'complete')
			.filter((item) => {
				if (!term) return true;
				return [item.name, item.thaiName, item.category, item.grandCategory, item.status, ...item.recipeNames]
					.filter(Boolean)
					.some((value) => value!.toLowerCase().includes(term));
			});
	});

	const heroImage = $derived(
		selectedRecipe?.imageUrl ?? selectedMenuItem?.imageUrl ?? selectedRecipe?.menuItems?.find((item) => item.imageUrl)?.imageUrl
	);
	const menuAllergens = $derived(
		Array.from(new Set([...(selectedRecipe?.menuItems?.flatMap((item) => item.allergens) ?? []), ...(selectedMenuItem?.allergens ?? [])]))
	);
	const dietaryOptions = $derived(
		Array.from(
			new Set([...(selectedRecipe?.menuItems?.flatMap((item) => item.dietaryOptions) ?? []), ...(selectedMenuItem?.dietaryOptions ?? [])])
		)
	);

	const recipeStatusLabel = (item: MenuItemSummary) =>
		item.recipeStatus === 'complete' ? 'recipe' : item.recipeStatus === 'incomplete' ? 'incomplete' : 'missing';

	const instructionsDirty = $derived(
		Boolean(
			selectedRecipe &&
				(englishInstructionsDraft !== (selectedRecipe.instructionsText ?? '') || thaiInstructionsDraft !== (selectedRecipe.thaiInstructionsText ?? ''))
		)
	);

	const recipeStatusClass = (item: MenuItemSummary) =>
		item.recipeStatus === 'complete'
			? 'bg-emerald-50 text-emerald-700'
			: item.recipeStatus === 'incomplete'
				? 'bg-orange-50 text-orange-700'
				: 'bg-amber-50 text-amber-700';

	const getErrorMessage = (error: unknown, fallback: string) => {
		if (error instanceof Error && error.message) return error.message;
		if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') return error.message;
		return fallback;
	};

	async function loadMenuIndex() {
		isLoadingList = true;
		listError = null;
		try {
			const index = await getRecipeMenuIndex();
			menuGroups = index.menuGroups;
			recipeCount = index.recipes.length;
		} catch (error) {
			console.error('recipes: failed to load menu index', error);
			listError = 'Could not load menu and recipes from Notion.';
		} finally {
			isLoadingList = false;
		}
	}

	async function loadRecipeDetail(recipeId: string | null) {
		const requestId = ++detailRequestId;
		if (!recipeId) {
			selectedRecipe = null;
			isLoadingDetail = false;
			return;
		}

		isLoadingDetail = true;
		detailError = null;
		try {
			const detail = await getRecipeDetail({ recipeId });
			if (requestId === detailRequestId) {
				selectedRecipe = detail;
				englishInstructionsDraft = detail?.instructionsText ?? '';
				thaiInstructionsDraft = detail?.thaiInstructionsText ?? '';
				translationMessage = null;
				translationError = null;
			}
		} catch (error) {
			console.error('recipes: failed to load detail', error);
			if (requestId === detailRequestId) detailError = 'Could not load this recipe.';
		} finally {
			if (requestId === detailRequestId) isLoadingDetail = false;
		}
	}

	async function translateInstructions(direction: 'english-to-thai' | 'thai-to-english') {
		if (!selectedRecipe) return;
		const targetLanguage = direction === 'english-to-thai' ? 'Thai' : 'English';
		const toastId = toast.loading(`Translating to ${targetLanguage}…`, {
			description: 'Replicate is drafting kitchen-safe instructions. This can take up to a minute.'
		});
		isTranslating = direction;
		translationError = null;
		translationMessage = `Translating to ${targetLanguage}…`;
		try {
			const sourceText = direction === 'english-to-thai' ? englishInstructionsDraft : thaiInstructionsDraft;
			const { translatedText } = await translateRecipeInstructions({ recipeId: selectedRecipe.id, direction, text: sourceText });
			if (direction === 'english-to-thai') {
				thaiInstructionsDraft = translatedText;
			} else {
				englishInstructionsDraft = translatedText;
			}
			translationMessage = 'Translation drafted. Review it, then apply to Notion.';
			toast.success('Translation drafted', { id: toastId, description: `Review the ${targetLanguage} draft, then apply it to Notion.` });
		} catch (error) {
			console.error('recipes: failed to translate instructions', error);
			const message = getErrorMessage(error, 'Could not translate instructions.');
			translationError = message;
			translationMessage = null;
			toast.error('Translation failed', { id: toastId, description: message });
		} finally {
			isTranslating = null;
		}
	}

	async function saveInstructions(language: 'english' | 'thai') {
		if (!selectedRecipe) return;
		const toastId = toast.loading(`Saving ${language === 'english' ? 'English' : 'Thai'} instructions…`, {
			description: 'Updating this recipe record in Notion.'
		});
		isSavingInstructions = language;
		translationError = null;
		translationMessage = null;
		try {
			const text = language === 'english' ? englishInstructionsDraft : thaiInstructionsDraft;
			await updateRecipeInstructions({ recipeId: selectedRecipe.id, language, text });
			selectedRecipe = {
				...selectedRecipe,
				instructionsText: language === 'english' ? text : selectedRecipe.instructionsText,
				thaiInstructionsText: language === 'thai' ? text : selectedRecipe.thaiInstructionsText,
				hasInstructions: Boolean((language === 'english' ? text : selectedRecipe.instructionsText)?.trim()) || selectedRecipe.instructionBlocks.length > 0,
				isComplete: selectedRecipe.hasIngredientLines && (Boolean((language === 'english' ? text : selectedRecipe.instructionsText)?.trim()) || selectedRecipe.instructionBlocks.length > 0)
			};
			translationMessage = `Saved ${language === 'english' ? 'English' : 'Thai'} instructions to Notion.`;
			toast.success('Saved to Notion', { id: toastId, description: `${language === 'english' ? 'English' : 'Thai'} instructions were updated.` });
		} catch (error) {
			console.error('recipes: failed to save instructions', error);
			const message = getErrorMessage(error, 'Could not save instructions to Notion.');
			translationError = message;
			toast.error('Save failed', { id: toastId, description: message });
		} finally {
			isSavingInstructions = null;
		}
	}

	onMount(() => {
		loadMenuIndex();
	});

	$effect(() => {
		loadRecipeDetail(selectedRecipeId);
	});
</script>

<svelte:head>
	<title>Casa Luma Recipes · Staff Tools</title>
</svelte:head>

<div class="space-y-4">
	<section class="rounded-3xl border border-[#dfd2c6] bg-white/80 px-5 py-4 shadow-sm">
		<div class="flex flex-wrap items-center justify-between gap-3">
			<div>
				<p class="text-xs font-bold uppercase tracking-[0.22em] text-[#a37752]">Casa Luma Recipes</p>
				<h2 class="text-2xl font-semibold tracking-tight text-[#2c2925]">Kitchen recipe book</h2>
				<p class="mt-1 text-sm text-[#7a6550]">Browse by menu category; each item shows whether a recipe exists.</p>
			</div>
			<div class="rounded-full bg-[#f6f1eb] px-3 py-1.5 text-xs font-semibold text-[#7a6550]">
				{isLoadingList ? 'Loading…' : `${allMenuItems.length} menu items · ${recipeCount} recipes`}
			</div>
		</div>
	</section>

	<div class={`grid gap-4 ${isMenuBrowserCollapsed ? 'lg:grid-cols-[72px_minmax(0,1fr)]' : 'lg:grid-cols-[340px_minmax(0,1fr)]'}`}>
		<aside class="rounded-3xl border border-[#dfd2c6] bg-white/80 p-3 shadow-sm lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-hidden">
			<div class="flex items-center justify-between gap-2">
				{#if !isMenuBrowserCollapsed}
					<p class="px-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#a37752]">Menu browser</p>
				{/if}
				<button
					type="button"
					onclick={() => (isMenuBrowserCollapsed = !isMenuBrowserCollapsed)}
					class="rounded-full bg-[#f6f1eb] px-3 py-2 text-xs font-bold text-[#7a6550] shadow-sm hover:bg-[#efe5dc]"
					aria-label={isMenuBrowserCollapsed ? 'Expand menu browser' : 'Collapse menu browser'}
					title={isMenuBrowserCollapsed ? 'Expand menu browser' : 'Collapse menu browser'}
				>
					{isMenuBrowserCollapsed ? '☰' : 'Hide'}
				</button>
			</div>

			{#if isMenuBrowserCollapsed}
				<div class="mt-4 flex flex-col items-center gap-3 text-center">
					<div class="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#f6f1eb] text-xl">🍽️</div>
					<p class="text-[11px] font-bold uppercase tracking-[0.18em] text-[#a37752] [writing-mode:vertical-rl]">Menu</p>
				</div>
			{:else}
				<input
					bind:value={search}
					placeholder="Search menu, Thai, category, recipe…"
					class="mt-3 w-full rounded-2xl border border-[#d8c8b8] bg-white px-3 py-2.5 text-sm outline-none transition focus:border-[#9a7656] focus:ring-2 focus:ring-[#9a7656]/15"
				/>

				<div class="mt-3 space-y-3 overflow-y-auto pr-1 lg:max-h-[calc(100vh-10rem)]">
				{#if isLoadingList}
					{#each Array(8) as _}
						<div class="h-16 animate-pulse rounded-2xl bg-[#f1e8df]"></div>
					{/each}
				{:else if listError}
					<p class="rounded-2xl bg-red-50 p-3 text-sm text-red-700">{listError}</p>
				{:else}
					<section class="rounded-2xl border border-[#e4d8cc] bg-[#fbf8f5] p-2.5">
						<div class="flex items-center justify-between gap-2">
							<p class="text-[11px] font-bold uppercase tracking-[0.18em] text-[#a37752]">Menu map</p>
							<button
								type="button"
								onclick={() => {
									activeGrandCategory = 'All';
									activeCategoryKey = 'All';
									coverageFilter = 'all';
									search = '';
								}}
								class="rounded-full bg-white px-2 py-1 text-[10px] font-bold text-[#7a6550] shadow-sm hover:bg-[#f6f1eb]"
							>
								Reset
							</button>
						</div>

						<div class="mt-2 grid grid-cols-2 gap-1.5">
							<button
								type="button"
								onclick={() => {
									activeGrandCategory = 'All';
									activeCategoryKey = 'All';
								}}
								class={`rounded-xl border px-2.5 py-2 text-left transition ${activeGrandCategory === 'All' ? 'border-[#9a7656] bg-white shadow-sm' : 'border-transparent bg-white/60 hover:bg-white'}`}
							>
								<p class="text-sm font-bold text-[#2c2925]">All</p>
								<p class="text-[10px] font-semibold text-[#a37752]">{allMenuItems.filter((item) => item.recipeStatus === 'complete').length}/{allMenuItems.length} recipes</p>
							</button>
							{#each menuGroups as grand (grand.grandCategory)}
								<button
									type="button"
									onclick={() => {
										activeGrandCategory = grand.grandCategory;
										activeCategoryKey = 'All';
									}}
									class={`rounded-xl border px-2.5 py-2 text-left transition ${activeGrandCategory === grand.grandCategory ? 'border-[#9a7656] bg-white shadow-sm' : 'border-transparent bg-white/60 hover:bg-white'}`}
								>
									<p class="truncate text-sm font-bold text-[#2c2925]">{grand.grandCategory}</p>
									<p class="text-[10px] font-semibold text-[#a37752]">{grand.recipeCount}/{grand.totalItems} recipes</p>
								</button>
							{/each}
						</div>

						<div class="mt-3 flex flex-wrap gap-1.5">
							<button
								type="button"
								onclick={() => (activeCategoryKey = 'All')}
								class={`rounded-full border px-2.5 py-1 text-[11px] font-bold transition ${activeCategoryKey === 'All' ? 'border-[#9a7656] bg-[#f1e6dc] text-[#2c2925]' : 'border-[#e4d8cc] bg-white text-[#7a6550] hover:border-[#9a7656]'}`}
							>
								All categories
							</button>
							{#each categoryOptions as category (category.key)}
								<button
									type="button"
									onclick={() => (activeCategoryKey = category.key)}
									class={`rounded-full border px-2.5 py-1 text-[11px] font-bold transition ${activeCategoryKey === category.key ? 'border-[#9a7656] bg-[#f1e6dc] text-[#2c2925]' : 'border-[#e4d8cc] bg-white text-[#7a6550] hover:border-[#9a7656]'}`}
									title={activeGrandCategory === 'All' ? category.grandCategory : undefined}
								>
									{category.category}
									<span class="ml-1 text-[#a37752]">{category.recipeCount}/{category.totalItems}</span>
								</button>
							{/each}
						</div>

						<div class="mt-3 grid grid-cols-2 gap-1 rounded-full bg-white p-1 text-xs font-bold">
							<button
								type="button"
								onclick={() => (coverageFilter = 'all')}
								class={`rounded-full px-3 py-1.5 ${coverageFilter === 'all' ? 'bg-[#2c2925] text-white' : 'text-[#7a6550] hover:bg-[#f6f1eb]'}`}
							>
								All items
							</button>
							<button
								type="button"
								onclick={() => (coverageFilter = 'needsWork')}
								class={`rounded-full px-3 py-1.5 ${coverageFilter === 'needsWork' ? 'bg-amber-600 text-white' : 'text-[#7a6550] hover:bg-[#f6f1eb]'}`}
							>
								Needs work
							</button>
						</div>
					</section>

					<section>
						<div class="mb-2 flex items-center justify-between gap-2 px-1">
							<p class="text-xs font-bold uppercase tracking-wide text-[#a37752]">{visibleMenuItems.length} items</p>
							{#if activeGrandCategory !== 'All' || activeCategoryKey !== 'All' || coverageFilter !== 'all'}
								<p class="truncate text-[11px] text-[#7a6550]">Filtered menu list</p>
							{/if}
						</div>

						{#if visibleMenuItems.length === 0}
							<p class="rounded-2xl border border-dashed border-[#d8c8b8] p-3 text-sm text-[#7a6550]">No menu items match these filters.</p>
						{:else}
							<div class="space-y-1.5">
								{#each visibleMenuItems as item (item.id)}
									<a
										href={`/tools/recipes?menuItemId=${item.id}${item.primaryRecipeId ? `&id=${item.primaryRecipeId}` : ''}`}
										class={`block rounded-xl border p-2 transition ${
											(selectedMenuItemId && notionIdKey(selectedMenuItemId) === notionIdKey(item.id)) || selectedRecipeId === item.primaryRecipeId
												? 'border-[#9a7656] bg-[#f6f1eb] shadow-sm'
												: 'border-transparent bg-white/70 hover:border-[#dfd2c6] hover:bg-white'
										}`}
									>
										<div class="flex gap-2.5">
											{#if item.imageUrl}
												<img src={item.imageUrl} alt="" class="h-11 w-11 shrink-0 rounded-lg object-cover" />
											{:else}
												<div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#efe5dc] text-base">🍽️</div>
											{/if}
											<div class="min-w-0 flex-1">
												<div class="flex items-start justify-between gap-2">
													<p class="truncate text-sm font-semibold text-[#2c2925]">{item.name}</p>
													<span class={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${recipeStatusClass(item)}`}>{recipeStatusLabel(item)}</span>
												</div>
												{#if item.thaiName}<p class="truncate text-xs text-[#7a6550]">{item.thaiName}</p>{/if}
												<div class="mt-0.5 flex flex-wrap gap-1 text-[11px] font-medium text-[#a37752]">
													<span>{item.category}</span>
													{#if item.price !== undefined}<span>· {money.format(item.price)}</span>{/if}
													{#if item.recipeCogs !== undefined}<span>· COGS {money.format(item.recipeCogs)}</span>{/if}
												</div>
											</div>
										</div>
									</a>
								{/each}
							</div>
						{/if}
					</section>
				{/if}
			</div>
			{/if}
		</aside>

		<section class="min-h-[60vh]">
			{#if isLoadingDetail}
				<div class="rounded-3xl border border-[#dfd2c6] bg-white p-5 shadow-sm">
					<div class="h-32 animate-pulse rounded-2xl bg-[#f1e8df]"></div>
					<div class="mt-4 grid gap-4 md:grid-cols-2">
						<div class="h-80 animate-pulse rounded-2xl bg-[#f1e8df]"></div>
						<div class="h-80 animate-pulse rounded-2xl bg-[#f1e8df]"></div>
					</div>
				</div>
			{:else if detailError}
				<div class="rounded-3xl border border-red-200 bg-red-50 p-6 text-red-800">{detailError}</div>
			{:else if selectedRecipe}
				<article class="overflow-hidden rounded-3xl border border-[#dfd2c6] bg-white shadow-sm">
					<header class="grid gap-4 p-4 md:grid-cols-[160px_minmax(0,1fr)] xl:grid-cols-[170px_minmax(0,1fr)_360px] md:p-5">
						<div class="rounded-2xl bg-[#f6f1eb] p-2">
							{#if heroImage}
								<img src={heroImage} alt={selectedRecipe.name} class="h-36 w-full rounded-xl object-cover md:h-40" />
							{:else}
								<div class="flex h-36 w-full items-center justify-center rounded-xl bg-gradient-to-br from-[#efe5dc] to-[#f8f1ea] text-4xl md:h-40">🍲</div>
							{/if}
						</div>

						<div class="min-w-0">
							<div class="flex flex-wrap gap-1.5">
								{#each selectedRecipe.menuItemGroups as group (group.category)}
									<span class="rounded-full bg-[#f1e6dc] px-2.5 py-1 text-[11px] font-semibold text-[#7a6550]">{group.category}</span>
								{/each}
							</div>
							<h1 class="mt-2 text-3xl font-semibold tracking-tight text-[#2c2925]">{selectedRecipe.name}</h1>
							{#if selectedRecipe.thaiName}<p class="text-xl text-[#7a6550]">{selectedRecipe.thaiName}</p>{/if}

							<div class="mt-3 flex flex-wrap gap-2 text-xs">
								{#if selectedRecipe.isComplete}
									<span class="rounded-full bg-emerald-50 px-3 py-1.5 font-bold text-emerald-700">Complete recipe</span>
								{:else}
									<span class="rounded-full bg-orange-50 px-3 py-1.5 font-bold text-orange-700">Incomplete recipe</span>
									{#if !selectedRecipe.hasIngredientLines}<span class="rounded-full bg-amber-50 px-3 py-1.5 font-bold text-amber-700">Missing ingredients</span>{/if}
									{#if !selectedRecipe.hasInstructions}<span class="rounded-full bg-amber-50 px-3 py-1.5 font-bold text-amber-700">Missing instructions</span>{/if}
								{/if}
								{#if selectedRecipe.cogs !== undefined}<span class="rounded-full bg-[#fbf4e7] px-3 py-1.5 font-semibold text-[#8a5a19]">COGS {money.format(selectedRecipe.cogs)}</span>{/if}
								{#each selectedRecipe.menuItems as item (item.id)}
									{#if item.price !== undefined}<span class="rounded-full bg-[#eef7ed] px-3 py-1.5 font-semibold text-[#467241]">{item.name}: {money.format(item.price)}</span>{/if}
								{/each}
								{#each menuAllergens as allergen}<span class="rounded-full bg-red-50 px-3 py-1.5 font-bold text-red-700">Allergen: {allergen}</span>{/each}
								{#each dietaryOptions as option}<span class="rounded-full bg-emerald-50 px-3 py-1.5 font-bold text-emerald-700">{option}</span>{/each}
							</div>
						</div>

						{#if selectedRecipe.menuItemGroups.length}
							<section class="rounded-2xl border border-[#e4d8cc] bg-[#fbf8f5] p-3 md:col-span-2 xl:col-span-1">
								<h2 class="text-sm font-bold uppercase tracking-wide text-[#a37752]">Menu items</h2>
								<div class="mt-2 max-h-44 space-y-2 overflow-y-auto pr-1">
									{#each selectedRecipe.menuItemGroups as group (group.category)}
										<div class="rounded-xl bg-white p-2.5 shadow-sm">
											<p class="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-[#a37752]">{group.category}</p>
											<div class="space-y-1.5">
												{#each group.items as item (item.id)}
													<div class="border-t border-[#f1e8df] pt-1.5 first:border-t-0 first:pt-0">
														<div class="flex justify-between gap-3">
															<div class="min-w-0"><p class="truncate text-sm font-semibold text-[#2c2925]">{item.name}</p>{#if item.thaiName}<p class="truncate text-xs text-[#7a6550]">{item.thaiName}</p>{/if}</div>
															{#if item.price !== undefined}<p class="shrink-0 text-sm font-bold text-[#467241]">{money.format(item.price)}</p>{/if}
														</div>
														{#if item.description}<p class="mt-1 line-clamp-2 text-xs leading-5 text-[#5c4a3d]">{item.description}</p>{/if}
													</div>
												{/each}
											</div>
										</div>
									{/each}
								</div>
							</section>
						{/if}
					</header>

					<section class="border-t border-[#eee4da] bg-[#fbf8f5] p-4 md:p-5">
						<div class="flex flex-wrap items-center justify-between gap-2">
							<h2 class="text-lg font-semibold text-[#2c2925]">Ingredients</h2>
							{#if selectedRecipe.ingredientLines.length}<p class="text-xs font-semibold text-[#7a6550]">{selectedRecipe.ingredientLines.length} lines</p>{/if}
						</div>
						{#if selectedRecipe.ingredientLines.length === 0}
							<p class="mt-3 rounded-2xl border border-dashed border-[#d8c8b8] bg-white p-4 text-sm text-[#7a6550]">No ingredient lines found.</p>
						{:else}
							<div class="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
								{#each selectedRecipe.ingredientLines as line (line.id)}
									<div class="grid grid-cols-[64px_34px_minmax(0,1fr)] gap-2 rounded-2xl border border-[#e4d8cc] bg-white p-2.5">
										<div class="text-right">
											<p class="font-bold leading-tight text-[#2c2925]">{line.amount !== undefined ? number.format(line.amount) : '—'}</p>
											<p class="text-[10px] font-semibold uppercase text-[#a37752]">{line.unit ?? line.ingredient?.unit ?? ''}</p>
										</div>
										{#if line.ingredient?.imageUrl}
											<img src={line.ingredient.imageUrl} alt="" class="h-8 w-8 rounded-lg object-cover" />
										{:else}
											<div class="flex h-8 w-8 items-center justify-center rounded-lg bg-[#f1e8df] text-sm">•</div>
										{/if}
										<div class="min-w-0">
											<p class="truncate text-sm font-semibold text-[#2c2925]">{line.ingredient?.name ?? line.name}</p>
											{#if line.ingredient?.thaiName}<p class="truncate text-xs text-[#7a6550]">{line.ingredient.thaiName}</p>{/if}
											<div class="flex flex-wrap gap-1 text-[11px] text-[#7a6550]">
												{#if line.lineCost !== undefined}<span>{money.format(line.lineCost)}</span>{/if}
												{#each (line.ingredient?.department ?? []) as department}<span>• {department}</span>{/each}
											</div>
										</div>
									</div>
								{/each}
							</div>
						{/if}
					</section>

					<section class="border-t border-[#eee4da] p-4 md:p-5">
						<div class="flex flex-wrap items-center justify-between gap-2">
							<div>
								<h2 class="text-lg font-semibold text-[#2c2925]">Instructions</h2>
								<p class="text-xs text-[#7a6550]">Review bilingual instructions and apply only this recipe record to Notion.</p>
							</div>
							{#if instructionsDirty}<span class="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700">Unsaved draft</span>{/if}
						</div>

						<div class="mt-3 rounded-2xl border border-[#e4d8cc] bg-[#fbf8f5] p-3">
							<div class="grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
								<div>
									<div class="mb-1.5 flex items-center justify-between gap-2">
										<p class="text-xs font-bold uppercase tracking-wide text-[#a37752]">English</p>
										<button type="button" onclick={() => saveInstructions('english')} disabled={isSavingInstructions !== null || englishInstructionsDraft === (selectedRecipe.instructionsText ?? '')} class="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-[#7a6550] shadow-sm disabled:cursor-not-allowed disabled:opacity-45 hover:bg-[#f6f1eb]">{isSavingInstructions === 'english' ? 'Saving…' : 'Apply to Notion'}</button>
									</div>
									<textarea bind:value={englishInstructionsDraft} rows="18" class="w-full rounded-xl border border-[#d8c8b8] bg-white p-3 text-sm leading-6 text-[#3f352d] outline-none focus:border-[#9a7656] focus:ring-2 focus:ring-[#9a7656]/15" placeholder="English recipe instructions"></textarea>
								</div>

								<div class="flex items-center justify-center gap-2 xl:flex-col">
									<button type="button" onclick={() => translateInstructions('english-to-thai')} disabled={isTranslating !== null || !englishInstructionsDraft.trim()} title="Translate English to Thai" class="inline-flex min-w-11 items-center justify-center gap-1 rounded-full bg-[#2c2925] px-3 py-2 text-sm font-bold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-45 hover:bg-[#443b33]">
										{#if isTranslating === 'english-to-thai'}<LoaderCircle size={16} class="animate-spin" />{:else}→{/if}
									</button>
									<button type="button" onclick={() => translateInstructions('thai-to-english')} disabled={isTranslating !== null || !thaiInstructionsDraft.trim()} title="Translate Thai to English" class="inline-flex min-w-11 items-center justify-center gap-1 rounded-full bg-[#2c2925] px-3 py-2 text-sm font-bold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-45 hover:bg-[#443b33]">
										{#if isTranslating === 'thai-to-english'}<LoaderCircle size={16} class="animate-spin" />{:else}←{/if}
									</button>
								</div>

								<div>
									<div class="mb-1.5 flex items-center justify-between gap-2">
										<p class="text-xs font-bold uppercase tracking-wide text-[#a37752]">Thai</p>
										<button type="button" onclick={() => saveInstructions('thai')} disabled={isSavingInstructions !== null || thaiInstructionsDraft === (selectedRecipe.thaiInstructionsText ?? '')} class="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-[#7a6550] shadow-sm disabled:cursor-not-allowed disabled:opacity-45 hover:bg-[#f6f1eb]">{isSavingInstructions === 'thai' ? 'Saving…' : 'Apply to Notion'}</button>
									</div>
									<textarea bind:value={thaiInstructionsDraft} rows="18" class="w-full rounded-xl border border-[#d8c8b8] bg-white p-3 text-sm leading-6 text-[#3f352d] outline-none focus:border-[#9a7656] focus:ring-2 focus:ring-[#9a7656]/15" placeholder="Thai recipe instructions"></textarea>
								</div>
							</div>
							{#if isTranslating}
								<p class="mt-2 inline-flex items-center gap-2 rounded-xl bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700">
									<LoaderCircle size={14} class="animate-spin" />
									Translating with Replicate… keep this page open.
								</p>
							{:else if translationMessage}
								<p class="mt-2 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">{translationMessage}</p>
							{/if}
							{#if translationError}<p class="mt-2 rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{translationError}</p>{/if}
						</div>

						{#if selectedRecipe.instructionBlocks.length}
							<div class="mt-4 space-y-3 text-sm">
								{#each selectedRecipe.instructionBlocks as block (block.id)}<InstructionBlock {block} />{/each}
							</div>
						{:else if !selectedRecipe.instructionsText && !selectedRecipe.thaiInstructionsText}
							<p class="mt-3 rounded-2xl border border-dashed border-[#d8c8b8] p-4 text-sm text-[#7a6550]">No instruction content found.</p>
						{/if}
					</section>
				</article>
			{:else if selectedMenuItem}
				{@render MenuOnlyCard({ item: selectedMenuItem, heroImage, menuAllergens, dietaryOptions, money })}
			{:else}
				<div class="flex min-h-[55vh] items-center justify-center rounded-3xl border border-dashed border-[#d8c8b8] bg-white/60 p-8 text-center">
					<div class="max-w-sm"><div class="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white text-2xl shadow-sm">🍲</div><h3 class="mt-4 text-lg font-semibold text-[#2c2925]">Select a menu item</h3><p class="mt-2 text-sm leading-6 text-[#7a6550]">Menu categories load from Notion first; opening an item reuses the linked recipe id when one exists.</p></div>
				</div>
			{/if}
		</section>
	</div>
</div>

{#snippet MenuOnlyCard({ item, heroImage, menuAllergens, dietaryOptions, money }: { item: MenuItemSummary; heroImage?: string; menuAllergens: string[]; dietaryOptions: string[]; money: Intl.NumberFormat })}
	<article class="overflow-hidden rounded-3xl border border-amber-200 bg-white shadow-sm">
		<header class="grid gap-4 p-4 md:grid-cols-[160px_minmax(0,1fr)] md:p-5">
			<div class="rounded-2xl bg-[#f6f1eb] p-2">
				{#if heroImage}
					<img src={heroImage} alt={item.name} class="h-36 w-full rounded-xl object-cover md:h-40" />
				{:else}
					<div class="flex h-36 w-full items-center justify-center rounded-xl bg-gradient-to-br from-[#efe5dc] to-[#f8f1ea] text-4xl md:h-40">🍽️</div>
				{/if}
			</div>
			<div>
				<div class="flex flex-wrap gap-1.5">
					{#if item.grandCategory}<span class="rounded-full bg-[#f1e6dc] px-2.5 py-1 text-[11px] font-semibold text-[#7a6550]">{item.grandCategory}</span>{/if}
					{#if item.category}<span class="rounded-full bg-[#f1e6dc] px-2.5 py-1 text-[11px] font-semibold text-[#7a6550]">{item.category}</span>{/if}
					<span class="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700">No recipe linked</span>
				</div>
				<h1 class="mt-2 text-3xl font-semibold tracking-tight text-[#2c2925]">{item.name}</h1>
				{#if item.thaiName}<p class="text-xl text-[#7a6550]">{item.thaiName}</p>{/if}
				<div class="mt-3 flex flex-wrap gap-2 text-xs">
					{#if item.price !== undefined}<span class="rounded-full bg-[#eef7ed] px-3 py-1.5 font-semibold text-[#467241]">Price {money.format(item.price)}</span>{/if}
					{#if item.status}<span class="rounded-full bg-[#f6f1eb] px-3 py-1.5 font-semibold text-[#7a6550]">{item.status}</span>{/if}
					{#each menuAllergens as allergen}<span class="rounded-full bg-red-50 px-3 py-1.5 font-bold text-red-700">Allergen: {allergen}</span>{/each}
					{#each dietaryOptions as option}<span class="rounded-full bg-emerald-50 px-3 py-1.5 font-bold text-emerald-700">{option}</span>{/each}
				</div>
			</div>
		</header>
		<section class="border-t border-[#eee4da] bg-[#fbf8f5] p-4 md:p-5">
			<h2 class="text-lg font-semibold text-[#2c2925]">Recipe tracking</h2>
			<p class="mt-2 rounded-2xl border border-dashed border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">
				This menu item is in Notion, but no Recipes database entry is linked to it yet.
			</p>
			{#if item.description}<p class="mt-4 text-sm leading-6 text-[#5c4a3d]">{item.description}</p>{/if}
			{#if item.thaiDescription}<p class="mt-2 text-sm leading-6 text-[#7a6550]">{item.thaiDescription}</p>{/if}
		</section>
	</article>
{/snippet}
