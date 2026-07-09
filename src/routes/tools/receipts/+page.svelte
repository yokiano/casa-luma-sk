<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { getReceipts } from '$lib/receipts.remote';
  import {
    ReceiptsList,
    ReceiptsTabs,
    ReceiptsToolbar,
    ReceiptsTools,
    enrichReceiptsWithTools,
    type ReceiptWithTools
  } from '$lib/components/receipts';

  type ReceiptTab = 'receipts' | 'analytics' | 'tools';
  type ReceiptViewMode = 'compact' | 'expanded';
  type ReceiptSortOrder = 'desc' | 'asc';

  const toInputDate = (date: Date) => date.toISOString().slice(0, 10);
  const defaultDateFrom = () => toInputDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
  const defaultDateTo = () => toInputDate(new Date());

  const validTab = (value: string | null): ReceiptTab =>
    value === 'analytics' || value === 'tools' ? value : 'receipts';
  const validViewMode = (value: string | null): ReceiptViewMode => (value === 'expanded' ? 'expanded' : 'compact');
  const validSortOrder = (value: string | null): ReceiptSortOrder => (value === 'asc' ? 'asc' : 'desc');
  const isValidInputDate = (value: string | null) => {
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  };
  const validInputDate = (value: string | null, fallback: string) => (isValidInputDate(value) ? value! : fallback);

  const startOfDayIso = (dateString: string) => {
    const date = new Date(`${dateString}T00:00:00.000Z`);
    return date.toISOString();
  };

  const endOfDayIso = (dateString: string) => {
    const date = new Date(`${dateString}T23:59:59.999Z`);
    return date.toISOString();
  };

  const initialCustomerId = page.url.searchParams.get('customerId') || '';

  let viewMode = $state<ReceiptViewMode>(validViewMode(page.url.searchParams.get('view')));
  let sortOrder = $state<ReceiptSortOrder>(validSortOrder(page.url.searchParams.get('sortOrder')));
  let activeTab = $state<ReceiptTab>(validTab(page.url.searchParams.get('tab')));
  let dateFrom = $state(validInputDate(page.url.searchParams.get('dateFrom'), initialCustomerId ? '' : defaultDateFrom()));
  let dateTo = $state(validInputDate(page.url.searchParams.get('dateTo'), initialCustomerId ? '' : defaultDateTo()));
  let customerId = $state(initialCustomerId);
  let storeId = $state(page.url.searchParams.get('storeId') || '');

  let receipts = $state<ReceiptWithTools[]>([]);
  let analyticsReceipts = $state<ReceiptWithTools[]>([]);
  let toolsRequestedKey = $state('');
  let toolsLoading = $state(false);
  let analyticsError = $state<string | null>(null);
  let analyticsLoadedCount = $state(0);
  let analyticsPageCount = $state(0);
  let cursor = $state<string | null>(null);
  let hasMore = $state(false);
  let isLoading = $state(false);
  let errorMessage = $state<string | null>(null);

  const sortedReceipts = $derived.by(() => {
    const list = receipts.slice();
    list.sort((a, b) => {
      const aTime = new Date(a.created_at ?? a.receipt_date ?? 0).getTime();
      const bTime = new Date(b.created_at ?? b.receipt_date ?? 0).getTime();
      return sortOrder === 'asc' ? aTime - bTime : bTime - aTime;
    });
    return list;
  });

  const analyticsKey = $derived.by(() => `${dateFrom}|${dateTo}|${storeId}|${customerId}`);

  const updateReceiptSearchParams = () => {
    const url = new URL(page.url);
    url.searchParams.set('tab', activeTab);
    if (dateFrom) url.searchParams.set('dateFrom', dateFrom);
    else url.searchParams.delete('dateFrom');
    if (dateTo) url.searchParams.set('dateTo', dateTo);
    else url.searchParams.delete('dateTo');
    url.searchParams.set('sortOrder', sortOrder);
    url.searchParams.set('view', viewMode);

    if (storeId.trim()) url.searchParams.set('storeId', storeId.trim());
    else url.searchParams.delete('storeId');

    if (customerId.trim()) url.searchParams.set('customerId', customerId.trim());
    else url.searchParams.delete('customerId');

    goto(url, { replaceState: true, keepFocus: true, noScroll: true });
  };

  const changeTab = (tab: ReceiptTab) => {
    activeTab = tab;
    updateReceiptSearchParams();
  };

  const loadToolsReceipts = async (key: string) => {
    if (toolsLoading) return;
    toolsLoading = true;
    analyticsError = null;
    analyticsReceipts = [];
    analyticsLoadedCount = 0;
    analyticsPageCount = 0;

    let nextCursor: string | undefined;
    const allReceipts: ReceiptWithTools[] = [];

    try {
      do {
        const response = await getReceipts({
          dateFrom: dateFrom ? startOfDayIso(dateFrom) : undefined,
          dateTo: dateTo ? endOfDayIso(dateTo) : undefined,
          storeId: storeId.trim() || undefined,
          customerId: customerId.trim() || undefined,
          limit: 250,
          cursor: nextCursor
        });

        allReceipts.push(...enrichReceiptsWithTools(response.receipts ?? []));
        analyticsLoadedCount = allReceipts.length;
        analyticsPageCount += 1;
        nextCursor = response.cursor ?? undefined;
      } while (nextCursor && toolsRequestedKey === key);

      if (toolsRequestedKey === key) {
        analyticsReceipts = allReceipts;
      }
    } catch (error) {
      if (toolsRequestedKey === key) analyticsError = error instanceof Error ? error.message : 'Failed to load tools data.';
    } finally {
      toolsLoading = false;
      if (toolsRequestedKey && toolsRequestedKey !== key) loadToolsReceipts(toolsRequestedKey);
    }
  };

  const loadReceipts = async ({ reset }: { reset?: boolean } = {}) => {
    if (isLoading) return;
    isLoading = true;
    errorMessage = null;

    try {
      const response = await getReceipts({
        dateFrom: dateFrom ? startOfDayIso(dateFrom) : undefined,
        dateTo: dateTo ? endOfDayIso(dateTo) : undefined,
        storeId: storeId.trim() || undefined,
        customerId: customerId.trim() || undefined,
        limit: 50,
        cursor: reset ? undefined : cursor ?? undefined
      });

      const enriched = enrichReceiptsWithTools(response.receipts ?? []);
      receipts = reset ? enriched : receipts.concat(enriched);
      cursor = response.cursor;
      hasMore = response.hasMore;
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : 'Failed to load receipts.';
    } finally {
      isLoading = false;
    }
  };

  const applyFilters = () => {
    cursor = null;
    updateReceiptSearchParams();
    loadReceipts({ reset: true });
  };

  const refresh = () => {
    loadReceipts({ reset: true });
  };

  const resetFilters = () => {
    viewMode = 'compact';
    sortOrder = 'desc';
    dateFrom = defaultDateFrom();
    dateTo = defaultDateTo();
    storeId = '';
    customerId = '';
    cursor = null;
    updateReceiptSearchParams();
    loadReceipts({ reset: true });
  };

  $effect(() => {
    if (activeTab === 'tools') {
      if (toolsRequestedKey === analyticsKey) return;
      toolsRequestedKey = analyticsKey;
      loadToolsReceipts(analyticsKey);
    }
  });

  loadReceipts({ reset: true });
