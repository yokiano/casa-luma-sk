<script lang="ts">
  import type { LoyverseReceipt } from '$lib/server/loyverse';
  import { scaleBand, scalePoint } from 'd3-scale';
  import { BarChart, LineChart } from 'layerchart';
  import * as Chart from '$lib/components/ui/chart';
  import { formatAmount, formatOptional } from './receipt-format';

  interface Props {
    receipts: LoyverseReceipt[];
  }

  let { receipts }: Props = $props();

  const saleReceipts = $derived.by(() =>
    receipts.filter((receipt) => receipt.receipt_type !== 'REFUND')
  );

  const refundReceipts = $derived.by(() =>
    receipts.filter((receipt) => receipt.receipt_type === 'REFUND')
  );

  const totalRevenue = $derived.by(() =>
    saleReceipts.reduce((sum, receipt) => sum + (receipt.total_money ?? 0), 0)
  );

  const totalRefunds = $derived.by(() =>
    refundReceipts.reduce((sum, receipt) => sum + Math.abs(receipt.total_money ?? 0), 0)
  );

  const refundRate = $derived.by(() => {
    if (receipts.length === 0) return 0;
    return (refundReceipts.length / receipts.length) * 100;
  });

  const totalDiscounts = $derived.by(() =>
    saleReceipts.reduce((sum, r) => sum + (r.total_discount ?? 0), 0)
  );

  const discountRate = $derived.by(() => {
    if (totalRevenue === 0) return 0;
    return (totalDiscounts / (totalRevenue + totalDiscounts)) * 100;
  });

  const totalTips = $derived.by(() =>
    saleReceipts.reduce((sum, r) => sum + (r.tip ?? 0), 0)
  );

  const avgItemsPerReceipt = $derived.by(() => {
    if (saleReceipts.length === 0) return 0;
    const totalItems = saleReceipts.reduce((sum, r) => sum + (r.line_items?.length ?? 0), 0);
    return totalItems / saleReceipts.length;
  });

  const totalTax = $derived.by(() =>
    saleReceipts.reduce((sum, r) => sum + (r.total_tax ?? 0), 0)
  );

  const totalSurcharges = $derived.by(() =>
    saleReceipts.reduce((sum, r) => sum + (r.surcharge ?? 0), 0)
  );

  const tipsPercent = $derived.by(() => {
    if (totalRevenue === 0) return 0;
    return (totalTips / totalRevenue) * 100;
  });

  const avgTicket = $derived.by(() => {
    if (saleReceipts.length === 0) return 0;
    return totalRevenue / saleReceipts.length;
  });

  const topPaymentType = $derived.by(() => {
    const counts = new Map<string, number>();
    saleReceipts.forEach((receipt) => {
      (receipt.payments ?? []).forEach((payment) => {
        const name = payment.name || payment.type || 'Unknown';
        counts.set(name, (counts.get(name) ?? 0) + 1);
      });
    });
    let top = '—';
    let topCount = 0;
    counts.forEach((count, name) => {
      if (count > topCount) {
        topCount = count;
        top = name;
      }
    });
    return top;
  });

  const peakHour = $derived.by(() => {
    const counts = new Map<number, number>();
    saleReceipts.forEach((receipt) => {
      const timestamp = receipt.created_at ?? receipt.receipt_date;
      if (!timestamp) return;
      const date = new Date(timestamp);
      if (Number.isNaN(date.getTime())) return;
      const hour = date.getHours();
      counts.set(hour, (counts.get(hour) ?? 0) + 1);
    });
    let peak = null as number | null;
    let peakCount = 0;
    counts.forEach((count, hour) => {
      if (count > peakCount) {
        peakCount = count;
        peak = hour;
      }
    });
    if (peak === null) return '—';
    return `${peak.toString().padStart(2, '0')}:00`;
  });

  const topItem = $derived.by(() => {
    const counts = new Map<string, number>();
    saleReceipts.forEach((receipt) => {
      (receipt.line_items ?? []).forEach((item) => {
        const name = item.item_name || 'Unknown item';
        counts.set(name, (counts.get(name) ?? 0) + (item.quantity ?? 0));
      });
    });
    let top = '—';
    let topCount = 0;
    counts.forEach((count, name) => {
      if (count > topCount) {
        topCount = count;
        top = name;
      }
    });
    return { name: top, count: topCount };
  });

  const topItemsByRevenue = $derived.by(() => {
    const revs = new Map<string, number>();
    saleReceipts.forEach((r) => {
      (r.line_items ?? []).forEach((item) => {
        const name = item.item_name || 'Unknown';
        revs.set(name, (revs.get(name) ?? 0) + (item.total_money ?? 0));
      });
    });
    return Array.from(revs.entries())
      .map(([label, revenue]) => ({ label, revenue }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 20);
  });

  const dayOfWeekNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const receiptsByDayOfWeek = $derived.by(() => {
    const counts = new Array(7).fill(0).map((_, i) => ({ label: dayOfWeekNames[i], count: 0 }));
    saleReceipts.forEach((r) => {
      const date = new Date(r.receipt_date ?? r.created_at ?? 0);
      counts[date.getDay()].count++;
    });
    return counts;
  });

  const avgTicketByDay = $derived.by(() => {
    const totals = new Map<string, { sum: number; count: number }>();
    saleReceipts.forEach((r) => {
      const key = new Date(r.receipt_date ?? r.created_at ?? 0).toISOString().slice(0, 10);
      const entry = totals.get(key) ?? { sum: 0, count: 0 };
      entry.sum += r.total_money ?? 0;
      entry.count += 1;
      totals.set(key, entry);
    });
    return Array.from(totals.entries())
      .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
      .map(([key, { sum, count }]) => ({
        label: new Date(key).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
        avg: count > 0 ? sum / count : 0
      }));
  });

  const discountShareByDay = $derived.by(() => {
    const totals = new Map<string, { revenue: number; discount: number }>();
    saleReceipts.forEach((r) => {
      const key = new Date(r.receipt_date ?? r.created_at ?? 0).toISOString().slice(0, 10);
      const entry = totals.get(key) ?? { revenue: 0, discount: 0 };
      entry.revenue += r.total_money ?? 0;
      entry.discount += r.total_discount ?? 0;
      totals.set(key, entry);
    });
    return Array.from(totals.entries())
      .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
      .map(([key, { revenue, discount }]) => ({
        label: new Date(key).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
        rate: revenue + discount > 0 ? (discount / (revenue + discount)) * 100 : 0
      }));
  });

  const revenueByDay = $derived.by(() => {
    const totals = new Map<string, number>();
    saleReceipts.forEach((receipt) => {
      const timestamp = receipt.receipt_date ?? receipt.created_at;
      if (!timestamp) return;
      const date = new Date(timestamp);
      if (Number.isNaN(date.getTime())) return;
      const key = date.toISOString().slice(0, 10);
      totals.set(key, (totals.get(key) ?? 0) + (receipt.total_money ?? 0));
    });

    return Array.from(totals.entries())
      .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
      .map(([key, value]) => {
        const date = new Date(key);
        const label = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
        return { label, revenue: value };
      });
  });

  const receiptsByHour = $derived.by(() => {
    const hours = Array.from({ length: 24 }, (_, index) => ({
      label: index.toString().padStart(2, '0'),
      count: 0
    }));

    saleReceipts.forEach((receipt) => {
      const timestamp = receipt.created_at ?? receipt.receipt_date;
      if (!timestamp) return;
      const date = new Date(timestamp);
      if (Number.isNaN(date.getTime())) return;
      const hour = date.getHours();
      hours[hour].count += 1;
    });

    return hours;
  });

  const paymentTypeCounts = $derived.by(() => {
    const counts = new Map<string, number>();
    saleReceipts.forEach((receipt) => {
      (receipt.payments ?? []).forEach((payment) => {
        const name = payment.name || payment.type || 'Unknown';
        counts.set(name, (counts.get(name) ?? 0) + 1);
      });
    });

    return Array.from(counts.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 6)
      .map(([label, value]) => ({ label, count: value }));
  });

  const paymentTypeRevenue = $derived.by(() => {
    const revenue = new Map<string, number>();
    saleReceipts.forEach((receipt) => {
      (receipt.payments ?? []).forEach((payment) => {
        const name = payment.name || payment.type || 'Unknown';
        revenue.set(name, (revenue.get(name) ?? 0) + (payment.money_amount ?? 0));
      });
    });

    return Array.from(revenue.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 6)
      .map(([label, value]) => ({ label, revenue: value }));
  });

  const loyaltyStats = $derived.by(() => {
    const ids = saleReceipts.map((r) => r.customer_id).filter(Boolean);
    const unique = new Set(ids);
    const repeat = ids.length - unique.size;
    return {
      totalWithId: ids.length,
      unique: unique.size,
      repeat,
      rate: ids.length > 0 ? (repeat / ids.length) * 100 : 0
    };
  });
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
      <p class="text-xl font-bold text-[#2c2925]">{saleReceipts.length}</p>
      <p class="text-[10px] text-[#7a6550]/60">{refundReceipts.length} refunds ({refundRate.toFixed(1)}%)</p>
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
      <p class="text-[10px] text-[#7a6550]/60">Avg {formatAmount(totalTips / (saleReceipts.length || 1))}/sale</p>
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
  </div>

  <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
    <!-- Row 1 -->
    <div class="flex flex-col space-y-3 rounded-2xl border border-[#d8c9bb] bg-white/85 p-5 shadow-sm">
      <div>
        <p class="text-xs uppercase tracking-wide text-[#7a6550]/70">Revenue by day</p>
        <p class="mt-1 text-xs text-[#7a6550]/70">Sales receipts only</p>
      </div>
      <Chart.Container
        config={{
          revenue: { label: 'Revenue', color: 'var(--color-chart-1)' }
        }}
        class="aspect-auto h-[240px] w-full"
      >
        <LineChart
          data={revenueByDay}
          x="label"
          y="revenue"
          xScale={scalePoint().padding(0.5)}
          series={[{ key: 'revenue', label: 'Revenue', color: 'var(--color-chart-1)' }]}
          points
          labels={{ class: 'text-[9px] fill-[#7a6550]/60', format: (v: number) => (v > 0 ? formatAmount(v) : '') }}
          padding={{ top: 20, right: 20, bottom: 20, left: 40 }}
          axis="x"
          props={{
            xAxis: { format: (value: string) => value },
            yAxis: { ticks: 4 }
          }}
        >
          {#snippet tooltip()}
            <Chart.Tooltip labelKey="label" nameKey="revenue" />
          {/snippet}
        </LineChart>
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
          labels={{ class: 'text-[9px] fill-[#7a6550]/60', format: (v: number) => (v > 0 ? v : '') }}
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

    <!-- Row 2 -->
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
            position: 'right',
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
        <p class="text-xs uppercase tracking-wide text-[#7a6550]/70">Avg Ticket by Day</p>
        <p class="mt-1 text-xs text-[#7a6550]/70">Transaction value trends</p>
      </div>
      <Chart.Container
        config={{
          avg: { label: 'Avg Ticket', color: 'var(--color-chart-2)' }
        }}
        class="aspect-auto h-[240px] w-full"
      >
        <LineChart
          data={avgTicketByDay}
          x="label"
          y="avg"
          xScale={scalePoint().padding(0.5)}
          series={[{ key: 'avg', label: 'Avg Ticket', color: 'var(--color-chart-2)' }]}
          points
          labels={{ class: 'text-[9px] fill-[#7a6550]/60', format: (v: number) => (v > 0 ? formatAmount(v) : '') }}
          padding={{ top: 20, right: 20, bottom: 20, left: 40 }}
          axis="x"
          props={{
            xAxis: { format: (value: string) => value },
            yAxis: { ticks: 4, format: (v: number) => formatAmount(v) }
          }}
        >
          {#snippet tooltip()}
            <Chart.Tooltip labelKey="label" nameKey="avg" />
          {/snippet}
        </LineChart>
      </Chart.Container>
    </div>

    <!-- Row 4 -->
    <div class="flex flex-col space-y-3 rounded-2xl border border-[#d8c9bb] bg-white/85 p-5 shadow-sm">
      <div>
        <p class="text-xs uppercase tracking-wide text-[#7a6550]/70">Discount Share Trend</p>
        <p class="mt-1 text-xs text-[#7a6550]/70">% of gross revenue discounted</p>
      </div>
      <Chart.Container
        config={{
          rate: { label: 'Discount %', color: 'var(--color-chart-5)' }
        }}
        class="aspect-auto h-[240px] w-full"
      >
        <LineChart
          data={discountShareByDay}
          x="label"
          y="rate"
          xScale={scalePoint().padding(0.5)}
          series={[{ key: 'rate', label: 'Discount %', color: 'var(--color-chart-5)' }]}
          points
          labels={{ class: 'text-[9px] fill-[#7a6550]/60', format: (v: number) => (v > 0 ? `${v.toFixed(1)}%` : '') }}
          padding={{ top: 20, right: 20, bottom: 20, left: 40 }}
          axis="x"
          props={{
            xAxis: { format: (value: string) => value },
            yAxis: { ticks: 4, format: (v: number) => `${v.toFixed(1)}%` }
          }}
        >
          {#snippet tooltip()}
            <Chart.Tooltip labelKey="label" nameKey="rate" />
          {/snippet}
        </LineChart>
      </Chart.Container>
    </div>

    <div class="flex flex-col space-y-3 rounded-2xl border border-[#d8c9bb] bg-white/85 p-5 shadow-sm">
      <div>
        <p class="text-xs uppercase tracking-wide text-[#7a6550]/70">Day of Week</p>
        <p class="mt-1 text-xs text-[#7a6550]/70">Volume by weekday</p>
      </div>
      <Chart.Container
        config={{
          count: { label: 'Receipts', color: 'var(--color-chart-1)' }
        }}
        class="aspect-auto h-[240px] w-full"
      >
        <BarChart
          data={receiptsByDayOfWeek}
          x="label"
          y="count"
          xScale={scaleBand().padding(0.35)}
          series={[{ key: 'count', label: 'Receipts', color: 'var(--color-chart-1)' }]}
          labels={{ class: 'text-[9px] fill-[#7a6550]/60', format: (v: number) => (v > 0 ? v : '') }}
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
  </div>
</section>
