<script lang="ts">
  import { getMgmtDashboardAnalytics } from '$lib/mgmt-dashboard.remote';
  import { getReceiptAnalytics } from '$lib/receipts.remote';
  import AnalyticsToolbar from '$lib/components/mgmt-dashboard/analytics/AnalyticsToolbar.svelte';
  import { analyticsSections, type AnalyticsSectionId } from '$lib/components/mgmt-dashboard/analytics/AnalyticsSectionNav.svelte';
  import ReceiptsAnalytics from '$lib/components/mgmt-dashboard/analytics/ReceiptsAnalytics.svelte';
  import { MgmtAnalyticsFilters, type MgmtAnalyticsPeriod } from '$lib/mgmt-dashboard/analytics-filters.svelte';
  import type { ReceiptAnalytics } from '$lib/receipts/analytics';
  import { BarChart3, TrendingUp, WalletCards } from 'lucide-svelte';
  import { scalePoint } from 'd3-scale';
  import { LineChart } from 'layerchart';
  import { onMount } from 'svelte';
  import * as Chart from '$lib/components/ui/chart';

  type DashboardAnalytics = Awaited<ReturnType<typeof getMgmtDashboardAnalytics>>;

  const filters = new MgmtAnalyticsFilters();
  const money = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 });
  const formatMoney = (value: number | null | undefined) => (value === null || value === undefined ? '—' : money.format(value));
  const percent = (value: number | null | undefined) => `${(value ?? 0).toFixed(1)}%`;
  const ratio = (value: number | null | undefined) => (value === null || value === undefined ? '—' : `${value.toFixed(2)}×`);
  const formatDuration = (minutes: number | null | undefined) => {
    if (minutes === null || minutes === undefined) return '—';
    const rounded = Math.round(minutes);
    const hours = Math.floor(rounded / 60);
    const mins = rounded % 60;
    return hours > 0 ? `${hours}h ${mins.toString().padStart(2, '0')}m` : `${mins}m`;
  };
  const errorMessage = (error: unknown) => (error instanceof Error ? error.message : error ? String(error) : null);

  const bangkokDateParts = (date: Date) => {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
    return {
      year: Number(parts.find((part) => part.type === 'year')?.value),
      month: Number(parts.find((part) => part.type === 'month')?.value),
      day: Number(parts.find((part) => part.type === 'day')?.value)
    };
  };

  const bangkokBoundaryIso = (date: Date, endOfDay = false) => {
    const { year, month, day } = bangkokDateParts(date);
    const utc = endOfDay
      ? Date.UTC(year, month - 1, day, 16, 59, 59, 999)
      : Date.UTC(year, month - 1, day - 1, 17, 0, 0, 0);
    return new Date(utc).toISOString();
  };

  const dateRangeForPeriod = (period: MgmtAnalyticsPeriod) => {
    const now = new Date();
    const today = bangkokDateParts(now);
    const from = new Date(Date.UTC(today.year, today.month - 1, today.day));
    if (period === '7d') from.setUTCDate(from.getUTCDate() - 6);
    else if (period === '30d') from.setUTCDate(from.getUTCDate() - 29);
    else if (period === '90d') from.setUTCDate(from.getUTCDate() - 89);
    else if (period === '12m') from.setUTCFullYear(from.getUTCFullYear() - 1);

    return { dateFrom: bangkokBoundaryIso(from), dateTo: bangkokBoundaryIso(now, true) };
  };

  let data = $state<DashboardAnalytics | null>(null);
  let legacyReceipts = $state<ReceiptAnalytics | null>(null);
  let loading = $state(true);
  let error = $state<string | null>(null);
  let requestKey = $state('');
  let activeSection = $state<AnalyticsSectionId>('overview');

  const loadAnalytics = async (key: string) => {
    loading = true;
    error = null;

    try {
      const range = dateRangeForPeriod(filters.period);
      const [dashboard, receipts] = await Promise.all([
        getMgmtDashboardAnalytics({ period: filters.period, groupBy: filters.groupBy }),
        getReceiptAnalytics(range)
      ]);
      if (requestKey === key) {
        data = dashboard;
        legacyReceipts = receipts;
      }
    } catch (err) {
      if (requestKey === key) error = errorMessage(err) ?? 'Failed to load management analytics.';
    } finally {
      if (requestKey === key) loading = false;
    }
  };

  $effect(() => {
    const key = filters.queryKey;
    requestKey = key;
    loadAnalytics(key);
  });

  const selectedPassMix = $derived(data?.passMix ?? []);
  const openPlayDurationDistribution = $derived(data?.openPlayDurationDistribution ?? []);
  const openPlayDurationStats = $derived(data?.openPlayDurationStats);
  const revenueTrend = $derived(data?.revenueTrend ?? []);
  const profitabilityTrend = $derived(data?.profitabilityTrend ?? []);
  const maxChannelRevenue = $derived(Math.max(1, ...(data?.revenueChannels ?? []).map((row) => row.revenue)));
  const showPoints = (rows: unknown[]) => rows.length <= 60;
  const commonXAxisProps = $derived({
    tickSpacing: filters.groupBy === 'day' ? 104 : 88,
    format: (value: string) => value,
    tickLabelProps: { class: 'text-[10px] fill-[#7a6550]/60' }
  });

  const channelSeries = [
    { key: 'restaurant', label: 'Restaurant', color: '#7a6550', value: (row: { restaurant: number }) => row.restaurant },
    { key: 'openPlay', label: 'Open-play', color: '#d79a5f', value: (row: { openPlay: number }) => row.openPlay },
    { key: 'store', label: 'Store', color: '#7f9f8f', value: (row: { store: number }) => row.store },
    { key: 'others', label: 'Others', color: '#b47c8c', value: (row: { others: number }) => row.others }
  ];

  const passMixSeries = [
    { key: 'oneHourQuantity', label: '1-hour qty', color: '#7a6550', value: (row: { oneHourQuantity: number }) => row.oneHourQuantity },
    { key: 'oneDayQuantity', label: '1-day qty', color: '#d79a5f', value: (row: { oneDayQuantity: number }) => row.oneDayQuantity }
  ];

  const openPlayDurationSeries = [
    { key: 'oneHourOnlyCount', label: '1-hour only', color: '#7a6550', value: (row: { oneHourOnlyCount: number }) => row.oneHourOnlyCount },
    { key: 'convertedCount', label: '1-hour → 1-day', color: '#d79a5f', value: (row: { convertedCount: number }) => row.convertedCount }
  ];

  const profitabilitySeries = [
    { key: 'grossMargin', label: 'Gross margin %', color: '#7f9f8f', value: (row: { grossMargin: number }) => row.grossMargin },
    { key: 'incomeToCogsRatio', label: 'Income / COGS', color: '#b47c8c', value: (row: { incomeToCogsRatio: number | null }) => row.incomeToCogsRatio ?? 0 }
  ];

  const sectionIds = analyticsSections.map((section) => section.id);
  const trackedSections = new Map<AnalyticsSectionId, HTMLElement>();
  const stickyAnchorOffset = 190;
  let scrollFrame = 0;

  const updateActiveSection = () => {
    let nextSection = sectionIds[0];

    for (const sectionId of sectionIds) {
      const element = trackedSections.get(sectionId);
      if (!element) continue;
      const top = element.getBoundingClientRect().top;
      if (top <= stickyAnchorOffset) nextSection = sectionId;
      else break;
    }

    activeSection = nextSection;
  };

  const scheduleActiveSectionUpdate = () => {
    if (scrollFrame) return;
    scrollFrame = window.requestAnimationFrame(() => {
      scrollFrame = 0;
      updateActiveSection();
    });
  };

  const trackSection = (node: HTMLElement) => {
    const id = node.id as AnalyticsSectionId;
    trackedSections.set(id, node);
    node.style.scrollMarginTop = `${stickyAnchorOffset}px`;
    scheduleActiveSectionUpdate();

    return {
      destroy() {
        trackedSections.delete(id);
      }
    };
  };

  onMount(() => {
    const hash = window.location.hash.slice(1) as AnalyticsSectionId;
    if (sectionIds.includes(hash)) activeSection = hash;

    window.addEventListener('scroll', scheduleActiveSectionUpdate, { passive: true });
    window.addEventListener('resize', scheduleActiveSectionUpdate);
    scheduleActiveSectionUpdate();

    return () => {
      window.removeEventListener('scroll', scheduleActiveSectionUpdate);
      window.removeEventListener('resize', scheduleActiveSectionUpdate);
      if (scrollFrame) window.cancelAnimationFrame(scrollFrame);
    };
  });
