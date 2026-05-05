<script lang="ts">
  import type { LoyverseReceipt } from '$lib/receipts/types';
  import type { ReceiptAnalytics, ReceiptAnalyticsGranularity, ReceiptAnalyticsTimeSeriesPoint } from '$lib/receipts/analytics';
  import { scaleBand } from 'd3-scale';
  import { BarChart } from 'layerchart';
  import * as Chart from '$lib/components/ui/chart';
  import AnalyticsTimeSeriesCard from './AnalyticsTimeSeriesCard.svelte';
  import { formatAmount, formatDurationMinutes, formatOptional } from './receipt-format';
  import { getReceiptToolsMeta } from './receipt-tools';

  interface Props {
    receipts?: LoyverseReceipt[];
    analytics?: ReceiptAnalytics | null;
  }

  let { receipts = [], analytics = null }: Props = $props();

  const dayOfWeekNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const buildAnalyticsFromReceipts = (input: LoyverseReceipt[]): ReceiptAnalytics => {
    const hours = Array.from({ length: 24 }, (_, index) => ({
      label: index.toString().padStart(2, '0'),
      count: 0
    }));
    const dayOfWeek = new Array(7).fill(0).map((_, i) => ({ label: dayOfWeekNames[i], revenue: 0 }));
    const timeSeriesByDate = new Map<string, { revenue: number; saleCount: number; unassignedCustomers: number }>();
    const paymentCounts = new Map<string, number>();
    const paymentRevenue = new Map<string, number>();
    const itemCounts = new Map<string, number>();
    const itemRevenue = new Map<string, number>();
    const customerIds = new Set<string>();

    let receiptCount = 0;
    let saleCount = 0;
    let refundCount = 0;
    let totalRevenue = 0;
    let totalRefunds = 0;
    let totalDiscounts = 0;
    let totalTips = 0;
    let totalTax = 0;
    let totalSurcharges = 0;
    let lineItemCount = 0;
    let loyaltyTotalWithId = 0;
    let unassignedReceiptsCount = 0;
    let durationReceiptsCount = 0;
    let durationTotal = 0;
    let longStayReceiptsCount = 0;

    for (const receipt of input) {
      receiptCount += 1;
      if (receipt.receipt_type === 'REFUND') {
        refundCount += 1;
        totalRefunds += Math.abs(receipt.total_money ?? 0);
        continue;
      }

      saleCount += 1;
      const revenue = receipt.total_money ?? 0;
      const discount = receipt.total_discount ?? 0;
      totalRevenue += revenue;
      totalDiscounts += discount;
      totalTips += receipt.tip ?? 0;
      totalTax += receipt.total_tax ?? 0;
      totalSurcharges += receipt.surcharge ?? 0;
      lineItemCount += receipt.line_items?.length ?? 0;

      if (receipt.customer_id) {
        loyaltyTotalWithId += 1;
        customerIds.add(receipt.customer_id);
      } else {
        unassignedReceiptsCount += 1;
      }

      const meta = getReceiptToolsMeta(receipt);
      if (meta.durationMinutes !== null) {
        durationReceiptsCount += 1;
        durationTotal += meta.durationMinutes;
        if (meta.durationMinutes >= 120) longStayReceiptsCount += 1;
      }

      const timestamp = receipt.created_at ?? receipt.receipt_date;
      const date = timestamp ? new Date(timestamp) : null;
      if (date && !Number.isNaN(date.getTime())) {
        const hour = date.getHours();
        hours[hour].count += 1;
      }

      const receiptTimestamp = receipt.receipt_date ?? receipt.created_at;
      const receiptDate = receiptTimestamp ? new Date(receiptTimestamp) : null;
      if (receiptDate && !Number.isNaN(receiptDate.getTime())) {
        const key = receiptDate.toISOString().slice(0, 10);
        dayOfWeek[receiptDate.getDay()].revenue += revenue;
        const seriesEntry = timeSeriesByDate.get(key) ?? { revenue: 0, saleCount: 0, unassignedCustomers: 0 };
        seriesEntry.revenue += revenue;
        seriesEntry.saleCount += 1;
        if (!receipt.customer_id) seriesEntry.unassignedCustomers += 1;
        timeSeriesByDate.set(key, seriesEntry);
      }

      for (const payment of receipt.payments ?? []) {
        const name = payment.name || payment.type || 'Unknown';
        paymentCounts.set(name, (paymentCounts.get(name) ?? 0) + 1);
        paymentRevenue.set(name, (paymentRevenue.get(name) ?? 0) + (payment.money_amount ?? 0));
      }

      for (const item of receipt.line_items ?? []) {
        const name = item.item_name || 'Unknown item';
        itemCounts.set(name, (itemCounts.get(name) ?? 0) + (item.quantity ?? 0));
        itemRevenue.set(name, (itemRevenue.get(name) ?? 0) + (item.total_money ?? 0));
      }
    }

    const sortedDateEntries = <T,>(map: Map<string, T>) =>
      Array.from(map.entries()).sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime());
    const formatDay = (key: string) => new Date(`${key}T00:00:00.000Z`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', timeZone: 'UTC' });
    const formatMonth = (date: Date) => date.toLocaleDateString('en-GB', { month: 'short', year: 'numeric', timeZone: 'UTC' });
    const isoDay = (date: Date) => date.toISOString().slice(0, 10);
    const startOfIsoWeek = (date: Date) => {
      const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
      const day = start.getUTCDay() || 7;
      start.setUTCDate(start.getUTCDate() - day + 1);
      return start;
    };
    const startOfMonth = (date: Date) => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
    const buildTimeSeries = (): Record<ReceiptAnalyticsGranularity, ReceiptAnalyticsTimeSeriesPoint[]> => {
      const aggregate = (granularity: ReceiptAnalyticsGranularity) => {
        const buckets = new Map<string, { bucketStart: Date; revenue: number; saleCount: number; unassignedCustomers: number }>();

        for (const [key, entry] of timeSeriesByDate) {
          const date = new Date(`${key}T00:00:00.000Z`);
          const bucketStart = granularity === 'week' ? startOfIsoWeek(date) : granularity === 'month' ? startOfMonth(date) : date;
          const bucketKey = isoDay(bucketStart);
          const current = buckets.get(bucketKey) ?? { bucketStart, revenue: 0, saleCount: 0, unassignedCustomers: 0 };
          current.revenue += entry.revenue;
          current.saleCount += entry.saleCount;
          current.unassignedCustomers += entry.unassignedCustomers;
          buckets.set(bucketKey, current);
        }

        return Array.from(buckets.entries())
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([bucketStart, value]) => ({
            bucketStart,
            label:
              granularity === 'month'
                ? formatMonth(value.bucketStart)
                : granularity === 'week'
                  ? `Week of ${formatDay(bucketStart)}`
                  : formatDay(bucketStart),
            revenue: value.revenue,
            saleCount: value.saleCount,
            avgTicket: value.saleCount > 0 ? value.revenue / value.saleCount : 0,
            unassignedCustomers: value.unassignedCustomers
          }));
      };

      return { day: aggregate('day'), week: aggregate('week'), month: aggregate('month') };
    };
    const topEntry = (map: Map<string, number>) =>
      Array.from(map.entries()).reduce<[string, number]>((top, current) => (current[1] > top[1] ? current : top), ['—', 0]);
    const [topPaymentType] = topEntry(paymentCounts);
    const [topItemName, topItemCount] = topEntry(itemCounts);
    const peak = hours.reduce((top, current) => (current.count > top.count ? current : top), { label: '—', count: 0 });

    return {
      summary: {
        totalRevenue,
        totalRefunds,
        saleCount,
        refundCount,
        receiptCount,
        totalDiscounts,
        totalTips,
        lineItemCount,
        totalTax,
        totalSurcharges,
        topPaymentType,
        peakHour: peak.count > 0 ? `${peak.label}:00` : '—',
        topItemName,
        topItemCount,
        loyaltyTotalWithId,
        loyaltyUnique: customerIds.size,
        loyaltyRepeat: Math.max(0, loyaltyTotalWithId - customerIds.size),
        unassignedReceiptsCount,
        durationReceiptsCount,
        avgDurationMinutes: durationReceiptsCount > 0 ? durationTotal / durationReceiptsCount : null,
        longStayReceiptsCount
      },
      timeSeries: buildTimeSeries(),
      revenueByDay: sortedDateEntries(timeSeriesByDate).map(([key, value]) => ({ label: formatDay(key), revenue: value.revenue })),
      receiptsByHour: hours,
      topItemsByRevenue: Array.from(itemRevenue.entries())
        .map(([label, revenue]) => ({ label, revenue }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 20),
      paymentTypeRevenue: Array.from(paymentRevenue.entries())
        .map(([label, revenue]) => ({ label, revenue }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 6),
      avgTicketByDay: sortedDateEntries(timeSeriesByDate).map(([key, value]) => ({
        label: formatDay(key),
        avg: value.saleCount > 0 ? value.revenue / value.saleCount : 0
      })),
      revenueByDayOfWeek: dayOfWeek
    };
  };

  const computedAnalytics = $derived.by(() => analytics ?? buildAnalyticsFromReceipts(receipts));
  const summary = $derived(computedAnalytics.summary);

  const totalRevenue = $derived(summary.totalRevenue);
  const totalRefunds = $derived(summary.totalRefunds);
  const refundRate = $derived(summary.receiptCount === 0 ? 0 : (summary.refundCount / summary.receiptCount) * 100);
  const totalDiscounts = $derived(summary.totalDiscounts);
  const discountRate = $derived(totalRevenue === 0 ? 0 : (totalDiscounts / (totalRevenue + totalDiscounts)) * 100);
  const totalTips = $derived(summary.totalTips);
  const avgItemsPerReceipt = $derived(summary.saleCount === 0 ? 0 : summary.lineItemCount / summary.saleCount);
  const totalTax = $derived(summary.totalTax);
  const totalSurcharges = $derived(summary.totalSurcharges);
  const tipsPercent = $derived(totalRevenue === 0 ? 0 : (totalTips / totalRevenue) * 100);
  const avgTicket = $derived(summary.saleCount === 0 ? 0 : totalRevenue / summary.saleCount);
  const peakHour = $derived(summary.peakHour);
  const topItem = $derived({ name: summary.topItemName, count: summary.topItemCount });
  const loyaltyStats = $derived({
    totalWithId: summary.loyaltyTotalWithId,
    unique: summary.loyaltyUnique,
    repeat: summary.loyaltyRepeat,
    rate: summary.loyaltyTotalWithId > 0 ? (summary.loyaltyRepeat / summary.loyaltyTotalWithId) * 100 : 0
  });
  const unassignedReceiptsCount = $derived(summary.unassignedReceiptsCount);
  const avgDurationMinutes = $derived(summary.avgDurationMinutes);
  const durationReceiptsCount = $derived(summary.durationReceiptsCount);
  const longStayReceiptsCount = $derived(summary.longStayReceiptsCount);
  const timeGroupingOptions: ReceiptAnalyticsGranularity[] = ['day', 'week', 'month'];
  let timeGrouping = $state<ReceiptAnalyticsGranularity>('day');
  let timeGroupingTouched = $state(false);

  const selectedTimeSeries = $derived(computedAnalytics.timeSeries?.[timeGrouping] ?? []);

  $effect(() => {
    if (timeGroupingTouched) return;
    const dayCount = computedAnalytics.timeSeries?.day.length ?? 0;
    timeGrouping = dayCount > 90 ? 'month' : dayCount > 31 ? 'week' : 'day';
  });

  const receiptsByHour = $derived(computedAnalytics.receiptsByHour);
  const topItemsByRevenue = $derived(computedAnalytics.topItemsByRevenue);
  const paymentTypeRevenue = $derived(computedAnalytics.paymentTypeRevenue);
  const revenueByDayOfWeek = $derived(computedAnalytics.revenueByDayOfWeek);
</script>

<section class="space-y-6">
  <!-- Compact Metrics Grid -->
  <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
    <div class="flex flex-col justify-center rounded-xl border border-[#d8c9bb] bg-white/80 p-3 shadow-sm">
      <p class="text-[10px] font-medium uppercase tracking-wider text-[#7a6550]/70">Revenue</p>
      <p class="text-xl font-bold text-[#2c2925]">{formatAmount(totalRevenue)}</p>
      <p class="text-[10px] text-[#7a6550]/60">-{formatAmount(totalRefunds)} refunds</p>
    </div>
    <div class="flex flex-col justify-center rounded-xl border border-[#d8c9bb] bg-white/80 p-3 shadow-sm">
      <p class="text-[10px] font-medium uppercase tracking-wider text-[#7a6550]/70">Receipts</p>
      <p class="text-xl font-bold text-[#2c2925]">{summary.saleCount}</p>
      <p class="text-[10px] text-[#7a6550]/60">{summary.refundCount} refunds ({refundRate.toFixed(1)}%)</p>
    </div>
    <div class="flex flex-col justify-center rounded-xl border border-[#d8c9bb] bg-white/80 p-3 shadow-sm">
      <p class="text-[10px] font-medium uppercase tracking-wider text-[#7a6550]/70">Avg Ticket</p>
      <p class="text-xl font-bold text-[#2c2925]">{formatAmount(avgTicket)}</p>
      <p class="text-[10px] text-[#7a6550]/60">{avgItemsPerReceipt.toFixed(1)} items/receipt</p>
    </div>
    <div class="flex flex-col justify-center rounded-xl border border-[#d8c9bb] bg-white/80 p-3 shadow-sm">
      <p class="text-[10px] font-medium uppercase tracking-wider text-[#7a6550]/70">Discounts</p>
      <p class="text-xl font-bold text-[#2c2925]">{formatAmount(totalDiscounts)}</p>
      <p class="text-[10px] text-[#7a6550]/60">{discountRate.toFixed(1)}% of gross sales</p>
    </div>
    <div class="flex flex-col justify-center rounded-xl border border-[#d8c9bb] bg-white/80 p-3 shadow-sm">
      <p class="text-[10px] font-medium uppercase tracking-wider text-[#7a6550]/70">Tips</p>
      <p class="text-xl font-bold text-[#2c2925]">{formatAmount(totalTips)}</p>
      <p class="text-[10px] text-[#7a6550]/60">Avg {formatAmount(totalTips / (summary.saleCount || 1))}/sale</p>
    </div>
    <div class="flex flex-col justify-center rounded-xl border border-[#d8c9bb] bg-white/80 p-3 shadow-sm">
      <p class="text-[10px] font-medium uppercase tracking-wider text-[#7a6550]/70">Peak Hour</p>
      <p class="text-lg font-bold text-[#2c2925]">{formatOptional(peakHour)}</p>
      <p class="text-[10px] text-[#7a6550]/60">Most active period</p>
    </div>
    <div class="flex flex-col justify-center rounded-xl border border-[#d8c9bb] bg-white/80 p-3 shadow-sm">
      <p class="text-[10px] font-medium uppercase tracking-wider text-[#7a6550]/70">Tax Collected</p>
      <p class="text-xl font-bold text-[#2c2925]">{formatAmount(totalTax)}</p>
      <p class="text-[10px] text-[#7a6550]/60">Included in revenue</p>
    </div>
    <div class="flex flex-col justify-center rounded-xl border border-[#d8c9bb] bg-white/80 p-3 shadow-sm">
      <p class="text-[10px] font-medium uppercase tracking-wider text-[#7a6550]/70">Surcharges</p>
      <p class="text-xl font-bold text-[#2c2925]">{formatAmount(totalSurcharges)}</p>
      <p class="text-[10px] text-[#7a6550]/60">Total fees applied</p>
    </div>
    <div class="flex flex-col justify-center rounded-xl border border-[#d8c9bb] bg-white/80 p-3 shadow-sm">
      <p class="text-[10px] font-medium uppercase tracking-wider text-[#7a6550]/70">Tip %</p>
      <p class="text-xl font-bold text-[#2c2925]">{tipsPercent.toFixed(1)}%</p>
      <p class="text-[10px] text-[#7a6550]/60">Of total revenue</p>
    </div>
    <div class="flex flex-col justify-center rounded-xl border border-[#d8c9bb] bg-white/80 p-3 shadow-sm lg:col-span-2 xl:col-span-1">
      <p class="text-[10px] font-medium uppercase tracking-wider text-[#7a6550]/70">Customer Loyalty</p>
      <p class="text-sm font-bold text-[#2c2925]">{loyaltyStats.rate.toFixed(1)}% Repeat</p>
      <p class="text-[10px] text-[#7a6550]/60">{loyaltyStats.unique} unique customers</p>
    </div>
    <div class="flex flex-col justify-center rounded-xl border border-[#d8c9bb] bg-white/80 p-3 shadow-sm lg:col-span-2 xl:col-span-1">
      <p class="text-[10px] font-medium uppercase tracking-wider text-[#7a6550]/70">Top Item</p>
      <p class="truncate text-sm font-bold text-[#2c2925]" title={topItem.name}>{formatOptional(topItem.name)}</p>
      <p class="text-[10px] text-[#7a6550]/60">{topItem.count} units sold</p>
    </div>
    <div class="flex flex-col justify-center rounded-xl border border-[#d8c9bb] bg-white/80 p-3 shadow-sm lg:col-span-2 xl:col-span-1">
      <p class="text-[10px] font-medium uppercase tracking-wider text-[#7a6550]/70">Avg Duration</p>
      <p class="text-sm font-bold text-[#2c2925]">{formatDurationMinutes(avgDurationMinutes)}</p>
      <p class="text-[10px] text-[#7a6550]/60">{durationReceiptsCount} receipts with parsed timing</p>
    </div>
    <div class="flex flex-col justify-center rounded-xl border border-[#d8c9bb] bg-white/80 p-3 shadow-sm lg:col-span-2 xl:col-span-1">
      <p class="text-[10px] font-medium uppercase tracking-wider text-[#7a6550]/70">Unassigned Customers</p>
      <p class="text-xl font-bold text-[#2c2925]">{unassignedReceiptsCount}</p>
      <p class="text-[10px] text-[#7a6550]/60">{longStayReceiptsCount} receipts are 2h+ duration</p>
    </div>
  </div>

  <div class="space-y-6">
    <div class="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#d8c9bb] bg-white/70 p-4">
      <div>
        <h3 class="text-base font-semibold text-[#2c2925]">Business-critical performance</h3>
        <p class="text-xs text-[#7a6550]/70">Revenue, order value, and customer attribution over the selected range.</p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <span class="text-xs uppercase tracking-wide text-[#7a6550]/70">Group by</span>
        {#each timeGroupingOptions as grouping}
          <button
            type="button"
            class={`rounded-full border px-3 py-1.5 text-xs font-semibold capitalize transition ${
              timeGrouping === grouping
                ? 'border-[#7a6550] bg-[#7a6550] text-white'
                : 'border-[#d8c9bb] text-[#7a6550] hover:border-[#7a6550]'
            }`}
            onclick={() => {
              timeGrouping = grouping;
              timeGroupingTouched = true;
            }}
          >
            {grouping}
          </button>
        {/each}
      </div>
    </div>

    <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
      <AnalyticsTimeSeriesCard
        title="Revenue"
        subtitle="Sales receipts only"
        data={selectedTimeSeries}
        yKey="revenue"
        label="Revenue"
        color="var(--color-chart-1)"
        valueFormatter={formatAmount}
      />

      <AnalyticsTimeSeriesCard
        title="Avg Ticket"
        subtitle="Weighted by sales count"
        data={selectedTimeSeries}
        yKey="avgTicket"
        label="Avg Ticket"
        color="var(--color-chart-2)"
        valueFormatter={formatAmount}
      />

      <AnalyticsTimeSeriesCard
        title="Unassigned Customers"
        subtitle="Receipts without a customer attached"
        data={selectedTimeSeries}
        yKey="unassignedCustomers"
        label="Unassigned"
        color="var(--color-chart-5)"
        valueFormatter={(value) => String(Math.round(value))}
      />

      <div class="flex flex-col space-y-3 rounded-2xl border border-[#d8c9bb] bg-white/85 p-5 shadow-sm md:col-span-2">
        <div>
          <p class="text-xs uppercase tracking-wide text-[#7a6550]/70">Top 20 Items by Revenue</p>
          <p class="mt-1 text-xs text-[#7a6550]/70">Highest grossing items</p>
        </div>
        <Chart.Container
          config={{
            revenue: { label: 'Revenue', color: 'var(--color-chart-2)' }
          }}
          class="aspect-auto h-[500px] w-full"
        >
          <BarChart
            data={topItemsByRevenue}
            x="revenue"
            y="label"
            yScale={scaleBand().padding(0.35)}
            series={[{ key: 'revenue', label: 'Revenue', color: 'var(--color-chart-2)' }]}
            orientation="horizontal"
            labels={{
              class: 'text-[9px] fill-[#7a6550]/60',
              format: (v: number) => (v > 0 ? formatAmount(v) : '')
            }}
            padding={{ left: 120, right: 60, top: 0, bottom: 20 }}
            axis="y"
            props={{
              xAxis: { ticks: 4, format: (v: number) => formatAmount(v) },
              yAxis: { format: (value: string | number) => value.toString() }
            }}
          >
            {#snippet tooltip()}
              <Chart.Tooltip labelKey="label" nameKey="revenue" />
            {/snippet}
          </BarChart>
        </Chart.Container>
      </div>
    </div>
  </div>

  <div class="space-y-3">
    <div>
      <h3 class="text-base font-semibold text-[#2c2925]">Supporting operational patterns</h3>
      <p class="text-xs text-[#7a6550]/70">Payment mix, timing, and weekday patterns for staffing and operational context.</p>
    </div>

    <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
      <div class="flex flex-col space-y-3 rounded-2xl border border-[#d8c9bb] bg-white/85 p-5 shadow-sm">
        <div>
          <p class="text-xs uppercase tracking-wide text-[#7a6550]/70">Revenue by Payment</p>
          <p class="mt-1 text-xs text-[#7a6550]/70">Share by type</p>
        </div>
        <Chart.Container
          config={{
            revenue: { label: 'Revenue', color: 'var(--color-chart-4)' }
          }}
          class="aspect-auto h-[240px] w-full"
        >
          <BarChart
            data={paymentTypeRevenue}
            x="label"
            y="revenue"
            xScale={scaleBand().padding(0.35)}
            series={[{ key: 'revenue', label: 'Revenue', color: 'var(--color-chart-4)' }]}
            labels={{ class: 'text-[9px] fill-[#7a6550]/60', format: (v: number) => (v > 0 ? formatAmount(v) : '') }}
            padding={{ top: 20, right: 10, bottom: 20, left: 40 }}
            axis="x"
            props={{
              xAxis: { format: (value: string) => value },
              yAxis: { ticks: 4, format: (v: number) => formatAmount(v) }
            }}
          >
            {#snippet tooltip()}
              <Chart.Tooltip labelKey="label" nameKey="revenue" />
            {/snippet}
          </BarChart>
        </Chart.Container>
      </div>

      <div class="flex flex-col space-y-3 rounded-2xl border border-[#d8c9bb] bg-white/85 p-5 shadow-sm">
        <div>
          <p class="text-xs uppercase tracking-wide text-[#7a6550]/70">Receipts by hour</p>
          <p class="mt-1 text-xs text-[#7a6550]/70">Peak timing across filters</p>
        </div>
        <Chart.Container
          config={{
            count: { label: 'Receipts', color: 'var(--color-chart-3)' }
          }}
          class="aspect-auto h-[240px] w-full"
        >
          <BarChart
            data={receiptsByHour}
            x="label"
            y="count"
            xScale={scaleBand().padding(0.3)}
            series={[{ key: 'count', label: 'Receipts', color: 'var(--color-chart-3)' }]}
            labels={{ class: 'text-[9px] fill-[#7a6550]/60', format: (v: number) => (v > 0 ? String(v) : '') }}
            padding={{ top: 20, right: 10, bottom: 20, left: 30 }}
            axis="x"
            props={{ yAxis: { ticks: 4 } }}
          >
            {#snippet tooltip()}
              <Chart.Tooltip labelKey="label" nameKey="count" />
            {/snippet}
          </BarChart>
        </Chart.Container>
      </div>

      <div class="flex flex-col space-y-3 rounded-2xl border border-[#d8c9bb] bg-white/85 p-5 shadow-sm">
        <div>
          <p class="text-xs uppercase tracking-wide text-[#7a6550]/70">Day of Week</p>
          <p class="mt-1 text-xs text-[#7a6550]/70">Revenue by weekday</p>
        </div>
        <Chart.Container
          config={{
            revenue: { label: 'Revenue', color: 'var(--color-chart-1)' }
          }}
          class="aspect-auto h-[240px] w-full"
        >
          <BarChart
            data={revenueByDayOfWeek}
            x="label"
            y="revenue"
            xScale={scaleBand().padding(0.35)}
            series={[{ key: 'revenue', label: 'Revenue', color: 'var(--color-chart-1)' }]}
            labels={{ class: 'text-[9px] fill-[#7a6550]/60', format: (v: number) => (v > 0 ? formatAmount(v) : '') }}
            padding={{ top: 20, right: 10, bottom: 20, left: 40 }}
            axis="x"
            props={{ yAxis: { ticks: 4, format: (v: number) => formatAmount(v) } }}
          >
            {#snippet tooltip()}
              <Chart.Tooltip labelKey="label" nameKey="revenue" />
            {/snippet}
          </BarChart>
        </Chart.Container>
      </div>
    </div>
  </div>
</section>