</script>

<section class="space-y-6">
  <header class="space-y-2">
    <h2 class="text-2xl font-semibold text-[#2c2925]">Receipts</h2>
    <p class="text-sm text-[#7a6550]/80">
      Review receipts stored in Neon with full line item details, payment splits, and timestamps.
    </p>
  </header>

  <ReceiptsToolbar
    bind:viewMode
    bind:dateFrom
    bind:dateTo
    bind:storeId
    bind:customerId
    bind:sortOrder
    {isLoading}
    onApply={applyFilters}
    onReset={resetFilters}
    onRefresh={refresh}
  />

  <div class="space-y-3">
    <ReceiptsTabs activeTab={activeTab} onChange={changeTab} />
    {#if activeTab === 'analytics'}
      <div class="rounded-3xl border border-[#d8c9bb] bg-white/85 p-6 shadow-sm">
        <p class="text-xs font-bold uppercase tracking-[0.18em] text-[#7a6550]/60">Analytics moved</p>
        <h3 class="mt-2 text-xl font-semibold text-[#2c2925]">Receipt analytics now live in the management dashboard.</h3>
        <p class="mt-2 max-w-2xl text-sm text-[#7a6550]">
          Use the dedicated analytics section for revenue split, open-play mix, profitability, and legacy receipt trends.
        </p>
        <a class="mt-4 inline-flex items-center rounded-full border border-[#7a6550] bg-[#7a6550] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#2c2925]" href="/mgmt-dashboard/analytics">
          Open management analytics
        </a>
      </div>
    {:else if activeTab === 'tools'}
      {#if analyticsError}
        <div class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {analyticsError}
        </div>
      {/if}
      {#if toolsLoading}
        <div class="rounded-xl border border-[#d8c9bb] bg-white/80 px-4 py-3 text-sm text-[#7a6550]">
          Loading detailed receipt data... {analyticsLoadedCount} receipts across {analyticsPageCount} page{analyticsPageCount === 1 ? '' : 's'} loaded.
        </div>
      {/if}
      <ReceiptsTools receipts={analyticsReceipts} isLoading={toolsLoading} />
    {:else}
      <ReceiptsList
        receipts={sortedReceipts}
        {viewMode}
        {isLoading}
        {hasMore}
        {errorMessage}
        onLoadMore={() => loadReceipts()}
      />
    {/if}
  </div>
</section>
