<script lang="ts">
	import { getMenuSummary } from '$lib/menu.remote';
	import FloatingShapes3 from '$lib/components/workshops/FloatingShapes3.svelte';
	import SectionHero from '$lib/components/layout/SectionHero.svelte';
	import MenuFilters from '$lib/components/menu/MenuFilters.svelte';
	import MenuHighlights from '$lib/components/menu/MenuHighlights.svelte';
	import MenuDietaryLegend from '$lib/components/menu/MenuDietaryLegend.svelte';
	import MenuItemCard from '$lib/components/menu/MenuItemCard.svelte';

	const SCROLL_OFFSET = 160;
	const ACTIVE_OFFSET = 200;

	let menu = $state(await getMenuSummary());
	let activeSection = $state('All');

	const visibleGrandCategories = $derived(
		menu.grandCategories
			.map((grand) => ({
				...grand,
				sections: grand.sections
					.map((section) => ({ ...section, items: section.items.filter((item) => !item.archived) }))
					.filter((section) => section.items.length > 0)
			}))
			.filter((grand) => grand.sections.length > 0)
	);

	const visibleSections = $derived(visibleGrandCategories.flatMap((grand) => grand.sections));
	const allSections = $derived(visibleSections.map((section) => section.name));
	const highlights = $derived(menu.highlights.filter((item) => !item.archived));

	function handleSection(sectionName: string) {
		activeSection = sectionName;
		if (typeof window === 'undefined') return;
		if (sectionName === 'All') {
			window.scrollTo({ top: 0, behavior: 'smooth' });
			return;
		}
		const target = document.querySelector<HTMLElement>(`[data-menu-section="${sectionName}"]`);
		if (target) {
			const elementPosition = target.getBoundingClientRect().top + window.scrollY;
			window.scrollTo({ top: elementPosition - SCROLL_OFFSET, behavior: 'smooth' });
		}
	}

	function updateActiveSectionOnScroll() {
		if (typeof window === 'undefined') return;
		const sections = document.querySelectorAll<HTMLElement>('[data-menu-section]');
		const scrollPosition = window.scrollY + ACTIVE_OFFSET;
		let current = 'All';
		for (const section of sections) {
			if (section.offsetTop <= scrollPosition) {
				current = section.dataset.menuSection ?? current;
			}
		}
		activeSection = current;
	}

	$effect(() => {
		if (typeof window === 'undefined') return;
		const onScroll = () => updateActiveSectionOnScroll();
		window.addEventListener('scroll', onScroll, { passive: true });
		updateActiveSectionOnScroll();
		return () => window.removeEventListener('scroll', onScroll);
	});
</script>

<svelte:head>
	<title>Café Menu - Casa Luma</title>
	<meta
		name="description"
		content="Explore Casa Luma's seasonal menu of nourishing plates, family-friendly favorites, specialty drinks, and sweet treats crafted on Koh Phangan."
	/>
</svelte:head>
<SectionHero
	titleBlack="Café"
	titleColor="Menu"
	tagline="Coastal comfort meets mindful nourishment. Savor dishes crafted for family moments from sunrise to sunset."
	maxWidth="wide"
/>

