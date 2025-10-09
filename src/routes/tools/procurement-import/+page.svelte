<script lang="ts">
  import {
    scrapeMultipleProducts,
    importProcurementDrafts,
    getProcurementMetadata
  } from '$lib/tools/procurement.remote';

  import type { ProcurementDraft, ScrapeResult } from '$lib/tools/types';
  import { priceStringToNumber, extractLazadaUrls } from '$lib/tools/utils';
  import SelectOrAdd from '$lib/components/ui/SelectOrAdd.svelte';
  import FileDropZone from '$lib/components/ui/FileDropZone.svelte';

  let urlsInput = $state('');
  let isScraping = $state(false);
  let isImporting = $state(false);
  let scrapeError = $state<string | null>(null);
  let importResults = $state<any[]>([]);
  let drafts = $state<ProcurementDraft[]>([]);

  const metadataQuery = getProcurementMetadata();

  const metadata = $derived(metadataQuery.current ?? null);
  const metadataLoading = $derived(metadataQuery.loading);
  
  let additionalDepartments = $state<string[]>([]);
  let additionalStatuses = $state<string[]>([]);
  let additionalObjectCategories = $state<string[]>([]);

  const departments = $derived([...(metadata?.departments ?? []), ...additionalDepartments]);
  const statuses = $derived([...(metadata?.statuses ?? []), ...additionalStatuses]);
  const objectCategories = $derived([...(metadata?.objectCategories ?? []), ...additionalObjectCategories]);
  const metadataError = $derived.by(() => {
    const error = metadataQuery.error;
    if (!error) return null;
    if (error instanceof Error) return error.message;
    if (typeof error === 'string') return error;
    return 'Failed to load metadata.';
  });

  function createManualDraft(): ProcurementDraft {
    const index = drafts.length + 1;
    return {
      item: `Manual Item ${index}`,
      priceTHB: null,
      linkToProduct: null,
      supplier: null,
      imageUrl: null,
      department: departments[0] ?? 'General',
      status: statuses[0] ?? 'Idea',
      objectCategories: [],
      quantity: 1,
      trackingNumber: null,
      invoice: null,
      description: null
    } satisfies ProcurementDraft;
  }

  function addManualDraft() {
    drafts = [...drafts, createManualDraft()];
  }

  function removeDraft(index: number) {
    drafts = drafts.filter((_, i) => i !== index);
  }

  async function handleScrape() {
    const urls = extractLazadaUrls(urlsInput);
    if (urls.length === 0) {
      scrapeError = 'Provide at least one Lazada product URL.';
      return;
    }
    scrapeError = null;
    isScraping = true;
    try {
      console.log("######## urls", urls);
      const results = await scrapeMultipleProducts({ urls });
      console.log("######## results", results);
      const nextDrafts = results.map((result) => toDraft(result));
      drafts = nextDrafts;
    } catch (error) {
      scrapeError = error instanceof Error ? error.message : 'Scrape failed.';
    } finally {
      isScraping = false;
    }
  }

  function toDraft(result: ScrapeResult): ProcurementDraft {
    return {
      item: result.title || (result.error ? 'Failed to scrape item' : 'Untitled Lazada Item'),
      priceTHB: priceStringToNumber(result.price),
      linkToProduct: result.link ?? null,
      supplier: result.storeName,
      imageUrl: result.mainImage,
      department: departments[0] ?? 'General',
      status: statuses[0] ?? 'Idea',
      objectCategories: [],
      quantity: 1,
      trackingNumber: null,
      invoice: null,
      description: result.error ?? null
    } satisfies ProcurementDraft;
  }

  function setCategory(index: number, category: string | null) {
    updateDraft(index, {
      objectCategories: category ? [category] : []
    });
  }

  function updateDraft(index: number, patch: Partial<ProcurementDraft>) {
    drafts = drafts.map((draft, i) => (i === index ? { ...draft, ...patch } : draft));
  }

  function addDepartment(newDepartment: string) {
    if (!departments.includes(newDepartment)) {
      additionalDepartments = [...additionalDepartments, newDepartment];
    }
  }

  function addStatus(newStatus: string) {
    if (!statuses.includes(newStatus)) {
      additionalStatuses = [...additionalStatuses, newStatus];
    }
  }

  function addObjectCategory(newCategory: string) {
    if (!objectCategories.includes(newCategory)) {
      additionalObjectCategories = [...additionalObjectCategories, newCategory];
    }
  }

  async function handleImport() {
    if (drafts.length === 0) return;
    isImporting = true;
    importResults = [];
    try {
      const results = await importProcurementDrafts({ drafts });
      importResults = results;
    } catch (error) {
      importResults = [
        {
          success: false,
          error: error instanceof Error ? error.message : 'Import failed.'
        }
      ];
    } finally {
      isImporting = false;
    }
  }

  const hasDrafts = $derived(drafts.length > 0);
