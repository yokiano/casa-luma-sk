<script lang="ts">
	import { getMenuSummary } from '$lib/menu.remote';
	import { isPublicMenuItem, preparePublicMenuSummary } from '$lib/menu-display';
	import OnlineMenuStickyNav from '$lib/components/menu/online/OnlineMenuStickyNav.svelte';
	import OnlineMenuItem from '$lib/components/menu/online/OnlineMenuItem.svelte';
	import type { DietaryTag, MenuItem } from '$lib/types/menu';

	const SCROLL_OFFSET = 168;
	const ACTIVE_OFFSET = 200;

	const accentPalette = ['#DFBC69', '#A8C3A0', '#E07A5F', '#8E8FB5', '#C7A4A1'];

	let menu = $state(preparePublicMenuSummary(await getMenuSummary()));

	let activeGrandCategory = $state('');
	let activeCategory = $state('');
	let searchQuery = $state('');
	let searchOpen = $state(false);
	let activeDietaryFilters = $state<Set<DietaryTag>>(new Set());
	let scrollSpyEnabled = $state(true);

	const itemMatchesFilters = (item: MenuItem) => {
		if (!isPublicMenuItem(item)) return false;

		const query = searchQuery.trim().toLowerCase();
		if (query) {
			const haystack = [item.name, item.description, item.category, item.grandCategory, ...item.tags]
				.join(' ')
				.toLowerCase();
			if (!haystack.includes(query)) return false;
		}

		if (activeDietaryFilters.size > 0) {
			for (const tag of activeDietaryFilters) {
				if (!item.dietaryTags.includes(tag)) return false;
			}
		}

		return true;
	};

	const filteredGrandCategories = $derived.by(() =>
		menu.grandCategories
			.map((grand) => ({
				...grand,
				sections: grand.sections
					.map((section) => ({
						...section,
						items: section.items.filter(itemMatchesFilters)
					}))
					.filter((section) => section.items.length > 0)
			}))
			.filter((grand) => grand.sections.length > 0)
	);

	const grandCategoryNames = $derived(filteredGrandCategories.map((grand) => grand.name));

	const categoriesForActiveGrand = $derived.by(() => {
		const grand =
			filteredGrandCategories.find((g) => g.name === activeGrandCategory) ??
			filteredGrandCategories[0];
		return grand?.sections.map((section) => section.name) ?? [];
	});

	const totalItemCount = $derived(
		menu.grandCategories.reduce(
			(count, grand) =>
				count + grand.sections.reduce((s, section) => s + section.items.filter(isPublicMenuItem).length, 0),
			0
		)
	);

	const filteredItemCount = $derived(
		filteredGrandCategories.reduce(
			(count, grand) => count + grand.sections.reduce((s, section) => s + section.items.length, 0),
			0
		)
	);

	$effect(() => {
		if (!activeGrandCategory && grandCategoryNames.length > 0) {
			activeGrandCategory = grandCategoryNames[0];
		}
	});

	$effect(() => {
		const categories = categoriesForActiveGrand;
		if (categories.length === 0) return;
		if (!categories.includes(activeCategory)) {
			activeCategory = categories[0];
		}
	});

	function sectionKey(grandName: string, sectionName: string) {
		return `${grandName}::${sectionName}`;
	}

	function scrollToSection(grandName: string, sectionName: string) {
		if (typeof window === 'undefined') return;
		scrollSpyEnabled = false;
		const target = document.querySelector<HTMLElement>(
			`[data-menu-section="${sectionKey(grandName, sectionName)}"]`
		);
		if (target) {
			const top = target.getBoundingClientRect().top + window.scrollY - SCROLL_OFFSET;
			window.scrollTo({ top, behavior: 'smooth' });
		}
		window.setTimeout(() => {
			scrollSpyEnabled = true;
		}, 600);
	}

	function handleGrandCategoryChange(name: string) {
		activeGrandCategory = name;
		const grand = filteredGrandCategories.find((g) => g.name === name);
		const firstSection = grand?.sections[0];
		if (firstSection) {
			activeCategory = firstSection.name;
			scrollToSection(name, firstSection.name);
		}
	}

	function handleCategoryChange(name: string) {
		activeCategory = name;
		scrollToSection(activeGrandCategory, name);
	}

	function toggleDietaryFilter(tag: DietaryTag) {
		const next = new Set(activeDietaryFilters);
		if (next.has(tag)) next.delete(tag);
		else next.add(tag);
		activeDietaryFilters = next;
	}

	function updateActiveOnScroll() {
		if (typeof window === 'undefined' || !scrollSpyEnabled) return;

		const sections = document.querySelectorAll<HTMLElement>('[data-menu-section]');
		const scrollPosition = window.scrollY + ACTIVE_OFFSET;
		let currentSection = '';
		let currentGrand = '';

		for (const section of sections) {
			if (section.offsetTop <= scrollPosition) {
				currentSection = section.dataset.menuCategory ?? '';
				currentGrand = section.dataset.menuGrand ?? '';
			}
		}

		if (currentGrand) activeGrandCategory = currentGrand;
		if (currentSection) activeCategory = currentSection;
	}

	$effect(() => {
		if (typeof window === 'undefined') return;
		const onScroll = () => updateActiveOnScroll();
		window.addEventListener('scroll', onScroll, { passive: true });
		updateActiveOnScroll();
		return () => window.removeEventListener('scroll', onScroll);
	});
