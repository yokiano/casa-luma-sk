<script lang="ts">
  import { toast } from 'svelte-sonner';
  import type { EmailAutomationEventDetail, ReviewQueueItem } from '$lib/server/email-automation/dashboard';
  import ActionToolbar from './ActionToolbar.svelte';
  import { formatAge, humanize, reviewStateClasses } from './presentation';
  import { reviewNotesPayload, type ReviewOperations } from './types';

  type Props = {
    review: ReviewQueueItem;
    operations: ReviewOperations;
    onRefresh: () => Promise<void>;
    loadDetail: (eventId: number) => Promise<EmailAutomationEventDetail | null>;
    onQuickReview: (eventId: number) => void;
  };

  let { review, operations, onRefresh, loadDetail, onQuickReview }: Props = $props();
  let analysis = $state('');
  let summary = $state('');
  let needsFullBody = $state(false);
  let syncedReviewId = $state<number | null>(null);
  let syncedRevision = $state<number | null>(null);
  let dirty = $state(false);
  let working = $state(false);
  let copying = $state(false);
  let status = $state('');

  const evidenceLabel = $derived.by(() => {
    const mime = review.mimeCompleteness === 'complete' ? 'complete MIME' : humanize(review.mimeCompleteness);
    return review.bodyPreviewTruncated ? `${mime}; preview truncated` : mime;
  });

  const openCardReview = () => onQuickReview(review.eventId);

  $effect(() => {
    const sameReview = review.id === syncedReviewId;
    if (sameReview && review.revision === syncedRevision) return;
    syncedReviewId = review.id;
    syncedRevision = review.revision;
    // A stale-revision refresh must advance the concurrency token without
    // erasing the manager's draft, so the next save can succeed.
    if (sameReview && dirty) return;
    analysis = review.analysis ?? '';
    summary = review.summary ?? '';
    needsFullBody = review.needsFullBody;
    dirty = false;
  });

  const runReview = async (label: string, operation: () => Promise<{ nextStep?: string }>) => {
    if (working) return;
    working = true;
    status = `${label} running…`;
    const toastId = toast.loading(`${label}…`);
    try {
      const result = await operation();
      dirty = false;
      try {
        await onRefresh();
        status = `${label} completed. ${result.nextStep ?? 'Review queue refreshed.'}`;
        toast.success(`${label} completed`, { id: toastId, description: result.nextStep ?? 'Review queue refreshed.' });
      } catch (refreshError) {
        status = `${label} may have succeeded, but refresh failed. Reload before taking another action.`;
        toast.error(`${label} may have succeeded`, { id: toastId, description: refreshError instanceof Error ? `${refreshError.message} Reload before retrying.` : 'Reload before retrying.' });
      }
    } catch (error) {
      // Refresh the server revision while the dirty-state guard keeps the local
      // draft intact, avoiding a loop of guaranteed stale-revision failures.
      status = `${label} failed. Your notes remain in the form.`;
      try {
        await onRefresh();
        status = `${label} failed. The queue revision was refreshed and your notes remain in the form.`;
      } catch {
        status = `${label} failed. Your notes remain, but the queue could not refresh.`;
      }
      toast.error(`${label} failed`, { id: toastId, description: error instanceof Error ? error.message : 'Refresh and try again.' });
    } finally {
      working = false;
    }
  };

  const saveNotes = () => runReview('Save review notes', () => operations.saveNotes(reviewNotesPayload(review, analysis, summary, needsFullBody)));

  const dismiss = async () => {
    if (!window.confirm('Dismiss this review as irrelevant? The email and audit history will remain stored, and no external action will run.')) return;
    await runReview('Dismiss as irrelevant', () => operations.dismiss(reviewNotesPayload(review, analysis, summary, needsFullBody)));
  };

  const copyBundle = async () => {
    if (copying) return;
    copying = true;
    const toastId = toast.loading('Preparing review bundle…');
    try {
      const detail = await loadDetail(review.eventId);
      const bundle = detail?.review?.bundle;
      if (!bundle) throw new Error('Review bundle is unavailable. Refresh the dashboard and try again.');
      await navigator.clipboard.writeText(bundle);
      toast.success('Review bundle copied', { id: toastId, description: 'Paste the bounded evidence and diagnostics into a local Pi session.' });
    } catch (error) {
      toast.error('Copy failed', { id: toastId, description: error instanceof Error ? error.message : 'Refresh and try again.' });
    } finally {
      copying = false;
    }
  };