</script>

<div class="space-y-10">
  <section>
    <h2 class="text-xl font-semibold text-[#5c4a3d]">Lazada Procurement Import</h2>
    <p class="mt-1 max-w-2xl text-sm text-[#5c4a3d]/70">
      Paste one or more Lazada product URLs. We’ll fetch product details, let you tweak procurement metadata, then push to the Notion Procurement Tracker.
    </p>

    <div class="mt-6 rounded-3xl border border-[#d3c5b8] bg-white/80 p-6 shadow-sm">
      <label for="urlsInput" class="block text-sm font-medium text-[#5c4a3d]">Lazada URLs</label>
      <textarea
        bind:value={urlsInput}
        id="urlsInput"
        class="mt-2 min-h-[120px] w-full rounded-2xl border border-[#d9d0c7] bg-white px-4 py-3 text-sm text-[#2c2925] shadow-inner focus:border-[#7a6550] focus:outline-none focus:ring-2 focus:ring-[#cdb69f]/50"
        placeholder="https://www.lazada.co.th/products/..."
      ></textarea>
      {#if scrapeError}
        <p class="mt-2 text-sm text-red-600">{scrapeError}</p>
      {/if}
      <div class="mt-4 flex flex-wrap gap-3">
        <button
          class="inline-flex items-center gap-2 rounded-full bg-[#7a6550] px-6 py-2 text-sm font-semibold text-white shadow transition hover:bg-[#655140] disabled:cursor-not-allowed disabled:bg-[#cdb69f]"
          onclick={handleScrape}
          disabled={isScraping}
        >
          {#if isScraping}
            <span class="h-3 w-3 animate-spin rounded-full border-2 border-white/60 border-t-transparent"></span>
            Fetching...
          {:else}
            Fetch Products
          {/if}
        </button>

        <button
          type="button"
          class="inline-flex items-center gap-2 rounded-full border border-[#7a6550] px-6 py-2 text-sm font-semibold text-[#7a6550] shadow-sm transition hover:bg-[#f7f1ea]"
          onclick={addManualDraft}
        >
          Add Item Manually
        </button>
      </div>
    </div>
  </section>

  {#if metadataLoading}
    <div class="rounded-3xl border border-[#d3c5b8] bg-white/60 p-6 text-sm text-[#5c4a3d]/70">
      Loading procurement metadata...
    </div>
  {/if}

  {#if metadataError}
    <div class="rounded-3xl border border-red-200 bg-red-50 p-6 text-sm text-red-600">
      Failed to load metadata: {metadataError}
    </div>
  {/if}

  {#if hasDrafts}
    <section class="space-y-8">
      <header>
        <h3 class="text-lg font-semibold text-[#5c4a3d]">Review and Edit</h3>
        <p class="mt-1 text-sm text-[#5c4a3d]/70">
          Adjust procurement metadata before importing. All changes stay local until you hit “Import to Notion”.
        </p>
      </header>

      <div class="grid gap-6">
        {#each drafts as draft, index}
          <article class="rounded-3xl border border-[#d3c5b8] bg-white/80 p-6 shadow-sm">
            <div class="grid grid-cols-[160px,1fr] gap-6">
              <div>
                <FileDropZone
                  value={draft.imageUrl}
                  onFileSelect={(dataUrl) => updateDraft(index, { imageUrl: dataUrl })}
                />
                {#if draft.linkToProduct}
                  <a
                    href={draft.linkToProduct}
                    target="_blank"
                    rel="noreferrer"
                    class="mt-3 block text-xs font-semibold uppercase tracking-wide text-[#7a6550]"
                  >
                    View product
                  </a>
                {:else}
                  <span class="mt-3 block text-xs font-semibold uppercase tracking-wide text-[#7a6550]/50">
                    No product link
                  </span>
                {/if}
              </div>

              <div class="space-y-4">
                <div>
                  <label for="itemName" class="text-xs font-semibold uppercase tracking-[0.12em] text-[#7a6550]/70">Item Name</label>
                  <input
                    class="mt-1 w-full rounded-2xl border border-[#d9d0c7] bg-white px-4 py-2 text-sm focus:border-[#7a6550] focus:outline-none focus:ring-2 focus:ring-[#cdb69f]/40"
                    value={draft.item}
                    id="itemName"
                    oninput={(event) => updateDraft(index, { item: event.currentTarget.value })}
                  />
                </div>

                <div class="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label for="priceTHB" class="text-xs font-semibold uppercase tracking-[0.12em] text-[#7a6550]/70">Price (THB)</label>
                    <input
                      type="number"
                      class="mt-1 w-full rounded-2xl border border-[#d9d0c7] bg-white px-4 py-2 text-sm focus:border-[#7a6550] focus:outline-none focus:ring-2 focus:ring-[#cdb69f]/40"
                      id="priceTHB"
                      value={draft.priceTHB ?? ''}
                      oninput={(event) => updateDraft(index, { priceTHB: Number(event.currentTarget.value) || null })}
                    />
                  </div>

                  <div>
                    <label for="quantity" class="text-xs font-semibold uppercase tracking-[0.12em] text-[#7a6550]/70">Quantity</label>
                    <input
                      type="number"
                      min="1"
                      class="mt-1 w-full rounded-2xl border border-[#d9d0c7] bg-white px-4 py-2 text-sm focus:border-[#7a6550] focus:outline-none focus:ring-2 focus:ring-[#cdb69f]/40"
                      id="quantity"
                      value={draft.quantity ?? 1}
                      oninput={(event) => updateDraft(index, { quantity: Number(event.currentTarget.value) || 1 })}
                    />
                  </div>
                </div>

                <div class="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label for="department" class="text-xs font-semibold uppercase tracking-[0.12em] text-[#7a6550]/70">Department</label>
                    <SelectOrAdd
                      options={departments}
                      bind:value={draft.department}
                      id="department"
                      placeholder="Select or add department"
                      onAdd={addDepartment}
                      class="mt-1"
                    />
                  </div>

                  <div>
                    <label for="status"   class="text-xs font-semibold uppercase tracking-[0.12em] text-[#7a6550]/70">Status</label>
                    <SelectOrAdd
                      options={statuses}
                      bind:value={draft.status}
                      id="status"
                      placeholder="Select or add status"
                      onAdd={addStatus}
                      class="mt-1"
                    />
                  </div>

                  <div>
                    <label for="supplier" class="text-xs font-semibold uppercase tracking-[0.12em] text-[#7a6550]/70">Supplier</label>
                    <input
                      class="mt-1 w-full rounded-2xl border border-[#d9d0c7] bg-white px-4 py-2 text-sm focus:border-[#7a6550] focus:outline-none focus:ring-2 focus:ring-[#cdb69f]/40"
                      value={draft.supplier ?? ''}
                      id="supplier"
                      oninput={(event) => {
                        const value = event.currentTarget.value.trim();
                        updateDraft(index, { supplier: value ? value : null });
                      }}
                    />
                  </div>
                </div>

                <div class="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label for="linkToProduct" class="text-xs font-semibold uppercase tracking-[0.12em] text-[#7a6550]/70">Product Link</label>
                    <input
                      type="url"
                      class="mt-1 w-full rounded-2xl border border-[#d9d0c7] bg-white px-4 py-2 text-sm focus:border-[#7a6550] focus:outline-none focus:ring-2 focus:ring-[#cdb69f]/40"
                      placeholder="https://..."
                      value={draft.linkToProduct ?? ''}
                      id="linkToProduct"
                      oninput={(event) => {
                        const value = event.currentTarget.value.trim();
                        updateDraft(index, { linkToProduct: value ? value : null });
                      }}
                    />
                  </div>

                  <div>
                    <label for="imageUrl" class="text-xs font-semibold uppercase tracking-[0.12em] text-[#7a6550]/70">Image URL</label>
                    <input
                      type="url"
                      id="imageUrl"
                      class="mt-1 w-full rounded-2xl border border-[#d9d0c7] bg-white px-4 py-2 text-sm focus:border-[#7a6550] focus:outline-none focus:ring-2 focus:ring-[#cdb69f]/40"
                      placeholder="https://..."
                      value={draft.imageUrl ?? ''}
                      oninput={(event) => {
                        const value = event.currentTarget.value.trim();
                        updateDraft(index, { imageUrl: value ? value : null });
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label for="objectCategory" class="text-xs font-semibold uppercase tracking-[0.12em] text-[#7a6550]/70">Object Category</label>
                  <SelectOrAdd
                    options={objectCategories}
                    value={draft.objectCategories[0] ?? null}
                    id="objectCategory"
                    placeholder="Select or add category"
                    onSelect={(cat) => setCategory(index, cat)}
                    onAdd={(newCat) => {
                      addObjectCategory(newCat);
                      setCategory(index, newCat);
                    }}
                    class="mt-1"
                  />
                </div>

                <div class="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label for="trackingNumber" class="text-xs font-semibold uppercase tracking-[0.12em] text-[#7a6550]/70">Tracking Number</label>
                    <div class="flex items-center gap-2">
                      <input
                        class="mt-1 w-full rounded-2xl border border-[#d9d0c7] bg-white px-4 py-2 text-sm focus:border-[#7a6550] focus:outline-none focus:ring-2 focus:ring-[#cdb69f]/40"
                        value={draft.trackingNumber ?? ''}
                        id="trackingNumber"
                        oninput={(event) => {
                          const value = event.currentTarget.value.trim();
                          updateDraft(index, { trackingNumber: value ? value : null });
                        }}
                      />
                      <button
                        type="button"
                        class="mt-1 rounded-full border border-[#d3c5b8] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#7a6550] transition hover:border-[#7a6550]"
                        onclick={() => updateDraft(index, { trackingNumber: null })}
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  <div>
                    <label for="invoice" class="text-xs font-semibold uppercase tracking-[0.12em] text-[#7a6550]/70">Invoice</label>
                    <div class="flex items-center gap-2">
                      <input
                        class="mt-1 w-full rounded-2xl border border-[#d9d0c7] bg-white px-4 py-2 text-sm focus:border-[#7a6550] focus:outline-none focus:ring-2 focus:ring-[#cdb69f]/40"
                        value={draft.invoice ?? ''}
                        id="invoice"
                        oninput={(event) => {
                          const value = event.currentTarget.value.trim();
                          updateDraft(index, { invoice: value ? value : null });
                        }}
                      />
                      <button
                        type="button"
                        class="mt-1 rounded-full border border-[#d3c5b8] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#7a6550] transition hover:border-[#7a6550]"
                        onclick={() => updateDraft(index, { invoice: null })}
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <label for="description" class="text-xs font-semibold uppercase tracking-[0.12em] text-[#7a6550]/70">Notes / Description</label>
                  <textarea
                    class="mt-1 w-full rounded-2xl border border-[#d9d0c7] bg-white px-4 py-2 text-sm focus:border-[#7a6550] focus:outline-none focus:ring-2 focus:ring-[#cdb69f]/40"
                    value={draft.description ?? ''}
                    id="description"
                    oninput={(event) => {
                      const value = event.currentTarget.value;
                      updateDraft(index, { description: value.trim() ? value : null });
                    }}
                  ></textarea>
                </div>

                <div class="flex justify-end">
                  <button
                    type="button"
                    class="inline-flex items-center gap-2 rounded-full border border-[#d3c5b8] px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-[#7a6550] transition hover:border-red-300 hover:text-red-500"
                    onclick={() => removeDraft(index)}
                  >
                    Remove Item
                  </button>
                </div>
              </div>
            </div>
          </article>
        {/each}
      </div>

      <div class="flex items-center justify-between rounded-3xl border border-[#d3c5b8] bg-white/80 px-6 py-4">
        <div>
          <p class="text-sm font-semibold text-[#5c4a3d]">Ready to import {drafts.length} item(s)</p>
          <p class="text-xs text-[#5c4a3d]/70">
            We’ll create entries in the Procurement Tracker with the current values.
          </p>
        </div>

        <button
          class="inline-flex items-center gap-2 rounded-full bg-[#5f7a50] px-6 py-2 text-sm font-semibold text-white shadow transition hover:bg-[#4d6242] disabled:cursor-not-allowed disabled:bg-[#b7c4b0]"
          onclick={handleImport}
          disabled={isImporting}
        >
          {#if isImporting}
            <span class="h-3 w-3 animate-spin rounded-full border-2 border-white/60 border-t-transparent"></span>
            Importing...
          {:else}
            Import to Notion
          {/if}
        </button>
      </div>

      {#if importResults.length > 0}
        <div class="rounded-3xl border border-[#d3c5b8] bg-white/80 p-6">
          <h4 class="text-sm font-semibold uppercase tracking-[0.12em] text-[#7a6550]/80">
            Import Summary
          </h4>
          <ul class="mt-4 space-y-2 text-sm">
            {#each importResults as result}
              <li
                class={`flex items-center justify-between rounded-2xl px-4 py-3 ${
                  result.success
                    ? 'bg-[#edf5ec] text-[#38563a]'
                    : 'bg-[#fbeeed] text-[#8a3d33]'
                }`}
              >
                <span>
                  {result.item ?? 'Item'}
                  {#if result.success && result.url}
                    <a
                      href={result.url}
                      target="_blank"
                      rel="noreferrer"
                      class="ml-3 text-xs uppercase tracking-wide underline"
                    >
                      View page
                    </a>
                  {/if}
                </span>
                <span class="text-xs font-semibold uppercase tracking-[0.16em]">
                  {result.success ? 'Imported' : result.error || 'Failed'}
                </span>
              </li>
            {/each}
          </ul>
        </div>
      {/if}
    </section>
  {/if}
</div>

