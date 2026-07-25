<script lang="ts">
	import { getPublicMenuSummary } from '$lib/menu.remote';
	import { isPublicMenuItem } from '$lib/menu-display';
	import OnlineMenuStickyNav from '$lib/components/menu/online/OnlineMenuStickyNav.svelte';
	import OnlineMenuItem from '$lib/components/menu/online/OnlineMenuItem.svelte';
	import MenuItemModal from '$lib/components/menu/online/MenuItemModal.svelte';
	import MenuShareModal from '$lib/components/menu/online/MenuShareModal.svelte';
	import type { DietaryTag, MenuItem, MenuMetaFilter } from '$lib/types/menu';

	const accentPalette = ['#DFBC69', '#A8C3A0', '#E07A5F', '#8E8FB5', '#C7A4A1'];

	let menu = $state(await getPublicMenuSummary());

	let activeGrandCategory = $state('');
	let activeCategory = $state('');
	let searchQuery = $state('');
	let searchOpen = $state(false);
	let activeDietaryFilters = $state<Set<DietaryTag>>(new Set());
	let activeMetaFilter = $state<MenuMetaFilter | null>(null);
	let shareOpen = $state(false);
	let selectedItem = $state<MenuItem | null>(null);
	let menuScrollOffset = $state(184);
	let scrollSpyEnabled = $state(true);

	const itemMatchesFilters = (item: MenuItem) => {
		if (!isPublicMenuItem(item)) return false;

		const query = searchQuery.trim().toLowerCase();
		if (query) {
			const modifierSearchValues =
				item.modifiers?.flatMap((modifier) => [modifier.name, ...modifier.options.map((option) => option.name)]) ?? [];
			const haystack = [
				item.name,
				item.description,
				item.thaiName ?? '',
				item.thaiDescription ?? '',
				item.category,
				item.grandCategory,
				item.availabilityWindow ?? '',
				...item.tags,
				...item.dietaryTags,
				...item.allergens,
				...modifierSearchValues
			]
				.join(' ')
				.toLowerCase();
			if (!haystack.includes(query)) return false;
		}

		if (activeMetaFilter === 'popular' && !item.highlight) return false;
		if (activeMetaFilter === 'recommended' && !item.recommended) return false;

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

	const metaFilters = $derived.by(() => {
		const publicItems = menu.grandCategories.flatMap((grand) =>
			grand.sections.flatMap((section) => section.items.filter(isPublicMenuItem))
		);
		const filters: MenuMetaFilter[] = [];
		if (publicItems.some((item) => item.highlight)) filters.push('popular');
		if (publicItems.some((item) => item.recommended)) filters.push('recommended');
		return filters;
	});

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
		if (grandCategoryNames.length === 0) {
			activeGrandCategory = '';
			activeCategory = '';
			return;
		}
		if (!grandCategoryNames.includes(activeGrandCategory)) {
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

	function sectionId(grandName: string, sectionName: string) {
		const slug = (value: string) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-');
		return `menu-section-${slug(grandName)}-${slug(sectionName)}`;
	}

	// Keep section headings below both the global header and the sticky menu toolbar.
	function getMenuScrollOffset() {
		if (typeof window === 'undefined') return menuScrollOffset;
		const stickyNav = document.querySelector<HTMLElement>('[data-menu-sticky-nav]');
		return stickyNav ? Math.ceil(stickyNav.getBoundingClientRect().bottom + 16) : menuScrollOffset;
	}

	function scrollToSection(grandName: string, sectionName: string) {
		if (typeof window === 'undefined') return;
		scrollSpyEnabled = false;
		const target = document.getElementById(sectionId(grandName, sectionName));
		if (target) {
			const offset = getMenuScrollOffset();
			menuScrollOffset = offset;
			const top = target.getBoundingClientRect().top + window.scrollY - offset;
			window.scrollTo({ top, behavior: 'smooth' });
		}
		window.setTimeout(() => {
			scrollSpyEnabled = true;
		}, 600);
	}

	function scrollToTop() {
		if (typeof window === 'undefined') return;
		window.scrollTo({ top: 0, behavior: 'smooth' });
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
		// Dietary filters behave like a radio group so Vegan and Vegan Option do not intersect to zero results.
		activeDietaryFilters = activeDietaryFilters.has(tag)
			? new Set<DietaryTag>()
			: new Set<DietaryTag>([tag]);
		scrollToTop();
	}

	function toggleMetaFilter(filter: MenuMetaFilter) {
		activeMetaFilter = activeMetaFilter === filter ? null : filter;
		scrollToTop();
	}

	function openItem(item: MenuItem) {
		selectedItem = item;
	}

	function updateActiveOnScroll() {
		if (typeof window === 'undefined' || !scrollSpyEnabled) return;

		const sections = document.querySelectorAll<HTMLElement>('[data-menu-section]');
		const scrollPosition = window.scrollY + getMenuScrollOffset() + 16;
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
		const stickyNav = document.querySelector<HTMLElement>('[data-menu-sticky-nav]');
		const updateOffset = () => {
			if (stickyNav) menuScrollOffset = Math.ceil(stickyNav.getBoundingClientRect().bottom + 16);
		};
		updateOffset();
		const observer = stickyNav && typeof ResizeObserver !== 'undefined' ? new ResizeObserver(updateOffset) : null;
		if (stickyNav && observer) observer.observe(stickyNav);

		const onScroll = () => updateActiveOnScroll();
		window.addEventListener('scroll', onScroll, { passive: true });
		updateActiveOnScroll();
		return () => {
			window.removeEventListener('scroll', onScroll);
			observer?.disconnect();
		};
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
		{metaFilters}
		{activeGrandCategory}
		{activeCategory}
		{activeDietaryFilters}
		{activeMetaFilter}
		{searchQuery}
		{searchOpen}
		filteredCount={filteredItemCount}
		totalCount={totalItemCount}
		onGrandCategoryChange={handleGrandCategoryChange}
		onCategoryChange={handleCategoryChange}
		onDietaryToggle={toggleDietaryFilter}
		onMetaToggle={toggleMetaFilter}
		onShareOpen={() => (shareOpen = true)}
		onSearchChange={(value) => (searchQuery = value)}
		onSearchOpenChange={(open) => (searchOpen = open)}
	/>

	<MenuShareModal open={shareOpen} onClose={() => (shareOpen = false)} />
	{#if selectedItem}
		<MenuItemModal item={selectedItem} open={true} onClose={() => (selectedItem = null)} />
	{/if}

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
							class="menu-section {sectionIndex > 0 ? 'mt-10' : ''}"
							style={`scroll-margin-top: ${menuScrollOffset}px;`}
							id={sectionId(grand.name, section.name)}
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
									<OnlineMenuItem {item} accentColor={accent} onSelect={openItem} />
								{/each}
							</div>
						</section>
					{/each}
				</div>
			{/each}
		{/if}
	</div>
</div>
