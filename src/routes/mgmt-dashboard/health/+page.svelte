<script lang="ts">
  import { getDatabaseHealth, getIncidentHealth, getReceiptFreshnessHealth, sendTestTelegramAlert } from '$lib/mgmt-dashboard.remote';
  import { AlertTriangle, CheckCircle2, Database, HeartPulse, Loader2, Radio, Send } from 'lucide-svelte';

  const databaseHealth = getDatabaseHealth();
  const receiptFreshness = getReceiptFreshnessHealth();
  const incidentHealth = getIncidentHealth();

  let testAlertLoading = $state(false);
  let testAlertResult = $state<string | null>(null);
  let testAlertError = $state<string | null>(null);

  const dateTime = new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short'
  });

  const formatDateTime = (value: string | null | undefined) => {
    if (!value) return '—';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '—' : dateTime.format(date);
  };

  const formatAge = (minutes: number | null | undefined) => {
    if (minutes === null || minutes === undefined) return '—';
    if (minutes < 60) return `${minutes}m ago`;
    if (minutes < 60 * 24) return `${Math.round(minutes / 60)}h ago`;
    return `${Math.round(minutes / (60 * 24))}d ago`;
  };

  const statusClasses = (status: string | undefined) => {
    if (status === 'healthy') return 'border-emerald-200 bg-emerald-50 text-emerald-800';
    if (status === 'critical') return 'border-red-200 bg-red-50 text-red-800';
    return 'border-amber-200 bg-amber-50 text-amber-800';
  };

  const sendTestAlert = async () => {
    if (testAlertLoading) return;
    testAlertLoading = true;
    testAlertResult = null;
    testAlertError = null;

    try {
      const result = await sendTestTelegramAlert({});
      testAlertResult = result.notified
        ? `Telegram test sent. Incident #${result.incidentId ?? 'unknown'} was recorded.`
        : `Test incident recorded (#${result.incidentId ?? 'unknown'}), but Telegram was not notified. Check Telegram config / notify_error.`;
    } catch (error) {
      testAlertError = error instanceof Error ? error.message : 'Failed to send test alert.';
    } finally {
      testAlertLoading = false;
    }
  };
</script>

