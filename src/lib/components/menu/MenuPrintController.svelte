<script lang="ts">
	import { MenuPrintState } from '../../../routes/menu/print/menu-print.state.svelte';
	import type { MenuModifier } from '$lib/types/menu';
	import { ChevronDown, ChevronUp, Eye, EyeOff, Plus, X } from 'lucide-svelte';

	let { printState }: { printState: MenuPrintState } = $props();

	let isExpanded = $state(false);
	let addingModifierToSection = $state<string | null>(null); // sectionId
	let editingDescription = $state<string | null>(null); // sectionId or grandCategoryId
	let descriptionText = $state('');
	let editingModifierDescription = $state<string | null>(null); // modifierId
	let modifierDescriptionText = $state('');
</script>

<div class="sticky top-0 z-50 mb-8 w-full border-b border-neutral-200 bg-white/95 px-4 py-4 shadow-sm backdrop-blur print:hidden">
	<div class="mx-auto max-w-4xl">
		<div class="flex items-center justify-between">
			<h2 class="text-sm font-semibold uppercase tracking-wider text-neutral-900">
				Menu Customization
			</h2>
			<button
				type="button"
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
				<div class="text-xs font-semibold uppercase tracking-wider text-neutral-500 mt-2 mb-1">Grand Categories</div>
				{#each printState.allGrandCategories as grand (grand.id)}
					<div class="rounded-lg border border-neutral-100 bg-neutral-50 px-3 py-2">
						<div class="mb-1 flex items-center justify-between gap-2">
							<span class="text-xs font-bold text-neutral-800">{grand.name}</span>
							<button
								type="button"
								title="Edit Description"
								onclick={() => {
									editingDescription = grand.id;
									descriptionText = printState.getCustomDescription(grand.id);
								}}
								class="rounded px-2 py-1 text-[10px] font-medium text-neutral-500 hover:bg-white hover:text-neutral-900 hover:shadow-sm"
							>
								{printState.getCustomDescription(grand.id) ? 'Edit' : 'Add'} Description
							</button>
						</div>
						{#if editingDescription === grand.id}
							<div class="mt-2 rounded border border-blue-100 bg-blue-50 p-2">
								<textarea
									bind:value={descriptionText}
									placeholder="Enter description for {grand.name}..."
									class="w-full rounded border border-blue-200 bg-white px-2 py-1.5 text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-300"
									rows="2"
								></textarea>
								<div class="mt-1.5 flex gap-1.5">
									<button
										type="button"
										onclick={() => {
											printState.setCustomDescription(grand.id, descriptionText);
											editingDescription = null;
											descriptionText = '';
										}}
										class="rounded bg-blue-600 px-2 py-1 text-[10px] font-medium text-white hover:bg-blue-700"
									>
										Save
									</button>
									<button
										type="button"
										onclick={() => {
											editingDescription = null;
											descriptionText = '';
										}}
										class="rounded border border-blue-200 bg-white px-2 py-1 text-[10px] font-medium text-blue-600 hover:bg-blue-50"
									>
										Cancel
									</button>
									{#if printState.getCustomDescription(grand.id)}
										<button
											type="button"
											onclick={() => {
												printState.setCustomDescription(grand.id, '');
												editingDescription = null;
												descriptionText = '';
											}}
											class="ml-auto rounded border border-red-200 bg-white px-2 py-1 text-[10px] font-medium text-red-600 hover:bg-red-50"
										>
											Remove
										</button>
									{/if}
								</div>
							</div>
						{:else if printState.getCustomDescription(grand.id)}
							<p class="mt-1 text-[11px] italic text-neutral-600">{printState.getCustomDescription(grand.id)}</p>
						{/if}
					</div>
				{/each}

				<div class="text-xs font-semibold uppercase tracking-wider text-neutral-500 mt-4 mb-1">Sections</div>
				{#each printState.allSections as { section, uniqueKey } (uniqueKey)}
					{@const sectionModifiers = printState.getSectionModifiers(section.id)}
					<div class="rounded-lg border border-neutral-100 bg-neutral-50 px-3 py-2">
						<div class="mb-1 flex items-center justify-between gap-2">
							<span class="text-xs font-bold text-neutral-800">{section.name}</span>
							<div class="flex gap-1">
								<button
									type="button"
									title="Edit Description"
									onclick={() => {
										editingDescription = section.id;
										descriptionText = printState.getCustomDescription(section.id);
									}}
									class="rounded px-2 py-1 text-[10px] font-medium text-neutral-500 hover:bg-white hover:text-neutral-900 hover:shadow-sm"
								>
									{printState.getCustomDescription(section.id) ? 'Edit' : 'Add'} Description
								</button>
								{#if sectionModifiers.length > 0}
									<button
										type="button"
										title="Show all"
										onclick={() => printState.showAllForTarget(section.id)}
										class="rounded p-1 text-neutral-400 hover:bg-white hover:text-green-600 hover:shadow-sm"
									>
										<Eye class="h-3.5 w-3.5" />
									</button>
									<button
										type="button"
										title="Hide all"
										onclick={() => printState.hideAllForTarget(section.id, sectionModifiers)}
										class="rounded p-1 text-neutral-400 hover:bg-white hover:text-red-600 hover:shadow-sm"
									>
										<EyeOff class="h-3.5 w-3.5" />
									</button>
								{/if}
								<button
									type="button"
									title="Add Modifier"
									onclick={() => addingModifierToSection = addingModifierToSection === section.id ? null : section.id}
									class="rounded p-1 text-neutral-400 hover:bg-white hover:text-blue-600 hover:shadow-sm"
									class:text-blue-600={addingModifierToSection === section.id}
									class:bg-white={addingModifierToSection === section.id}
								>
									<Plus class="h-3.5 w-3.5" />
								</button>
							</div>
						</div>

						{#if addingModifierToSection === section.id}
							<div class="mb-3 mt-2 rounded border border-blue-100 bg-blue-50 p-2">
								<div class="mb-1.5 flex items-center justify-between text-[10px] uppercase font-bold text-blue-600">
									<span>Add Modifier to {section.name}</span>
									<button type="button" onclick={() => addingModifierToSection = null} class="text-blue-400 hover:text-blue-700">
										<X class="h-3 w-3" />
									</button>
								</div>
								<div class="flex flex-wrap gap-1">
									{#each printState.menu.allModifiers || [] as mod}
										{@const isAttached = sectionModifiers.some((m: MenuModifier) => m.id === mod.id)}
										<button
											type="button"
											class="rounded border px-2 py-1 text-[10px] transition-colors
												{isAttached 
													? 'border-blue-200 bg-blue-100 text-blue-800' 
													: 'border-white bg-white text-neutral-600 hover:border-blue-200 hover:text-blue-700'}"
											onclick={() => printState.toggleManualModifier(section.id, mod.id)}
										>
											{mod.name}
										</button>
									{/each}
								</div>
							</div>
						{/if}

						{#if editingDescription === section.id}
							<div class="mt-2 rounded border border-blue-100 bg-blue-50 p-2">
								<textarea
									bind:value={descriptionText}
									placeholder="Enter description for {section.name}..."
									class="w-full rounded border border-blue-200 bg-white px-2 py-1.5 text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-300"
									rows="2"
								></textarea>
								<div class="mt-1.5 flex gap-1.5">
									<button
										type="button"
										onclick={() => {
											printState.setCustomDescription(section.id, descriptionText);
											editingDescription = null;
											descriptionText = '';
										}}
										class="rounded bg-blue-600 px-2 py-1 text-[10px] font-medium text-white hover:bg-blue-700"
									>
										Save
									</button>
									<button
										type="button"
										onclick={() => {
											editingDescription = null;
											descriptionText = '';
										}}
										class="rounded border border-blue-200 bg-white px-2 py-1 text-[10px] font-medium text-blue-600 hover:bg-blue-50"
									>
										Cancel
									</button>
									{#if printState.getCustomDescription(section.id)}
										<button
											type="button"
											onclick={() => {
												printState.setCustomDescription(section.id, '');
												editingDescription = null;
												descriptionText = '';
											}}
											class="ml-auto rounded border border-red-200 bg-white px-2 py-1 text-[10px] font-medium text-red-600 hover:bg-red-50"
										>
											Remove
										</button>
									{/if}
								</div>
							</div>
						{:else if printState.getCustomDescription(section.id)}
							<p class="mt-1 text-[11px] italic text-neutral-600">{printState.getCustomDescription(section.id)}</p>
						{/if}

						{#if sectionModifiers.length > 0}
							<div class="space-y-1.5">
								{#each sectionModifiers as modifier (modifier.id)}
									<div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
										<label class="flex cursor-pointer items-center gap-1.5 rounded py-0.5 hover:bg-white hover:shadow-sm">
											<input
												type="checkbox"
												checked={printState.isModifierVisible(section.id, modifier.id)}
												onchange={() => printState.toggleModifier(section.id, modifier.id)}
												class="h-3.5 w-3.5 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
											/>
											<span class="select-none font-semibold text-neutral-700" class:opacity-50={!printState.isModifierVisible(section.id, modifier.id)}>
												{modifier.name}:
											</span>
										</label>

										<button
											type="button"
											title="Edit Modifier Description"
											onclick={() => {
												editingModifierDescription = modifier.id;
												modifierDescriptionText = printState.getModifierDescription(modifier.id);
											}}
											class="rounded px-1.5 py-0.5 text-[9px] font-medium text-neutral-400 hover:bg-white hover:text-neutral-700 hover:shadow-sm"
										>
											{printState.getModifierDescription(modifier.id) ? 'Edit' : 'Add'} Desc
										</button>

										<div class="flex flex-wrap gap-x-3 gap-y-1">
											{#each modifier.options as option}
												<label class="flex cursor-pointer items-center gap-1.5 rounded py-0.5 hover:bg-white/50">
													<input
														type="checkbox"
														checked={printState.isOptionVisible(section.id, modifier.id, option.name)}
														onchange={() => printState.toggleOption(section.id, modifier.id, option.name)}
														disabled={!printState.isModifierVisible(section.id, modifier.id)}
														class="h-3 w-3 rounded border-neutral-300 text-neutral-600 focus:ring-neutral-900 disabled:opacity-50"
													/>
													<span 
														class="select-none text-[11px] text-neutral-600 transition-opacity" 
														class:opacity-50={!printState.isOptionVisible(section.id, modifier.id, option.name) || !printState.isModifierVisible(section.id, modifier.id)}
													>
														{option.name}
													</span>
												</label>
											{/each}
										</div>
										{#if editingModifierDescription === modifier.id}
											<div class="mt-1.5 rounded border border-blue-100 bg-blue-50 p-2">
												<textarea
													bind:value={modifierDescriptionText}
													placeholder="Enter description for {modifier.name}..."
													class="w-full rounded border border-blue-200 bg-white px-2 py-1 text-[10px] text-neutral-900 placeholder:text-neutral-400 focus:border-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-300"
													rows="1"
												></textarea>
												<div class="mt-1 flex gap-1">
													<button
														type="button"
														onclick={() => {
															printState.setModifierDescription(modifier.id, modifierDescriptionText);
															editingModifierDescription = null;
															modifierDescriptionText = '';
														}}
														class="rounded bg-blue-600 px-1.5 py-0.5 text-[9px] font-medium text-white hover:bg-blue-700"
													>
														Save
													</button>
													<button
														type="button"
														onclick={() => {
															editingModifierDescription = null;
															modifierDescriptionText = '';
														}}
														class="rounded border border-blue-200 bg-white px-1.5 py-0.5 text-[9px] font-medium text-blue-600 hover:bg-blue-50"
													>
														Cancel
													</button>
													{#if printState.getModifierDescription(modifier.id)}
														<button
															type="button"
															onclick={() => {
																printState.setModifierDescription(modifier.id, '');
																editingModifierDescription = null;
																modifierDescriptionText = '';
															}}
															class="ml-auto rounded border border-red-200 bg-white px-1.5 py-0.5 text-[9px] font-medium text-red-600 hover:bg-red-50"
														>
															Remove
														</button>
													{/if}
												</div>
											</div>
										{/if}
									</div>
								{/each}
							</div>
						{:else}
							<div class="text-[10px] text-neutral-400 italic">No modifiers attached</div>
						{/if}
					</div>
				{/each}

				{#if printState.itemsWithModifiers.length > 0}
					<div class="text-xs font-semibold uppercase tracking-wider text-neutral-500 mt-4 mb-1">Items</div>
					{#each printState.itemsWithModifiers as item (item.id)}
						<div class="rounded-lg border border-neutral-100 bg-neutral-50 px-3 py-2">
							<div class="mb-1 flex items-center justify-between gap-2">
								<span class="text-xs font-bold text-neutral-800">{item.name}</span>
								<div class="flex gap-1">
									<button
										type="button"
										title="Show all"
										onclick={() => printState.showAllForTarget(item.id)}
										class="rounded p-1 text-neutral-400 hover:bg-white hover:text-green-600 hover:shadow-sm"
									>
										<Eye class="h-3.5 w-3.5" />
									</button>
									<button
										type="button"
										title="Hide all"
										onclick={() => printState.hideAllForTarget(item.id, item.modifiers || [])}
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

										<button
											type="button"
											title="Edit Modifier Description"
											onclick={() => {
												editingModifierDescription = modifier.id;
												modifierDescriptionText = printState.getModifierDescription(modifier.id);
											}}
											class="rounded px-1.5 py-0.5 text-[9px] font-medium text-neutral-400 hover:bg-white hover:text-neutral-700 hover:shadow-sm"
										>
											{printState.getModifierDescription(modifier.id) ? 'Edit' : 'Add'} Desc
										</button>

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
										{#if editingModifierDescription === modifier.id}
											<div class="mt-1.5 rounded border border-blue-100 bg-blue-50 p-2">
												<textarea
													bind:value={modifierDescriptionText}
													placeholder="Enter description for {modifier.name}..."
													class="w-full rounded border border-blue-200 bg-white px-2 py-1 text-[10px] text-neutral-900 placeholder:text-neutral-400 focus:border-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-300"
													rows="1"
												></textarea>
												<div class="mt-1 flex gap-1">
													<button
														type="button"
														onclick={() => {
															printState.setModifierDescription(modifier.id, modifierDescriptionText);
															editingModifierDescription = null;
															modifierDescriptionText = '';
														}}
														class="rounded bg-blue-600 px-1.5 py-0.5 text-[9px] font-medium text-white hover:bg-blue-700"
													>
														Save
													</button>
													<button
														type="button"
														onclick={() => {
															editingModifierDescription = null;
															modifierDescriptionText = '';
														}}
														class="rounded border border-blue-200 bg-white px-1.5 py-0.5 text-[9px] font-medium text-blue-600 hover:bg-blue-50"
													>
														Cancel
													</button>
													{#if printState.getModifierDescription(modifier.id)}
														<button
															type="button"
															onclick={() => {
																printState.setModifierDescription(modifier.id, '');
																editingModifierDescription = null;
																modifierDescriptionText = '';
															}}
															class="ml-auto rounded border border-red-200 bg-white px-1.5 py-0.5 text-[9px] font-medium text-red-600 hover:bg-red-50"
														>
															Remove
														</button>
													{/if}
												</div>
											</div>
										{/if}
									</div>
								{/each}
							</div>
						</div>
					{/each}
				{/if}
			</div>
		{/if}
	</div>
</div>
