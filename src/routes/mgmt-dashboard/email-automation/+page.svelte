<script lang="ts">
  import { toast } from 'svelte-sonner';
  import {
    BookOpen,
    ListChecks,
    Map,
    Scale,
    Send,
    Tags,
    Zap,
    ChevronDown
  } from 'lucide-svelte';
  import type { PageData } from './$types';
  import {
    addEmailAutomationReviewSenderToIgnoredListNow,
    copyPendingEmailAutomationReviews,
    dismissEmailAutomationReviewAsIrrelevantNow,
    getEmailAutomationEventDetailNow,
    markEmailAutomationReviewDoneNow,
    reconcileEmailAutomationActionNow,
    refreshEmailAutomationDashboard,
    reopenEmailAutomationReviewNow,
    retryEmailAutomationActionNow,
    retryEmailAutomationNotificationNow,
    saveEmailAutomationReviewNotesNow,
    sendEmailAutomationTestForBuiltin
  } from '$lib/email-automation.remote';
  import AutomationSettingsSection from '$lib/components/mgmt-dashboard/email-automation/AutomationSettingsSection.svelte';
  import ClassifierRulesSection from '$lib/components/mgmt-dashboard/email-automation/ClassifierRulesSection.svelte';
  import DashboardTotals from '$lib/components/mgmt-dashboard/email-automation/DashboardTotals.svelte';
  import OperationsHealthSection from '$lib/components/mgmt-dashboard/email-automation/OperationsHealthSection.svelte';
  import QuickReviewModal from '$lib/components/mgmt-dashboard/email-automation/QuickReviewModal.svelte';
  import RecentEventsSection from '$lib/components/mgmt-dashboard/email-automation/RecentEventsSection.svelte';
  import ReviewQueueSection from '$lib/components/mgmt-dashboard/email-automation/ReviewQueueSection.svelte';
  import type { ReviewOperations } from '$lib/components/mgmt-dashboard/email-automation/types';
  import type { DashboardData, EmailAutomationEventDetail } from '$lib/server/email-automation/dashboard';

  let { data }: { data: PageData } = $props();

  // Remote mutations update this override without duplicating the SSR source.
  let refreshedDashboard = $state<DashboardData | null>(null);
  const dashboard = $derived(refreshedDashboard ?? data);

  const reviewOperations: ReviewOperations = {
    saveNotes: (payload) => saveEmailAutomationReviewNotesNow(payload),
    markDone: (payload) => markEmailAutomationReviewDoneNow(payload),
    dismiss: (payload) => dismissEmailAutomationReviewAsIrrelevantNow(payload),
    reopen: (payload) => reopenEmailAutomationReviewNow(payload),
    addSenderToIgnoredList: (payload) => addEmailAutomationReviewSenderToIgnoredListNow(payload),
    retryAction: (payload) => retryEmailAutomationActionNow(payload),
    reconcileAction: (payload) => reconcileEmailAutomationActionNow(payload),
    retryNotification: (payload) => retryEmailAutomationNotificationNow(payload)
  };
  let quickReviewOpen = $state(false);
  let quickReviewEventId = $state<number | null>(null);
  let quickReviewDetail = $state<EmailAutomationEventDetail | null>(null);
  let quickReviewLoading = $state(false);
  let quickReviewErrorMessage = $state('');
  let quickReviewRequestToken = 0;

  const loadReviewDetail = (eventId: number): Promise<EmailAutomationEventDetail | null> =>
    getEmailAutomationEventDetailNow({ eventId });

  const fetchQuickReviewDetail = async (selectedEventId: number, propagateError = false) => {
    const token = ++quickReviewRequestToken;
    quickReviewLoading = true;
    quickReviewErrorMessage = '';
    quickReviewDetail = null;
    try {
      const result = await loadReviewDetail(selectedEventId);
      if (token !== quickReviewRequestToken || !quickReviewOpen || quickReviewEventId !== selectedEventId) return;
      if (!result) throw new Error('This email event is no longer available.');
      quickReviewDetail = result;
    } catch (error) {
      if (token === quickReviewRequestToken && quickReviewOpen && quickReviewEventId === selectedEventId) {
        quickReviewDetail = null;
        quickReviewErrorMessage = error instanceof Error ? error.message : 'Quick review could not be loaded.';
      }
      if (propagateError) throw error;
    } finally {
      if (token === quickReviewRequestToken) quickReviewLoading = false;
    }
  };

  const openQuickReview = (eventId: number) => {
    quickReviewEventId = eventId;
    quickReviewOpen = true;
    void fetchQuickReviewDetail(eventId);
  };

  const closeQuickReview = () => {
    quickReviewRequestToken += 1;
    quickReviewOpen = false;
    quickReviewEventId = null;
    quickReviewDetail = null;
    quickReviewErrorMessage = '';
    quickReviewLoading = false;
  };

  const retryQuickReview = () => {
    if (!quickReviewEventId) return;
    void fetchQuickReviewDetail(quickReviewEventId);
  };

  const refreshQuickReview = async () => {
    const selectedEventId = quickReviewEventId;
    if (!selectedEventId) throw new Error('No email event is selected.');
    await reload();
    await fetchQuickReviewDetail(selectedEventId, true);
  };

  const dateTime = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
  const when = (value: string | Date) => dateTime.format(new Date(value));
  const stateClass = (state: string) => state === 'ready' || state === 'ledger_created' || state === 'done'
    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
    : state === 'review' || state === 'waiting' || state === 'in_progress'
      ? 'bg-amber-50 text-amber-800 border-amber-200'
      : state === 'retry_pending' || state === 'failed'
        ? 'bg-red-50 text-red-800 border-red-200'
        : 'bg-slate-50 text-slate-700 border-slate-200';
  const human = (value: string | null | undefined) => value ? value.replaceAll('_', ' ') : 'built-in fallback';
  type RoadmapStatus = 'done' | 'partial' | 'blocked' | 'planned';
  type RoadmapItem = { phase: string; title: string; status: RoadmapStatus; delivered: string; missing: string; next: string; gate?: string };
  const roadmap: RoadmapItem[] = [
    { phase: 'Foundation', title: 'Durable state and human explanations', status: 'partial', delivered: 'Events, actions, attempts and Telegram intent are stored durably. Event pages explain what happened, the action taken, current state and next step.', missing: 'The manual review workflow is operational. An optional isolated database test for overlapping processors remains a future operations follow-up, not a requirement for manual review.', next: 'Keep watching live events here. If automatic retries are later enabled, validate overlapping processor claims in a disposable database first.' },
    { phase: 'Security 1', title: 'Signed manager sessions', status: 'done', delivered: 'Unsigned and altered role cookies are rejected. Manager commands check authorization at their server boundary.', missing: 'Audit records identify a shared manager role, not an individual person.', next: 'Choose whether named staff identities are needed for financial-action accountability.' },
    { phase: 'Security 2A', title: 'Sender-authenticity observation', status: 'partial', delivered: 'Unknown authenticity is visible. The canary requires one deploy-time opt-in, dashboard visible-sender allowlist, complete MIME, extracted reference and amount, and a dashboard max amount limit.', missing: 'SPF, DKIM, DMARC, ARC, Return-Path and visible-From alignment are not yet captured from routed mail.', next: 'Capture bounded authentication evidence from representative real emails in report-only mode.', gate: 'Requires Cloudflare Worker deployment preparation and real routed-email samples.' },
    { phase: 'Security 2B', title: 'Sender-authenticity enforcement', status: 'blocked', delivered: 'Ledger execution is operational only inside the explicit canary gates; the emergency stop is the dashboard Ledger switch or the canary env flag.', missing: 'No approved authenticated-domain policy or forwarding exception policy exists yet.', next: 'Review report-only evidence, approve policy, then quarantine failed or indeterminate financial senders.', gate: 'Do not broaden beyond the canary until real header evidence proves legitimate mail passes.' },
    { phase: 'Handlers', title: 'Typed action handlers and idempotency', status: 'partial', delivered: 'Typed handlers, semantic idempotency keys and duplicate-action linking are implemented.', missing: 'Only the current Ledger and notification-oriented handlers exist; external reconciliation needs database-backed validation.', next: 'Validate existing-record reconciliation and ambiguous duplicates without creating a second external record.' },
    { phase: 'Recovery', title: 'Retries, temporary work reservations and reconciliation', status: 'partial', delivered: 'Manager action retry, Telegram-only retry, temporary work reservations that expire after an interrupted processor, stale-completion protection and attempt history exist. Ledger recovery uses the same canary policy as intake and execution.', missing: 'There is no automatic retry timer. Today, due work is visible here and available recovery controls are shown on the event page.', next: 'If automatic retries are later approved, add a bounded Vercel Cron processor every 5 minutes and record each run, including idle runs.', gate: 'Recommended choice: Vercel Cron. Configure a private CRON_SECRET bearer token and deploy the endpoint. This processes retries only; it cannot bypass Ledger canary gates.' },
    { phase: 'Review workflow', title: 'Email attention review records', status: 'partial', delivered: 'A separate review table backfills review and terminal-failure events. The queue and event page support bounded evidence, deterministic diagnostics, manual analysis, provider-neutral bundle copy/download, done, and reopen states.', missing: 'Approve, reject, reclassify, assign, comment and approve-and-run flows are intentionally not implemented in this phase.', next: 'Keep review completion separate from action queues. Add guarded decision flows only after a separate approval of the external-action policy.' },
    { phase: 'Telegram', title: 'Durable transition notifications', status: 'partial', delivered: 'Messages use truthful labels, and new attention reviews can include a direct event dashboard link.', missing: 'Not every persisted transition has a dedicated one-time message or direct event-page link.', next: 'Add deduplicated queued, succeeded, reconciled, retry, terminal-failure and quarantine transitions with dashboard links.' },
    { phase: 'Rules', title: 'Rule lifecycle and audit', status: 'partial', delivered: 'Rules can be enabled, disabled, reordered, previewed and test-sent. Events retain decision snapshots.', missing: 'Create/edit/clone, revisions, approval, rollback, historical simulation and named-actor audit are missing.', next: 'Add draft → tested → approved → active → retired revisions with optimistic conflict checks.' },
    { phase: 'Monitoring', title: 'Health, queues and alerts', status: 'partial', delivered: 'The operations panel reports oldest due work, stale leases, terminal retries and parser warnings with exact remediation. Scheduler status is explicitly shown as not configured.', missing: 'Durable scheduler heartbeats, intake-silence/latency thresholds and rate-limited external alerts are not implemented.', next: 'After choosing a scheduler, persist every run including idle runs, then add cadence-based heartbeat alerts.', gate: 'Scheduler provider, authenticated invocation secret and expected cadence require deployment configuration and approval.' },
    { phase: 'Privacy', title: 'Redaction and retention', status: 'planned', delivered: 'Dashboard results select safe fields and stored errors are redacted and bounded.', missing: 'Retention periods, expiry, deletion dry-run, deletion audit and attachment policy are undecided.', next: 'Choose retention by data class, then add dry-run expiry before enabling deletion.', gate: 'Requires accounting/privacy decisions. Never store attachment bytes before storage, scanning and access policies exist.' },
    { phase: 'MIME', title: 'Production email parsing', status: 'partial', delivered: 'Missing, malformed, multipart, truncated, unsupported or attachment-bearing financial emails fail safely into review.', missing: 'The Worker still lacks a complete MIME/charset/forwarded-message parser and attachment metadata pipeline.', next: 'Evaluate a Worker-compatible parser against sanitized Thai, multipart and forwarded-email fixtures.' },
    { phase: 'Rollout', title: 'Staged production verification', status: 'partial', delivered: 'Migrations 0006 and 0007 are applied. This dashboard reads the production database and shows Ledger canary controls, the separate attention queue, live queue health and recent email events.', missing: 'Automatic scheduling, the first live financial canary, and some provider/runtime failure exercises remain future operational work.', next: 'Wait for representative emails, open each event from this page, and follow its four facts: what happened, action taken, current state and next step.' }
  ];
  const roadmapStatus = (status: RoadmapStatus) => status === 'done'
    ? { label: 'Delivered', classes: 'border-emerald-200 bg-emerald-50 text-emerald-800' }
    : status === 'partial'
      ? { label: 'Partially delivered', classes: 'border-sky-200 bg-sky-50 text-sky-800' }
      : status === 'blocked'
        ? { label: 'Blocked for safety', classes: 'border-red-200 bg-red-50 text-red-800' }
        : { label: 'Planned', classes: 'border-amber-200 bg-amber-50 text-amber-800' };

  let copyingPendingReviews = $state(false);

  const reload = async () => {
    refreshedDashboard = await refreshEmailAutomationDashboard();
  };

  const onCopyPendingReviews = async () => {
    copyingPendingReviews = true;
    const toastId = toast.loading('Preparing pending reviews…');
    try {
      const result = await copyPendingEmailAutomationReviews();
      if (result.count === 0) {
        toast.info('No open reviews', { id: toastId, description: 'There are no waiting or in-progress review bundles to copy.' });
        return;
      }
      await navigator.clipboard.writeText(result.bundle);
      toast.success('Pending reviews copied', { id: toastId, description: `${result.count} structured review bundle${result.count === 1 ? '' : 's'} copied for a local Pi session.` });
    } catch (error) {
      toast.error('Copy failed', { id: toastId, description: error instanceof Error ? error.message : 'Refresh and try again.' });
    } finally {
      copyingPendingReviews = false;
    }
  };

  const onSendTestBuiltin = async (key: string) => {
    const toastId = toast.loading('Sending test message…');
    try {
      const result = await sendEmailAutomationTestForBuiltin({ key });
      if (!result.ok) { toast.error('Test send failed', { id: toastId, description: result.error }); return; }
      if (result.sent === 'not_configured') { toast.error('Telegram not configured', { id: toastId, description: 'Missing bot token or chat id.' }); return; }
      toast.success('Test sent to Telegram', { id: toastId, description: result.target });
    } catch (e) {
      toast.error('Test send failed', { id: toastId, description: e instanceof Error ? e.message : undefined });
    }
  };
