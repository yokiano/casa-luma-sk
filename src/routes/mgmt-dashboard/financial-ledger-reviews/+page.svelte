<script lang="ts">
  import { enhance } from '$app/forms';
  import { ArrowLeft, CheckCircle2, ExternalLink, Save, TriangleAlert } from 'lucide-svelte';

  let { data, form } = $props();
  let savingReviewId = $state<number | null>(null);

  const dateTime = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
  const formatDate = (value: string | Date) => dateTime.format(new Date(value));
  const formatMoney = (minor: number | null, currency: string | null) => {
    if (minor === null) return 'Amount unavailable';
    return new Intl.NumberFormat('en-GB', { style: 'currency', currency: currency || 'THB' }).format(minor / 100);
  };

  const submitEnhance = (reviewId: number) => {
    savingReviewId = reviewId;
    return async ({ update }: { update: () => Promise<void> }) => {
      await update();
      savingReviewId = null;
    };
  };
</script>

<svelte:head>
  <title>Financial Ledger reviews · Mgmt Dashboard</title>
</svelte:head>

<section class="mx-auto max-w-5xl space-y-6">
  <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
    <div>
      <a href="/mgmt-dashboard" class="inline-flex items-center gap-1 text-sm font-semibold text-[#7a6550] hover:text-[#2c2925]"><ArrowLeft size={15} /> Daily meeting</a>
      <p class="mt-5 text-sm font-bold uppercase tracking-[0.22em] text-[#7a6550]/55">Financial Ledger</p>
      <h1 class="mt-2 text-3xl font-semibold tracking-tight">Outstanding completeness reviews</h1>
      <p class="mt-2 max-w-3xl text-sm leading-6 text-[#7a6550]">
        Recorded transactions remain open here until Category is set and an Invoice / Receipt is attached, or Receipt Not Required is explicitly confirmed.
        Every save derives Review Required again and records an audit entry.
      </p>
    </div>
    <a href="/mgmt-dashboard/email-automation" class="inline-flex items-center gap-2 rounded-full border border-[#dfd2c5] bg-white px-4 py-2 text-xs font-bold text-[#7a6550] hover:border-[#7a6550]">Email automation <ExternalLink size={13} /></a>
  </div>

  {#if form?.success}
    <div class="flex items-start gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950">
      <CheckCircle2 class="mt-0.5 shrink-0 text-emerald-700" size={18} />
      <span>{form.nextStep}</span>
    </div>
  {:else if form?.error}
    <div class="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
      <p class="font-bold">Review was not saved.</p>
      <p class="mt-1">{form.error}</p>
    </div>
  {/if}

  {#if data.error}
    <div class="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">{data.error}</div>
  {/if}

  {#if data.reviews.length === 0}
    <div class="rounded-3xl border border-dashed border-[#dfd2c5] bg-white p-8 text-center text-sm text-[#7a6550]">
      No open recorded Financial Ledger completeness reviews.
    </div>
  {:else}
    <div class="space-y-4">
      {#each data.reviews as review (review.reviewId)}
        <article class="rounded-3xl border border-amber-200 bg-white p-5 shadow-sm">
          <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p class="text-xs font-bold uppercase tracking-[0.16em] text-amber-700">Review #{review.reviewId} · {review.status}</p>
              <h2 class="mt-1 text-lg font-semibold text-[#2c2925]">{review.ledger?.description ?? review.subject}</h2>
              <p class="mt-1 text-xs text-[#7a6550]">{formatDate(review.receivedAt)} · {formatMoney(review.amountMinor, review.currency)} · event #{review.eventId}</p>
              <p class="mt-2 text-sm text-amber-950">{review.reason}</p>
            </div>
            <div class="flex flex-wrap gap-2 text-xs">
              <a class="inline-flex items-center gap-1 rounded-full border border-[#dfd2c5] px-3 py-1.5 font-bold text-[#7a6550] hover:border-[#7a6550]" href={`/mgmt-dashboard/email-automation/${review.eventId}`}>Open event <ExternalLink size={12} /></a>
              {#if review.ledger}<a class="inline-flex items-center gap-1 rounded-full border border-[#dfd2c5] px-3 py-1.5 font-bold text-[#7a6550] hover:border-[#7a6550]" href={review.ledger.url} target="_blank" rel="noreferrer">Open Ledger <ExternalLink size={12} /></a>{/if}
            </div>
          </div>

          {#if review.ledgerError}
            <p class="mt-4 flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-900"><TriangleAlert class="mt-0.5 shrink-0" size={16} />{review.ledgerError}</p>
          {:else if review.ledger}
            <form method="POST" use:enhance={submitEnhance(review.reviewId)} class="mt-4 rounded-2xl border border-[#eadfd3] bg-[#fffaf4] p-4">
              <input type="hidden" name="reviewId" value={review.reviewId} />
              <input type="hidden" name="expectedReviewRevision" value={review.reviewRevision} />
              <div class="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
                <label class="block text-sm font-bold text-[#2c2925]">
                  Category
                  <select name="category" required class="mt-2 block w-full rounded-2xl border border-[#d3c5b8] bg-white px-4 py-3 font-normal text-[#2c2925] focus:border-[#7a6550] focus:outline-none">
                    <option value="" disabled>Select a category</option>
                    {#each data.categories as category}
                      <option value={category} selected={review.ledger.category === category}>{category}</option>
                    {/each}
                  </select>
                </label>
                <label class="flex items-start gap-2 rounded-2xl border border-[#d3c5b8] bg-white px-4 py-3 text-sm text-[#5c4a3d]">
                  <input type="checkbox" name="receiptNotRequired" value="true" checked={review.ledger.receiptNotRequired} class="mt-0.5" />
                  <span><b class="block text-[#2c2925]">Receipt Not Required</b><span class="text-xs leading-5">Use only when no invoice or receipt is expected for this transaction.</span></span>
                </label>
              </div>
              <div class="mt-3 flex flex-wrap items-center justify-between gap-3">
                <p class="text-xs text-[#7a6550]">Current derived state: <b>{review.ledger.reviewRequired ? `Review required · missing ${review.ledger.missingFields.join(' and ')}` : 'complete'}</b></p>
                <button type="submit" disabled={savingReviewId === review.reviewId} class="inline-flex items-center gap-2 rounded-full bg-[#7a6550] px-4 py-2 text-xs font-bold text-white hover:bg-[#2c2925] disabled:cursor-not-allowed disabled:opacity-60"><Save size={14} />{savingReviewId === review.reviewId ? 'Saving…' : 'Save completeness'}</button>
              </div>
            </form>
          {/if}
        </article>
      {/each}
    </div>
  {/if}
</section>
