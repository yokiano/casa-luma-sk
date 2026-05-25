<script lang="ts">
  import { scalePoint } from 'd3-scale';
  import { LineChart } from 'layerchart';
  import { ArrowUpRight, BarChart3, ListChecks, SlidersHorizontal } from 'lucide-svelte';
  import * as Chart from '$lib/components/ui/chart';

  let { data } = $props();

  const chartColors = [
    'var(--color-chart-1)',
    'var(--color-chart-2)',
    'var(--color-chart-3)',
    'var(--color-chart-4)',
    'var(--color-chart-5)'
  ];

  const dateTime = new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short'
  });

  const formatDateTime = (value: string | null | undefined) => {
    if (!value) return '—';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '—' : dateTime.format(date);
  };

  const formatCodes = (codes: string[]) => (codes.length ? codes.join(', ') : '—');

  const isoDate = (date: Date) => date.toISOString().slice(0, 10);
  const utcDate = (value: string) => {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day));
  };
  const addDays = (date: Date, days: number) => new Date(date.getTime() + days * 86_400_000);
  const addMonths = (date: Date, months: number) =>
    new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1));
  const startOfWeek = (date: Date) => {
    const day = date.getUTCDay() || 7;
    return addDays(date, 1 - day);
  };
  const startOfMonth = (date: Date) => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));

  const buildTrendBuckets = () => {
    const generatedAt = new Date(data.analytics.generatedAt);
    const today = new Date(Date.UTC(generatedAt.getUTCFullYear(), generatedAt.getUTCMonth(), generatedAt.getUTCDate()));
    const existingBuckets = Array.from(new Set(data.analytics.dailyBuckets.map((bucket) => bucket.day))).sort((a, b) => a.localeCompare(b));
    const buckets: string[] = [];

    if (data.analytics.groupBy === 'month') {
      const end = startOfMonth(today);
      const start = data.analytics.timeframe === 'all' && existingBuckets[0]
        ? startOfMonth(utcDate(existingBuckets[0]))
        : addMonths(end, data.analytics.timeframe === '12m' ? -11 : data.analytics.timeframe === '90d' ? -2 : data.analytics.timeframe === '30d' ? 0 : 0);
      for (let cursor = start; cursor <= end; cursor = addMonths(cursor, 1)) buckets.push(isoDate(cursor));
      return buckets;
    }

    if (data.analytics.groupBy === 'week') {
      const end = startOfWeek(today);
      const weeksBack = data.analytics.timeframe === '7d' ? 0 : data.analytics.timeframe === '30d' ? 4 : data.analytics.timeframe === '90d' ? 12 : data.analytics.timeframe === '12m' ? 52 : 0;
      const start = data.analytics.timeframe === 'all' && existingBuckets[0] ? startOfWeek(utcDate(existingBuckets[0])) : addDays(end, -7 * weeksBack);
      for (let cursor = start; cursor <= end; cursor = addDays(cursor, 7)) buckets.push(isoDate(cursor));
      return buckets;
    }

    const daysBack = data.analytics.timeframe === '7d' ? 6 : data.analytics.timeframe === '30d' ? 29 : data.analytics.timeframe === '90d' ? 89 : data.analytics.timeframe === '12m' ? 364 : 0;
    const start = data.analytics.timeframe === 'all' && existingBuckets[0] ? utcDate(existingBuckets[0]) : addDays(today, -daysBack);
    for (let cursor = start; cursor <= today; cursor = addDays(cursor, 1)) buckets.push(isoDate(cursor));
    return buckets;
  };

  const hrefFor = (updates: Record<string, string>) => {
    const params = new URLSearchParams({
      timeframe: data.filters.timeframe,
      groupBy: data.filters.groupBy,
      ...updates
    });
    return `/mgmt-dashboard/violations?${params.toString()}`;
  };

  const activeSummaries = $derived(data.analytics.summaries.filter((summary) => summary.count > 0));
  const totalIncidents = $derived(data.analytics.summaries.reduce((sum, summary) => sum + summary.count, 0));
  const last24h = $derived(data.analytics.summaries.reduce((sum, summary) => sum + summary.last24h, 0));
  const latestSeen = $derived(
    data.analytics.summaries
      .map((summary) => summary.lastSeenAt)
      .filter(Boolean)
      .sort()
      .at(-1) ?? null
  );

  const visibleTrendSummaries = $derived(activeSummaries.slice(0, 5));
  const trendSeries = $derived(
    visibleTrendSummaries.map((summary, index) => ({
      key: summary.code,
      label: summary.label,
      color: chartColors[index % chartColors.length]
    }))
  );
  const trendConfig = $derived(
    Object.fromEntries(trendSeries.map((series) => [series.key, { label: series.label, color: series.color }]))
  );
  const trendBuckets = $derived(buildTrendBuckets());
  const trendData = $derived(
    trendBuckets.map((day) => {
      const row: Record<string, string | number> = { label: day };
      for (const series of trendSeries) row[series.key] = 0;
      for (const bucket of data.analytics.dailyBuckets.filter((bucket) => bucket.day === day)) {
        if (trendSeries.some((series) => series.key === bucket.code)) row[bucket.code] = bucket.count;
      }
      return row;
    })
  );

  const trendLabel = (trend: string) => {
    if (trend === 'new') return 'new';
    if (trend === 'up') return 'up';
    if (trend === 'down') return 'down';
    return 'flat';
  };

  const trendClasses = (trend: string) => {
    if (trend === 'new' || trend === 'up') return 'border-amber-200 bg-amber-50 text-amber-800';
    if (trend === 'down') return 'border-emerald-200 bg-emerald-50 text-emerald-800';
    return 'border-slate-200 bg-slate-50 text-slate-700';
  };
