<script lang="ts">
	import type { MenuPrintState } from '$routes/menu/print/menu-print.state.svelte';
	import { ChevronDown, ChevronUp, Eye, EyeOff } from 'lucide-svelte';

	let { printState }: { printState: MenuPrintState } = $props();

	let isExpanded = $state(true);
</script>

<div class="sticky top-0 z-50 mb-8 w-full border-b border-neutral-200 bg-white/95 px-4 py-4 shadow-sm backdrop-blur print:hidden">
	<div class="mx-auto max-w-4xl">
		<div class="flex items-center justify-between">
			<h2 class="text-sm font-semibold uppercase tracking-wider text-neutral-900">
				Modifier Visibility
			</h2>
			<button
				onclick={() => (isExpanded = !isExpanded)}
				class="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-100"
			>
				{#if isExpanded}
					<ChevronUp class="h-4 w-4" />
					Collapse
				{:else}
					<ChevronDown class="h-4 w-4" />
					Expand
				{/if}
			</button>
		</div>

		{#if isExpanded}
			<div class="mt-4 flex flex-col gap-2 max-h-[40vh] overflow-y-auto pr-2">
				{#each printState.itemsWithModifiers as item (item.id)}
					<div class="rounded-lg border border-neutral-100 bg-neutral-50 px-3 py-2">
						<div class="mb-1 flex items-center justify-between gap-2">
							<span class="text-xs font-bold text-neutral-800">{item.name}</span>
							<div class="flex gap-1">
								<button
									title="Show all"
									onclick={() => printState.showAllForItem(item.id)}
									class="rounded p-1 text-neutral-400 hover:bg-white hover:text-green-600 hover:shadow-sm"
								>
									<Eye class="h-3.5 w-3.5" />
								</button>
								<button
									title="Hide all"
									onclick={() => printState.hideAllForItem(item.id)}
									class="rounded p-1 text-neutral-400 hover:bg-white hover:text-red-600 hover:shadow-sm"
								>
									<EyeOff class="h-3.5 w-3.5" />
								</button>
							</div>
						</div>

						<div class="space-y-1.5">
							{#each item.modifiers || [] as modifier (modifier.id)}
								<div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
									<label class="flex cursor-pointer items-center gap-1.5 rounded py-0.5 hover:bg-white hover:shadow-sm">
										<input
											type="checkbox"
											checked={printState.isModifierVisible(item.id, modifier.id)}
											onchange={() => printState.toggleModifier(item.id, modifier.id)}
											class="h-3.5 w-3.5 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
										/>
										<span class="select-none font-semibold text-neutral-700" class:opacity-50={!printState.isModifierVisible(item.id, modifier.id)}>
											{modifier.name}:
										</span>
									</label>

									<div class="flex flex-wrap gap-x-3 gap-y-1">
										{#each modifier.options as option}
											<label class="flex cursor-pointer items-center gap-1.5 rounded py-0.5 hover:bg-white/50">
												<input
													type="checkbox"
													checked={printState.isOptionVisible(item.id, modifier.id, option.name)}
													onchange={() => printState.toggleOption(item.id, modifier.id, option.name)}
													disabled={!printState.isModifierVisible(item.id, modifier.id)}
													class="h-3 w-3 rounded border-neutral-300 text-neutral-600 focus:ring-neutral-900 disabled:opacity-50"
												/>
												<span 
													class="select-none text-[11px] text-neutral-600 transition-opacity" 
													class:opacity-50={!printState.isOptionVisible(item.id, modifier.id, option.name) || !printState.isModifierVisible(item.id, modifier.id)}
												>
													{option.name}
												</span>
											</label>
										{/each}
									</div>
								</div>
							{/each}
						</div>
					</div>
				{/each}

				{#if printState.itemsWithModifiers.length === 0}
					<div class="py-8 text-center text-xs text-neutral-400">
						No items with modifiers found in the menu.
					</div>
				{/if}
			</div>
		{/if}
	</div>
</div>