</script>

<section class="space-y-6">
  <header class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
    <div>
      <p class="text-sm font-bold uppercase tracking-[0.22em] text-[#7a6550]/55">Management analytics</p>
      <h1 class="mt-2 text-3xl font-semibold tracking-tight text-[#2c2925]">Revenue, open-play, and receipt trends</h1>
      <p class="mt-2 max-w-3xl text-sm text-[#7a6550]">
        Dedicated analytics for the management dashboard. Daily meeting content stays on the main dashboard; this route owns receipt and revenue trends.
      </p>
    </div>
    <a href="/mgmt-dashboard" class="rounded-full border border-[#dfd2c5] bg-white px-4 py-2 text-sm font-bold text-[#7a6550] transition hover:border-[#7a6550] hover:text-[#2c2925]">
      Back to daily dashboard
    </a>
  </header>

  <AnalyticsToolbar {filters} {loading} {activeSection} />

  <div class="min-w-0 space-y-6">
  {#if error}
    <div class="rounded-3xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">{error}</div>
  {:else if loading && !data}
    <div class="grid gap-4 md:grid-cols-3">
      {#each Array(3) as _}
        <div class="h-36 animate-pulse rounded-3xl bg-white/70 shadow-sm"></div>
      {/each}
    </div>
  {:else}
    <section class="grid gap-4 md:grid-cols-4" id="overview" use:trackSection>
      <article class="rounded-3xl border border-[#dfd2c5] bg-white p-6 shadow-sm">
        <p class="text-sm font-semibold text-[#7a6550]">Net revenue</p>
        <p class="mt-3 text-3xl font-bold tracking-tight">{formatMoney(data?.summary.netRevenue)}</p>
        <p class="mt-3 text-xs text-[#7a6550]/70">After {formatMoney(data?.summary.refunds)} refunds.</p>
      </article>
      <article class="rounded-3xl border border-[#dfd2c5] bg-white p-6 shadow-sm">
        <p class="text-sm font-semibold text-[#7a6550]">Gross revenue</p>
        <p class="mt-3 text-3xl font-bold tracking-tight">{formatMoney(data?.summary.grossRevenue)}</p>
        <p class="mt-3 text-xs text-[#7a6550]/70">{data?.summary.saleCount ?? 0} sales · {data?.summary.receiptCount ?? 0} receipts.</p>
      </article>
      <article class="rounded-3xl border border-[#dfd2c5] bg-white p-6 shadow-sm">
        <p class="text-sm font-semibold text-[#7a6550]">Gross margin</p>
        <p class="mt-3 text-3xl font-bold tracking-tight">{percent(data?.summary.grossMargin)}</p>
        <p class="mt-3 text-xs text-[#7a6550]/70">COGS {formatMoney(data?.summary.cogs)}.</p>
      </article>
      <article class="rounded-3xl border border-[#dfd2c5] bg-white p-6 shadow-sm">
        <p class="text-sm font-semibold text-[#7a6550]">Income / COGS</p>
        <p class="mt-3 text-3xl font-bold tracking-tight">{ratio(data?.summary.incomeToCogsRatio)}</p>
        <p class="mt-3 text-xs text-[#7a6550]/70">Higher means stronger contribution after cost.</p>
      </article>
    </section>

    <section class="grid gap-4" id="revenue" use:trackSection>
      <article class="rounded-3xl border border-[#dfd2c5] bg-white p-6 shadow-sm">
        <div class="flex items-start gap-3">
          <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#efe6dc] text-[#7a6550]"><WalletCards size={18} /></span>
          <div>
            <p class="text-sm font-semibold text-[#7a6550]">Revenue split</p>
            <h2 class="mt-1 text-2xl font-bold tracking-tight text-[#2c2925]">Channel trend by {filters.groupBy}</h2>
            <p class="mt-1 text-xs text-[#7a6550]/70">Line chart for restaurant, open-play, store, and other revenue.</p>
          </div>
        </div>
        <Chart.Container
          config={{
            restaurant: { label: 'Restaurant', color: '#7a6550' },
            openPlay: { label: 'Open-play', color: '#d79a5f' },
            store: { label: 'Store', color: '#7f9f8f' },
            others: { label: 'Others', color: '#b47c8c' }
          }}
          class="aspect-auto mt-5 h-[360px] w-full"
        >
          <LineChart
            data={revenueTrend}
            x="label"
            xScale={scalePoint().padding(0.5)}
            series={channelSeries}
            legend
            points={showPoints(revenueTrend)}
            padding={{ top: 24, right: 24, bottom: 34, left: 58 }}
            props={{ xAxis: commonXAxisProps, yAxis: { ticks: 4, format: (value: number) => formatMoney(value) } }}
          >
            {#snippet tooltip()}
              <Chart.Tooltip labelKey="label" />
            {/snippet}
          </LineChart>
        </Chart.Container>
      </article>

      <aside class="space-y-4 rounded-3xl border border-[#dfd2c5] bg-white p-6 shadow-sm">
        <p class="text-sm font-semibold text-[#7a6550]">Selected-period mix</p>
        {#each data?.revenueChannels ?? [] as channel}
          <div>
            <div class="mb-1 flex items-center justify-between gap-3 text-sm">
              <p class="font-semibold capitalize text-[#2c2925]">{channel.channel.replace('-', ' ')}</p>
              <p class="tabular-nums text-[#7a6550]">{percent(channel.share)} · {formatMoney(channel.revenue)}</p>
            </div>
            <div class="h-3 overflow-hidden rounded-full bg-[#efe6dc]"><div class="h-full rounded-full bg-[#7a6550]" style="width: {(channel.revenue / maxChannelRevenue) * 100}%"></div></div>
            <p class="mt-1 text-xs text-[#7a6550]/70">COGS {formatMoney(channel.cogs)} · gross profit {formatMoney(channel.grossProfit)}</p>
          </div>
        {/each}
      </aside>
    </section>

    <section class="space-y-4" id="open-play" use:trackSection>
      <article class="rounded-3xl border border-[#dfd2c5] bg-white p-6 shadow-sm">
        <div class="flex items-start gap-3">
          <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#efe6dc] text-[#7a6550]"><TrendingUp size={18} /></span>
          <div>
            <p class="text-sm font-semibold text-[#7a6550]">Open-play duration distribution</p>
            <h2 class="mt-1 text-2xl font-bold tracking-tight text-[#2c2925]">How long 1-hour ticket receipts stay</h2>
            <p class="mt-1 text-xs text-[#7a6550]/70">
              Receipts that include the 1-hour item, split between tickets left as 1-hour only and tickets converted with the 1-hour → 1-day item.
            </p>
          </div>
        </div>

        <div class="mt-5 grid gap-3 md:grid-cols-4">
          <div class="rounded-2xl border border-[#eadfd3] bg-[#fffaf4] p-4">
            <p class="text-xs font-semibold uppercase tracking-[0.14em] text-[#7a6550]/70">Parsed receipts</p>
            <p class="mt-2 text-2xl font-bold text-[#2c2925]">{openPlayDurationStats?.totalReceipts ?? 0}</p>
          </div>
          <div class="rounded-2xl border border-[#eadfd3] bg-[#fffaf4] p-4">
            <p class="text-xs font-semibold uppercase tracking-[0.14em] text-[#7a6550]/70">1-hour only avg</p>
            <p class="mt-2 text-2xl font-bold text-[#2c2925]">{formatDuration(openPlayDurationStats?.oneHourOnlyAvgMinutes)}</p>
            <p class="mt-1 text-xs text-[#7a6550]/70">{openPlayDurationStats?.oneHourOnlyCount ?? 0} receipts</p>
          </div>
          <div class="rounded-2xl border border-[#eadfd3] bg-[#fffaf4] p-4">
            <p class="text-xs font-semibold uppercase tracking-[0.14em] text-[#7a6550]/70">Converted avg</p>
            <p class="mt-2 text-2xl font-bold text-[#2c2925]">{formatDuration(openPlayDurationStats?.convertedAvgMinutes)}</p>
            <p class="mt-1 text-xs text-[#7a6550]/70">{openPlayDurationStats?.convertedCount ?? 0} receipts</p>
          </div>
          <div class="rounded-2xl border border-[#eadfd3] bg-[#fffaf4] p-4">
            <p class="text-xs font-semibold uppercase tracking-[0.14em] text-[#7a6550]/70">Over 75m</p>
            <p class="mt-2 text-2xl font-bold text-[#2c2925]">{(openPlayDurationStats?.oneHourOnlyOver75Count ?? 0) + (openPlayDurationStats?.convertedOver75Count ?? 0)}</p>
            <p class="mt-1 text-xs text-[#7a6550]/70">1-hour only {openPlayDurationStats?.oneHourOnlyOver75Count ?? 0} · converted {openPlayDurationStats?.convertedOver75Count ?? 0}</p>
          </div>
        </div>

        {#if openPlayDurationDistribution.length}
          <Chart.Container
            config={{
              oneHourOnlyCount: { label: '1-hour only', color: '#7a6550' },
              convertedCount: { label: '1-hour → 1-day', color: '#d79a5f' }
            }}
            class="aspect-auto mt-5 h-[360px] w-full"
          >
            <LineChart
              data={openPlayDurationDistribution}
              x="label"
              xScale={scalePoint().padding(0.5)}
              series={openPlayDurationSeries}
              legend
              points
              padding={{ top: 24, right: 24, bottom: 34, left: 48 }}
              props={{ xAxis: { tickSpacing: 70, format: (value: string) => value, tickLabelProps: { class: 'text-[10px] fill-[#7a6550]/60' } }, yAxis: { ticks: 4, format: (value: number) => String(Math.round(value)) } }}
            >
              {#snippet tooltip()}
                <Chart.Tooltip labelKey="label" />
              {/snippet}
            </LineChart>
          </Chart.Container>
        {:else}
          <p class="mt-5 rounded-2xl border border-dashed border-[#dfd2c5] p-4 text-sm text-[#7a6550]">
            No 1-hour receipts with parsed order timing found for this period.
          </p>
        {/if}
      </article>

      <article class="rounded-3xl border border-[#dfd2c5] bg-white p-6 shadow-sm">
        <div class="flex items-start gap-3">
          <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#efe6dc] text-[#7a6550]"><TrendingUp size={18} /></span>
          <div>
            <p class="text-sm font-semibold text-[#7a6550]">1-hour vs 1-day open-play mix</p>
            <h2 class="mt-1 text-2xl font-bold tracking-tight text-[#2c2925]">Ticket quantity trend by {filters.groupBy}</h2>
            <p class="mt-1 text-xs text-[#7a6550]/70">Lines show 1-hour and 1-day ticket volume for the selected global grouping.</p>
          </div>
        </div>
        {#if selectedPassMix.length}
          <Chart.Container
            config={{
              oneHourQuantity: { label: '1-hour qty', color: '#7a6550' },
              oneDayQuantity: { label: '1-day qty', color: '#d79a5f' }
            }}
            class="aspect-auto mt-5 h-[340px] w-full"
          >
            <LineChart
              data={selectedPassMix}
              x="label"
              xScale={scalePoint().padding(0.5)}
              series={passMixSeries}
              legend
              points={showPoints(selectedPassMix)}
              padding={{ top: 24, right: 24, bottom: 34, left: 48 }}
              props={{ xAxis: commonXAxisProps, yAxis: { ticks: 4, format: (value: number) => String(Math.round(value)) } }}
            >
              {#snippet tooltip()}
                <Chart.Tooltip labelKey="label" />
              {/snippet}
            </LineChart>
          </Chart.Container>
        {:else}
          <p class="mt-5 rounded-2xl border border-dashed border-[#dfd2c5] p-4 text-sm text-[#7a6550]">No 1-hour or 1-day open-play items found for this period.</p>
        {/if}
      </article>
    </section>

    <section class="grid gap-4" id="profitability" use:trackSection>
      <article class="rounded-3xl border border-[#dfd2c5] bg-white p-6 shadow-sm">
        <div class="flex items-start gap-3">
          <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#efe6dc] text-[#7a6550]"><BarChart3 size={18} /></span>
          <div>
            <p class="text-sm font-semibold text-[#7a6550]">Profitability trend</p>
            <h2 class="mt-1 text-2xl font-bold tracking-tight text-[#2c2925]">Gross margin and income / COGS</h2>
            <p class="mt-1 text-xs text-[#7a6550]/70">Category mapping from {data?.departmentMappingSource === 'notion' ? 'Notion' : 'fallback config'}.</p>
          </div>
        </div>
        <Chart.Container
          config={{
            grossMargin: { label: 'Gross margin %', color: '#7f9f8f' },
            incomeToCogsRatio: { label: 'Income / COGS', color: '#b47c8c' }
          }}
          class="aspect-auto mt-5 h-[340px] w-full"
        >
          <LineChart
            data={profitabilityTrend}
            x="label"
            xScale={scalePoint().padding(0.5)}
            series={profitabilitySeries}
            legend
            points={showPoints(profitabilityTrend)}
            padding={{ top: 24, right: 24, bottom: 34, left: 48 }}
            props={{ xAxis: commonXAxisProps, yAxis: { ticks: 4, format: (value: number) => value >= 10 ? `${value.toFixed(0)}%` : value.toFixed(1) } }}
          >
            {#snippet tooltip()}
              <Chart.Tooltip labelKey="label" />
            {/snippet}
          </LineChart>
        </Chart.Container>
      </article>

      <article class="rounded-3xl border border-[#dfd2c5] bg-white p-6 shadow-sm">
        <p class="text-sm font-semibold text-[#7a6550]">Department detail</p>
        <div class="mt-4 overflow-x-auto rounded-2xl border border-[#eadfd3]">
          <table class="w-full min-w-[520px] text-left text-sm">
            <thead class="bg-[#fffaf4] text-xs uppercase tracking-[0.16em] text-[#7a6550]/70"><tr><th class="px-4 py-3 font-bold">Department</th><th class="px-4 py-3 text-right font-bold">Revenue</th><th class="px-4 py-3 text-right font-bold">Gross profit</th></tr></thead>
            <tbody class="divide-y divide-[#eadfd3]">
              {#each data?.departments ?? [] as row}
                <tr class={row.department === 'unknown' && row.lineCount > 0 ? 'bg-amber-50/70' : ''}>
                  <td class="px-4 py-3 font-semibold capitalize text-[#2c2925]">{row.department}</td>
                  <td class="px-4 py-3 text-right tabular-nums">{formatMoney(row.revenue)}</td>
                  <td class="px-4 py-3 text-right font-semibold tabular-nums">{formatMoney(row.grossProfit)}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </article>
    </section>

    <section class="space-y-4" id="receipt-patterns" use:trackSection>
      <div>
        <p class="text-sm font-bold uppercase tracking-[0.22em] text-[#7a6550]/55">Legacy receipt analytics</p>
        <h2 class="mt-2 text-2xl font-semibold tracking-tight text-[#2c2925]">Customer, payment, item, and timing patterns</h2>
      </div>
      <ReceiptsAnalytics analytics={legacyReceipts} groupBy={filters.groupBy} />
    </section>
  {/if}
  </div>
</section>
