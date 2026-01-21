<script lang="ts">
  import type { LoyverseReceipt } from '$lib/server/loyverse';
  import { getReceipts } from '$lib/receipts.remote';
  import { ReceiptsList, ReceiptsToolbar } from '$lib/components/receipts';

  const toInputDate = (date: Date) => date.toISOString().slice(0, 10);

  const startOfDayIso = (dateString: string) => {
    const date = new Date(`${dateString}T00:00:00.000Z`);
    return date.toISOString();
  };

  const endOfDayIso = (dateString: string) => {
    const date = new Date(`${dateString}T23:59:59.999Z`);
    return date.toISOString();
  };

  let viewMode = $state<'compact' | 'expanded'>('compact');
  let sortOrder = $state<'desc' | 'asc'>('desc');
  let dateFrom = $state(toInputDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)));
  let dateTo = $state(toInputDate(new Date()));
  let storeId = $state('');

  let receipts = $state<LoyverseReceipt[]>([]);
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

      receipts = reset ? response.receipts : receipts.concat(response.receipts);
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
    loadReceipts({ reset: true });
  };

  const refresh = () => {
    loadReceipts({ reset: true });
  };

  const resetFilters = () => {
    viewMode = 'compact';
    sortOrder = 'desc';
    dateFrom = toInputDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
    dateTo = toInputDate(new Date());
    storeId = '';
    cursor = null;
    loadReceipts({ reset: true });
  };

  loadReceipts({ reset: true });
</script>

<section class="space-y-6">
  <header class="space-y-2">
    <h2 class="text-2xl font-semibold text-[#2c2925]">Receipts</h2>
    <p class="text-sm text-[#7a6550]/80">
      Review Loyverse receipts with full line item details, payment splits, and timestamps.
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

  <ReceiptsList
    receipts={sortedReceipts}
    {viewMode}
    {isLoading}
    {hasMore}
    {errorMessage}
    onLoadMore={() => loadReceipts()}
  />
</section>