</script>

<svelte:head>
	<title>Our Menu - Casa Luma</title>
	<meta
		name="description"
		content="Browse Casa Luma's cafe menu — breakfast, lunch, drinks, kids meals and sweet treats on Koh Phangan."
	/>
</svelte:head>

<div class="min-h-screen bg-[#F9F7F2] text-[#2D3A3A]">
	<OnlineMenuStickyNav
		grandCategories={grandCategoryNames}
		categories={categoriesForActiveGrand}
		dietaryTags={menu.dietaryTags}
		{activeGrandCategory}
		{activeCategory}
		{activeDietaryFilters}
		{searchQuery}
		{searchOpen}
		filteredCount={filteredItemCount}
		totalCount={totalItemCount}
		onGrandCategoryChange={handleGrandCategoryChange}
		onCategoryChange={handleCategoryChange}
		onDietaryToggle={toggleDietaryFilter}
		onSearchChange={(value) => (searchQuery = value)}
		onSearchOpenChange={(open) => (searchOpen = open)}
	/>

	<div class="mx-auto max-w-3xl px-4 pb-16 sm:px-6">
		{#if filteredGrandCategories.length === 0}
			<div class="py-20 text-center">
				<p class="text-lg font-light text-[#2D3A3A]/70">No items match your filters.</p>
				<p class="mt-2 text-sm text-[#2D3A3A]/45">Try adjusting search or dietary filters.</p>
			</div>
		{:else}
			{#each filteredGrandCategories as grand, grandIndex}
				<div class="pt-8 {grandIndex > 0 ? 'mt-12 border-t border-[#2D3A3A]/10' : 'pt-4'}">
					<header class="mb-8 sm:mb-10" data-menu-grand-marker={grand.name}>
						<h2
							class="font-heading text-[3.25rem] font-medium leading-[0.92] tracking-tight text-[#2D3A3A] sm:text-6xl lg:text-7xl"
						>
							{grand.name}
						</h2>
						<div class="mt-4 h-px w-16 bg-[#E07A5F]/60 sm:mt-5 sm:w-20"></div>
					</header>

					{#each grand.sections as section, sectionIndex}
						{@const accent =
							section.accentColor || accentPalette[(grandIndex + sectionIndex) % accentPalette.length]}
						<section
							class="scroll-mt-44 {sectionIndex > 0 ? 'mt-10' : ''}"
							data-menu-section={sectionKey(grand.name, section.name)}
							data-menu-grand={grand.name}
							data-menu-category={section.name}
						>
							<header class="mb-4 border-b border-[#2D3A3A]/12 pb-3">
								<h3 class="font-heading text-xl font-medium tracking-tight text-[#2D3A3A] sm:text-2xl">
									{section.name}
								</h3>
								{#if section.intro}
									<p class="mt-1.5 max-w-2xl text-sm leading-relaxed text-[#2D3A3A]/55 sm:text-[15px]">
										{section.intro}
									</p>
								{/if}
							</header>

							<div class="divide-y divide-[#2D3A3A]/6">
								{#each section.items as item}
									<OnlineMenuItem {item} accentColor={accent} />
								{/each}
							</div>
						</section>
					{/each}
				</div>
			{/each}
		{/if}
	</div>
</div>
