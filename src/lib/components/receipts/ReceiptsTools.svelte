<script lang="ts">
  import type { ReceiptWithTools } from './receipt-tools';
  import { formatDateTime, formatDurationMinutes } from './receipt-format';

  interface Props {
    receipts: ReceiptWithTools[];
    isLoading?: boolean;
  }

  let { receipts, isLoading = false }: Props = $props();

  const saleReceipts = $derived.by(() =>
    receipts.filter((receipt) => receipt.receipt_type !== 'REFUND')
  );

  const oneHourReceipts = $derived.by(() =>
    saleReceipts.filter((receipt) => receipt.toolsMeta.hasOneHour)
  );

  const oneDayItemReceipts = $derived.by(() =>
    saleReceipts.filter((receipt) => receipt.toolsMeta.hasOneHourToDay)
  );

  const verifiableOneHourReceipts = $derived.by(() =>
    oneHourReceipts.filter((receipt) => Boolean(receipt.toolsMeta.orderStartTime))
  );

  const convertedReceipts = $derived.by(() =>
    verifiableOneHourReceipts.filter((receipt) => receipt.toolsMeta.hasOneHourToDay)
  );

  const notConvertedReceipts = $derived.by(() =>
    verifiableOneHourReceipts.filter((receipt) => receipt.toolsMeta.isNotConverted)
  );

  const totalOneHourTickets = $derived.by(() =>
    oneHourReceipts.reduce((sum, receipt) => sum + (receipt.toolsMeta.oneHourQuantity ?? 0), 0)
  );

  const unhandledOverdueTickets = $derived.by(() =>
    notConvertedReceipts.reduce((sum, receipt) => sum + (receipt.toolsMeta.oneHourQuantity ?? 0), 0)
  );

  const unhandledOverdueHours = $derived.by(() => {
    const minutes = notConvertedReceipts.reduce((sum, receipt) => {
      const duration = receipt.toolsMeta.durationMinutes;
      if (duration === null) return sum;
      const overdueMinutesPerTicket = Math.max(duration - 60, 0);
      return sum + overdueMinutesPerTicket * (receipt.toolsMeta.oneHourQuantity ?? 0);
    }, 0);

    return minutes / 60;
  });

  const unverifiableOneHourReceipts = $derived.by(() =>
    oneHourReceipts.filter((receipt) => !receipt.toolsMeta.orderStartTime)
  );

  const durationReceipts = $derived.by(() =>
    saleReceipts.filter((receipt) => receipt.toolsMeta.durationMinutes !== null)
  );

  const avgDurationMinutes = $derived.by(() => {
    if (durationReceipts.length === 0) return null;
    const totalMinutes = durationReceipts.reduce(
      (sum, receipt) => sum + (receipt.toolsMeta.durationMinutes ?? 0),
      0
    );
    return totalMinutes / durationReceipts.length;
  });

  const unassignedReceiptsCount = $derived.by(
    () => saleReceipts.filter((receipt) => !receipt.customer_id).length
  );

  const percentOfSales = (count: number) => {
    if (saleReceipts.length === 0) return '0.0%';
    return `${((count / saleReceipts.length) * 100).toFixed(1)}%`;
  };

  const percentOfOneHourTickets = (count: number) => {
    if (totalOneHourTickets === 0) return '0.0%';
    return `${((count / totalOneHourTickets) * 100).toFixed(1)}%`;
  };
</script>