</script>

<article class="relative px-5 py-4 transition hover:bg-[#fbf8f4]">
  <button
    type="button"
    class="absolute inset-0 z-0 w-full cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#6d4c35]"
    aria-label={`Open quick review for email: ${review.subject}`}
    title="Open quick review"
    onclick={openCardReview}
  ></button>
  <div class="pointer-events-none relative z-10 flex flex-wrap items-start justify-between gap-3">
    <div class="min-w-0">
      <p class="truncate text-sm font-semibold text-[#2c2925]">{review.subject}</p>
      <p class="mt-1 truncate text-xs text-[#7a6550]">{review.fromAddress} · {review.reasonCode.replaceAll('_', ' ')}</p>
    </div>
    <div class="flex flex-wrap items-center gap-2">
      <span class={`rounded-full border px-2.5 py-1 text-xs font-bold ${reviewStateClasses(review.status)}`} title="Review workflow state" aria-label={`Review state: ${humanize(review.status)}`}>Review: {humanize(review.status)}</span>
      <span class={`rounded-full border px-2 py-1 text-xs font-semibold ${review.mimeCompleteness === 'complete' && !review.bodyPreviewTruncated ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-800'}`} title="Evidence retained for review" aria-label={`Evidence state: ${evidenceLabel}`}>Evidence: {evidenceLabel}</span>
      <span class="rounded-full border border-[#eee5dc] bg-white px-2 py-1 text-xs font-semibold text-[#7a6550]" title="How long this review has been open">Age: {formatAge(review.createdAt)}</span>
    </div>
  </div>
  <p class="pointer-events-none relative z-10 mt-2 text-sm text-amber-950">{review.reason}</p>
  {#if review.summary}<p class="pointer-events-none relative z-10 mt-1 truncate text-xs text-[#7a6550]">Saved summary: {review.summary}</p>{/if}

  <div class="relative z-20 mt-3 flex flex-wrap gap-2">
    <button type="button" class="rounded-full border border-[#d9d0c7] bg-white px-3 py-1.5 text-xs font-semibold text-[#5c4a3d] disabled:opacity-50" disabled={copying} onclick={copyBundle}>{copying ? 'Preparing bundle…' : 'Copy review bundle'}</button>
    <button type="button" class="rounded-full border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-800 disabled:opacity-50" disabled={working} onclick={dismiss}>Dismiss as irrelevant</button>
  </div>

  <details class="relative z-20 mt-3 rounded-xl border border-amber-200 bg-amber-50">
    <summary class="cursor-pointer px-3 py-2 text-sm font-semibold text-amber-950">Analysis notes</summary>
    <div class="border-t border-amber-200 p-3">
      <div class="grid gap-3 md:grid-cols-[1fr_2fr]">
        <label class="block text-sm font-medium text-amber-950">Summary<textarea class="mt-1 min-h-20 w-full rounded-xl border border-amber-300 bg-white px-3 py-2" maxlength="1000" bind:value={summary} oninput={() => dirty = true} placeholder="Short conclusion for the next reviewer"></textarea></label>
        <label class="block text-sm font-medium text-amber-950">Analysis / triage guidance<textarea class="mt-1 min-h-20 w-full rounded-xl border border-amber-300 bg-white px-3 py-2" maxlength="12000" bind:value={analysis} oninput={() => dirty = true} placeholder="What needs attention? Do not paste secrets."></textarea></label>
      </div>
      <label class="mt-3 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-950"><input class="mt-1" type="checkbox" bind:checked={needsFullBody} onchange={() => dirty = true} /><span><b class="block">Flag that the full Gmail body is needed</b><span class="text-xs leading-5">This records guidance only. It does not retrieve Gmail data, raw MIME, or attachments.</span></span></label>
      <ActionToolbar>
        <button type="button" class="rounded-full bg-[#2c2925] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50" disabled={working} onclick={saveNotes}>Save</button>
      </ActionToolbar>
    </div>
  </details>
  <p class="sr-only" aria-live="polite">{status}</p>
</article>