<div class="page">
	<FloatingShapes3 intensity={0.6} quantityScale={0.8} opacityScale={0.6} grainEnabled={true} grainIntensity={0.12} />

	<div class="page__content">
		<section class="intro">
			<div class="intro__copy">
				<h2>Crafted for Curious Palates</h2>
				<p>
					From bright island produce to artisan pantry favorites, every plate reflects our Montessori-inspired
					gathering space. Mix and match your family's favorites or discover new rituals over coffee and play.
				</p>
			</div>
			<MenuDietaryLegend />
		</section>

		<MenuFilters sections={['All', ...allSections]} activeSection={activeSection} onSectionChange={handleSection} />

		<MenuHighlights items={highlights} />

		<div class="sections">
			{#each visibleGrandCategories as grand}
				<section class="grand-page" aria-label={`${grand.name} menu`}>
					<header class="grand-page__header">
						<span class="grand-page__eyebrow">Grand category</span>
						<h2 class="grand-page__title">{grand.name}</h2>
					</header>

					<div class="grand-page__sections">
						{#each grand.sections as section, sectionIndex}
							{@const accentFallback = ['#DFBC69', '#A8C3A0', '#E07A5F', '#8E8FB5', '#C7A4A1'][sectionIndex % 5]}
							{@const accent = section.accentColor || accentFallback}
							{@const visibleItems = section.items.filter((item) => item.isAvailable)}

							<section class="grand-page__section" data-menu-section={section.name} style={`--accent:${accent};`}>
								<header class="grand-page__section-header">
									<h3 class="grand-page__section-title">{section.name}</h3>
									{#if section.intro}
										<p class="grand-page__section-intro">{section.intro}</p>
									{/if}
								</header>

								{#if visibleItems.length === 0}
									<div class="grand-page__empty">
										<span>Currently resting. New dishes coming soon.</span>
									</div>
								{:else}
									<div class="grand-page__grid">
										{#each visibleItems as item, index}
											<MenuItemCard {item} accentColor={accent} index={index} />
										{/each}
									</div>
								{/if}
							</section>
						{/each}
					</div>
				</section>
			{/each}
		</div>
	</div>
</div>

<style lang="postcss">
	.page {
		position: relative;
		min-height: 100vh;
		background: linear-gradient(180deg, #f9ede8 0%, #ffffff 100%);
	}

	.page :global(.floating-shapes) {
		opacity: 0.6;
	}

	.page__content {
		position: relative;
		padding: clamp(2rem, 4vw, 4rem) 1.5rem 6rem;
		max-width: 1200px;
		margin: 0 auto;
		display: grid;
		gap: clamp(2rem, 4vw, 3.5rem);
	}

	.intro {
		display: grid;
		gap: 2rem;
		padding: clamp(1.5rem, 4vw, 3rem);
		border-radius: 48px;
		background: linear-gradient(120deg, rgba(255, 255, 255, 0.85), rgba(168, 195, 160, 0.18));
		box-shadow: 0 50px 120px -80px rgba(51, 51, 51, 0.45);
	}

	.intro__copy {
		display: grid;
		gap: 1rem;
		max-width: 60ch;
	}

	.intro__copy h2 {
		font-size: clamp(2rem, 5vw, 3.2rem);
		font-weight: 300;
		letter-spacing: -0.015em;
		color: #333;
	}

	.intro__copy p {
		font-size: 1.1rem;
		line-height: 1.9;
		color: rgba(51, 51, 51, 0.7);
	}

	.sections {
		display: grid;
		gap: clamp(2rem, 5vw, 3.75rem);
	}

	.grand-page {
		display: grid;
		gap: 2.75rem;
		padding: clamp(2.75rem, 5vw, 4rem) clamp(1.4rem, 4vw, 3.25rem);
		border-radius: 56px;
		background: rgba(255, 255, 255, 0.82);
		backdrop-filter: blur(12px);
		box-shadow: 0 60px 140px -100px rgba(51, 51, 51, 0.55);
		border: 1px solid rgba(255, 255, 255, 0.65);
		overflow: hidden;
		position: relative;
	}

	.grand-page::before {
		content: '';
		position: absolute;
		inset: -20% -20% auto -20%;
		height: 55%;
		background: radial-gradient(circle at top left, rgba(223, 188, 105, 0.18), transparent 60%);
		z-index: 0;
	}

	.grand-page__header {
		position: relative;
		z-index: 1;
		display: grid;
		gap: 0.75rem;
	}

	.grand-page__eyebrow {
		font-size: 0.8rem;
		letter-spacing: 0.4em;
		text-transform: uppercase;
		color: rgba(51, 51, 51, 0.55);
	}

	.grand-page__title {
		font-size: clamp(2.4rem, 6vw, 3.8rem);
		font-weight: 250;
		letter-spacing: -0.03em;
		color: rgba(51, 51, 51, 0.9);
	}

	.grand-page__sections {
		position: relative;
		z-index: 1;
		display: grid;
		gap: clamp(2.25rem, 5vw, 4rem);
	}

	.grand-page__section {
		position: relative;
		display: grid;
		gap: 2rem;
		padding: clamp(2.2rem, 4vw, 3.1rem) clamp(1.1rem, 2.5vw, 2.2rem);
		border-radius: 44px;
		background: rgba(255, 255, 255, 0.75);
		border: 1px solid rgba(255, 255, 255, 0.55);
		box-shadow: 0 35px 80px -70px rgba(51, 51, 51, 0.5);
		overflow: hidden;
	}

	.grand-page__section::before {
		content: '';
		position: absolute;
		top: 10%;
		right: -8%;
		width: clamp(220px, 34vw, 380px);
		height: clamp(220px, 34vw, 380px);
		background: radial-gradient(circle at top right, color-mix(in srgb, var(--accent) 35%, transparent), transparent 72%);
		z-index: 0;
	}

	.grand-page__section-header {
		position: relative;
		z-index: 1;
		display: grid;
		gap: 1rem;
	}

	.grand-page__section-title {
		font-size: clamp(1.9rem, 5vw, 2.7rem);
		font-weight: 300;
		letter-spacing: -0.02em;
		color: rgba(51, 51, 51, 0.9);
	}

	.grand-page__section-intro {
		font-size: 1.05rem;
		line-height: 1.85;
		color: rgba(51, 51, 51, 0.68);
		max-width: 60ch;
	}

	.grand-page__grid {
		position: relative;
		z-index: 1;
		display: grid;
		gap: 2rem;
	}

	.grand-page__empty {
		position: relative;
		z-index: 1;
		padding: 2.25rem;
		border-radius: 32px;
		background: rgba(51, 51, 51, 0.04);
		color: rgba(51, 51, 51, 0.6);
		font-size: 1rem;
		text-align: center;
	}

	@media (max-width: 768px) {
		.page__content {
			padding: 2rem 1rem 4rem;
		}

		.intro {
			gap: 1.5rem;
		}

		.intro__copy p {
			font-size: 1rem;
		}
	}
</style>

