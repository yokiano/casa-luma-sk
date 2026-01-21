<script lang="ts">
  interface Props {
    viewMode: 'compact' | 'expanded';
    dateFrom: string;
    dateTo: string;
    storeId: string;
    sortOrder: 'desc' | 'asc';
    isLoading?: boolean;
    onApply?: () => void;
    onReset?: () => void;
    onRefresh?: () => void;
  }

  let {
    viewMode = $bindable('compact'),
    dateFrom = $bindable(''),
    dateTo = $bindable(''),
    storeId = $bindable(''),
    sortOrder = $bindable('desc'),
    isLoading = false,
    onApply,
    onReset,
    onRefresh
  }: Props = $props();
</script>

<section class="rounded-2xl border border-[#d8c9bb] bg-white/80 p-5 shadow-sm">
  <div class="flex flex-col gap-4">
    <div class="flex flex-wrap items-center gap-4">
      <div class="flex flex-col gap-2">
        <span class="text-xs uppercase tracking-wide text-[#7a6550]/80">View</span>
        <div class="flex items-center gap-3 text-sm text-[#2c2925]">
          <label class="flex items-center gap-2">
            <input type="radio" bind:group={viewMode} value="compact" />
            Compact
          </label>
          <label class="flex items-center gap-2">
            <input type="radio" bind:group={viewMode} value="expanded" />
            Expanded
          </label>
        </div>
      </div>

      <div class="flex flex-col gap-2">
        <span class="text-xs uppercase tracking-wide text-[#7a6550]/80">Date range</span>
        <div class="flex flex-wrap items-center gap-2">
          <input
            type="date"
            class="rounded-lg border border-[#d8c9bb] bg-white px-3 py-2 text-sm text-[#2c2925]"
            bind:value={dateFrom}
          />
          <span class="text-[#7a6550]/60">to</span>
          <input
            type="date"
            class="rounded-lg border border-[#d8c9bb] bg-white px-3 py-2 text-sm text-[#2c2925]"
            bind:value={dateTo}
          />
        </div>
      </div>

      <div class="flex flex-col gap-2">
        <span class="text-xs uppercase tracking-wide text-[#7a6550]/80">Store ID</span>
        <input
          type="text"
          placeholder="Optional store filter"
          class="min-w-[220px] rounded-lg border border-[#d8c9bb] bg-white px-3 py-2 text-sm text-[#2c2925]"
          bind:value={storeId}
        />
      </div>

      <div class="flex flex-col gap-2">
        <span class="text-xs uppercase tracking-wide text-[#7a6550]/80">Sort</span>
        <select
          class="rounded-lg border border-[#d8c9bb] bg-white px-3 py-2 text-sm text-[#2c2925]"
          bind:value={sortOrder}
        >
          <option value="desc">Latest first</option>
          <option value="asc">Oldest first</option>
        </select>
      </div>
    </div>

    <div class="flex flex-wrap items-center gap-3">
      <button
        type="button"
        class="rounded-full bg-[#7a6550] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#6a5847] disabled:cursor-not-allowed disabled:opacity-60"
        onclick={() => onApply?.()}
        disabled={isLoading}
      >
        Apply filters
      </button>
      <button
        type="button"
        class="rounded-full border border-[#d8c9bb] px-5 py-2 text-sm font-semibold text-[#7a6550] transition hover:border-[#7a6550] disabled:cursor-not-allowed disabled:opacity-60"
        onclick={() => onReset?.()}
        disabled={isLoading}
      >
        Reset
      </button>
      <button
        type="button"
        class="rounded-full border border-transparent px-4 py-2 text-sm font-medium text-[#7a6550]/80 transition hover:text-[#7a6550]"
        onclick={() => onRefresh?.()}
        disabled={isLoading}
      >
        Refresh
      </button>
    </div>
  </div>
</section>
