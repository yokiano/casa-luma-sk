<script lang="ts">
  import { CircleAlert, CircleCheck, Clock3, Copy, Eye, FileText, Trash2 } from 'lucide-svelte';
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
  const reviewLabel = $derived(`Review: ${humanize(review.status)}`);
  const evidenceTitle = $derived(`Evidence: ${evidenceLabel}`);
  const ageTitle = $derived(`Age: ${formatAge(review.createdAt)}`);
  const chipBase = 'inline-flex h-6 w-6 items-center justify-center rounded-full border bg-white shadow-[0_1px_0_rgba(0,0,0,0.03)]';
  const evidenceClasses = $derived(review.mimeCompleteness === 'complete' && !review.bodyPreviewTruncated
    ? 'border-emerald-200 text-emerald-700'
    : 'border-amber-200 text-amber-700');
  const nestedControlSelector = 'a, button, input, textarea, select, summary, label, details, [role="button"], [contenteditable="true"]';

  const openCardReview = () => onQuickReview(review.eventId);

  const handleCardClick = (event: MouseEvent) => {
    if (event.target instanceof Element && event.target.closest(nestedControlSelector)) return;
    openCardReview();
  };

  const handleCardKeydown = (event: KeyboardEvent) => {
    if (event.currentTarget !== event.target || (event.key !== 'Enter' && event.key !== ' ')) return;
    event.preventDefault();
    openCardReview();
  };

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

<div
  class="group relative cursor-pointer overflow-hidden rounded-2xl border border-[#e7e2dc] bg-white px-4 py-3 shadow-[0_1px_2px_rgba(44,41,37,0.04)] transition hover:border-[#d8cec3] hover:bg-[#fdfbf8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#6d4c35]"
  role="button"
  tabindex="0"
  aria-label={`Open quick review for email: ${review.subject}`}
  onclick={handleCardClick}
  onkeydown={handleCardKeydown}
>
  <div class="relative z-10 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
    <div class="pointer-events-none min-w-0">
      <p class="truncate text-sm font-medium leading-5 text-[#1f1f1f]" title={review.subject}>{review.subject}</p>
      <p class="mt-0.5 truncate text-[11px] leading-4 text-[#8a7a69]" title={`${review.fromAddress} · ${review.reasonCode.replaceAll('_', ' ')}`}>{review.fromAddress} · {review.reasonCode.replaceAll('_', ' ')}</p>
    </div>
    <div class="flex shrink-0 cursor-help items-center gap-1.5" aria-label="Review card status">
      <span class={`${chipBase} ${reviewStateClasses(review.status)}`} title={reviewLabel} aria-label={reviewLabel}>
        {#if review.status === 'done'}<CircleCheck size={12} />{:else}<CircleAlert size={12} />{/if}
      </span>
      <span class={`${chipBase} ${evidenceClasses}`} title={evidenceTitle} aria-label={evidenceTitle}><FileText size={12} /></span>
      <span class={`${chipBase} border-[#e7e2dc] text-[#7a6550]`} title={ageTitle} aria-label={ageTitle}><Clock3 size={12} /></span>
    </div>
  </div>

  <p class="pointer-events-none relative z-10 mt-2 truncate text-xs leading-5 text-[#5f5145]" title={review.reason}>{review.reason}</p>
  {#if review.summary}<p class="pointer-events-none relative z-10 mt-0.5 truncate text-[11px] leading-4 text-[#8a7a69]" title={review.summary}>Saved summary: {review.summary}</p>{/if}

  <details class="relative z-20 mt-2 rounded-xl border border-[#eadfd4] bg-[#fffaf4]">
    <summary class="cursor-pointer px-3 py-1.5 text-xs font-medium text-[#5f5145]">Analysis notes</summary>
    <div class="border-t border-[#eadfd4] p-3">
      <div class="grid gap-2 md:grid-cols-[0.9fr_1.6fr]">
        <label class="block text-xs font-medium text-[#5f5145]">Summary<textarea class="mt-1 min-h-16 w-full rounded-lg border border-[#ded6ce] bg-white px-2.5 py-2 text-sm" maxlength="1000" bind:value={summary} oninput={() => dirty = true} placeholder="Short conclusion"></textarea></label>
        <label class="block text-xs font-medium text-[#5f5145]">Analysis / triage guidance<textarea class="mt-1 min-h-16 w-full rounded-lg border border-[#ded6ce] bg-white px-2.5 py-2 text-sm" maxlength="12000" bind:value={analysis} oninput={() => dirty = true} placeholder="What needs attention? Do not paste secrets."></textarea></label>
      </div>
      <label class="mt-2 flex items-start gap-2 rounded-lg border border-red-100 bg-red-50 p-2 text-xs text-red-900"><input class="mt-0.5" type="checkbox" bind:checked={needsFullBody} onchange={() => dirty = true} /><span><b class="block font-medium">Full Gmail body needed</b><span class="leading-5">Records guidance only. It does not retrieve Gmail data, raw MIME, or attachments.</span></span></label>
      <ActionToolbar>
        <button type="button" class="rounded-full bg-[#1f1f1f] px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50" disabled={working} onclick={saveNotes}>Save</button>
      </ActionToolbar>
    </div>
  </details>

  <div class="relative z-20 mt-2 flex justify-end gap-1.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
    <button type="button" class="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[#ded6ce] bg-white text-[#5c4a3d] shadow-sm hover:bg-[#f7f3ef]" onclick={openCardReview} title="Open quick review" aria-label="Open quick review"><Eye size={13} /></button>
    <button type="button" class="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[#ded6ce] bg-white text-[#5c4a3d] shadow-sm hover:bg-[#f7f3ef] disabled:opacity-50" disabled={copying} onclick={copyBundle} title={copying ? 'Preparing review bundle' : 'Copy review bundle'} aria-label={copying ? 'Preparing review bundle' : 'Copy review bundle'}><Copy size={13} /></button>
    <button type="button" class="inline-flex h-7 w-7 items-center justify-center rounded-full border border-red-200 bg-white text-red-700 shadow-sm hover:bg-red-50 disabled:opacity-50" disabled={working} onclick={dismiss} title="Dismiss as irrelevant" aria-label="Dismiss as irrelevant"><Trash2 size={13} /></button>
  </div>
  <p class="sr-only" aria-live="polite">{status}</p>
</div>
