<script lang="ts">
  import type { LoyverseReceipt } from '$lib/server/loyverse';
  import ReceiptRowCompact from './ReceiptRowCompact.svelte';
  import ReceiptRowExpanded from './ReceiptRowExpanded.svelte';

  interface Props {
    receipts: LoyverseReceipt[];
    viewMode: 'compact' | 'expanded';
    isLoading?: boolean;
    hasMore?: boolean;
    errorMessage?: string | null;
    onLoadMore?: () => void;
  }

  let {
    receipts,
    viewMode,
    isLoading = false,
    hasMore = false,
    errorMessage = null,
    onLoadMore
  }: Props = $props();
</script>

<section class="space-y-4">
  {#if errorMessage}
    <div class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      {errorMessage}
    </div>
  {/if}

  {#if receipts.length === 0 && !isLoading}
    <div class="rounded-xl border border-[#eadfd4] bg-white/70 px-4 py-6 text-center text-sm text-[#7a6550]/80">
      No receipts found for the selected filters.
    </div>
  {:else}
    <div class="space-y-4">
      {#each receipts as receipt (receipt.receipt_number)}
        {#if viewMode === 'expanded'}
          <ReceiptRowExpanded {receipt} />
        {:else}
          <ReceiptRowCompact {receipt} />
        {/if}
      {/each}
    </div>
  {/if}

  <div class="flex items-center justify-between">
    <div class="text-xs text-[#7a6550]/70">
      {#if isLoading}
        Loading receipts...
      {:else if receipts.length > 0}
        Showing {receipts.length} receipt{receipts.length === 1 ? '' : 's'}
      {/if}
    </div>
    {#if hasMore}
      <button
        type="button"
        class="rounded-full border border-[#d8c9bb] px-4 py-2 text-sm font-medium text-[#7a6550] transition hover:border-[#7a6550] disabled:cursor-not-allowed disabled:opacity-60"
        onclick={() => onLoadMore?.()}
        disabled={isLoading}
      >
        Load more
      </button>
    {/if}
  </div>
</section>
