<script lang="ts">
  import { ClipboardList, Copy } from 'lucide-svelte';
  import type { EmailAutomationEventDetail, ReviewQueueItem } from '$lib/server/email-automation/dashboard';
  import PendingReviewCard from './PendingReviewCard.svelte';
  import type { ReviewOperations } from './types';

  type Props = {
    reviews: ReviewQueueItem[];
    reviewTotals: { waiting: number; inProgress: number; done: number };
    copyingPendingReviews: boolean;
    onCopyPendingReviews: () => Promise<void>;
    operations: ReviewOperations;
    onRefresh: () => Promise<void>;
    loadDetail: (eventId: number) => Promise<EmailAutomationEventDetail | null>;
    onQuickReview: (eventId: number) => void;
  };

  let {
    reviews,
    reviewTotals,
    copyingPendingReviews,
    onCopyPendingReviews,
    operations,
    onRefresh,
    loadDetail,
    onQuickReview
  }: Props = $props();
</script>

<section class="overflow-hidden rounded-3xl border border-amber-200 bg-white shadow-sm">
  <div class="flex flex-wrap items-center justify-between gap-3 border-b border-amber-100 bg-amber-50 px-5 py-4">
    <div>
      <h2 class="flex items-center gap-2 font-semibold text-amber-950"><ClipboardList size={18} />Email attention review queue</h2>
      <p class="mt-1 text-xs text-amber-900">{reviewTotals.waiting} waiting · {reviewTotals.inProgress} in progress · {reviewTotals.done} done. Review notes and completion are stored separately from external actions, retries, Ledger, and Telegram work.</p>
    </div>
    <div class="flex flex-wrap items-center gap-2">
      <span class="rounded-full border border-amber-200 bg-white px-3 py-1 text-xs font-bold text-amber-800">{reviewTotals.waiting + reviewTotals.inProgress} open</span>
      <button class="flex items-center gap-2 rounded-full bg-[#2c2925] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50" disabled={copyingPendingReviews || reviewTotals.waiting + reviewTotals.inProgress === 0} onclick={onCopyPendingReviews}><Copy size={14} />Copy pending reviews for agent</button>
    </div>
  </div>
  <div class="border-b border-amber-100 bg-white px-5 py-3">
    <p class="text-sm font-semibold text-[#5c4a3d]">Remember to add this workflow to the future ticketing system.</p>
    <p class="mt-1 text-xs leading-5 text-[#7a6550]">For now, triage here, copy one or all provider-neutral bundles, paste them into a local Pi session, then modify and test classifier code locally. The dashboard never edits classifier source code.</p>
  </div>
  {#if reviews.length === 0}
    <p class="px-5 py-8 text-sm text-[#7a6550]">No open email reviews. Historical review records are retained as done when completed.</p>
  {:else}
    <div class="divide-y divide-[#eee5dc]">
      {#each reviews as review (review.id)}
        <PendingReviewCard {review} {operations} {onRefresh} {loadDetail} {onQuickReview} />
      {/each}
    </div>
  {/if}
</section>
