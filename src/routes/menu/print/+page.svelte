<script lang="ts">
	import type { PageData } from './$types';
	import { page } from '$app/state';
	import MenuVariant1 from '$lib/components/menu/MenuVariant1.svelte';
	import MenuVariant2 from '$lib/components/menu/MenuVariant2.svelte';
	import { MenuPrintState } from './menu-print.state.svelte';
	import MenuPrintController from '$lib/components/menu/MenuPrintController.svelte';

	let { data }: { data: PageData } = $props();

	// Initialize state
	const state = new MenuPrintState(data.menu);

	const menu = $derived({
		...data.menu,
		grandCategories: data.menu.grandCategories
			.map((grand) => ({
				...grand,
				sections: grand.sections
					.filter((section) => section.items.length > 0)
			}))
			.filter((grand) => grand.sections.length > 0),
		sections: data.menu.sections
			.filter((section) => section.items.length > 0),
		highlights: data.menu.highlights
	});

	const activeVariant = $derived.by(() => {
		const raw = (page.url.searchParams.get('v') ?? '1').trim().toLowerCase();
		return raw === '2' ? '2' : '1';
	});
</script>

<MenuPrintController printState={state} />

<div class="bg-neutral-100 p-8 print:bg-white print:p-0">
	<div class="mx-auto w-full max-w-[21cm]">
		<nav class="mb-6 flex items-baseline justify-between text-[11px] uppercase tracking-[0.22em] text-neutral-500 print:hidden">
			<div class="flex gap-6">
				<a
					href="?v=1"
					class={activeVariant === '1'
						? 'text-neutral-900 underline underline-offset-4 decoration-neutral-400'
						: 'hover:text-neutral-900'}
				>
					Classic
				</a>
				<a
					href="?v=2"
					class={activeVariant === '2'
						? 'text-neutral-900 underline underline-offset-4 decoration-neutral-400'
						: 'hover:text-neutral-900'}
				>
					Modern
				</a>
			</div>
			<div class="text-neutral-400">Soft opening menu</div>
		</nav>

		<section class="bg-white p-12 shadow-xl w-full min-h-[29.7cm] print:shadow-none print:min-h-0">
			{#if activeVariant === '1'}
				<MenuVariant1 menu={menu} getVisibleModifiers={(id) => state.getFlatVisibleOptions(id)} />
			{:else}
				<MenuVariant2 menu={menu} getVisibleModifiers={(id) => state.getFlatVisibleOptions(id)} />
			{/if}
		</section>
	</div>
</div>
