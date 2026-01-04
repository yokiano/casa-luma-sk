<script lang="ts">
    import ChecklistPrintView from '$lib/components/checklist/ChecklistPrintView.svelte';
	import type { PageData } from './$types';
	import { page } from '$app/state';

	let { data }: { data: PageData } = $props();

	// Group SOPs by 'When' for the filter
	const groupedSops = $derived.by(() => {
		const groups = {
			Opening: [] as typeof data.sops,
			Closing: [] as typeof data.sops,
			Other: [] as typeof data.sops
		};

		data.sops.forEach((sop) => {
			if (sop.when === 'Opening') {
				groups.Opening.push(sop);
			} else if (sop.when === 'Closing') {
				groups.Closing.push(sop);
			} else {
				groups.Other.push(sop);
			}
		});

		return groups;
	});

    const selectedId = $derived(page.url.searchParams.get('id'));
    const selectedSopSummary = $derived(data.sops.find(s => s.id === selectedId));

    function selectSop(id: string) {
        const url = new URL(window.location.href);
        url.searchParams.set('id', id);
        window.location.href = url.toString();
    }
</script>

<div class="space-y-6">
    <!-- Filter Chips -->
    <div class="flex flex-wrap gap-2">
        {#if groupedSops.Opening.length > 0}
            <div class="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-neutral-200 shadow-sm">
                <span class="text-xs font-bold uppercase tracking-wider text-orange-600">Opening</span>
                <div class="h-4 w-px bg-neutral-200"></div>
                {#each groupedSops.Opening as sop}
                    <button 
                        onclick={() => selectSop(sop.id)}
                        class="text-xs px-2 py-1 rounded-full transition-colors {selectedId === sop.id ? 'bg-orange-100 text-orange-800 font-medium' : 'hover:bg-neutral-100 text-neutral-600'}"
                    >
                        {sop.name}
                    </button>
                {/each}
            </div>
        {/if}

        {#if groupedSops.Closing.length > 0}
            <div class="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-neutral-200 shadow-sm">
                <span class="text-xs font-bold uppercase tracking-wider text-blue-600">Closing</span>
                <div class="h-4 w-px bg-neutral-200"></div>
                {#each groupedSops.Closing as sop}
                    <button 
                        onclick={() => selectSop(sop.id)}
                        class="text-xs px-2 py-1 rounded-full transition-colors {selectedId === sop.id ? 'bg-blue-100 text-blue-800 font-medium' : 'hover:bg-neutral-100 text-neutral-600'}"
                    >
                        {sop.name}
                    </button>
                {/each}
            </div>
        {/if}

        {#if groupedSops.Other.length > 0}
            <div class="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-neutral-200 shadow-sm">
                <span class="text-xs font-bold uppercase tracking-wider text-neutral-500">Other</span>
                <div class="h-4 w-px bg-neutral-200"></div>
                {#each groupedSops.Other as sop}
                    <button 
                        onclick={() => selectSop(sop.id)}
                        class="text-xs px-2 py-1 rounded-full transition-colors {selectedId === sop.id ? 'bg-neutral-100 text-neutral-800 font-medium' : 'hover:bg-neutral-50 text-neutral-600'}"
                    >
                        {sop.name}
                    </button>
                {/each}
            </div>
        {/if}
    </div>

    <!-- Main Content -->
    <div class="bg-neutral-100/50 rounded-xl border border-neutral-200 p-8 min-h-[60vh] flex flex-col items-center justify-center">
        {#if data.selectedSop}
            <div class="w-full max-w-[21cm] relative group">
                <!-- Print Action Bar -->
                <div class="absolute -top-12 right-0 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <a 
                        href="/print/checklist/{data.selectedSop.id}" 
                        target="_blank"
                        class="inline-flex items-center gap-2 bg-neutral-900 text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg hover:bg-neutral-800 transition-colors"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-printer"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect width="12" height="8" x="6" y="14"/></svg>
                        Print Checklist
                    </a>
                </div>

                <div class="shadow-xl">
                    <ChecklistPrintView sop={data.selectedSop} />
                </div>
            </div>
        {:else}
            <div class="text-center max-w-md">
                <div class="w-16 h-16 bg-white rounded-full shadow-sm border border-neutral-100 flex items-center justify-center mx-auto mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-check-square text-neutral-400"><path d="m9 11 3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
                </div>
                <h3 class="text-lg font-medium text-neutral-900 mb-2">Select a Checklist</h3>
                <p class="text-neutral-500 text-sm">Choose a checklist from the options above to preview and print. Opening and Closing checklists are grouped for easy access.</p>
            </div>
        {/if}
    </div>
</div>
