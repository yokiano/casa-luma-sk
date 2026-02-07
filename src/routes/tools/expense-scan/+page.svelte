<script lang="ts">
  import { onMount } from 'svelte';
  import type { PageData } from './$types';
  import MultiFileDropZone from '$lib/components/ui/MultiFileDropZone.svelte';
  import SlipCard from '$lib/components/expense-scan/SlipCard.svelte';
  import ManualExpenseModal from '$lib/components/expense-scan/ManualExpenseModal.svelte';
  import { ExpenseScanState, type DropItem, type ScannedSlip } from './ExpenseScanState.svelte';

  let { data }: { data: PageData } = $props();

  const esState = new ExpenseScanState();
  
  $effect(() => {
    esState.rules = data.rules || [];
  });

  let activeTab = $state<'upload' | 'review'>('upload');
  let dropItems = $state<DropItem[]>([]);
  let defaults = $state<{ category?: string; department?: string; supplierId?: string }>({});
  let showManualModal = $state(false);

  onMount(() => {
    try {
      const raw = localStorage.getItem('expense-scan-defaults');
      if (raw) {
        defaults = JSON.parse(raw);
      }
    } catch {
      defaults = {};
    }
  });

  function persistDefaults(update: Partial<typeof defaults>) {
    defaults = { ...defaults, ...update };
    try {
      localStorage.setItem('expense-scan-defaults', JSON.stringify(defaults));
    } catch {
      // ignore storage failures
    }
  }

  function handleDropItems(items: DropItem[]) {
    dropItems = items;
    const existingIds = new Set(esState.slips.map((slip) => slip.id));
    const newItems = items.filter((item) => !existingIds.has(item.id));

    if (newItems.length > 0) {
      esState.addItems(newItems);
      for (const item of newItems) {
        if (defaults.category || defaults.department || defaults.supplierId) {
          esState.updateSlip(item.id, {
            category: defaults.category,
            department: defaults.department,
            supplierId: defaults.supplierId
          });
        }
      }
      activeTab = 'review';
      void esState.scanAll();
    }

    const incomingIds = new Set(items.map((item) => item.id));
    for (const slip of [...esState.slips]) {
      if (!incomingIds.has(slip.id)) {
        esState.removeSlip(slip.id);
      }
    }
  }

  function handleRemove(id: string) {
    esState.removeSlip(id);
    dropItems = dropItems.filter((item) => item.id !== id);
  }

  function handleUpdate(id: string, patch: Partial<ScannedSlip>) {
    esState.updateSlip(id, patch);
    if (patch.category || patch.department || patch.supplierId) {
      persistDefaults({
        category: patch.category ?? defaults.category,
        department: patch.department ?? defaults.department,
        supplierId: patch.supplierId ?? defaults.supplierId
      });
    }
  }
</script>