<section class="space-y-6">
  <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
    <div>
      <p class="text-sm font-bold uppercase tracking-[0.22em] text-[#7a6550]/55">Health checks</p>
      <h1 class="mt-2 text-3xl font-semibold tracking-tight text-[#2c2925]">Operational health</h1>
      <p class="mt-2 max-w-2xl text-sm text-[#7a6550]">
        Each card is loaded through Svelte remote functions, so slow checks do not block the whole dashboard.
      </p>
    </div>

    <button
      type="button"
      class="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#7a6550] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#654f3d] disabled:cursor-not-allowed disabled:opacity-60"
      onclick={sendTestAlert}
      disabled={testAlertLoading}
    >
      {#if testAlertLoading}
        <Loader2 class="animate-spin" size={18} />
        Sending…
      {:else}
        <Send size={18} />
        Send test Telegram alert
      {/if}
    </button>
  </div>

  {#if testAlertResult}
    <div class="rounded-3xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800">
      {testAlertResult}
    </div>
  {/if}
  {#if testAlertError}
    <div class="rounded-3xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-800">
      {testAlertError}
    </div>
  {/if}

  <div class="grid gap-4 xl:grid-cols-3">
    <article class="rounded-3xl border border-[#dfd2c5] bg-white p-6 shadow-sm">
      <div class="flex items-start justify-between gap-4">
        <div>
          <p class="text-sm font-bold text-[#7a6550]">Neon database</p>
          <h2 class="mt-2 text-2xl font-semibold">Connectivity/schema</h2>
        </div>
        <Database class="text-[#7a6550]" size={24} />
      </div>

      {#if databaseHealth.loading}
        <div class="mt-6 flex items-center gap-2 text-sm text-[#7a6550]"><Loader2 class="animate-spin" size={16} /> Checking…</div>
      {:else if databaseHealth.error}
        <div class="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">Remote function failed.</div>
      {:else}
        {@const check = databaseHealth.current}
        <div class={`mt-6 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold ${statusClasses(check?.status)}`}>
          {#if check?.ok}<CheckCircle2 size={14} />{:else}<AlertTriangle size={14} />{/if}
          {check?.status ?? 'unknown'}
        </div>
        <dl class="mt-5 space-y-3 text-sm">
          <div class="flex justify-between gap-4"><dt class="text-[#7a6550]">Connection env</dt><dd class="font-semibold">{check?.selectedConnectionEnv ?? '—'}</dd></div>
          <div class="flex justify-between gap-4"><dt class="text-[#7a6550]">Database</dt><dd class="font-semibold">{check?.database ?? '—'}</dd></div>
          <div class="flex justify-between gap-4"><dt class="text-[#7a6550]">Missing tables</dt><dd class="font-semibold">{check?.missingTables?.length ? check.missingTables.join(', ') : 'none'}</dd></div>
          <div class="flex justify-between gap-4"><dt class="text-[#7a6550]">Elapsed</dt><dd class="font-semibold">{check?.elapsedMs ?? 0}ms</dd></div>
        </dl>
      {/if}
    </article>

    <article class="rounded-3xl border border-[#dfd2c5] bg-white p-6 shadow-sm">
      <div class="flex items-start justify-between gap-4">
        <div>
          <p class="text-sm font-bold text-[#7a6550]">Receipts</p>
          <h2 class="mt-2 text-2xl font-semibold">Freshness</h2>
        </div>
        <Radio class="text-[#7a6550]" size={24} />
      </div>

      {#if receiptFreshness.loading}
        <div class="mt-6 flex items-center gap-2 text-sm text-[#7a6550]"><Loader2 class="animate-spin" size={16} /> Checking…</div>
      {:else if receiptFreshness.error}
        <div class="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">Remote function failed.</div>
      {:else}
        {@const check = receiptFreshness.current}
        <div class={`mt-6 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold ${statusClasses(check?.status)}`}>
          {#if check?.ok}<CheckCircle2 size={14} />{:else}<AlertTriangle size={14} />{/if}
          {check?.receiptsLast24h ?? 0} / {check?.threshold ?? 5} receipts in last 24h
        </div>
        <dl class="mt-5 space-y-3 text-sm">
          <div class="flex justify-between gap-4"><dt class="text-[#7a6550]">Latest receipt</dt><dd class="font-semibold">{formatDateTime(check?.latestCreatedAt)}</dd></div>
          <div class="flex justify-between gap-4"><dt class="text-[#7a6550]">Age</dt><dd class="font-semibold">{formatAge(check?.latestReceiptAgeMinutes)}</dd></div>
          <div class="flex justify-between gap-4"><dt class="text-[#7a6550]">Latest sync</dt><dd class="font-semibold">{formatDateTime(check?.latestSyncedAt)}</dd></div>
          <div class="flex justify-between gap-4"><dt class="text-[#7a6550]">All receipts</dt><dd class="font-semibold">{check?.totalReceipts ?? 0}</dd></div>
        </dl>
      {/if}
    </article>

    <article class="rounded-3xl border border-[#dfd2c5] bg-white p-6 shadow-sm">
      <div class="flex items-start justify-between gap-4">
        <div>
          <p class="text-sm font-bold text-[#7a6550]">Incidents</p>
          <h2 class="mt-2 text-2xl font-semibold">Validation alerts</h2>
        </div>
        <HeartPulse class="text-[#7a6550]" size={24} />
      </div>

      {#if incidentHealth.loading}
        <div class="mt-6 flex items-center gap-2 text-sm text-[#7a6550]"><Loader2 class="animate-spin" size={16} /> Checking…</div>
      {:else if incidentHealth.error}
        <div class="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">Remote function failed.</div>
      {:else}
        {@const check = incidentHealth.current}
        <div class={`mt-6 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold ${statusClasses(check?.status)}`}>
          {#if check?.ok}<CheckCircle2 size={14} />{:else}<AlertTriangle size={14} />{/if}
          {check?.criticalLast24h ?? 0} critical incidents / 24h
        </div>
        <dl class="mt-5 space-y-3 text-sm">
          <div class="flex justify-between gap-4"><dt class="text-[#7a6550]">Warnings / 24h</dt><dd class="font-semibold">{check?.warningLast24h ?? 0}</dd></div>
          <div class="flex justify-between gap-4"><dt class="text-[#7a6550]">Notify errors</dt><dd class="font-semibold">{check?.notifyErrorsOpen ?? 0}</dd></div>
          <div class="flex justify-between gap-4"><dt class="text-[#7a6550]">Last incident</dt><dd class="font-semibold">{formatDateTime(check?.lastIncidentAt)}</dd></div>
          <div class="flex justify-between gap-4"><dt class="text-[#7a6550]">Telegram vars</dt><dd class="font-semibold">{check?.telegram?.botToken?.present && check?.telegram?.chatId?.present ? 'configured' : 'missing'}</dd></div>
        </dl>
        {#if check?.latestIncident}
          <div class="mt-5 rounded-2xl bg-[#f6f1eb] p-4 text-xs text-[#7a6550]">
            Latest: <b>{check.latestIncident.code}</b> · {check.latestIncident.message}
          </div>
        {/if}
      {/if}
    </article>
  </div>
</section>
