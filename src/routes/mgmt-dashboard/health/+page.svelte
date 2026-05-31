<script lang="ts">
  import { getDatabaseHealth, getIncidentHealth, getMembershipCreationHealth, getReceiptFreshnessHealth, sendTestTelegramAlert } from '$lib/mgmt-dashboard.remote';
  import { AlertTriangle, CheckCircle2, Database, HeartPulse, IdCard, Loader2, Radio, Send } from 'lucide-svelte';

  const databaseHealth = getDatabaseHealth();
  const receiptFreshness = getReceiptFreshnessHealth();
  const membershipCreationHealth = getMembershipCreationHealth();
  const incidentHealth = getIncidentHealth();

  const testAlertTypes = [
    {
      value: 'generic',
      label: 'Generic incident',
      description: 'Basic dashboard Telegram plumbing test.'
    },
    {
      value: 'one_hour_not_converted',
      label: 'One hour not converted',
      description: 'Receipt violation with duration details.'
    },
    {
      value: 'discount_100_present',
      label: '100% discount used',
      description: 'Receipt alert for full discount usage.'
    },
    {
      value: 'discount_total_over_threshold',
      label: 'Discount over ฿400',
      description: 'Receipt alert for high total discount.'
    },
    {
      value: 'forced_test_failure',
      label: 'Forced test failure',
      description: 'Receipt validation forced-failure alert.'
    },
    {
      value: 'validation_engine_error',
      label: 'Validation engine error',
      description: 'Receipt validation exception alert.'
    }
  ];

  let testAlertLoading = $state<string | null>(null);
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

  const sendTestAlert = async (alertType: string) => {
    if (testAlertLoading) return;
    testAlertLoading = alertType;
    testAlertResult = null;
    testAlertError = null;

    const alertLabel = testAlertTypes.find((type) => type.value === alertType)?.label ?? 'Test alert';

    try {
      const result = await sendTestTelegramAlert({ alertType });
      testAlertResult = result.notified
        ? `${alertLabel} sent. Incident #${result.incidentId ?? 'unknown'} was recorded.`
        : `${alertLabel} incident recorded (#${result.incidentId ?? 'unknown'}), but Telegram was not notified. Check Telegram config / notify_error.`;
    } catch (error) {
      testAlertError = error instanceof Error ? error.message : 'Failed to send test alert.';
    } finally {
      testAlertLoading = null;
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

    <div class="rounded-2xl border border-[#dfd2c5] bg-white/70 px-4 py-3 text-xs text-[#7a6550] shadow-sm">
      Use the test buttons below to send dummy Telegram alerts.
    </div>
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

  <section class="rounded-3xl border border-[#dfd2c5] bg-white p-6 shadow-sm">
    <div class="flex items-start justify-between gap-4">
      <div>
        <p class="text-sm font-bold text-[#7a6550]">Telegram alert tests</p>
        <h2 class="mt-2 text-2xl font-semibold">Send dummy alert types</h2>
        <p class="mt-2 max-w-2xl text-sm text-[#7a6550]">
          These create real incident rows and send Telegram notifications, but the payload is clearly marked as a management-dashboard test.
        </p>
      </div>
      <Send class="text-[#7a6550]" size={24} />
    </div>

    <div class="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {#each testAlertTypes as alertType}
        <button
          type="button"
          class="rounded-2xl border border-[#dfd2c5] bg-[#fffaf4] p-4 text-left shadow-sm transition hover:border-[#b99f86] hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
          onclick={() => sendTestAlert(alertType.value)}
          disabled={Boolean(testAlertLoading)}
        >
          <span class="flex items-center gap-2 text-sm font-bold text-[#2c2925]">
            {#if testAlertLoading === alertType.value}
              <Loader2 class="animate-spin text-[#7a6550]" size={16} />
            {:else}
              <Send class="text-[#7a6550]" size={16} />
            {/if}
            {alertType.label}
          </span>
          <span class="mt-2 block text-xs leading-relaxed text-[#7a6550]">{alertType.description}</span>
        </button>
      {/each}
    </div>
  </section>

  <div class="grid gap-4 xl:grid-cols-2 2xl:grid-cols-4">
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
          <p class="text-sm font-bold text-[#7a6550]">Flexi & memberships</p>
          <h2 class="mt-2 text-2xl font-semibold">Creation flow</h2>
        </div>
        <IdCard class="text-[#7a6550]" size={24} />
      </div>

      {#if membershipCreationHealth.loading}
        <div class="mt-6 flex items-center gap-2 text-sm text-[#7a6550]"><Loader2 class="animate-spin" size={16} /> Checking…</div>
      {:else if membershipCreationHealth.error}
        <div class="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">Remote function failed.</div>
      {:else}
        {@const check = membershipCreationHealth.current}
        <div class={`mt-6 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold ${statusClasses(check?.status)}`}>
          {#if check?.ok}<CheckCircle2 size={14} />{:else}<AlertTriangle size={14} />{/if}
          {check?.totalCreated ?? 0} created in last {check?.windowDays ?? 7} days
        </div>
        <p class="mt-4 text-sm leading-relaxed text-[#7a6550]">
          {#if check?.ok}
            Membership or Flexi Passes records were created recently, so the automation/business flow appears active.
          {:else}
            No membership or Flexi Passes records were created recently. The automation/business flow may need checking.
          {/if}
        </p>
        <dl class="mt-5 space-y-3 text-sm">
          <div class="flex justify-between gap-4"><dt class="text-[#7a6550]">Flexi Passes records</dt><dd class="font-semibold">{check?.flexiCreated ?? 0}</dd></div>
          <div class="flex justify-between gap-4"><dt class="text-[#7a6550]">Memberships records</dt><dd class="font-semibold">{check?.membershipCreated ?? 0}</dd></div>
          <div class="flex justify-between gap-4"><dt class="text-[#7a6550]">Latest created</dt><dd class="font-semibold">{formatDateTime(check?.latestCreatedAt)}</dd></div>
          <div class="flex justify-between gap-4"><dt class="text-[#7a6550]">Elapsed</dt><dd class="font-semibold">{check?.elapsedMs ?? 0}ms</dd></div>
        </dl>
        {#if check?.latestRecord}
          <a href={check.latestRecord.url} target="_blank" rel="noreferrer" class="mt-5 block rounded-2xl bg-[#f6f1eb] p-4 text-xs text-[#7a6550] transition hover:bg-[#efe6dc]">
            Latest: <b>{check.latestRecord.name}</b> · {check.latestRecord.kind === 'flexi-pass' ? 'Flexi Passes' : 'Memberships'} · {check.latestRecord.type ?? 'No type'}
          </a>
        {/if}
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
