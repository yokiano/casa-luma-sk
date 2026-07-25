<script lang="ts">
  import type { ReceiptAnalytics, ReceiptAnalyticsGranularity } from '$lib/receipts/analytics';
  import { scaleBand, scalePoint } from 'd3-scale';
  import { BarChart, LineChart } from 'layerchart';
  import * as Chart from '$lib/components/ui/chart';
  import { formatAmount } from '$lib/components/receipts/receipt-format';

  interface Props {
    analytics?: ReceiptAnalytics | null;
    groupBy?: ReceiptAnalyticsGranularity;
  }

  let { analytics = null, groupBy = 'day' }: Props = $props();

  type BreakdownMode = 'periodRevenue' | 'weekdayRevenue' | 'weekdaySales' | 'weekdayAvgTicket';

  const dayOfWeekNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const options = $derived<{ key: BreakdownMode; label: string }[]>([
    { key: 'periodRevenue', label: `Revenue per ${groupBy}` },
    { key: 'weekdayRevenue', label: 'Revenue by weekday' },
    { key: 'weekdaySales', label: 'Sales by weekday' },
    { key: 'weekdayAvgTicket', label: 'Avg ticket by weekday' }
  ]);

  let mode = $state<BreakdownMode>('periodRevenue');

  const weekdayBreakdown = $derived.by(() => {
    const totals = dayOfWeekNames.map((label) => ({ label, revenue: 0, saleCount: 0 }));

    for (const row of analytics?.timeSeries.day ?? []) {
      const date = new Date(`${row.bucketStart}T00:00:00.000Z`);
      if (Number.isNaN(date.getTime())) continue;
      const total = totals[date.getUTCDay()];
      total.revenue += row.revenue;
      total.saleCount += row.saleCount;
    }

    return totals.map((row) => ({ ...row, avgTicket: row.saleCount > 0 ? row.revenue / row.saleCount : 0 }));
  });

  const selectedTimeSeries = $derived(analytics?.timeSeries[groupBy] ?? []);
  const periodRevenue = $derived(selectedTimeSeries.map((row) => ({ label: row.label, value: row.revenue })));
  const selectedData = $derived.by(() => {
    if (mode === 'periodRevenue') return periodRevenue;
    if (mode === 'weekdayRevenue') return weekdayBreakdown.map((row) => ({ label: row.label, value: row.revenue }));
    if (mode === 'weekdaySales') return weekdayBreakdown.map((row) => ({ label: row.label, value: row.saleCount }));
    return weekdayBreakdown.map((row) => ({ label: row.label, value: row.avgTicket }));
  });

  const isPeriodTrend = $derived(mode === 'periodRevenue');
  const hasData = $derived(selectedTimeSeries.length > 0);
  const title = $derived(options.find((option) => option.key === mode)?.label ?? 'Revenue breakdown');
  const subtitle = $derived(
    mode === 'periodRevenue'
      ? `Sales receipts grouped by ${groupBy} for the selected period`
      : mode === 'weekdayRevenue'
        ? 'Total sales receipts grouped Sunday through Saturday'
        : mode === 'weekdaySales'
          ? 'Number of sales receipts grouped Sunday through Saturday'
          : 'Average receipt value grouped Sunday through Saturday'
  );
  const valueLabel = $derived(mode === 'weekdaySales' ? 'Sales' : mode === 'weekdayAvgTicket' ? 'Avg ticket' : 'Revenue');
  const formatValue = (value: number) => (mode === 'weekdaySales' ? String(Math.round(value)) : formatAmount(value));
  const showPoints = $derived(selectedData.length <= 60);
  const showLabels = $derived(selectedData.length <= 12);
</script>

<article class="flex flex-col space-y-3 rounded-3xl border border-[#dfd2c5] bg-white p-6 shadow-sm">
  <div class="flex flex-wrap items-start justify-between gap-3">
    <div>
      <p class="text-xs uppercase tracking-wide text-[#7a6550]/70">Revenue timing</p>
      <p class="mt-1 text-base font-semibold text-[#2c2925]">{title}</p>
      <p class="mt-1 text-xs text-[#7a6550]/70">{subtitle}</p>
    </div>
    <div class="flex flex-wrap gap-1 rounded-2xl bg-[#f6f1eb] p-1" role="group" aria-label="Revenue timing metrics">
      {#each options as option}
        <button
          type="button"
          aria-pressed={mode === option.key}
          class="rounded-full px-3 py-1.5 text-xs font-semibold transition {mode === option.key ? 'bg-[#7a6550] text-white shadow-sm' : 'text-[#7a6550] hover:bg-[#efe6dc]'}"
          onclick={() => (mode = option.key)}
        >
          {option.label}
        </button>
      {/each}
    </div>
  </div>

  {#if hasData}
    <Chart.Container config={{ value: { label: valueLabel, color: 'var(--color-chart-1)' } }} class="aspect-auto h-[340px] w-full">
      {#if isPeriodTrend}
        <LineChart
          data={selectedData}
          x="label"
          y="value"
          xScale={scalePoint().padding(0.5)}
          series={[{ key: 'value', label: valueLabel, color: 'var(--color-chart-1)' }]}
          points={showPoints}
          labels={{ class: 'text-[9px] fill-[#7a6550]/60', format: (value: number) => (showLabels && value > 0 ? formatValue(value) : '') }}
          padding={{ top: 24, right: 24, bottom: 34, left: 58 }}
          axis="x"
          props={{ xAxis: { tickSpacing: 96, format: (value: string) => value, tickLabelProps: { class: 'text-[10px] fill-[#7a6550]/60' } }, yAxis: { ticks: 4, format: formatValue } }}
        >
          {#snippet tooltip()}
            <Chart.Tooltip labelKey="label" nameKey="value" />
          {/snippet}
        </LineChart>
      {:else}
        <BarChart
          data={selectedData}
          x="label"
          y="value"
          xScale={scaleBand().padding(0.35)}
          series={[{ key: 'value', label: valueLabel, color: 'var(--color-chart-1)' }]}
          labels={{ class: 'text-[9px] fill-[#7a6550]/60', format: (value: number) => (value > 0 ? formatValue(value) : '') }}
          padding={{ top: 20, right: 10, bottom: 20, left: 58 }}
          axis="x"
          props={{ yAxis: { ticks: 4, format: formatValue } }}
        >
          {#snippet tooltip()}
            <Chart.Tooltip labelKey="label" nameKey="value" />
          {/snippet}
        </BarChart>
      {/if}
    </Chart.Container>
  {:else}
    <p class="rounded-2xl border border-dashed border-[#dfd2c5] p-4 text-sm text-[#7a6550]">No sales found for this period.</p>
  {/if}
</article>
