<script lang="ts">
	import { getMenuSummary } from '$lib/menu.remote';
	import FloatingShapes3 from '$lib/components/workshops/FloatingShapes3.svelte';
	import SectionHero from '$lib/components/layout/SectionHero.svelte';
	import MenuFilters from '$lib/components/menu/MenuFilters.svelte';
	import MenuHighlights from '$lib/components/menu/MenuHighlights.svelte';
	import MenuSection from '$lib/components/menu/MenuSection.svelte';
	import MenuDietaryLegend from '$lib/components/menu/MenuDietaryLegend.svelte';

	const SCROLL_OFFSET = 160;
	const ACTIVE_OFFSET = 200;

	let menu = $state(await getMenuSummary());
	let activeSection = $state('All');

	const allSections = $derived(menu.sections.map((section) => section.name));
	const visibleSections = $derived(menu.sections);

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

		<MenuHighlights items={menu.highlights} />

		<div class="sections">
			{#each visibleSections as section}
				<div data-menu-section={section.name}>
					<MenuSection section={section} />
				</div>
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

