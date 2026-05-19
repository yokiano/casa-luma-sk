<script lang="ts">
  import { getTodayDashboardOverview } from '$lib/mgmt-dashboard.remote';

  const overview = getTodayDashboardOverview();

  const money = new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'THB',
    maximumFractionDigits: 0
  });

  const formatMoney = (value: number | undefined) => money.format(value ?? 0);
</script>

<section class="space-y-6">
  <div>
    <p class="text-sm font-bold uppercase tracking-[0.22em] text-[#7a6550]/55">Overview</p>
    <h1 class="mt-2 text-3xl font-semibold tracking-tight text-[#2c2925]">Today’s receipt summary</h1>
    <p class="mt-2 max-w-2xl text-sm text-[#7a6550]">
      Starter summary based on receipts recorded today in Neon. “Profit” is shown as receipt net total for now.
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

    <div class="rounded-3xl border border-[#dfd2c5] bg-[#fffaf4] p-5 text-sm text-[#7a6550]">
      Next iteration can split this into revenue, COGS, payroll, and true profit once those sources are connected.
    </div>
  {/if}
</section>
