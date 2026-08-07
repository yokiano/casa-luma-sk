<script lang="ts">
  import { onDestroy } from 'svelte';
  import { searchReceiptAnalyticsFilterOptions } from '$lib/receipts.remote';
  import { searchFamilies } from '$lib/tools/families/families.remote';
  import type { MgmtAnalyticsFilterOption } from '$lib/mgmt-dashboard/analytics-filters.svelte';

  type FilterKind = 'customer' | 'item' | 'payment';
  type Props = {
    kind: FilterKind;
    label: string;
    placeholder: string;
    selected: MgmtAnalyticsFilterOption[];
    multiple?: boolean;
    onToggle: (option: MgmtAnalyticsFilterOption) => void;
  };

  let { kind, label, placeholder, selected, multiple = true, onToggle }: Props = $props();
  let search = $state('');
  let results = $state<MgmtAnalyticsFilterOption[]>([]);
  let loading = $state(false);
  let searched = $state(false);
  let timer: ReturnType<typeof setTimeout> | null = null;
  let requestId = 0;

  const isSelected = (id: string) => selected.some((option) => option.id === id);

  const runSearch = async (value: string, currentRequest: number) => {
    // Normalize customer input before using the shared family search, which matches the tools search case-insensitively.
    const query = (kind === 'customer' ? value.toLowerCase() : value).trim();
    if (!query) return;

    loading = true;
    searched = true;
    try {
      const options = kind === 'customer'
        ? (await searchFamilies({ search: query }))
            .filter((family) => family.loyverseCustomerId)
            .map((family) => ({
              id: family.loyverseCustomerId!,
              label: family.familyName,
              secondaryLabel: `Code: ${family.customerCode ?? 'No customer code'} · ${family.mainPhone ?? 'No phone'}`
            }))
        : await searchReceiptAnalyticsFilterOptions({ kind, search: query });
      if (requestId === currentRequest) results = options;
    } catch (error) {
      console.error('analytics filter search failed:', error);
      if (requestId === currentRequest) results = [];
    } finally {
      if (requestId === currentRequest) loading = false;
    }
  };

  const scheduleSearch = () => {
    if (timer) clearTimeout(timer);
    const currentRequest = ++requestId;
    results = [];
    searched = Boolean(search.trim());
    loading = searched;
    timer = setTimeout(() => void runSearch(search, currentRequest), 250);
  };

  onDestroy(() => {
    if (timer) clearTimeout(timer);
  });
</script>

<div class="space-y-2">
  <div class="flex items-center justify-between gap-3">
    <label class="text-sm font-bold text-[#2c2925]" for={`analytics-filter-${kind}`}>{label}</label>
    {#if multiple && selected.length}<span class="text-xs font-semibold text-[#7a6550]">{selected.length} selected</span>{/if}
  </div>
  {#if selected.length}
    <div class="flex flex-wrap gap-2">
      {#each selected as option (option.id)}
        <button
          type="button"
          class="rounded-full border border-[#d8c9bb] bg-[#f6f1eb] px-3 py-1 text-xs font-semibold text-[#7a6550] hover:border-[#7a6550]"
          onclick={() => onToggle(option)}
          title={`Remove ${option.label}`}
        >
          {option.label} ×
        </button>
      {/each}
    </div>
  {/if}
  <input
    id={`analytics-filter-${kind}`}
    bind:value={search}
    oninput={scheduleSearch}
    {placeholder}
    autocomplete="off"
    class="h-10 w-full rounded-2xl border border-[#d9d0c7] bg-white px-4 text-sm text-[#2c2925] outline-none transition focus:border-[#7a6550] focus:ring-2 focus:ring-[#cdb69f]/30"
  />

  {#if search.trim()}
    <div class="max-h-44 overflow-y-auto rounded-2xl border border-[#e4d8cc] bg-white p-1">
      {#if loading}
        <p class="p-3 text-sm text-[#7a6550]">Searching…</p>
      {:else if searched && !results.length}
        <p class="p-3 text-sm text-[#7a6550]">No matching {label.toLowerCase()}.</p>
      {:else}
        {#each results as option (option.id)}
          <button
            type="button"
            class="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition hover:bg-[#f6f1eb]"
            onclick={() => {
              onToggle(option);
              if (!multiple) search = '';
            }}
          >
            <span class="flex h-4 w-4 shrink-0 items-center justify-center rounded border {isSelected(option.id) ? 'border-[#7a6550] bg-[#7a6550] text-white' : 'border-[#cdbfb1]'}">
              {#if isSelected(option.id)}✓{/if}
            </span>
            <span class="min-w-0">
              <span class="block truncate">{option.label}</span>
              {#if option.secondaryLabel}
                <span class="block truncate text-xs text-[#7a6550]/70">{option.secondaryLabel}</span>
              {/if}
            </span>
          </button>
        {/each}
      {/if}
    </div>
  {/if}
</div>
