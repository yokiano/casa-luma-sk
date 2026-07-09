<script lang="ts">
  import { scalePoint } from 'd3-scale';
  import { LineChart } from 'layerchart';
  import * as Chart from '$lib/components/ui/chart';
  import type { ReceiptAnalyticsTimeSeriesPoint } from '$lib/receipts/analytics';

  interface Props {
    title: string;
    subtitle: string;
    data: ReceiptAnalyticsTimeSeriesPoint[];
    yKey: 'revenue' | 'avgTicket' | 'unassignedCustomers';
    label: string;
    color: string;
    valueFormatter: (value: number) => string;
    yAxisFormatter?: (value: number) => string;
  }

  let {
    title,
    subtitle,
    data,
    yKey,
    label,
    color,
    valueFormatter,
    yAxisFormatter = valueFormatter
  }: Props = $props();

  const showPointLabels = $derived(data.length <= 12);
  const showPoints = $derived(data.length <= 60);
</script>

<div class="flex flex-col space-y-3 rounded-3xl border border-[#dfd2c5] bg-white p-6 shadow-sm">
  <div>
    <p class="text-xs uppercase tracking-wide text-[#7a6550]/70">{title}</p>
    <p class="mt-1 text-xs text-[#7a6550]/70">{subtitle}</p>
  </div>
  <Chart.Container
    config={{
      [yKey]: { label, color }
    }}
    class="aspect-auto h-[280px] w-full"
  >
    <LineChart
      {data}
      x="label"
      y={yKey}
      xScale={scalePoint().padding(0.5)}
      series={[{ key: yKey, label, color }]}
      points={showPoints}
      labels={{ class: 'text-[9px] fill-[#7a6550]/60', format: (v: number) => (showPointLabels && v > 0 ? valueFormatter(v) : '') }}
      padding={{ top: 20, right: 20, bottom: 28, left: 46 }}
      axis="x"
      props={{
        xAxis: { tickSpacing: 96, format: (value: string) => value, tickLabelProps: { class: 'text-[10px] fill-[#7a6550]/60' } },
        yAxis: { ticks: 4, format: yAxisFormatter }
      }}
    >
      {#snippet tooltip()}
        <Chart.Tooltip labelKey="label" nameKey={yKey} />
      {/snippet}
    </LineChart>
  </Chart.Container>
</div>
