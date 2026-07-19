<script lang="ts">
  import { toast } from 'svelte-sonner';
  import ActionToolbar from './ActionToolbar.svelte';
  import DashboardSection from './DashboardSection.svelte';
  import MetricCard from './MetricCard.svelte';
  import {
    bodyWarning,
    formatDateTime,
    formatJson,
    humanize,
    reviewStateClasses
  } from './presentation';
  import {
    reviewNotesPayload,
    type ReviewOperationResult,
    type SingleEmailReviewProps
  } from './types';

  let { detail, variant = 'route', operations, onRefresh }: SingleEmailReviewProps = $props();
  let analysis = $state('');
  let summary = $state('');
  let needsFullBody = $state(false);
  let syncedReviewId = $state<number | null>(null);
  let syncedReviewRevision = $state<number | null>(null);
  let reviewDraftDirty = $state(false);
  let reason = $state('');
  let reviewWorking = $state(false);
  let recoveryWorking = $state(false);
  let reviewStatus = $state('');
  let recoveryStatus = $state('');

  $effect(() => {
    const currentReview = detail.review;
    const currentReviewId = currentReview?.id ?? null;
    const currentReviewRevision = currentReview?.triage.revision ?? null;
    const sameReview = currentReviewId === syncedReviewId;
    if (sameReview && currentReviewRevision === syncedReviewRevision) return;

    syncedReviewId = currentReviewId;
    syncedReviewRevision = currentReviewRevision;
    // Refresh stale concurrency state without discarding an in-progress draft.
    if (sameReview && reviewDraftDirty) return;
    analysis = currentReview?.analysis ?? '';
    summary = currentReview?.summary ?? '';
    needsFullBody = currentReview?.triage.needsFullBody ?? false;
    reviewDraftDirty = false;
  });

  const warning = $derived(bodyWarning(detail.event.mimeCompleteness, detail.event.bodyPreview, detail.event.bodyPreviewTruncated));
  const review = $derived(detail.review);
  const hasRecoverableAction = $derived(detail.actions.some((action) => action.status === 'failed' || action.status === 'retry_scheduled'));
  const hasRecoverableNotification = $derived(detail.outbox.some((notification) => notification.status === 'failed' || notification.status === 'retry_scheduled'));

  const runReview = async (label: string, operation: () => Promise<ReviewOperationResult>) => {
    if (!detail.review || reviewWorking) return;
    reviewWorking = true;
    reviewStatus = `${label} running…`;
    const toastId = toast.loading(`${label}…`);
    try {
      const result = await operation();
      reviewDraftDirty = false;
      try {
        await onRefresh();
        reviewStatus = `${label} completed. ${result.nextStep ?? 'Review state refreshed.'}`;
        toast.success(`${label} completed`, { id: toastId, description: result.nextStep ?? 'Review state refreshed.' });
      } catch (refreshError) {
        reviewStatus = `${label} may have succeeded, but refresh failed. Reload before taking another action.`;
        toast.error(`${label} may have succeeded`, { id: toastId, description: refreshError instanceof Error ? `${refreshError.message} Reload before retrying.` : 'Reload before retrying.' });
      }
    } catch (error) {
      reviewStatus = `${label} failed. Your notes remain in the form.`;
      try {
        await onRefresh();
        reviewStatus = `${label} failed. The review revision was refreshed and your notes remain in the form.`;
      } catch {
        reviewStatus = `${label} failed. Your notes remain, but the review could not refresh.`;
      }
      toast.error(`${label} failed`, { id: toastId, description: error instanceof Error ? error.message : 'Refresh and try again.' });
    } finally {
      reviewWorking = false;
    }
  };

  const runRecovery = async (label: string, operation: () => Promise<ReviewOperationResult>) => {
    if (reason.trim().length < 3) {
      recoveryStatus = 'A reason of at least 3 characters is required before a recovery action can run.';
      toast.error('Reason required', { description: 'Explain why this recovery action is safe.' });
      return;
    }
    if (recoveryWorking) return;
    recoveryWorking = true;
    recoveryStatus = `${label} running…`;
    const toastId = toast.loading(`${label}…`);
    try {
      const result = await operation();
      try {
        await onRefresh();
        reason = '';
        recoveryStatus = `${label} completed. ${result.nextStep ?? 'Durable state refreshed.'}`;
        toast.success(`${label} completed`, { id: toastId, description: result.nextStep ?? 'Refresh the durable state before taking another action.' });
      } catch (refreshError) {
        recoveryStatus = `${label} may have succeeded, but refresh failed. Reload before retrying.`;
        toast.error(`${label} may have succeeded`, { id: toastId, description: refreshError instanceof Error ? `${refreshError.message} Reload before retrying.` : 'Reload before retrying.' });
      }
    } catch (error) {
      recoveryStatus = `${label} failed. The reason remains in the form.`;
      toast.error(`${label} failed`, { id: toastId, description: error instanceof Error ? error.message : 'Refresh and try again.' });
    } finally {
      recoveryWorking = false;
    }
  };

  const copyText = async (value: string, label: string, description: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(label, { description });
    } catch {
      toast.error('Copy failed', { description: 'Copy the value manually from the evidence below.' });
    }
  };

  const copyReviewBundle = async () => {
    if (detail.review?.bundle) await copyText(detail.review.bundle, 'Review bundle copied', 'Paste the bounded evidence and diagnostics into a local Pi session.');
  };

  const downloadReviewBundle = () => {
    if (!detail.review?.bundle) return;
    const url = URL.createObjectURL(new Blob([detail.review.bundle], { type: 'text/markdown;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `email-review-${detail.review.id}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const dismissReview = async () => {
    if (!detail.review || !window.confirm('Dismiss this review as irrelevant? The email and audit history will remain stored, and no external action will run.')) return;
    await runReview('Dismiss as irrelevant', () => operations.dismiss(reviewNotesPayload(detail.review!, analysis, summary, needsFullBody)));
  };

  const addSenderToIgnoredList = async () => {
    if (!detail.review || !window.confirm(`Add ${detail.event.senderEmail} to the ignored sender list?\n\nThe visible sender may be spoofed. Matching future messages will bypass handlers, review creation, and Telegram notifications.`)) return;
    await runReview('Add sender to ignored list', () => operations.addSenderToIgnoredList({ reviewId: detail.review!.id, confirmIgnoredSenderBypassRisk: true }));
  };

  const reviewNotes = (operation: 'saveNotes' | 'markDone') => {
    if (!detail.review) return Promise.resolve();
    return runReview(operation === 'saveNotes' ? 'Save review notes' : 'Mark review done', () => operations[operation](reviewNotesPayload(detail.review!, analysis, summary, needsFullBody)));
  };
</script>

<section class="mx-auto max-w-4xl space-y-5">
  {#if variant === 'route'}
    <a class="text-sm font-medium text-[#7a6550] hover:underline" href="/mgmt-dashboard/email-automation">← Email automation</a>
  {/if}

  <header>
    <p class="text-sm font-bold uppercase tracking-[0.22em] text-[#7a6550]/55">Operational event</p>
    <h1 class="mt-2 text-3xl font-semibold text-[#2c2925]">{detail.event.subject}</h1>
    <p class="mt-2 break-words text-sm text-[#5c4a3d]">{detail.event.fromAddress} <span class="text-[#7a6550]">to</span> {detail.event.toAddress}</p>
    <p class="mt-1 text-sm text-[#7a6550]">Received {formatDateTime(detail.event.receivedAt)} · event #{detail.event.id}</p>
    {#if detail.event.ledgerUrl}<a class="mt-2 inline-block text-sm font-semibold text-[#7a6550] hover:underline" href={detail.event.ledgerUrl} target="_blank" rel="noreferrer">Open Ledger record</a>{/if}
  </header>

  <DashboardSection title="Most recent extracted body" description={`This ${detail.event.bodyPreviewSource ?? 'text'} body contains only the latest visible message selected by the MIME parser, capped at 64,000 characters. It is untrusted email evidence; raw MIME and attachments are not retained.`}>
    {#if warning}
      <p class="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm leading-5 text-amber-950">{warning}</p>
    {/if}
    {#if review?.triage.needsFullBody}
      <p class="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-900">Manager flag: the full Gmail body is needed. Retrieval is deferred and has not run.</p>
    {/if}
    {#if detail.event.bodyPreview}
      <pre class="mt-3 max-h-[32rem] overflow-auto whitespace-pre-wrap rounded-xl bg-[#1f1b17] p-4 text-xs leading-5 text-[#f8f3ed]">{detail.event.bodyPreview}</pre>
    {:else}
      <p class="mt-3 text-sm text-[#7a6550]">No readable body preview was available. Check MIME completeness and attachments below.</p>
    {/if}
  </DashboardSection>

  <div class="grid gap-3 md:grid-cols-2">
    <MetricCard label="What happened" value={detail.outcome.whatHappened} tone={detail.event.processingState === 'review' ? 'warning' : 'neutral'} />
    <MetricCard label="Action taken" value={detail.outcome.actionTaken} tone={detail.outcome.isActionRequired ? 'warning' : 'positive'} />
    <MetricCard label="Current state" value={detail.outcome.currentState} />
    <MetricCard label="Next step" value={detail.outcome.nextStep} tone={detail.outcome.isActionRequired ? 'warning' : 'neutral'} />
  </div>

  {#if review}
    <DashboardSection title={`Attention review #${review.id}`} description="This is a human-notes record only. Review saves run in the current request and do not start background action or Telegram work. Saving, completing, or dismissing it does not approve, retry, reconcile, cancel, or otherwise mutate those queues. Automatic background retry scheduling is not configured." class="border-amber-200 bg-amber-50">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <p class="max-w-2xl text-sm text-amber-950">{review.reason}</p>
        <div class="flex flex-wrap gap-2">
          <span class="rounded-full border px-3 py-1 text-xs font-bold {reviewStateClasses(review.status)}">{humanize(review.status)}</span>
          {#if review.triage.disposition}<span class="rounded-full border border-slate-300 bg-slate-100 px-3 py-1 text-xs font-bold text-slate-800">dismissed irrelevant</span>{/if}
          {#if review.triage.needsFullBody}<span class="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-bold text-red-800">full Gmail body needed</span>{/if}
        </div>
      </div>

      <div class="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="MIME" value={humanize(detail.event.mimeCompleteness)} tone={detail.event.mimeCompleteness === 'complete' ? 'positive' : 'warning'} />
        <MetricCard label="Parser" value={detail.event.parserVersion ?? 'not recorded'} />
        <MetricCard label="Body" value={detail.event.bodyPreviewTruncated ? 'truncated at safety cap' : 'complete'} tone={detail.event.bodyPreviewTruncated ? 'warning' : 'positive'} />
        <MetricCard label="Attachments" value={String(detail.event.attachmentCount)} tone={detail.event.attachmentCount > 0 ? 'warning' : 'neutral'} />
      </div>

      <div class="mt-4 grid gap-3 md:grid-cols-[1fr_2fr]">
        <label class="block text-sm font-medium text-amber-950">Summary<textarea class="mt-1 min-h-24 w-full rounded-xl border border-amber-300 bg-white px-3 py-2" maxlength="1000" bind:value={summary} oninput={() => reviewDraftDirty = true} placeholder="Short conclusion for the next reviewer"></textarea></label>
        <label class="block text-sm font-medium text-amber-950">Analysis / triage guidance<textarea class="mt-1 min-h-24 w-full rounded-xl border border-amber-300 bg-white px-3 py-2" maxlength="12000" bind:value={analysis} oninput={() => reviewDraftDirty = true} placeholder="What needs attention? What should happen with this email or future emails like it? Do not paste secrets."></textarea></label>
      </div>
      <label class="mt-3 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-950"><input class="mt-1" type="checkbox" bind:checked={needsFullBody} onchange={() => reviewDraftDirty = true} /><span><b class="block">Flag that the full Gmail body is needed</b><span class="text-xs leading-5">This records guidance only. It does not retrieve Gmail data, raw MIME, or attachments.</span></span></label>

      <ActionToolbar busy={reviewWorking} status={reviewStatus}>
        {#if review.status !== 'done'}
          <button type="button" class="rounded-full bg-[#2c2925] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50" disabled={reviewWorking} onclick={() => reviewNotes('saveNotes')}>Save notes</button>
          <button type="button" class="rounded-full border border-[#2c2925] bg-white px-3 py-1.5 text-xs font-semibold disabled:opacity-50" disabled={reviewWorking} onclick={() => reviewNotes('markDone')}>Mark done</button>
          <button type="button" class="rounded-full border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-800 disabled:opacity-50" disabled={reviewWorking} onclick={dismissReview}>Dismiss as irrelevant</button>
        {:else}
          <button type="button" class="rounded-full border border-[#2c2925] bg-white px-3 py-1.5 text-xs font-semibold disabled:opacity-50" disabled={reviewWorking} onclick={() => runReview('Reopen review', () => operations.reopen({ reviewId: review.id }))}>Reopen for re-review</button>
        {/if}
        <button type="button" class="rounded-full border border-[#d9d0c7] bg-white px-3 py-1.5 text-xs font-semibold text-[#5c4a3d] disabled:opacity-50" disabled={!review.bundle} onclick={copyReviewBundle}>Copy review bundle</button>
        <button type="button" class="rounded-full border border-[#d9d0c7] bg-white px-3 py-1.5 text-xs font-semibold text-[#5c4a3d] disabled:opacity-50" disabled={!review.bundle} onclick={downloadReviewBundle}>Download Markdown</button>
        <button type="button" class="rounded-full border border-[#d9d0c7] bg-white px-3 py-1.5 text-xs font-semibold text-[#5c4a3d] disabled:opacity-50" onclick={() => copyText(detail.event.senderEmail, 'Sender copied', 'Copied the normalized visible sender address.')}>Copy sender address</button>
        <button type="button" class="rounded-full border border-[#d9d0c7] bg-white px-3 py-1.5 text-xs font-semibold text-[#5c4a3d] disabled:opacity-50" onclick={() => copyText(detail.event.classifierRuleDraft, 'Classifier rule draft copied', 'This disabled draft must be reviewed and tested locally. The dashboard did not create or enable a rule.')}>Copy disabled classifier rule draft</button>
      </ActionToolbar>

      <div class="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-950">
        <p class="font-semibold">Add visible sender to ignored list</p>
        <p class="mt-1 text-xs leading-5">The visible sender may be spoofed. After confirmation, matching future messages bypass handlers, review creation, and Telegram notifications. Existing records remain unchanged.</p>
        <button type="button" class="mt-2 rounded-full border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-800 disabled:opacity-50" disabled={reviewWorking} onclick={addSenderToIgnoredList}>Add sender to ignored list</button>
      </div>

      <div class="mt-4 grid gap-3 md:grid-cols-2">
        <details class="rounded-xl border border-amber-200 bg-white p-3"><summary class="cursor-pointer text-sm font-semibold text-amber-950">Saved review evidence</summary><pre class="mt-3 max-h-96 overflow-auto whitespace-pre-wrap rounded-xl bg-[#1f1b17] p-3 text-xs leading-5 text-[#f8f3ed]">{formatJson(review.evidenceSnapshot)}</pre></details>
        <details class="rounded-xl border border-amber-200 bg-white p-3"><summary class="cursor-pointer text-sm font-semibold text-amber-950">Classifier diagnostics</summary><pre class="mt-3 max-h-96 overflow-auto whitespace-pre-wrap rounded-xl bg-[#1f1b17] p-3 text-xs leading-5 text-[#f8f3ed]">{formatJson(review.classifierDiagnostics)}</pre></details>
      </div>
      <details class="mt-4 rounded-xl border border-amber-200 bg-white p-3"><summary class="cursor-pointer text-sm font-semibold text-amber-950">Saved review bundle</summary><p class="mt-2 text-xs leading-5 text-[#7a6550]">The export contains bounded evidence, saved deterministic rule diagnostics, triage metadata, and provider-neutral note sections. It does not invoke an LLM.</p><pre class="mt-3 max-h-96 overflow-auto whitespace-pre-wrap rounded-xl bg-[#1f1b17] p-3 text-xs leading-5 text-[#f8f3ed]">{review.bundle}</pre></details>
      <details class="mt-4 rounded-xl border border-amber-200 bg-white p-3"><summary class="cursor-pointer text-sm font-semibold text-amber-950">Body extraction metadata</summary><pre class="mt-3 max-h-64 overflow-auto whitespace-pre-wrap rounded-xl bg-[#1f1b17] p-3 text-xs leading-5 text-[#f8f3ed]">{formatJson(detail.event.bodyExtractionMetadata)}</pre></details>
      <p class="mt-4 rounded-xl border border-sky-200 bg-sky-50 p-3 text-sm font-semibold text-sky-950">Remember to add this workflow to the future ticketing system.</p>
    </DashboardSection>
  {/if}

  <DashboardSection title="Manager recovery actions" description="Recovery may contact Telegram or an external service now. Automatic background retry scheduling is not configured. Ledger execution and reconciliation are currently disabled by a global safety lock, regardless of authenticity status. Enter a reason; it is saved in the audit history." class="border-amber-200 bg-amber-50">
    <label class="block text-sm font-medium text-amber-950">Reason for this action<input class="mt-1 w-full rounded-xl border border-amber-300 bg-white px-3 py-2" bind:value={reason} placeholder="Example: Verified the original bank email and amount" /></label>
    <ActionToolbar busy={recoveryWorking} status={recoveryStatus}>
      {#each detail.actions as action}
        {#if action.status === 'failed' || action.status === 'retry_scheduled'}
          <div class="w-full rounded-xl border border-amber-200 bg-white p-3">
            {#if action.handlerKey === 'company_ledger_expense'}
              <p class="text-sm"><b>{action.handlerKey}</b> is {humanize(action.status)}. Retry and reconciliation are unavailable because the global Ledger safety lock is active. No Ledger lookup or write will run.</p>
            {:else}
              <p class="text-sm"><b>{action.handlerKey}</b> is {humanize(action.status)}. Retry may run the configured external action. Reconciliation only searches for an existing matching record and will not create one.</p>
              <div class="mt-2 flex flex-wrap gap-2"><button type="button" class="rounded-full bg-[#2c2925] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50" disabled={recoveryWorking} onclick={() => runRecovery('Action retry', () => operations.retryAction({ actionId: action.id, reason }))}>Retry action</button><button type="button" class="rounded-full border border-[#2c2925] px-3 py-1.5 text-xs font-semibold disabled:opacity-50" disabled={recoveryWorking} onclick={() => runRecovery('Reconciliation', () => operations.reconcileAction({ actionId: action.id, reason }))}>Reconcile existing record</button></div>
            {/if}
          </div>
        {/if}
      {/each}
      {#each detail.outbox as notification}
        {#if notification.status === 'failed' || notification.status === 'retry_scheduled'}
          <div class="w-full rounded-xl border border-amber-200 bg-white p-3"><p class="text-sm">Telegram delivery is {humanize(notification.status)}. Retrying sends only this notification and cannot rerun the external action.</p><button type="button" class="mt-2 rounded-full bg-[#2c2925] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50" disabled={recoveryWorking} onclick={() => runRecovery('Notification retry', () => operations.retryNotification({ outboxId: notification.id, reason }))}>Retry Telegram only</button></div>
        {/if}
      {/each}
      {#if !hasRecoverableAction && !hasRecoverableNotification}<p class="w-full text-sm text-amber-900">No failed or retry-scheduled work is eligible for a manager recovery command.</p>{/if}
    </ActionToolbar>
  </DashboardSection>

  <DashboardSection title="Evidence and durable history">
    <dl class="grid gap-3 text-sm md:grid-cols-2">
      <div><dt class="text-[#7a6550]">Visible sender</dt><dd>{detail.event.fromAddress}</dd></div>
      <div><dt class="text-[#7a6550]">Normalized sender address</dt><dd>{detail.event.senderEmail}</dd></div>
      <div><dt class="text-[#7a6550]">Recipient</dt><dd>{detail.event.toAddress}</dd></div>
      <div><dt class="text-[#7a6550]">Message-ID</dt><dd class="break-all">{detail.event.messageId ?? 'not recorded'}</dd></div>
      <div><dt class="text-[#7a6550]">Classification</dt><dd>{humanize(detail.event.classification)} · {humanize(detail.event.subtype)}</dd></div>
      <div><dt class="text-[#7a6550]">Sender authenticity</dt><dd>{humanize(detail.event.authenticityVerdict)}. The visible sender may still be spoofed.</dd></div>
      <div><dt class="text-[#7a6550]">MIME completeness</dt><dd>{humanize(detail.event.mimeCompleteness)} · parser {detail.event.parserVersion ?? 'not recorded'}</dd></div>
      <div><dt class="text-[#7a6550]">Attachments</dt><dd>{detail.event.attachmentCount}</dd></div>
      <div><dt class="text-[#7a6550]">External reference</dt><dd>{detail.event.externalRef ?? 'not recorded'}</dd></div>
    </dl>
    <h3 class="mt-5 font-semibold">External action history</h3>
    {#if detail.actions.length === 0}<p class="mt-2 text-sm text-[#7a6550]">No external action record exists.</p>{:else}{#each detail.actions as action}<p class="mt-2 text-sm">{action.handlerKey} · {humanize(action.status)} · attempts {action.attemptCount} · {action.hasError ? 'An error was recorded; sensitive details remain server-side.' : 'no error recorded'}</p>{/each}{/if}
    <h3 class="mt-5 font-semibold">Telegram delivery history</h3>
    {#if detail.outbox.length === 0}<p class="mt-2 text-sm text-[#7a6550]">No Telegram delivery record exists.</p>{:else}{#each detail.outbox as notification}<p class="mt-2 text-sm">{humanize(notification.status)} · attempts {notification.attemptCount} · {notification.hasError ? 'Error details are restricted to server logs.' : 'no error recorded'}</p>{/each}{/if}
    <h3 class="mt-5 font-semibold">Attempts</h3>
    {#if detail.attempts.length === 0}<p class="mt-2 text-sm text-[#7a6550]">No attempts recorded.</p>{:else}{#each detail.attempts as attempt}<p class="mt-2 text-sm">{formatDateTime(attempt.createdAt)} · {humanize(attempt.status)} · {attempt.hasError ? 'Error details are restricted to server logs.' : 'completed'}</p>{/each}{/if}
    <h3 class="mt-5 font-semibold">Manager audit history</h3>
    {#if detail.audits.length === 0}<p class="mt-2 text-sm text-[#7a6550]">No manager audit entries recorded.</p>{:else}{#each detail.audits as audit}<p class="mt-2 text-sm">{formatDateTime(audit.createdAt)} · {humanize(audit.action)} · {audit.reason ?? 'no reason recorded'} · actor {audit.actor}</p>{/each}{/if}
  </DashboardSection>
</section>