<section class="space-y-4">
  <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-8">
    <article class="rounded-xl border border-[#d8c9bb] bg-white/80 p-4 shadow-sm">
      <p class="text-xs uppercase tracking-wide text-[#7a6550]/70">Sales scanned</p>
      <p class="mt-1 text-2xl font-semibold text-[#2c2925]">{saleReceipts.length}</p>
      <p class="text-[11px] text-[#7a6550]/60">Base: 100%</p>
    </article>
    <article class="rounded-xl border border-[#d8c9bb] bg-white/80 p-4 shadow-sm">
      <p class="text-xs uppercase tracking-wide text-[#7a6550]/70">With 1-day item</p>
      <p class="mt-1 text-2xl font-semibold text-[#2c2925]">{oneDayItemReceipts.length}</p>
      <p class="text-[11px] text-[#7a6550]/60">{percentOfSales(oneDayItemReceipts.length)} of sales</p>
    </article>
    <article class="rounded-xl border border-[#d8c9bb] bg-white/80 p-4 shadow-sm">
      <p class="text-xs uppercase tracking-wide text-[#7a6550]/70">With 1-hour item</p>
      <p class="mt-1 text-2xl font-semibold text-[#2c2925]">{oneHourReceipts.length}</p>
      <p class="text-[11px] text-[#7a6550]/60">{percentOfSales(oneHourReceipts.length)} of sales</p>
    </article>
    <article class="rounded-xl border border-[#d8c9bb] bg-white/80 p-4 shadow-sm">
      <p class="text-xs uppercase tracking-wide text-[#7a6550]/70">Converted to full day</p>
      <p class="mt-1 text-2xl font-semibold text-[#2c2925]">{convertedReceipts.length}</p>
      <p class="text-[11px] text-[#7a6550]/60">{percentOfSales(convertedReceipts.length)} of sales</p>
    </article>
    <article class="rounded-xl border border-red-200 bg-red-50 p-4 shadow-sm">
      <p class="text-xs uppercase tracking-wide text-red-700/80">Overdue unhandled hour</p>
      <p class="mt-1 text-2xl font-semibold text-red-700">{unhandledOverdueTickets}</p>
      <p class="text-[11px] text-red-700/80">Across {notConvertedReceipts.length} receipts</p>
      <p class="text-[11px] text-red-700/80">{percentOfOneHourTickets(unhandledOverdueTickets)} of 1-hour tickets</p>
      <p class="text-[11px] text-red-700/80">{unhandledOverdueHours.toFixed(1)} overdue ticket-hours</p>
    </article>
    <article class="rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
      <p class="text-xs uppercase tracking-wide text-amber-700/80">Missing start hour</p>
      <p class="mt-1 text-2xl font-semibold text-amber-700">{unverifiableOneHourReceipts.length}</p>
      <p class="text-[11px] text-amber-700/80">{percentOfSales(unverifiableOneHourReceipts.length)} of sales</p>
    </article>
    <article class="rounded-xl border border-[#d8c9bb] bg-white/80 p-4 shadow-sm">
      <p class="text-xs uppercase tracking-wide text-[#7a6550]/70">Unassigned customer</p>
      <p class="mt-1 text-2xl font-semibold text-[#2c2925]">{unassignedReceiptsCount}</p>
      <p class="text-[11px] text-[#7a6550]/60">{percentOfSales(unassignedReceiptsCount)} of sales</p>
    </article>
    <article class="rounded-xl border border-[#d8c9bb] bg-white/80 p-4 shadow-sm">
      <p class="text-xs uppercase tracking-wide text-[#7a6550]/70">Avg duration</p>
      <p class="mt-1 text-2xl font-semibold text-[#2c2925]">{formatDurationMinutes(avgDurationMinutes)}</p>
      <p class="text-[11px] text-[#7a6550]/60">{durationReceipts.length} receipts with parsed duration</p>
    </article>
  </div>

  <div class="rounded-2xl border border-[#d8c9bb] bg-white/85 p-4 shadow-sm">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <div>
        <h3 class="text-base font-semibold text-[#2c2925]">Unhandled overdue 1-hour receipts</h3>
        <p class="text-xs text-[#7a6550]/70">
          This list means the extra hour was not handled: duration is longer than 1h 15m and no 1h->day line item exists.
        </p>
        <p class="text-xs text-[#7a6550]/70">
          Red KPI counts unhandled tickets (1-hour item quantity), not just receipt count.
        </p>
      </div>
      {#if isLoading}
        <p class="text-xs text-[#7a6550]/70">Refreshing full dataset...</p>
      {/if}
    </div>

    {#if notConvertedReceipts.length === 0}
      <div class="mt-3 rounded-xl border border-[#eadfd4] bg-[#faf6f1] px-4 py-6 text-sm text-[#7a6550]/80">
        No non-converted 1-hour receipts found for the selected filters.
      </div>
    {:else}
      <div class="mt-3 overflow-x-auto">
        <table class="min-w-full border-separate border-spacing-y-2 text-sm text-[#2c2925]">
          <thead>
            <tr class="text-left text-xs uppercase tracking-wide text-[#7a6550]/70">
              <th class="px-3 py-1">Receipt</th>
              <th class="px-3 py-1">Order #</th>
              <th class="px-3 py-1">Start hour</th>
              <th class="px-3 py-1">Checkout hour</th>
              <th class="px-3 py-1">Duration</th>
              <th class="px-3 py-1">1h qty</th>
              <th class="px-3 py-1">Overdue ticket-hours</th>
              <th class="px-3 py-1">1h->day qty</th>
              <th class="px-3 py-1">Status</th>
            </tr>
          </thead>
          <tbody>
            {#each notConvertedReceipts as receipt (receipt.receipt_number)}
              <tr class="rounded-xl bg-red-50/70">
                <td class="px-3 py-2 font-medium">{receipt.receipt_number}</td>
                <td class="px-3 py-2">{receipt.toolsMeta.orderNumber ?? '—'}</td>
                <td class="px-3 py-2">{receipt.toolsMeta.orderStartTime ?? '—'}</td>
                <td class="px-3 py-2">{formatDateTime(receipt.toolsMeta.checkoutAt)}</td>
                <td class="px-3 py-2">{formatDurationMinutes(receipt.toolsMeta.durationMinutes)}</td>
                <td class="px-3 py-2">{receipt.toolsMeta.oneHourQuantity}</td>
                <td class="px-3 py-2">
                  {#if receipt.toolsMeta.durationMinutes !== null}
                    {(((Math.max(receipt.toolsMeta.durationMinutes - 60, 0) * receipt.toolsMeta.oneHourQuantity) / 60).toFixed(1))}
                  {:else}
                    —
                  {/if}
                </td>
                <td class="px-3 py-2">{receipt.toolsMeta.oneHourToDayQuantity}</td>
                <td class="px-3 py-2">
                  <span class="inline-flex rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-700">
                    Overdue unhandled
                  </span>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </div>
</section>
