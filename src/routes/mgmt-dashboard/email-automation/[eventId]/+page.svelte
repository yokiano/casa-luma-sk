<script lang="ts">
  import { invalidateAll } from '$app/navigation';
  import { toast } from 'svelte-sonner';
  import type { PageData } from './$types';
  import {
    markEmailAutomationReviewDoneNow,
    reopenEmailAutomationReviewNow,
    saveEmailAutomationReviewNotesNow,
    reconcileEmailAutomationActionNow,
    retryEmailAutomationActionNow,
    retryEmailAutomationNotificationNow
  } from '$lib/email-automation.remote';
  let { data }: { data: PageData } = $props();
  let reason = $state('');
  let analysis = $state(data.review?.analysis ?? '');
  let summary = $state(data.review?.summary ?? '');
  let reviewWorking = $state(false);
  let working = $state(false);
  $effect(() => {
    if (data.review) {
      analysis = data.review.analysis ?? '';
      summary = data.review.summary ?? '';
    }
  });
  const pretty = (value: string | null | undefined) => value?.replaceAll('_', ' ') ?? 'not recorded';
  const when = (value: string | Date | null) => value ? new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : 'not recorded';
  const runReview = async (label: string, operation: () => Promise<{ nextStep?: string }>) => {
    if (!data.review) return;
    reviewWorking = true;
    const toastId = toast.loading(`${label}…`);
    try {
      const result = await operation();
      toast.success(`${label} completed`, { id: toastId, description: result.nextStep ?? 'Review state refreshed.' });
      await invalidateAll();
    } catch (error) {
      toast.error(`${label} failed`, { id: toastId, description: error instanceof Error ? error.message : 'Refresh and try again.' });
    } finally { reviewWorking = false; }
  };
  const copyReviewBundle = async () => {
    if (!data.review?.bundle) return;
    try {
      await navigator.clipboard.writeText(data.review.bundle);
      toast.success('Review bundle copied', { description: 'Paste the bounded evidence and diagnostics into a Pi session.' });
    } catch {
      toast.error('Copy failed', { description: 'Use the bundle preview below and copy it manually.' });
    }
  };
  const downloadReviewBundle = () => {
    if (!data.review?.bundle) return;
    const url = URL.createObjectURL(new Blob([data.review.bundle], { type: 'text/markdown;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `email-review-${data.review.id}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };
  const run = async (label: string, operation: () => Promise<{ nextStep?: string }>) => {
    if (reason.trim().length < 3) { toast.error('Reason required', { description: 'Explain why this recovery action is safe.' }); return; }
    working = true;
    const toastId = toast.loading(`${label}…`);
    try {
      const result = await operation();
      toast.success(`${label} completed`, { id: toastId, description: result.nextStep ?? 'Refresh the durable state before taking another action.' });
      reason = '';
      await invalidateAll();
    } catch (error) {
      toast.error(`${label} failed`, { id: toastId, description: error instanceof Error ? error.message : 'Refresh and try again.' });
    } finally { working = false; }
  };
</script>
<section class="mx-auto max-w-4xl space-y-5">
  <a class="text-sm font-medium text-[#7a6550] hover:underline" href="/mgmt-dashboard/email-automation">← Email automation</a>
  <div><p class="text-sm font-bold uppercase tracking-[0.22em] text-[#7a6550]/55">Operational event</p><h1 class="mt-2 text-3xl font-semibold">{data.event.subject}</h1><p class="mt-2 text-sm text-[#7a6550]">Received {when(data.event.receivedAt)} · event #{data.event.id}</p>{#if data.event.ledgerUrl}<a class="mt-2 inline-block text-sm font-semibold text-[#7a6550] hover:underline" href={data.event.ledgerUrl} target="_blank" rel="noreferrer">Open Ledger record</a>{/if}</div>
  <div class="grid gap-3 md:grid-cols-2"><article class="rounded-2xl border border-[#dfd2c5] bg-white p-4"><b>What happened</b><p class="mt-2 text-sm">{data.outcome.whatHappened}</p></article><article class="rounded-2xl border border-[#dfd2c5] bg-white p-4"><b>Action taken</b><p class="mt-2 text-sm">{data.outcome.actionTaken}</p></article><article class="rounded-2xl border border-[#dfd2c5] bg-white p-4"><b>Current state</b><p class="mt-2 text-sm">{data.outcome.currentState}</p></article><article class="rounded-2xl border border-[#dfd2c5] bg-white p-4"><b>Next step</b><p class="mt-2 text-sm">{data.outcome.nextStep}</p></article></div>

  {#if data.review}
    <section class="rounded-2xl border border-amber-200 bg-amber-50 p-5">
      <div class="flex flex-wrap items-start justify-between gap-3"><div><h2 class="font-semibold text-amber-950">Attention review #{data.review.id}</h2><p class="mt-1 text-sm text-amber-900">{data.review.reason}</p></div><span class="rounded-full border border-amber-200 bg-white px-3 py-1 text-xs font-bold text-amber-800">{data.review.status.replaceAll('_', ' ')}</span></div>
      <p class="mt-3 text-xs leading-5 text-amber-900">This is a human-notes record only. Saving or completing it does not approve, retry, reconcile, cancel, or otherwise mutate the external-action or Telegram queues.</p>
      <div class="mt-4 grid gap-3 md:grid-cols-[1fr_2fr]">
        <label class="block text-sm font-medium text-amber-950">Summary<textarea class="mt-1 min-h-24 w-full rounded-xl border border-amber-300 bg-white px-3 py-2" maxlength="1000" bind:value={summary} placeholder="Short conclusion for the next reviewer" /></label>
        <label class="block text-sm font-medium text-amber-950">Analysis<textarea class="mt-1 min-h-24 w-full rounded-xl border border-amber-300 bg-white px-3 py-2" maxlength="12000" bind:value={analysis} placeholder="Record the evidence checked, uncertainty, and decision context. Do not paste secrets." /></label>
      </div>
      <div class="mt-3 flex flex-wrap gap-2">
        {#if data.review.status !== 'done'}
          <button class="rounded-full bg-[#2c2925] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50" disabled={reviewWorking} onclick={() => runReview('Save review notes', () => saveEmailAutomationReviewNotesNow({ reviewId: data.review!.id, analysis, summary }))}>Save notes</button>
          <button class="rounded-full border border-[#2c2925] bg-white px-3 py-1.5 text-xs font-semibold disabled:opacity-50" disabled={reviewWorking} onclick={() => runReview('Mark review done', () => markEmailAutomationReviewDoneNow({ reviewId: data.review!.id, analysis, summary }))}>Mark done</button>
        {:else}
          <button class="rounded-full border border-[#2c2925] bg-white px-3 py-1.5 text-xs font-semibold disabled:opacity-50" disabled={reviewWorking} onclick={() => runReview('Reopen review', () => reopenEmailAutomationReviewNow({ reviewId: data.review!.id }))}>Reopen for re-review</button>
        {/if}
        <button class="rounded-full border border-[#d9d0c7] bg-white px-3 py-1.5 text-xs font-semibold text-[#5c4a3d] disabled:opacity-50" disabled={!data.review.bundle} onclick={copyReviewBundle}>Copy review bundle</button>
        <button class="rounded-full border border-[#d9d0c7] bg-white px-3 py-1.5 text-xs font-semibold text-[#5c4a3d] disabled:opacity-50" disabled={!data.review.bundle} onclick={downloadReviewBundle}>Download Markdown</button>
      </div>
      <details class="mt-4 rounded-xl border border-amber-200 bg-white p-3"><summary class="cursor-pointer text-sm font-semibold text-amber-950">Saved review bundle</summary><p class="mt-2 text-xs leading-5 text-[#7a6550]">The export contains bounded evidence, saved deterministic rule diagnostics, and provider-neutral note sections. It does not invoke an LLM.</p><pre class="mt-3 max-h-96 overflow-auto whitespace-pre-wrap rounded-xl bg-[#1f1b17] p-3 text-xs leading-5 text-[#f8f3ed]">{data.review.bundle}</pre></details>
    </section>
  {/if}

  <section class="rounded-2xl border border-amber-200 bg-amber-50 p-5">
    <h2 class="font-semibold text-amber-950">Manager recovery actions</h2>
    <p class="mt-2 text-sm text-amber-900">These controls can contact Telegram or an external handler. Ledger execution and reconciliation are currently disabled by a global safety lock, regardless of authenticity status. Enter a reason; it is saved in the audit history.</p>
    <label class="mt-4 block text-sm font-medium text-amber-950">Reason for this action<input class="mt-1 w-full rounded-xl border border-amber-300 bg-white px-3 py-2" bind:value={reason} placeholder="Example: Verified the original bank email and amount" /></label>
    <div class="mt-4 space-y-3">
      {#each data.actions as action}
        {#if action.status === 'failed' || action.status === 'retry_scheduled'}
          <div class="rounded-xl border border-amber-200 bg-white p-3">
            {#if action.handlerKey === 'company_ledger_expense'}
              <p class="text-sm"><b>{action.handlerKey}</b> is {pretty(action.status)}. Retry and reconciliation are unavailable because the global Ledger safety lock is active. No Ledger lookup or write will run.</p>
            {:else}
              <p class="text-sm"><b>{action.handlerKey}</b> is {pretty(action.status)}. Retry may run the configured external action. Reconciliation only searches for an existing matching record and will not create one.</p>
              <div class="mt-2 flex flex-wrap gap-2"><button class="rounded-full bg-[#2c2925] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50" disabled={working} onclick={() => run('Action retry', () => retryEmailAutomationActionNow({ actionId: action.id, reason }))}>Retry action</button><button class="rounded-full border border-[#2c2925] px-3 py-1.5 text-xs font-semibold disabled:opacity-50" disabled={working} onclick={() => run('Reconciliation', () => reconcileEmailAutomationActionNow({ actionId: action.id, reason }))}>Reconcile existing record</button></div>
            {/if}
          </div>
        {/if}
      {/each}
      {#each data.outbox as notification}
        {#if notification.status === 'failed' || notification.status === 'retry_scheduled'}
          <div class="rounded-xl border border-amber-200 bg-white p-3"><p class="text-sm">Telegram delivery is {pretty(notification.status)}. Retrying sends only this notification and cannot rerun the external action.</p><button class="mt-2 rounded-full bg-[#2c2925] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50" disabled={working} onclick={() => run('Notification retry', () => retryEmailAutomationNotificationNow({ outboxId: notification.id, reason }))}>Retry Telegram only</button></div>
        {/if}
      {/each}
      {#if !data.actions.some((a) => a.status === 'failed' || a.status === 'retry_scheduled') && !data.outbox.some((n) => n.status === 'failed' || n.status === 'retry_scheduled')}<p class="text-sm text-amber-900">No failed or retry-scheduled work is eligible for a manager recovery command.</p>{/if}
    </div>
  </section>

  <details class="rounded-2xl border border-[#dfd2c5] bg-white p-4"><summary class="cursor-pointer font-semibold">Email body preview</summary><p class="mt-2 text-xs leading-5 text-[#7a6550]">This is a bounded {data.event.bodyPreviewSource ?? 'text'} preview, retained for event review up to 4,000 characters. {data.event.bodyPreviewTruncated ? 'The preview is truncated; the original MIME message was not retained.' : 'The available body was retained without truncation.'} Forwarded and quoted chains are not currently identified reliably, so treat the preview as untrusted evidence rather than a cleanly separated original message.</p>{#if data.event.bodyPreview}<pre class="mt-3 max-h-[32rem] overflow-auto whitespace-pre-wrap rounded-xl bg-[#1f1b17] p-4 text-xs leading-5 text-[#f8f3ed]">{data.event.bodyPreview}</pre>{:else}<p class="mt-3 text-sm text-[#7a6550]">No readable body preview was available. Check MIME completeness and attachments below.</p>{/if}</details>

  <details class="rounded-2xl border border-[#dfd2c5] bg-white p-4"><summary class="cursor-pointer font-semibold">Evidence and durable history</summary><dl class="mt-3 grid gap-2 text-sm"><div><dt class="text-[#7a6550]">Sender</dt><dd>{data.event.fromAddress}</dd></div><div><dt class="text-[#7a6550]">Classification</dt><dd>{pretty(data.event.classification)} · {pretty(data.event.subtype)}</dd></div><div><dt class="text-[#7a6550]">Sender authenticity</dt><dd>{pretty(data.event.authenticityVerdict)}. This is evidence only; the global Ledger safety lock remains active even when authenticity passes.</dd></div><div><dt class="text-[#7a6550]">MIME completeness</dt><dd>{pretty(data.event.mimeCompleteness)}</dd></div></dl><h2 class="mt-5 font-semibold">Actions</h2>{#each data.actions as action}<p class="mt-2 text-sm">{action.handlerKey} · {pretty(action.status)} · attempts {action.attemptCount} · {action.hasError ? 'An error was recorded; sensitive details remain server-side.' : 'no error recorded'}</p>{/each}<h2 class="mt-5 font-semibold">Attempts</h2>{#each data.attempts as attempt}<p class="mt-2 text-sm">{when(attempt.createdAt)} · {pretty(attempt.status)} · {attempt.hasError ? 'Error details are restricted to server logs.' : 'completed'}</p>{/each}</details>
</section>
