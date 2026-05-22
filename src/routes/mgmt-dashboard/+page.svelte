<script lang="ts">
  import { getTodayDashboardOverview } from '$lib/mgmt-dashboard.remote';

  const overview = getTodayDashboardOverview();

  const money = new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'THB',
    maximumFractionDigits: 0
  });

  const formatMoney = (value: number | undefined) => money.format(value ?? 0);

  const departmentLabel = (department: string) =>
    department === 'unknown'
      ? 'Unknown'
      : department
          .split('-')
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
          .join(' ');
</script>

<section class="space-y-6">
  <div>
    <p class="text-sm font-bold uppercase tracking-[0.22em] text-[#7a6550]/55">Overview</p>
    <h1 class="mt-2 text-3xl font-semibold tracking-tight text-[#2c2925]">Today’s receipt summary</h1>
    <p class="mt-2 max-w-2xl text-sm text-[#7a6550]">
      Starter summary based on receipts recorded today in Neon, with department gross profit prepared from line-item revenue and COGS.
    </p>
  </div>

  {#if overview.error}
    <div class="rounded-3xl border border-red-200 bg-red-50 p-5 text-red-800">
      Failed to load today’s overview.
    </div>
  {:else if overview.loading}
    <div class="grid gap-4 md:grid-cols-3">
      {#each Array(3) as _}
        <div class="h-36 animate-pulse rounded-3xl bg-white/70 shadow-sm"></div>
      {/each}
    </div>
  {:else}
    {@const data = overview.current}
    <div class="grid gap-4 md:grid-cols-3">
      <article class="rounded-3xl border border-[#dfd2c5] bg-white p-6 shadow-sm">
        <p class="text-sm font-semibold text-[#7a6550]">Net total today</p>
        <p class="mt-3 text-4xl font-bold tracking-tight">{formatMoney(data?.netTotal)}</p>
        <p class="mt-3 text-xs text-[#7a6550]/70">Sales minus refunds, using receipt total_money.</p>
      </article>

      <article class="rounded-3xl border border-[#dfd2c5] bg-white p-6 shadow-sm">
        <p class="text-sm font-semibold text-[#7a6550]">Sales today</p>
        <p class="mt-3 text-4xl font-bold tracking-tight">{formatMoney(data?.salesTotal)}</p>
        <p class="mt-3 text-xs text-[#7a6550]/70">{data?.saleCount ?? 0} sale receipts</p>
      </article>

      <article class="rounded-3xl border border-[#dfd2c5] bg-white p-6 shadow-sm">
        <p class="text-sm font-semibold text-[#7a6550]">Receipts today</p>
        <p class="mt-3 text-4xl font-bold tracking-tight">{data?.receiptCount ?? 0}</p>
        <p class="mt-3 text-xs text-[#7a6550]/70">
          Refunds: {data?.refundCount ?? 0} · {formatMoney(data?.refundTotal)}
        </p>
      </article>
    </div>

    <section class="rounded-3xl border border-[#dfd2c5] bg-white p-6 shadow-sm">
      <div class="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p class="text-sm font-semibold text-[#7a6550]">Gross profit by department</p>
          <h2 class="mt-1 text-2xl font-bold tracking-tight text-[#2c2925]">Today</h2>
        </div>
        <p class="text-xs text-[#7a6550]/70">
          Category mapping from {data?.departmentMappingSource === 'notion' ? 'Notion' : 'fallback config'}.
          Unmapped categories appear as Unknown.
        </p>
      </div>

      <div class="mt-5 overflow-x-auto rounded-2xl border border-[#eadfd3]">
        <table class="w-full min-w-[680px] text-left text-sm">
          <thead class="bg-[#fffaf4] text-xs uppercase tracking-[0.16em] text-[#7a6550]/70">
            <tr>
              <th class="px-4 py-3 font-bold">Department</th>
              <th class="px-4 py-3 text-right font-bold">Revenue</th>
              <th class="px-4 py-3 text-right font-bold">COGS</th>
              <th class="px-4 py-3 text-right font-bold">Gross profit</th>
              <th class="px-4 py-3 text-right font-bold">Lines</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#eadfd3]">
            {#each data?.departments ?? [] as row}
              <tr class={row.department === 'unknown' && row.lineCount > 0 ? 'bg-amber-50/70' : ''}>
                <td class="px-4 py-3 font-semibold text-[#2c2925]">
                  {departmentLabel(row.department)}
                  {#if row.department === 'unknown' && row.categories.length}
                    <p class="mt-1 text-xs font-normal text-amber-800">
                      {row.categories.join(', ')}
                    </p>
                  {/if}
                </td>
                <td class="px-4 py-3 text-right tabular-nums">{formatMoney(row.revenue)}</td>
                <td class="px-4 py-3 text-right tabular-nums">{formatMoney(row.cogs)}</td>
                <td class="px-4 py-3 text-right font-semibold tabular-nums">{formatMoney(row.grossProfit)}</td>
                <td class="px-4 py-3 text-right tabular-nums">{row.lineCount}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>

      <p class="mt-4 text-xs text-[#7a6550]/70">
        COGS uses Loyverse line-item cost_total when available; until costs are filled in, gross profit will be close to revenue.
      </p>
    </section>
  {/if}
</section>