<div class="space-y-6">
  <div class="rounded-3xl border border-[#e0d6cc] bg-white p-6">
    <div class="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
      <div>
        <h1 class="text-2xl font-semibold text-[#2c2925]">Expense Scan</h1>
        <p class="mt-2 text-sm text-[#5c4a3d]/70">
          Upload transaction slips, review parsed data, and submit to the company ledger.
        </p>
      </div>
      <div class="flex flex-wrap gap-2">
        <button
          type="button"
          onclick={() => (showManualModal = true)}
          class="rounded-full border border-[#d8c9bb] px-4 py-2 text-sm font-semibold text-[#7a6550] hover:bg-[#f6f1eb]"
        >
          Add transaction manually
        </button>
        <button
          type="button"
          onclick={() => (activeTab = 'upload')}
          class={`rounded-full px-4 py-2 text-sm font-semibold ${
            activeTab === 'upload'
              ? 'bg-[#7a6550] text-white'
              : 'border border-[#d8c9bb] text-[#7a6550]'
          }`}
        >
          Upload
        </button>
        <button
          type="button"
          onclick={() => (activeTab = 'review')}
          class={`rounded-full px-4 py-2 text-sm font-semibold ${
            activeTab === 'review'
              ? 'bg-[#7a6550] text-white'
              : 'border border-[#d8c9bb] text-[#7a6550]'
          }`}
        >
          Review ({esState.slips.length})
        </button>
      </div>
    </div>
  </div>

  <ManualExpenseModal 
    open={showManualModal} 
    onClose={() => (showManualModal = false)}
    categories={data.categories}
    departments={data.departments}
    suppliers={data.suppliers}
    bankAccounts={data.bankAccounts}
    paymentMethods={data.paymentMethods}
  />

  {#if activeTab === 'upload'}
    <div class="rounded-3xl border border-[#e0d6cc] bg-white p-6">
      <h2 class="text-lg font-semibold text-[#2c2925]">Upload slips</h2>
      <p class="mt-2 text-sm text-[#5c4a3d]/70">
        Add multiple images at once. Scanning starts immediately after upload.
      </p>
      <div class="mt-6">
        <MultiFileDropZone value={dropItems} onFilesSelect={handleDropItems} maxFiles={200} maxSizeMB={8} />
      </div>
    </div>
  {:else}
    <div class="space-y-4">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex flex-wrap items-center gap-4">
          <p class="text-sm text-[#5c4a3d]/70">
            {esState.slips.length === 0 ? 'No slips uploaded yet.' : 'Review each slip and submit when ready.'}
          </p>
          {#if esState.slips.length > 0}
            <div class="flex items-center gap-2">
              <span class="text-xs font-medium text-[#5c4a3d]/50">Sort by:</span>
              <select
                class="rounded-lg border border-[#d8c9bb] bg-white px-2 py-1 text-xs text-[#7a6550] outline-none focus:border-[#7a6550]"
                value={esState.sortBy || ''}
                onchange={(e) => {
                  const val = (e.target as HTMLSelectElement).value;
                  esState.sortBy = val ? (val as any) : null;
                  if (val === 'ruleMatch') {
                    esState.sortOrder = 'asc'; // false (not matched) comes first
                  } else {
                    esState.sortOrder = 'desc'; // defaults to newest/highest/etc
                  }
                }}
              >
                <option value="">Original</option>
                <option value="date">Date</option>
                <option value="amount">Amount</option>
                <option value="recipient">Recipient</option>
                <option value="ruleMatch">Not Matched</option>
              </select>
              {#if esState.sortBy && esState.sortBy !== 'ruleMatch'}
                <button
                  type="button"
                  onclick={() => (esState.sortOrder = esState.sortOrder === 'asc' ? 'desc' : 'asc')}
                  class="rounded-lg border border-[#d8c9bb] p-1 text-[#7a6550] hover:bg-[#fcfaf8]"
                >
                  {#if esState.sortOrder === 'asc'}
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 7-7 7 7"/><path d="M12 19V5"/></svg>
                  {:else}
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"/><path d="m19 12-7 7-7-7"/></svg>
                  {/if}
                </button>
              {/if}
            </div>
          {/if}
        </div>
        {#if esState.slips.length > 0}
          <button
            type="button"
            onclick={() => esState.submitAll()}
            class="rounded-full bg-[#7a6550] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            disabled={esState.isSubmittingAll}
          >
            Submit all ready slips
          </button>
        {/if}
      </div>

      <div class="grid gap-4">
        {#each esState.sortedSlips as slip (slip.id)}
          <SlipCard
            {slip}
            categories={data.categories}
            departments={data.departments}
            suppliers={data.suppliers}
            onRemove={handleRemove}
            onSubmit={(id) => esState.submitSlip(id)}
            onUpdate={handleUpdate}
            onScan={(id) => esState.scanSlip(id)}
          />
        {/each}
      </div>
    </div>
  {/if}
</div>
