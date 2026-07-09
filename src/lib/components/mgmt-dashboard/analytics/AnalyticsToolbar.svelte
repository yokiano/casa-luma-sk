<script lang="ts">
  import AnalyticsSectionNav, { type AnalyticsSectionId } from './AnalyticsSectionNav.svelte';
  import type { MgmtAnalyticsFilters } from '$lib/mgmt-dashboard/analytics-filters.svelte';

  interface Props {
    filters: MgmtAnalyticsFilters;
    loading?: boolean;
    activeSection?: AnalyticsSectionId;
  }

  let { filters, loading = false, activeSection = 'overview' }: Props = $props();
</script>

<div class="sticky top-0 z-10 -mx-2 space-y-3 rounded-3xl border border-[#dfd2c5] bg-white/90 p-3 shadow-sm backdrop-blur sm:mx-0">
  <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
    <div>
      <p class="text-xs font-bold uppercase tracking-[0.18em] text-[#7a6550]/60">Analytics timeframe</p>
      <p class="mt-1 text-sm font-semibold text-[#2c2925]">{filters.label}{loading ? ' · loading…' : ''}</p>
    </div>

    <div class="flex flex-wrap items-center gap-3">
      <div class="flex flex-wrap gap-2 rounded-2xl bg-[#f6f1eb] p-1">
        {#each filters.periodOptions as option}
          <button
            type="button"
            class="rounded-full px-3 py-1.5 text-xs font-bold transition {filters.period === option.value ? 'bg-[#7a6550] text-white shadow-sm' : 'text-[#7a6550] hover:bg-[#efe6dc]'}"
            onclick={() => filters.setPeriod(option.value)}
          >
            {option.label}
          </button>
        {/each}
      </div>

      <div class="flex flex-wrap gap-2 rounded-2xl bg-[#f6f1eb] p-1">
        {#each filters.groupByOptions as groupBy}
          <button
            type="button"
            class="rounded-full px-3 py-1.5 text-xs font-bold capitalize transition {filters.groupBy === groupBy ? 'bg-[#2c2925] text-white shadow-sm' : 'text-[#7a6550] hover:bg-[#efe6dc]'}"
            onclick={() => filters.setGroupBy(groupBy)}
          >
            {groupBy}
          </button>
        {/each}
      </div>
    </div>
  </div>

  <AnalyticsSectionNav {activeSection} />
</div>