</script>

<svelte:head>
  <title>Violations · Mgmt Dashboard</title>
</svelte:head>

<section class="space-y-6">
  <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
    <div>
      <p class="text-sm font-bold uppercase tracking-[0.22em] text-[#7a6550]/55">Violations</p>
      <h1 class="mt-2 text-3xl font-semibold tracking-tight text-[#2c2925]">Receipt validation dashboard</h1>
      <p class="mt-2 max-w-3xl text-sm text-[#7a6550]">
        Aggregates receipt validation incidents by underlying validation code from incident context/payload.
      </p>
    </div>
    <a
      href="/tools/incidents"
      class="inline-flex items-center gap-2 rounded-2xl border border-[#dfd2c5] bg-white px-4 py-3 text-sm font-semibold text-[#7a6550] shadow-sm hover:border-[#b99f86]"
    >
      Old incidents list <ArrowUpRight size={16} />
    </a>
  </div>

  {#if data.dbError}
    <div class="rounded-3xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
      {data.dbError}
    </div>
  {/if}

  <section class="rounded-3xl border border-[#dfd2c5] bg-white p-5 shadow-sm">
    <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div class="flex items-center gap-3">
        <SlidersHorizontal class="text-[#7a6550]" size={20} />
        <div>
          <p class="text-sm font-bold text-[#2c2925]">Filters</p>
          <p class="text-xs text-[#7a6550]">Current: {data.analytics.timeframeLabel}, {data.analytics.groupByLabel.toLowerCase()} buckets</p>
        </div>
      </div>
      <div class="flex flex-col gap-3 lg:items-end">
        <div class="flex flex-wrap gap-2">
          {#each data.filters.timeframes as option}
            <a
              href={hrefFor({ timeframe: option.value })}
              class={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                data.filters.timeframe === option.value
                  ? 'border-[#7a6550] bg-[#7a6550] text-white'
                  : 'border-[#d8c9bb] text-[#7a6550] hover:border-[#7a6550]'
              }`}
            >{option.label}</a>
          {/each}
        </div>
        <div class="flex flex-wrap gap-2">
          {#each data.filters.groupings as option}
            <a
              href={hrefFor({ groupBy: option.value })}
              class={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                data.filters.groupBy === option.value
                  ? 'border-[#7a6550] bg-[#7a6550] text-white'
                  : 'border-[#d8c9bb] text-[#7a6550] hover:border-[#7a6550]'
              }`}
            >{option.label}</a>
          {/each}
        </div>
      </div>
    </div>
  </section>

  <div class="grid gap-4 md:grid-cols-3">
    <article class="rounded-3xl border border-[#dfd2c5] bg-white p-6 shadow-sm">
      <p class="text-sm font-semibold text-[#7a6550]">Validation hits</p>
      <p class="mt-3 text-4xl font-bold tracking-tight">{totalIncidents}</p>
      <p class="mt-3 text-xs text-[#7a6550]/70">Within {data.analytics.timeframeLabel.toLowerCase()}.</p>
    </article>
    <article class="rounded-3xl border border-[#dfd2c5] bg-white p-6 shadow-sm">
      <p class="text-sm font-semibold text-[#7a6550]">Last 24 hours</p>
      <p class="mt-3 text-4xl font-bold tracking-tight">{last24h}</p>
      <p class="mt-3 text-xs text-[#7a6550]/70">Across all known and discovered validation codes.</p>
    </article>
    <article class="rounded-3xl border border-[#dfd2c5] bg-white p-6 shadow-sm">
      <p class="text-sm font-semibold text-[#7a6550]">Last seen</p>
      <p class="mt-3 text-2xl font-bold tracking-tight">{formatDateTime(latestSeen)}</p>
      <p class="mt-3 text-xs text-[#7a6550]/70">Generated {formatDateTime(data.analytics.generatedAt)}.</p>
    </article>
  </div>

  <section class="rounded-3xl border border-[#dfd2c5] bg-white p-6 shadow-sm">
    <div class="flex items-start justify-between gap-4">
      <div>
        <p class="text-sm font-bold text-[#7a6550]">Trend by violation</p>
        <h2 class="mt-2 text-2xl font-semibold">{data.analytics.groupByLabel} counts</h2>
        <p class="mt-1 text-xs text-[#7a6550]/70">Top {trendSeries.length || 0} active violation types in the selected timeframe.</p>
      </div>
      <BarChart3 class="text-[#7a6550]" size={24} />
    </div>

    {#if trendData.length === 0 || trendSeries.length === 0}
      <p class="mt-6 rounded-2xl bg-[#f6f1eb] p-4 text-sm text-[#7a6550]">No validation incidents in this timeframe.</p>
    {:else}
      <div class="mt-5 flex flex-wrap gap-3">
        {#each trendSeries as series}
          <span class="inline-flex items-center gap-2 text-xs font-semibold text-[#7a6550]">
            <span class="h-2.5 w-2.5 rounded-full" style={`background: ${series.color}`}></span>
            {series.label}
          </span>
        {/each}
      </div>
      <Chart.Container config={trendConfig} class="mt-5 aspect-auto h-[340px] w-full">
        <LineChart
          data={trendData}
          x="label"
          xScale={scalePoint().padding(0.5)}
          series={trendSeries}
          points={trendData.length <= 90}
          padding={{ top: 20, right: 20, bottom: 20, left: 35 }}
          axis="x"
          props={{
            xAxis: { format: (value: string) => value.slice(5) },
            yAxis: { ticks: 4, format: (value: number) => String(Math.round(value)) }
          }}
        >
          {#snippet tooltip()}
            <Chart.Tooltip labelKey="label" />
          {/snippet}
        </LineChart>
      </Chart.Container>
    {/if}
  </section>

  <section class="rounded-3xl border border-[#dfd2c5] bg-white p-6 shadow-sm">
    <div>
      <p class="text-sm font-bold text-[#7a6550]">Violation types</p>
      <h2 class="mt-2 text-2xl font-semibold">Compact cards</h2>
      <p class="mt-1 text-xs text-[#7a6550]/70">Open a card to see full description and protection notes.</p>
    </div>

    <div class="mt-6 grid gap-3 lg:grid-cols-2">
      {#each data.analytics.summaries as summary}
        <details class="group rounded-2xl border border-[#eadfd3] bg-[#fffaf4] p-4 open:bg-white">
          <summary class="cursor-pointer list-none">
            <div class="flex items-center justify-between gap-4">
              <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-2">
                  <h3 class="truncate text-base font-bold text-[#2c2925]">{summary.label}</h3>
                  <span class={`rounded-full border px-2 py-0.5 text-[11px] font-bold ${trendClasses(summary.recentTrend)}`}>
                    {trendLabel(summary.recentTrend)}
                  </span>
                </div>
                <p class="mt-1 truncate font-mono text-xs text-[#7a6550]">{summary.code}</p>
              </div>
              <dl class="grid shrink-0 grid-cols-3 gap-2 text-center text-xs">
                <div><dt class="text-[#7a6550]">Total</dt><dd class="text-lg font-bold text-[#2c2925]">{summary.count}</dd></div>
                <div><dt class="text-[#7a6550]">24h</dt><dd class="text-lg font-bold text-[#2c2925]">{summary.last24h}</dd></div>
                <div><dt class="text-[#7a6550]">7d</dt><dd class="text-lg font-bold text-[#2c2925]">{summary.last7d}</dd></div>
              </dl>
            </div>
          </summary>
          <div class="mt-4 border-t border-[#eadfd3] pt-4 text-sm text-[#5c4a3d]">
            <p>{summary.description}</p>
            <p class="mt-2 text-xs text-[#7a6550]/80"><b>Protects from:</b> {summary.protectsFrom}</p>
            <p class="mt-2 text-xs text-[#7a6550]/80"><b>Last seen:</b> {formatDateTime(summary.lastSeenAt)}</p>
          </div>
        </details>
      {/each}
    </div>
  </section>

  <section class="rounded-3xl border border-[#dfd2c5] bg-white p-6 shadow-sm">
    <div class="flex items-start justify-between gap-4">
      <div>
        <p class="text-sm font-bold text-[#7a6550]">Incidents</p>
        <h2 class="mt-2 text-2xl font-semibold">Inspect individual incidents</h2>
      </div>
      <ListChecks class="text-[#7a6550]" size={24} />
    </div>

    {#if data.analytics.recentIncidents.length === 0}
      <p class="mt-6 rounded-2xl bg-[#f6f1eb] p-4 text-sm text-[#7a6550]">No validation incidents in this timeframe.</p>
    {:else}
      <div class="mt-6 overflow-x-auto rounded-2xl border border-[#eadfd3]">
        <table class="w-full min-w-[760px] text-left text-sm">
          <thead class="bg-[#fffaf4] text-xs uppercase tracking-[0.16em] text-[#7a6550]/70">
            <tr>
              <th class="px-4 py-3 font-bold">When</th>
              <th class="px-4 py-3 font-bold">Violations</th>
              <th class="px-4 py-3 font-bold">Severity</th>
              <th class="px-4 py-3 font-bold">Message</th>
              <th class="px-4 py-3 font-bold">Open</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#eadfd3]">
            {#each data.analytics.recentIncidents as incident}
              <tr>
                <td class="px-4 py-3 text-[#5c4a3d]">{formatDateTime(incident.createdAt)}</td>
                <td class="px-4 py-3 font-mono text-xs text-[#2c2925]">{formatCodes(incident.violationCodes)}</td>
                <td class="px-4 py-3">
                  <span class="rounded-full px-2 py-1 text-xs font-semibold"
                    class:bg-red-100={incident.severity === 'critical'}
                    class:text-red-800={incident.severity === 'critical'}
                    class:bg-amber-100={incident.severity === 'warning'}
                    class:text-amber-800={incident.severity === 'warning'}
                    class:bg-slate-100={incident.severity !== 'critical' && incident.severity !== 'warning'}
                    class:text-slate-700={incident.severity !== 'critical' && incident.severity !== 'warning'}
                  >
                    {incident.severity}
                  </span>
                </td>
                <td class="max-w-xs truncate px-4 py-3 text-[#5c4a3d]">{incident.message}</td>
                <td class="px-4 py-3">
                  <a class="font-semibold text-[#7a6550] underline" href={`/mgmt-dashboard/violations/${incident.id}`}>view</a>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </section>
</section>
