<script lang="ts">
  type SupplierOption = { id: string; name: string };

  type ScannedSlip = {
    id: string;
    imageDataUrl: string;
    fileName: string;
    status: 'pending' | 'scanning' | 'scanned' | 'submitting' | 'submitted' | 'error';
    parsedTitle?: string | null;
    parsedAmount?: number | null;
    parsedDate?: string | null;
    parsedRecipientName?: string | null;
    parsedTransactionId?: string | null;
    category?: string;
    department?: string;
    supplierId?: string;
    error?: string | null;
  };

  interface Props {
    slip: ScannedSlip;
    categories: string[];
    departments: string[];
    suppliers: SupplierOption[];
    onRemove: (id: string) => void;
    onSubmit: (id: string) => void;
    onUpdate: (id: string, patch: Partial<ScannedSlip>) => void;
    onScan: (id: string) => void;
  }

  let {
    slip,
    categories,
    departments,
    suppliers,
    onRemove,
    onSubmit,
    onUpdate,
    onScan
  }: Props = $props();

  let showLightbox = $state(false);

  const statusLabel = $derived.by(() => {
    if (slip.status === 'pending') return 'Pending';
    if (slip.status === 'scanning') return 'Scanning...';
    if (slip.status === 'scanned') return 'Ready';
    if (slip.status === 'submitting') return 'Submitting';
    if (slip.status === 'submitted') return 'Submitted';
    return 'Error';
  });
</script>

<div class="relative rounded-3xl border border-[#e0d6cc] bg-white p-4 shadow-sm overflow-hidden">
  {#if slip.status === 'scanning' || slip.status === 'submitting'}
    <div class="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/60 backdrop-blur-[2px]">
      <div class="h-8 w-8 animate-spin rounded-full border-4 border-[#7a6550] border-t-transparent"></div>
      <p class="mt-2 text-sm font-medium text-[#5c4a3d]">{statusLabel}</p>
    </div>
  {/if}

  <div class="flex flex-col gap-4 sm:flex-row">
    <div class="w-full sm:w-44">
      <button 
        type="button" 
        onclick={() => (showLightbox = true)}
        class="group relative aspect-[4/5] w-full overflow-hidden rounded-2xl bg-[#f1e9df] transition-transform hover:scale-[1.02] active:scale-[0.98]"
      >
        <img src={slip.imageDataUrl} alt={slip.fileName} class="h-full w-full object-cover object-center" />
        <div class="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition-opacity group-hover:opacity-100">
          <svg class="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
          </svg>
        </div>
      </button>
      <p class="mt-2 truncate text-xs text-[#5c4a3d]/60">{slip.fileName}</p>
    </div>

    <div class="flex-1 space-y-3">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm font-semibold text-[#2c2925]">{slip.parsedTitle ?? 'No title detected'}</p>
          <p class="text-xs text-[#5c4a3d]/60">
            {slip.parsedRecipientName ?? 'Supplier not detected'}
          </p>
        </div>
        <span class="rounded-full bg-[#f6f1eb] px-3 py-1 text-xs font-semibold text-[#5c4a3d]">
          {statusLabel}
        </span>
      </div>

      <div class="grid gap-2 text-sm text-[#2c2925] sm:grid-cols-3">
        <div>
          <p class="text-xs uppercase tracking-wide text-[#5c4a3d]/60">Amount</p>
          <p class="font-semibold">{slip.parsedAmount ?? '-'}</p>
        </div>
        <div>
          <p class="text-xs uppercase tracking-wide text-[#5c4a3d]/60">Date</p>
          <p class="font-semibold">{slip.parsedDate ?? '-'}</p>
        </div>
        <div>
          <p class="text-xs uppercase tracking-wide text-[#5c4a3d]/60">Reference</p>
          <p class="truncate font-semibold">{slip.parsedTransactionId ?? '-'}</p>
        </div>
      </div>

      <div class="grid gap-3 sm:grid-cols-3">
        <label class="text-xs font-semibold text-[#5c4a3d]">
          Category
          <select
            class="mt-1 w-full rounded-2xl border border-[#d9d0c7] bg-white px-3 py-2 text-sm"
            value={slip.category ?? ''}
            onchange={(event) => onUpdate(slip.id, { category: (event.target as HTMLSelectElement).value })}
          >
            <option value="" disabled>Select</option>
            {#each categories as category}
              <option value={category}>{category}</option>
            {/each}
          </select>
        </label>

        <label class="text-xs font-semibold text-[#5c4a3d]">
          Department
          <select
            class="mt-1 w-full rounded-2xl border border-[#d9d0c7] bg-white px-3 py-2 text-sm"
            value={slip.department ?? ''}
            onchange={(event) => onUpdate(slip.id, { department: (event.target as HTMLSelectElement).value })}
          >
            <option value="" disabled>Select</option>
            {#each departments as department}
              <option value={department}>{department}</option>
            {/each}
          </select>
        </label>

        <label class="text-xs font-semibold text-[#5c4a3d]">
          Supplier (Optional)
          <select
            class="mt-1 w-full rounded-2xl border border-[#d9d0c7] bg-white px-3 py-2 text-sm"
            value={slip.supplierId ?? ''}
            onchange={(event) => onUpdate(slip.id, { supplierId: (event.target as HTMLSelectElement).value })}
          >
            <option value="">None</option>
            {#each suppliers as supplier}
              <option value={supplier.id}>{supplier.name}</option>
            {/each}
          </select>
        </label>
      </div>

      {#if slip.error}
        <div class="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {slip.error}
        </div>
      {/if}

      <div class="flex flex-wrap gap-2">
        <button
          type="button"
          onclick={() => onSubmit(slip.id)}
          class="rounded-full bg-[#7a6550] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          disabled={slip.status !== 'scanned' || !slip.parsedAmount}
        >
          Submit to Notion
        </button>
        <button
          type="button"
          onclick={() => onScan(slip.id)}
          class="rounded-full border border-[#d8c9bb] px-4 py-2 text-sm font-semibold text-[#7a6550] hover:bg-[#f6f1eb]"
        >
          {slip.status === 'error' ? 'Try Again' : 'Analyze Again'}
        </button>
        <button
          type="button"
          onclick={() => onRemove(slip.id)}
          class="rounded-full border border-[#d8c9bb] px-4 py-2 text-sm font-semibold text-[#7a6550]"
        >
          Remove
        </button>
      </div>
    </div>
  </div>
</div>

{#if showLightbox}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div 
    class="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
    onclick={() => (showLightbox = false)}
  >
    <button 
      type="button"
      class="absolute right-6 top-6 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
      onclick={() => (showLightbox = false)}
    >
      <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
    <img 
      src={slip.imageDataUrl} 
      alt={slip.fileName} 
      class="max-h-full max-w-full rounded-lg object-contain shadow-2xl"
      onclick={(e) => e.stopPropagation()}
    />
  </div>
{/if}
