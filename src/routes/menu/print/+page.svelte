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

	const debug = $derived.by(() => (page.url.searchParams.get('debug') ?? '').trim() === '1');
</script>

<MenuPrintController printState={state} />

<div class="bg-neutral-100 p-8 print:bg-white print:p-0">
	<div class="mx-auto w-full max-w-[21cm]">
		{#if debug}
			<div class="mb-6 rounded-lg border border-neutral-200 bg-white p-4 text-xs text-neutral-800 print:hidden">
				<div class="mb-2 font-semibold uppercase tracking-wider text-neutral-600">Debug: menu payload</div>
				<div class="space-y-3">
					<div>
						<div class="font-semibold text-neutral-700">Grand categories</div>
						<ul class="mt-1 space-y-1">
							{#each data.menu.grandCategories as gc (gc.id)}
								<li>
									<div class="font-medium">{gc.name}</div>
									<ul class="ml-4 mt-1 list-disc space-y-1">
										{#each gc.sections as s (s.id)}
											<li>
												<span class="font-medium">{s.name}</span>
												<span class="text-neutral-500">({s.items.length})</span>
												{#if s.items.length > 0}
													<div class="mt-1 text-neutral-600">
														{s.items.map((i) => i.name).join(' | ')}
													</div>
												{/if}
											</li>
										{/each}
									</ul>
								</li>
							{/each}
						</ul>
					</div>

					<div>
						<div class="font-semibold text-neutral-700">Flat sections</div>
						<ul class="mt-1 list-disc space-y-1 ml-4">
							{#each data.menu.sections as s (s.id)}
								<li>
									<span class="font-medium">{s.name}</span>
									<span class="text-neutral-500">({s.items.length})</span>
									{#if s.items.length > 0}
										<div class="mt-1 text-neutral-600">
											{s.items.map((i) => i.name).join(' | ')}
										</div>
									{/if}
								</li>
							{/each}
						</ul>
					</div>
				</div>
			</div>
		{/if}

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
				<MenuVariant1
					menu={menu}
					getVisibleModifiers={(id) => state.getFlatVisibleOptions(id)}
					isItemVisible={(id) => state.isItemVisible(id)}
				/>
			{:else}
				<MenuVariant2 
					menu={menu} 
					getVisibleModifiers={(id) => state.getFlatVisibleOptions(id)}
					getCustomDescription={(id) => state.getCustomDescription(id)}
					getGroupedModifiers={(id) => state.getGroupedVisibleModifiers(id)}
					getModifierDescription={(id) => state.getModifierDescription(id)}
					isGrandCategoryTitleVisible={(id) => state.isGrandCategoryTitleVisible(id)}
					isSectionTitleVisible={(id) => state.isSectionTitleVisible(id)}
					isItemVisible={(id) => state.isItemVisible(id)}
				/>
			{/if}
		</section>
	</div>
</div>
