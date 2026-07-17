<script lang="ts">
  import { toast } from 'svelte-sonner';
  import { ChevronDown } from 'lucide-svelte';
  import type { PageData } from './$types';
  import {
    moveEmailClassificationRule,
    refreshEmailAutomationDashboard,
    saveEmailAutomationSettings,
    sendEmailAutomationTestForBuiltin,
    sendEmailAutomationTestForRule,
    toggleEmailClassificationRule
  } from '$lib/email-automation.remote';
  import type { DashboardData, RulePreview } from '$lib/server/email-automation/dashboard';

  let { data }: { data: PageData } = $props();

  // Local mutable copy so we can update after remote commands without a page reload.
  // Initialized from SSR load data; refreshed by `refreshEmailAutomationDashboard` after mutations.
  let dashboard: DashboardData = $state(data);
  $effect(() => { dashboard = data; });

  const dateTime = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
  const when = (value: string | Date) => dateTime.format(new Date(value));
  const age = (value: string | Date) => {
    const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60_000));
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    return hours < 48 ? `${hours}h` : `${Math.floor(hours / 24)}d`;
  };
  const stateClass = (state: string) => state === 'ready' || state === 'ledger_created' || state === 'done'
    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
    : state === 'review' || state === 'waiting' || state === 'in_progress'
      ? 'bg-amber-50 text-amber-800 border-amber-200'
      : state === 'retry_pending' || state === 'failed'
        ? 'bg-red-50 text-red-800 border-red-200'
        : 'bg-slate-50 text-slate-700 border-slate-200';
  const human = (value: string | null | undefined) => value ? value.replaceAll('_', ' ') : 'built-in fallback';
  const patternSummary = (rule: RulePreview) => [
    rule.senderPattern ? `from: ${rule.senderPattern}` : null,
    rule.subjectPattern ? `subject: ${rule.subjectPattern}` : null,
    Array.isArray(rule.bodyPatterns) && rule.bodyPatterns.length > 0 ? `body: ${rule.bodyPatterns.length} all-match` : null,
    rule.bodyPatterns && !Array.isArray(rule.bodyPatterns) && typeof rule.bodyPatterns === 'object' ? 'body: custom match' : null
  ].filter(Boolean).join(' · ') || 'No pattern restrictions';

  const classBadge = (classification: string) =>
    classification === 'expense' ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
    : classification === 'review' ? 'bg-amber-50 text-amber-700 border-amber-200'
    : classification === 'ignore' ? 'bg-slate-100 text-slate-500 border-slate-200'
    : 'bg-sky-50 text-sky-700 border-sky-200';

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

  // Settings form state
  let automationEnabled = $state(dashboard.settings.automationEnabled);
  let ledgerEnabled = $state(dashboard.settings.ledgerEnabled);
  let notificationsEnabled = $state(dashboard.settings.notificationsEnabled);
  let ledgerAllowedSendersText = $state(dashboard.settings.ledgerAllowedSenders.join('\n'));
  let ledgerMaxAmountThb = $state(dashboard.settings.ledgerMaxAmountThb);
  let savingSettings = $state(false);
  $effect(() => {
    automationEnabled = dashboard.settings.automationEnabled;
    ledgerEnabled = dashboard.settings.ledgerEnabled;
    notificationsEnabled = dashboard.settings.notificationsEnabled;
    ledgerAllowedSendersText = dashboard.settings.ledgerAllowedSenders.join('\n');
    ledgerMaxAmountThb = dashboard.settings.ledgerMaxAmountThb;
  });

  // Ignored emails toggle
  let showIgnored = $state(false);
  const ignoredEvents = $derived(dashboard.recent.filter((e) => e.processingState === 'ignored'));
  const visibleEvents = $derived(showIgnored ? dashboard.recent : dashboard.recent.filter((e) => e.processingState !== 'ignored'));
  const staleCount = $derived(dashboard.operationsHealth.staleActionLeases + dashboard.operationsHealth.staleNotificationLeases);
  const failedCount = $derived(dashboard.operationsHealth.failedActions + dashboard.operationsHealth.failedNotifications);

  // Collapsible cards state
  let expandedRules = $state<Record<number, boolean>>({});
  const toggleRuleExpand = (id: number) => {
    expandedRules[id] = !expandedRules[id];
  };

  const reload = async () => {
    dashboard = await refreshEmailAutomationDashboard();
  };

  const onSaveSettings = async () => {
    savingSettings = true;
    const toastId = toast.loading('Saving settings…');
    try {
      const ledgerAllowedSenders = Array.from(new Set(ledgerAllowedSendersText.split(/[\n,]+/).map((entry) => entry.trim().toLowerCase()).filter(Boolean)));
      await saveEmailAutomationSettings({ automationEnabled, ledgerEnabled, notificationsEnabled, ledgerAllowedSenders, ledgerMaxAmountThb });
      await reload();
      toast.success('Settings saved', { id: toastId, description: 'Automation settings updated in Neon.' });
    } catch (e) {
      toast.error('Failed to save settings', { id: toastId, description: e instanceof Error ? e.message : undefined });
    } finally {
      savingSettings = false;
    }
  };

  const onToggleRule = async (ruleId: number, currentName: string) => {
    const toastId = toast.loading('Toggling rule…');
    try {
      const result = await toggleEmailClassificationRule({ ruleId });
      if (!result.ok) { toast.error('Failed', { id: toastId, description: result.error }); return; }
      await reload();
      toast.success(`${currentName} ${result.enabled ? 'enabled' : 'disabled'}`, { id: toastId });
    } catch (e) {
      toast.error('Failed to toggle rule', { id: toastId, description: e instanceof Error ? e.message : undefined });
    }
  };

  const onMoveRule = async (ruleId: number, direction: 'up' | 'down', name: string) => {
    const toastId = toast.loading('Reordering…');
    try {
      await moveEmailClassificationRule({ ruleId, direction });
      await reload();
      toast.success(`${name} moved ${direction}`, { id: toastId });
    } catch (e) {
      toast.error('Failed to reorder', { id: toastId, description: e instanceof Error ? e.message : undefined });
    }
  };

  const onSendTestRule = async (ruleId: number) => {
    const toastId = toast.loading('Sending test message…');
    try {
      const result = await sendEmailAutomationTestForRule({ ruleId });
      if (!result.ok) { toast.error('Test send failed', { id: toastId, description: result.error }); return; }
      if (result.sent === 'not_configured') { toast.error('Telegram not configured', { id: toastId, description: 'Missing bot token or chat id.' }); return; }
      toast.success('Test sent to Telegram', { id: toastId, description: result.target });
    } catch (e) {
      toast.error('Test send failed', { id: toastId, description: e instanceof Error ? e.message : undefined });
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

  <details class="group rounded-3xl border border-sky-200 bg-sky-50 shadow-sm" open>
    <summary class="flex cursor-pointer list-none items-center justify-between px-5 py-4">
      <span class="font-semibold text-sky-950">How to read this dashboard</span>
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

  <!-- Settings -->
  <details class="group rounded-3xl border border-[#dfd2c5] bg-white shadow-sm" open>
    <summary class="flex cursor-pointer list-none items-center justify-between px-5 py-4">
      <span class="font-semibold">Automation settings</span>
      <ChevronDown size={18} class="text-[#7a6550] transition-transform group-open:rotate-180" />
    </summary>
    <div class="border-t border-[#eee5dc] px-5 pb-5 pt-4">
      <p class="mb-4 text-sm text-[#7a6550]">Runtime switches stored in Neon. These replace deploy-time env toggles.</p>
      <div class="grid gap-3 md:grid-cols-3">
        <label class="flex items-start gap-3 rounded-2xl border border-[#eee5dc] bg-[#fbf8f4] p-4 text-sm">
          <input class="mt-1" type="checkbox" bind:checked={automationEnabled} />
          <span><b class="block text-[#2c2925]">Automation enabled</b><span class="text-[#7a6550]">When off, emails are stored as ignored.</span></span>
        </label>
        <label class="flex items-start gap-3 rounded-2xl border border-[#eee5dc] bg-[#fbf8f4] p-4 text-sm">
          <input class="mt-1" type="checkbox" bind:checked={ledgerEnabled} />
          <span><b class="block text-[#2c2925]">Company Ledger canary</b><span class="text-[#7a6550]">When on, Ledger writes are still allowed only if the deployment canary flag, dashboard sender allowlist, complete MIME, amount limit, reference, and idempotency checks pass. Turn this off as the emergency stop.</span></span>
        </label>
        <label class="flex items-start gap-3 rounded-2xl border border-[#eee5dc] bg-[#fbf8f4] p-4 text-sm">
          <input class="mt-1" type="checkbox" bind:checked={notificationsEnabled} />
          <span><b class="block text-[#2c2925]">Telegram notifications</b><span class="text-[#7a6550]">When off, events are stored but Telegram is not sent.</span></span>
        </label>
      </div>
      <div class="mt-4 grid gap-3 lg:grid-cols-[2fr_1fr]">
        <label class="block rounded-2xl border border-[#eee5dc] bg-[#fbf8f4] p-4 text-sm">
          <b class="block text-[#2c2925]">Ledger canary allowed senders</b>
          <span class="mt-1 block text-xs leading-5 text-[#7a6550]">One exact visible sender email or domain per line. Stored in Neon dashboard settings, not Vercel env.</span>
          <textarea class="mt-3 min-h-28 w-full rounded-xl border border-[#dfd2c5] bg-white p-3 font-mono text-xs" bind:value={ledgerAllowedSendersText} placeholder="kbiz@kasikornbank.com&#10;yardenavirav@gmail.com"></textarea>
        </label>
        <label class="block rounded-2xl border border-[#eee5dc] bg-[#fbf8f4] p-4 text-sm">
          <b class="block text-[#2c2925]">Ledger max amount (THB)</b>
          <span class="mt-1 block text-xs leading-5 text-[#7a6550]">Canary hard limit before a Ledger write can run.</span>
          <input class="mt-3 w-full rounded-xl border border-[#dfd2c5] bg-white p-3 text-sm" type="number" min="1" step="1" bind:value={ledgerMaxAmountThb} />
        </label>
      </div>
      <button class="mt-4 rounded-full bg-[#2c2925] px-4 py-2 text-sm font-semibold text-white hover:bg-[#4a4037] disabled:opacity-50" onclick={onSaveSettings} disabled={savingSettings}>Save settings</button>
    </div>
  </details>

  <!-- Company Ledger canary status -->
  <details class="group rounded-3xl border border-[#dfd2c5] bg-white shadow-sm" open>
    <summary class="flex cursor-pointer list-none items-center justify-between px-5 py-4">
      <div>
        <span class="font-semibold">Company Ledger canary status</span>
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

  <!-- Totals -->
  <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
    <div class="rounded-3xl border border-[#dfd2c5] bg-white p-5"><p class="text-xs font-bold uppercase tracking-wider text-[#7a6550]/60">Received</p><p class="mt-2 text-3xl font-semibold">{dashboard.totals.total}</p></div>
    <div class="rounded-3xl border border-emerald-200 bg-emerald-50 p-5"><p class="text-xs font-bold uppercase tracking-wider text-emerald-800/60">Ready for action</p><p class="mt-2 text-3xl font-semibold text-emerald-900">{dashboard.totals.ready}</p></div>
    <div class="rounded-3xl border border-amber-200 bg-amber-50 p-5"><p class="text-xs font-bold uppercase tracking-wider text-amber-800/60">Needs review</p><p class="mt-2 text-3xl font-semibold text-amber-900">{dashboard.totals.review}</p></div>
    <div class="rounded-3xl border border-slate-200 bg-slate-50 p-5"><p class="text-xs font-bold uppercase tracking-wider text-slate-700/60">Ignored</p><p class="mt-2 text-3xl font-semibold text-slate-900">{dashboard.totals.ignored}</p></div>
  </div>

  <!-- This is a separate human-attention queue. It never claims or completes action/Telegram work. -->
  <section class="overflow-hidden rounded-3xl border border-amber-200 bg-white shadow-sm">
    <div class="flex flex-wrap items-center justify-between gap-3 border-b border-amber-100 bg-amber-50 px-5 py-4">
      <div><h2 class="font-semibold text-amber-950">Email attention review queue</h2><p class="mt-1 text-xs text-amber-900">{dashboard.reviewTotals.waiting} waiting · {dashboard.reviewTotals.inProgress} in progress · {dashboard.reviewTotals.done} done. Review notes and completion are stored separately from external actions, retries, Ledger, and Telegram work.</p></div>
      <span class="rounded-full border border-amber-200 bg-white px-3 py-1 text-xs font-bold text-amber-800">{dashboard.reviewTotals.waiting + dashboard.reviewTotals.inProgress} open</span>
    </div>
    {#if dashboard.reviews.length === 0}
      <p class="px-5 py-8 text-sm text-[#7a6550]">No open email reviews. Historical review records are retained as done when completed.</p>
    {:else}
      <div class="divide-y divide-[#eee5dc]">
        {#each dashboard.reviews as review (review.id)}
          <a class="block px-5 py-4 transition hover:bg-[#fbf8f4]" href={`/mgmt-dashboard/email-automation/${review.eventId}`}>
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div class="min-w-0"><p class="truncate text-sm font-semibold text-[#2c2925]">{review.subject}</p><p class="mt-1 truncate text-xs text-[#7a6550]">{review.fromAddress} · {review.reasonCode.replaceAll('_', ' ')}</p></div>
              <div class="flex items-center gap-2"><span class={`rounded-full border px-2.5 py-1 text-xs font-bold ${stateClass(review.status)}`}>{review.status.replaceAll('_', ' ')}</span><span class="text-xs text-[#7a6550]">{age(review.createdAt)}</span></div>
            </div>
            <p class="mt-2 text-sm text-amber-950">{review.reason}</p>
            {#if review.summary}<p class="mt-1 truncate text-xs text-[#7a6550]">Saved summary: {review.summary}</p>{/if}
          </a>
        {/each}
      </div>
    {/if}
  </section>

  <!-- Operational health uses durable queue state. It never infers a scheduler heartbeat from unrelated event timestamps. -->
  <details class="group rounded-3xl border border-[#dfd2c5] bg-white shadow-sm" open>
    <summary class="flex cursor-pointer list-none items-center justify-between px-5 py-4">
      <div><span class="font-semibold">Operations health</span><span class="ml-3 text-xs text-[#7a6550]">live database state</span></div>
      <ChevronDown size={18} class="text-[#7a6550] transition-transform group-open:rotate-180" />
    </summary>
    <div class="grid gap-3 border-t border-[#eee5dc] p-5 lg:grid-cols-2">
      <article class={`rounded-2xl border p-4 ${dashboard.operationsHealth.oldestDueAt ? 'border-amber-200 bg-amber-50' : 'border-emerald-200 bg-emerald-50'}`}>
        <h3 class="font-semibold">Due work</h3>
        {#if dashboard.operationsHealth.oldestDueAt}<p class="mt-1 text-sm"><b>Oldest due: {age(dashboard.operationsHealth.oldestDueAt)}</b> ({when(dashboard.operationsHealth.oldestDueAt)}).</p><p class="mt-2 text-sm">This item is waiting for processing. Automatic retries are not configured, so open its event and use the recovery control shown there. Ledger retries still require the same canary gates as intake.</p>{:else}<p class="mt-1 text-sm">No action or Telegram item is currently overdue. Processing is manual until an automatic scheduler is configured.</p>{/if}
      </article>
      <article class={`rounded-2xl border p-4 ${staleCount ? 'border-red-200 bg-red-50' : 'border-emerald-200 bg-emerald-50'}`}>
        <h3 class="font-semibold">Interrupted work reservations</h3><p class="mt-1 text-sm"><b>{staleCount}</b> active past their expiry ({dashboard.operationsHealth.staleActionLeases} actions, {dashboard.operationsHealth.staleNotificationLeases} notifications).</p>
        {#if staleCount}<p class="mt-2 text-sm">A processor reserved this work but did not finish. Do not treat it as completed. Open the affected event and use the available recovery control after confirming the result.</p>{/if}
      </article>
      <article class={`rounded-2xl border p-4 ${failedCount ? 'border-red-200 bg-red-50' : 'border-emerald-200 bg-emerald-50'}`}>
        <h3 class="font-semibold">Exhausted retries</h3><p class="mt-1 text-sm"><b>{failedCount}</b> terminal ({dashboard.operationsHealth.failedActions} actions, {dashboard.operationsHealth.failedNotifications} notifications).</p>
        {#if dashboard.operationsHealth.failedActions}<p class="mt-2 text-sm">Open each event and inspect attempts. Reconcile before retry when duplicate external creation is possible.</p>{/if}{#if dashboard.operationsHealth.failedNotifications}<p class="mt-2 text-sm">Confirm Telegram configuration, then use “Retry Telegram only”. It cannot rerun the external action.</p>{/if}
      </article>
      <article class={`rounded-2xl border p-4 ${dashboard.operationsHealth.parserWarnings24h ? 'border-amber-200 bg-amber-50' : 'border-emerald-200 bg-emerald-50'}`}>
        <h3 class="font-semibold">Parser safety warnings, last 24h</h3><p class="mt-1 text-sm"><b>{dashboard.operationsHealth.parserWarnings24h}</b> incomplete or unidentified parser results.</p>
        {#if dashboard.operationsHealth.latestParserWarningEventId}<p class="mt-2 text-sm"><a class="font-semibold underline" href={`/mgmt-dashboard/email-automation/${dashboard.operationsHealth.latestParserWarningEventId}`}>Open latest warning</a>{dashboard.operationsHealth.latestParserWarningAt ? ` from ${when(dashboard.operationsHealth.latestParserWarningAt)}` : ''}. Keep financial work in review and inspect the original email. Never manually promote incomplete MIME.</p>{/if}
      </article>
      <article class="rounded-2xl border border-sky-200 bg-sky-50 p-4 lg:col-span-2"><h3 class="font-semibold text-sky-950">Automatic retries: not configured</h3><p class="mt-1 text-sm text-sky-950">Email intake and manager recovery work now. There is no automatic retry timer, so due work remains visible here and event pages show the available manual controls. If automatic retries are later approved, Vercel Cron every five minutes is the recommended option. It would process retries only and could not unlock Ledger.</p></article>
    </div>
  </details>

  <!-- Durable in-product roadmap so operational gaps do not depend on external documentation. -->
  <details class="group rounded-3xl border border-[#dfd2c5] bg-white shadow-sm" open>
    <summary class="flex cursor-pointer list-none items-center justify-between px-5 py-4">
      <div>
        <span class="font-semibold">Safety gaps and implementation roadmap</span>
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

  <!-- Classifier rules (compact data table with expandable rows) -->
  <details class="group rounded-3xl border border-[#dfd2c5] bg-white shadow-sm" open>
    <summary class="flex cursor-pointer list-none items-center justify-between px-5 py-4">
      <div>
        <span class="font-semibold">Classifier rules</span>
        <span class="ml-3 text-xs text-[#7a6550]">{dashboard.rules.filter(r => r.enabled).length} active · {dashboard.rules.filter(r => !r.enabled).length} disabled</span>
      </div>
      <ChevronDown size={18} class="text-[#7a6550] transition-transform group-open:rotate-180" />
    </summary>
    <div class="border-t border-[#eee5dc]">
      {#if dashboard.rules.length === 0}
        <p class="px-5 py-8 text-sm text-[#7a6550]">No DB rules yet. The classifier is using built-in fallbacks only.</p>
      {:else}
        <!-- Header row -->
        <div class="hidden grid-cols-[2.5rem_1fr_9rem_7rem_8rem] items-center gap-2 border-b border-[#eee5dc] bg-[#fbf8f4] px-5 py-2 text-xs font-bold uppercase tracking-wider text-[#7a6550]/70 md:grid">
          <span></span><span>Name</span><span>Class · subtype</span><span>Handler</span><span class="text-right">Actions</span>
        </div>
        {#each dashboard.rules as rule, i (rule.id)}
          <div class="border-b border-[#eee5dc] last:border-b-0">
            <!-- Collapsed row -->
            <div class="grid grid-cols-[2.5rem_1fr_auto] items-center gap-2 px-5 py-3 md:grid-cols-[2.5rem_1fr_9rem_7rem_8rem]">
              <button class="flex h-6 w-6 items-center justify-center rounded-full text-[#7a6550] hover:bg-[#efe6dc]" onclick={() => toggleRuleExpand(rule.id)} aria-label="Expand rule">
                <ChevronDown size={16} class={`transition-transform ${expandedRules[rule.id] ? 'rotate-180' : ''}`} />
              </button>
              <div class="min-w-0">
                <p class="truncate text-sm font-medium text-[#2c2925]">{rule.priority}. {rule.name}</p>
                <p class="truncate text-xs text-[#7a6550] md:hidden">{rule.classification} · {human(rule.subtype)}</p>
              </div>
              <div class="hidden md:block">
                <span class={`inline-block rounded-full border px-2 py-0.5 text-xs font-semibold ${classBadge(rule.classification)}`}>{rule.classification}</span>
                <span class="ml-1 text-xs text-[#7a6550]">{human(rule.subtype)}</span>
              </div>
              <div class="hidden md:block">
                <code class="rounded bg-[#f3ebe2] px-1.5 py-0.5 text-xs">{rule.handlerKey}</code>
              </div>
              <div class="flex items-center justify-end gap-1.5">
                <button class="rounded-full border border-[#eee5dc] px-2 py-1 text-xs font-medium text-[#7a6550] hover:bg-[#efe6dc] disabled:opacity-30" onclick={() => onMoveRule(rule.id, 'up', rule.name)} disabled={i === 0} aria-label="Move up">↑</button>
                <button class="rounded-full border border-[#eee5dc] px-2 py-1 text-xs font-medium text-[#7a6550] hover:bg-[#efe6dc] disabled:opacity-30" onclick={() => onMoveRule(rule.id, 'down', rule.name)} disabled={i === dashboard.rules.length - 1} aria-label="Move down">↓</button>
                <button class={`rounded-full border px-2.5 py-1 text-xs font-semibold transition ${rule.enabled ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'border-slate-200 bg-slate-100 text-slate-500 hover:bg-slate-200'}`} onclick={() => onToggleRule(rule.id, rule.name)}>{rule.enabled ? 'On' : 'Off'}</button>
                <button class="rounded-full border border-[#eee5dc] px-2.5 py-1 text-xs font-medium text-[#7a6550] hover:bg-[#efe6dc] disabled:opacity-30 disabled:hover:bg-white" onclick={() => onSendTestRule(rule.id)} disabled={!rule.hasDummyInput || !rule.preview}>Test</button>
              </div>
            </div>
            <!-- Expanded detail -->
            {#if expandedRules[rule.id]}
              <div class="grid gap-4 bg-[#fbf8f4] px-5 py-4 md:grid-cols-2">
                <div class="space-y-2">
                  <div class="flex flex-wrap gap-2 text-xs">
                    <span class={`rounded-full border px-2 py-0.5 font-semibold ${classBadge(rule.classification)}`}>{rule.classification}</span>
                    <span class="rounded-full border border-[#eee5dc] bg-white px-2 py-0.5 text-[#7a6550]">{human(rule.subtype)}</span>
                    <span class="rounded-full border border-[#eee5dc] bg-white px-2 py-0.5 text-[#7a6550]">handler: <code>{rule.handlerKey}</code></span>
                    <span class="rounded-full border border-[#eee5dc] bg-white px-2 py-0.5 text-[#7a6550]">notify: {rule.notifyPolicy}</span>
                  </div>
                  <p class="text-xs text-[#7a6550]">{patternSummary(rule)}</p>
                  {#if rule.preview}
                    <div class="rounded-xl border border-[#3a3329] bg-[#1f1b17] p-3 text-xs leading-5 text-[#f8f3ed]">{@html rule.preview}</div>
                  {:else}
                    <p class="rounded-xl border border-dashed border-[#eee5dc] bg-white p-3 text-xs text-[#7a6550]">{rule.previewNote ?? 'No preview available.'}</p>
                  {/if}
                </div>
                <div class="space-y-2 text-xs text-[#7a6550]">
                  <p>{rule.hasDummyInput ? 'Preview rendered from the rule\'s stored dummy_input using the same code as production.' : 'Add a dummy_input to enable preview and test-send.'}</p>
                  <p>Send test posts a demo message to the Telegram group with a TEST banner. It does not create a Ledger page or email event.</p>
                  <button class="rounded-full border border-[#d9d0c7] bg-white px-3 py-1.5 text-xs font-medium text-[#5c4a3d] hover:bg-[#efe6dc] disabled:opacity-30" onclick={() => onSendTestRule(rule.id)} disabled={!rule.hasDummyInput || !rule.preview}>Send test to Telegram</button>
                </div>
              </div>
            {/if}
          </div>
        {/each}
      {/if}
    </div>
  </details>

  <!-- Built-in classifiers -->
  <details class="group rounded-3xl border border-[#dfd2c5] bg-white shadow-sm">
    <summary class="flex cursor-pointer list-none items-center justify-between px-5 py-4">
      <div>
        <span class="font-semibold">Built-in fallback classifiers</span>
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
      <span class="font-semibold">Default Telegram message preview</span>
      <ChevronDown size={18} class="text-[#7a6550] transition-transform group-open:rotate-180" />
    </summary>
    <div class="border-t border-[#eee5dc] px-5 py-4">
      <p class="mb-3 text-sm text-[#7a6550]">A sample ready expense rendered with the same modular templates as production.</p>
      <div class="rounded-xl border border-[#3a3329] bg-[#1f1b17] p-4 text-sm leading-6 text-[#f8f3ed]">{@html dashboard.notificationPreview}</div>
    </div>
  </details>

  <!-- Classification outcomes -->
  <div class="grid gap-4 xl:grid-cols-2">
    <details class="group rounded-3xl border border-[#dfd2c5] bg-white shadow-sm" open>
      <summary class="flex cursor-pointer list-none items-center justify-between px-5 py-4">
        <span class="font-semibold">Recent classification outcomes</span>
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
        <span class="font-semibold">Rule and handler activity</span>
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

  <!-- Recent events (ignored hidden behind toggle) -->
  <section class="overflow-hidden rounded-3xl border border-[#dfd2c5] bg-white shadow-sm">
    <div class="flex items-center justify-between border-b border-[#dfd2c5] px-5 py-4">
      <span class="font-semibold">Recent email events</span>
      {#if ignoredEvents.length > 0}
        <label class="flex cursor-pointer items-center gap-2 text-xs font-medium text-[#7a6550]">
          <input type="checkbox" bind:checked={showIgnored} />
          Show ignored ({ignoredEvents.length})
        </label>
      {/if}
    </div>
    {#if visibleEvents.length === 0}
      <p class="px-5 py-10 text-sm text-[#7a6550]">No email events{showIgnored ? '' : ' (ignored hidden)'}.</p>
    {:else}
      <div class="overflow-x-auto"><table class="w-full text-left text-sm"><thead class="bg-[#fbf8f4] text-xs uppercase tracking-wider text-[#7a6550]"><tr><th class="px-5 py-3">Received</th><th class="px-5 py-3">Email</th><th class="px-5 py-3">Classification</th><th class="px-5 py-3">State</th><th class="px-5 py-3">Notification</th><th class="px-5 py-3"></th></tr></thead><tbody>
        {#each visibleEvents as event}<tr class="border-t border-[#eee5dc]"><td class="px-5 py-4 whitespace-nowrap">{when(event.receivedAt)}</td><td class="px-5 py-4"><p class="font-medium text-[#2c2925]">{event.subject}</p><p class="mt-1 text-xs text-[#7a6550]">{event.fromAddress}</p></td><td class="px-5 py-4">{event.subtype.replaceAll('_', ' ')}</td><td class="px-5 py-4"><span class={`rounded-full border px-2.5 py-1 text-xs font-bold ${stateClass(event.processingState)}`}>{event.processingState}</span></td><td class="px-5 py-4">{event.notificationState}</td><td class="px-5 py-4"><a class="font-medium text-[#6d4c35] underline" href={`/mgmt-dashboard/email-automation/${event.id}`}>Explain / act</a></td></tr>{/each}
      </tbody></table></div>
    {/if}
  </section>
</section>
