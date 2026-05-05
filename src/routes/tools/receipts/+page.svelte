<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { getReceiptAnalytics, getReceipts } from '$lib/receipts.remote';
  import type { ReceiptAnalytics } from '$lib/receipts/analytics';
  import {
    ReceiptsAnalytics,
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

  let viewMode = $state<ReceiptViewMode>(validViewMode(page.url.searchParams.get('view')));
  let sortOrder = $state<ReceiptSortOrder>(validSortOrder(page.url.searchParams.get('sortOrder')));
  let activeTab = $state<ReceiptTab>(validTab(page.url.searchParams.get('tab')));
  let dateFrom = $state(validInputDate(page.url.searchParams.get('dateFrom'), defaultDateFrom()));
  let dateTo = $state(validInputDate(page.url.searchParams.get('dateTo'), defaultDateTo()));
  let storeId = $state(page.url.searchParams.get('storeId') || '');

  let receipts = $state<ReceiptWithTools[]>([]);
  let analyticsData = $state<ReceiptAnalytics | null>(null);
  let analyticsLoadedInMs = $state<number | null>(null);
  let analyticsStartedAt = $state<number | null>(null);
  let analyticsElapsedMs = $state(0);
  let analyticsReceipts = $state<ReceiptWithTools[]>([]);
  let analyticsRequestedKey = $state('');
  let toolsRequestedKey = $state('');
  let analyticsLoading = $state(false);
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

  const analyticsKey = $derived.by(() => `${dateFrom}|${dateTo}|${storeId}`);

  const formatElapsed = (ms: number | null) => {
    if (ms === null) return '';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const updateReceiptSearchParams = () => {
    const url = new URL(page.url);
    url.searchParams.set('tab', activeTab);
    url.searchParams.set('dateFrom', dateFrom);
    url.searchParams.set('dateTo', dateTo);
    url.searchParams.set('sortOrder', sortOrder);
    url.searchParams.set('view', viewMode);

    if (storeId.trim()) url.searchParams.set('storeId', storeId.trim());
    else url.searchParams.delete('storeId');

    goto(url, { replaceState: true, keepFocus: true, noScroll: true });
  };

  const changeTab = (tab: ReceiptTab) => {
    activeTab = tab;
    updateReceiptSearchParams();
  };

  const loadAnalytics = async (key: string) => {
    if (analyticsLoading) return;
    analyticsLoading = true;
    analyticsError = null;
    analyticsData = null;
    analyticsLoadedInMs = null;
    analyticsStartedAt = performance.now();
    analyticsElapsedMs = 0;

    try {
      const response = await getReceiptAnalytics({
        dateFrom: dateFrom ? startOfDayIso(dateFrom) : undefined,
        dateTo: dateTo ? endOfDayIso(dateTo) : undefined,
        storeId: storeId || undefined
      });

      if (analyticsRequestedKey === key) {
        analyticsData = response;
        analyticsLoadedInMs = Math.round(performance.now() - (analyticsStartedAt ?? performance.now()));
      }
    } catch (error) {
      if (analyticsRequestedKey === key) analyticsError = error instanceof Error ? error.message : 'Failed to load analytics.';
    } finally {
      analyticsLoading = false;
      analyticsStartedAt = null;
      if (analyticsRequestedKey && analyticsRequestedKey !== key) loadAnalytics(analyticsRequestedKey);
    }
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
          storeId: storeId || undefined,
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
        storeId: storeId || undefined,
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
    cursor = null;
    updateReceiptSearchParams();
    loadReceipts({ reset: true });
  };

  $effect(() => {
    if (!analyticsStartedAt) return;
    const interval = window.setInterval(() => {
      if (analyticsStartedAt) analyticsElapsedMs = Math.round(performance.now() - analyticsStartedAt);
    }, 100);
    return () => window.clearInterval(interval);
  });

  $effect(() => {
    if (activeTab === 'analytics') {
      if (analyticsRequestedKey === analyticsKey) return;
      analyticsRequestedKey = analyticsKey;
      loadAnalytics(analyticsKey);
      return;
    }

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
    bind:sortOrder
    {isLoading}
    onApply={applyFilters}
    onReset={resetFilters}
    onRefresh={refresh}
  />

  <div class="space-y-3">
    <ReceiptsTabs activeTab={activeTab} onChange={changeTab} />
    {#if activeTab === 'analytics'}
      {#if analyticsError}
        <div class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {analyticsError}
        </div>
      {/if}
      {#if analyticsLoading}
        <div class="rounded-xl border border-[#d8c9bb] bg-white/80 px-4 py-3 text-sm text-[#7a6550]">
          Calculating analytics in Neon... {formatElapsed(analyticsElapsedMs)}
        </div>
      {:else if analyticsLoadedInMs !== null}
        <p class="text-xs text-[#7a6550]/70">Analytics calculated in {formatElapsed(analyticsLoadedInMs)}.</p>
      {/if}
      {#if analyticsData}
        <ReceiptsAnalytics analytics={analyticsData} />
      {:else if !analyticsLoading && !analyticsError}
        <div class="rounded-xl border border-[#d8c9bb] bg-white/80 px-4 py-3 text-sm text-[#7a6550]">
          Choose filters and open analytics to calculate receipt trends.
        </div>
      {/if}
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