</script>

<section class="space-y-5">
  <div>
    <p class="text-sm font-bold uppercase tracking-[0.22em] text-[#7a6550]/55">Operations</p>
    <h1 class="mt-2 text-3xl font-semibold tracking-tight">Email automation</h1>
    <p class="mt-2 max-w-3xl text-sm leading-6 text-[#7a6550]">
      Selected operational emails are recorded before any side effect is attempted. Each event page explains what happened, what action actually ran, its durable state, and the next step. Unclear or incomplete emails stay in review and do not run financial side effects automatically.
    </p>
  </div>

  <details class="group rounded-3xl border border-sky-200 bg-sky-50 shadow-sm">
    <summary class="flex cursor-pointer list-none items-center justify-between px-5 py-4">
      <span class="flex items-center gap-2 font-semibold text-sky-950"><BookOpen size={18} />How to read this dashboard</span>
      <ChevronDown size={18} class="text-sky-700 transition-transform group-open:rotate-180" />
    </summary>
    <div class="grid gap-3 border-t border-sky-200 px-5 pb-5 pt-4 text-sm leading-6 text-sky-950 md:grid-cols-2">
      <p><b>Needs review</b> means a manager should inspect the saved evidence. It does not approve, retry, or run a financial action.</p>
      <p><b>Ready for action</b> means the classifier found a possible action. It does not mean an external record was created.</p>
      <p><b>Completed</b> is shown only when the durable action reports success or reconciliation. Open the event for the external record and attempt history.</p>
      <p><b>Attention review queue</b> is human work kept separate from Ledger and Telegram work. Saving or completing review notes cannot run either queue.</p>
      <p><b>Due work</b> is work waiting for processing. Automatic retry scheduling is not configured, so use the recovery controls shown on the event page.</p>
      <p><b>Live database state</b> is the source of truth here. Refresh this page after a webhook, retry, review update, or settings change.</p>
    </div>
  </details>

  <AutomationSettingsSection settings={dashboard.settings} onRefresh={reload} />

  <!-- Company Ledger canary status -->
  <details class="group rounded-3xl border border-[#dfd2c5] bg-white shadow-sm">
    <summary class="flex cursor-pointer list-none items-center justify-between px-5 py-4">
      <div>
        <span class="flex items-center gap-2 font-semibold"><Scale size={18} />Company Ledger canary status</span>
        <span class={`ml-3 rounded-full border px-2 py-0.5 text-xs font-bold ${dashboard.ledgerPolicy.mode === 'canary' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>{dashboard.ledgerPolicy.mode === 'canary' ? 'eligible for allowed senders' : 'blocked closed'}</span>
      </div>
      <ChevronDown size={18} class="text-[#7a6550] transition-transform group-open:rotate-180" />
    </summary>
    <div class="grid gap-4 border-t border-[#eee5dc] p-5 xl:grid-cols-3">
      <article class="rounded-2xl border border-[#eee5dc] bg-[#fbf8f4] p-4 text-sm">
        <h3 class="font-semibold text-[#2c2925]">What works now</h3>
        <p class="mt-2 leading-6 text-[#7a6550]">Matching transaction emails can create or reconcile a Financial Ledger row, which is the current code path for the Company Ledger, only after all canary gates pass.</p>
        <p class="mt-2 text-xs text-[#7a6550]">Max canary amount: <b>{dashboard.ledgerPolicy.maxAmountThb.toLocaleString('en-US')} THB</b>.</p>
      </article>
      <article class="rounded-2xl border border-[#eee5dc] bg-[#fbf8f4] p-4 text-sm">
        <h3 class="font-semibold text-[#2c2925]">Current gates</h3>
        <ul class="mt-2 list-disc space-y-1 pl-5 text-[#7a6550]">
          <li>Dashboard Ledger canary: <b>{dashboard.ledgerPolicy.dashboardLedgerEnabled ? 'on' : 'off'}</b></li>
          <li>Deployment canary flag: <b>{dashboard.ledgerPolicy.canaryEnvEnabled ? 'set' : 'missing'}</b></li>
          <li>Dashboard sender allowlist: <b>{dashboard.ledgerPolicy.senderAllowlistConfigured ? 'configured' : 'missing'}</b>{#if dashboard.ledgerPolicy.senderAllowlistLabels.length} · {dashboard.ledgerPolicy.senderAllowlistLabels.join(', ')}{/if}</li>
          <li>Complete MIME, reference, THB amount, and idempotency are required per event.</li>
        </ul>
      </article>
      <article class="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
        <h3 class="font-semibold">Current risks and next action</h3>
        <p class="mt-2 leading-6">Sender authenticity is still not SPF/DKIM/DMARC enforced. The visible sender can be spoofed, so keep this to a narrow canary and review new Ledger rows.</p>
        <p class="mt-2 leading-6"><b>Next:</b> {dashboard.ledgerPolicy.nextAction}</p>
      </article>
      <article class="rounded-2xl border border-[#eee5dc] bg-white p-4 text-sm xl:col-span-3">
        <h3 class="font-semibold text-[#2c2925]">Safeguards retained</h3>
        <div class="mt-2 grid gap-2 md:grid-cols-2">
          {#each dashboard.ledgerPolicy.safeguards as safeguard}
            <p class="rounded-xl bg-[#fbf8f4] px-3 py-2 text-xs leading-5 text-[#7a6550]">{safeguard}</p>
          {/each}
        </div>
      </article>
    </div>
  </details>

  <DashboardTotals totals={dashboard.totals} />

  <!-- This human-attention queue never claims or completes action/Telegram work. -->
  <ReviewQueueSection
    reviews={dashboard.reviews}
    reviewTotals={dashboard.reviewTotals}
    {copyingPendingReviews}
    onCopyPendingReviews={onCopyPendingReviews}
    operations={reviewOperations}
    onRefresh={reload}
    loadDetail={loadReviewDetail}
    onQuickReview={openQuickReview}
  />

  <QuickReviewModal
    open={quickReviewOpen}
    eventId={quickReviewEventId}
    detail={quickReviewDetail}
    loading={quickReviewLoading}
    errorMessage={quickReviewErrorMessage}
    operations={reviewOperations}
    onRefresh={refreshQuickReview}
    onRetry={retryQuickReview}
    onClose={closeQuickReview}
  />

  <OperationsHealthSection health={dashboard.operationsHealth} />

  <!-- Durable in-product roadmap so operational gaps do not depend on external documentation. -->
  <details class="group rounded-3xl border border-[#dfd2c5] bg-white shadow-sm">
    <summary class="flex cursor-pointer list-none items-center justify-between px-5 py-4">
      <div>
        <span class="flex items-center gap-2 font-semibold"><Map size={18} />Safety gaps and implementation roadmap</span>
        <span class="ml-3 text-xs text-[#7a6550]">{roadmap.filter(item => item.status === 'done').length} delivered · {roadmap.filter(item => item.status !== 'done').length} remaining</span>
      </div>
      <ChevronDown size={18} class="text-[#7a6550] transition-transform group-open:rotate-180" />
    </summary>
    <div class="border-t border-[#eee5dc] p-5">
      <div class="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
        <p class="font-semibold">Current safety boundary</p>
        <p class="mt-1 leading-6">Company Ledger writes are available only as a narrow canary. The dashboard switch, deployment canary flag, sender allowlist, MIME completeness, extracted reference/amount, amount limit, and idempotency checks must all pass. Sender authenticity is still not enforced, so do not broaden beyond the canary until real authentication evidence is approved.</p>
      </div>
      <p class="mb-4 max-w-4xl text-sm leading-6 text-[#7a6550]">This is the operational source of truth for unfinished work. Each item states what exists, what is missing, and the next concrete action. “Partially delivered” means the feature must not be treated as complete.</p>
      <div class="grid gap-3 xl:grid-cols-2">
        {#each roadmap as item}
          {@const badge = roadmapStatus(item.status)}
          <article class="rounded-2xl border border-[#eee5dc] bg-[#fbf8f4] p-4">
            <div class="flex flex-wrap items-start justify-between gap-2">
              <div><p class="text-xs font-bold uppercase tracking-wider text-[#7a6550]/60">{item.phase}</p><h3 class="mt-1 font-semibold text-[#2c2925]">{item.title}</h3></div>
              <span class={`rounded-full border px-2.5 py-1 text-xs font-bold ${badge.classes}`}>{badge.label}</span>
            </div>
            <dl class="mt-4 space-y-3 text-sm leading-5">
              <div><dt class="font-semibold text-[#2c2925]">What exists</dt><dd class="mt-1 text-[#7a6550]">{item.delivered}</dd></div>
              <div><dt class="font-semibold text-[#2c2925]">What is missing</dt><dd class="mt-1 text-[#7a6550]">{item.missing}</dd></div>
              <div><dt class="font-semibold text-[#2c2925]">Next action</dt><dd class="mt-1 text-[#7a6550]">{item.next}</dd></div>
              {#if item.gate}<div class="rounded-xl border border-amber-200 bg-amber-50 p-3"><dt class="font-semibold text-amber-950">Decision or external gate</dt><dd class="mt-1 text-amber-900">{item.gate}</dd></div>{/if}
            </dl>
          </article>
        {/each}
      </div>
      <div class="mt-5 rounded-2xl border border-[#dfd2c5] bg-white p-4 text-sm">
        <p class="font-semibold">Required rollout order</p>
        <ol class="mt-2 list-decimal space-y-1 pl-5 text-[#7a6550]"><li>Receive an email, then open its event from the review queue or recent events.</li><li>Read the four outcome facts before taking any recovery action.</li><li>Keep review completion separate from Ledger and Telegram actions.</li><li>Verify the narrow Ledger canary gates before any allowed financial canary.</li><li>Consider automatic scheduling and broader automation only as separate future approvals.</li></ol>
      </div>
    </div>
  </details>

  <ClassifierRulesSection rules={dashboard.rules} onRefresh={reload} />

  <!-- Built-in classifiers -->
  <details class="group rounded-3xl border border-[#dfd2c5] bg-white shadow-sm">
    <summary class="flex cursor-pointer list-none items-center justify-between px-5 py-4">
      <div>
        <span class="flex items-center gap-2 font-semibold"><ListChecks size={18} />Built-in fallback classifiers</span>
        <span class="ml-3 text-xs text-[#7a6550]">{dashboard.builtinPreviews.filter(b => b.deprecated).length} deprecated · {dashboard.builtinPreviews.filter(b => !b.deprecated).length} catch-all</span>
      </div>
      <ChevronDown size={18} class="text-[#7a6550] transition-transform group-open:rotate-180" />
    </summary>
    <div class="grid gap-3 border-t border-[#eee5dc] p-5 lg:grid-cols-2">
      {#each dashboard.builtinPreviews as entry (entry.key)}
        <div class="rounded-2xl border border-[#eee5dc] bg-[#fbf8f4] p-4">
          <div class="flex items-start justify-between gap-3">
            <div>
              <p class="text-sm font-medium text-[#2c2925]">{entry.label}</p>
              <p class="mt-1 text-xs text-[#7a6550]">{entry.classification} · {human(entry.subtype)}</p>
            </div>
            {#if entry.deprecated}
              <span class="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-700">deprecated</span>
            {:else}
              <span class="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-xs font-bold text-sky-700">fallback</span>
            {/if}
          </div>
          <p class="mt-2 text-xs text-[#7a6550]">{entry.description}</p>
          <div class="mt-2 rounded-xl border border-[#3a3329] bg-[#1f1b17] p-3 text-xs leading-5 text-[#f8f3ed]">{@html entry.preview}</div>
          <button class="mt-3 rounded-full border border-[#d9d0c7] bg-white px-3 py-1.5 text-xs font-medium text-[#5c4a3d] hover:bg-[#efe6dc]" onclick={() => onSendTestBuiltin(entry.key)}>Send test to Telegram</button>
        </div>
      {/each}
    </div>
  </details>

  <!-- Default preview -->
  <details class="group rounded-3xl border border-[#dfd2c5] bg-white shadow-sm">
    <summary class="flex cursor-pointer list-none items-center justify-between px-5 py-4">
      <span class="flex items-center gap-2 font-semibold"><Send size={18} />Default Telegram message preview</span>
      <ChevronDown size={18} class="text-[#7a6550] transition-transform group-open:rotate-180" />
    </summary>
    <div class="border-t border-[#eee5dc] px-5 py-4">
      <p class="mb-3 text-sm text-[#7a6550]">A sample ready expense rendered with the same modular templates as production.</p>
      <div class="rounded-xl border border-[#3a3329] bg-[#1f1b17] p-4 text-sm leading-6 text-[#f8f3ed]">{@html dashboard.notificationPreview}</div>
    </div>
  </details>

  <!-- Classification outcomes -->
  <div class="grid gap-4 xl:grid-cols-2">
    <details class="group rounded-3xl border border-[#dfd2c5] bg-white shadow-sm">
      <summary class="flex cursor-pointer list-none items-center justify-between px-5 py-4">
        <span class="flex items-center gap-2 font-semibold"><Tags size={18} />Recent classification outcomes</span>
        <ChevronDown size={18} class="text-[#7a6550] transition-transform group-open:rotate-180" />
      </summary>
      {#if dashboard.subtypes.length === 0}
        <p class="border-t border-[#eee5dc] px-5 py-8 text-sm text-[#7a6550]">No classified events yet.</p>
      {:else}
        <div class="overflow-x-auto border-t border-[#eee5dc]"><table class="w-full text-left text-sm"><thead class="bg-[#fbf8f4] text-xs uppercase tracking-wider text-[#7a6550]"><tr><th class="px-4 py-3">Subtype</th><th class="px-4 py-3">State</th><th class="px-4 py-3">Count</th><th class="px-4 py-3">Latest</th></tr></thead><tbody>
          {#each dashboard.subtypes as row}<tr class="border-t border-[#eee5dc]"><td class="px-4 py-3"><p class="font-medium text-[#2c2925]">{human(row.subtype)}</p><p class="text-xs text-[#7a6550]">{row.classification}</p></td><td class="px-4 py-3"><span class={`rounded-full border px-2.5 py-1 text-xs font-bold ${stateClass(row.processingState)}`}>{row.processingState}</span></td><td class="px-4 py-3">{row.count}</td><td class="px-4 py-3 whitespace-nowrap">{when(row.latestReceivedAt)}</td></tr>{/each}
        </tbody></table></div>
      {/if}
    </details>

    <details class="group rounded-3xl border border-[#dfd2c5] bg-white shadow-sm">
      <summary class="flex cursor-pointer list-none items-center justify-between px-5 py-4">
        <span class="flex items-center gap-2 font-semibold"><Zap size={18} />Rule and handler activity</span>
        <ChevronDown size={18} class="text-[#7a6550] transition-transform group-open:rotate-180" />
      </summary>
      {#if dashboard.handlers.length === 0}
        <p class="border-t border-[#eee5dc] px-5 py-8 text-sm text-[#7a6550]">No rule matches recorded yet.</p>
      {:else}
        <div class="overflow-x-auto border-t border-[#eee5dc]"><table class="w-full text-left text-sm"><thead class="bg-[#fbf8f4] text-xs uppercase tracking-wider text-[#7a6550]"><tr><th class="px-4 py-3">Rule</th><th class="px-4 py-3">Handler</th><th class="px-4 py-3">Count</th><th class="px-4 py-3">Latest</th></tr></thead><tbody>
          {#each dashboard.handlers as row}<tr class="border-t border-[#eee5dc]"><td class="px-4 py-3">{row.matchedRuleName ?? 'built-in fallback'}</td><td class="px-4 py-3">{row.handlerKey ?? 'none'}</td><td class="px-4 py-3">{row.count}</td><td class="px-4 py-3 whitespace-nowrap">{when(row.latestReceivedAt)}</td></tr>{/each}
        </tbody></table></div>
      {/if}
    </details>
  </div>

  <RecentEventsSection events={dashboard.recent} onQuickReview={openQuickReview} />
</section>
