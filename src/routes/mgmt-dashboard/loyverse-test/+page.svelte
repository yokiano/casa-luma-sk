<script lang="ts">
  let { data } = $props();

  const dateTime = new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short'
  });

  const formatDate = (value: string | Date | null | undefined) => {
    if (!value) return '—';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '—' : dateTime.format(date);
  };

  const statusOrder = [
    'succeeded',
    'queued',
    'processing',
    'failed',
    'ambiguous',
    'unsupported',
    'not_selected',
    'skipped_refund',
    'skipped_cancelled',
    'source_changed'
  ] as const;

  const statusCounts = $derived(
    statusOrder
      .map((status) => ({ status, count: data.statusCounts[status] ?? 0 }))
      .filter((row) => row.count > 0)
      .concat(
        Object.entries(data.statusCounts)
          .filter(([status]) => !(statusOrder as readonly string[]).includes(status))
          .map(([status, count]) => ({ status, count }))
      )
  );

  const totalTracked = $derived(
    Object.values(data.statusCounts).reduce((sum, count) => sum + (count ?? 0), 0)
  );
</script>

<section class="space-y-6">
  <header class="space-y-2">
    <p class="text-sm font-bold uppercase tracking-[0.22em] text-[#7a6550]/55">Test environment</p>
    <h1 class="text-3xl font-semibold tracking-tight text-[#2c2925]">Second Loyverse mirror</h1>
    <p class="max-w-3xl text-sm leading-6 text-[#7a6550]">
      Status for receipt mirroring into the <span class="font-semibold text-[#2c2925]">second Loyverse account</span>
      (analysis / automation test POS). This is not production POS. Production receipts and webhooks stay on the primary account.
    </p>
  </header>

  <aside class="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-950 shadow-sm">
    <p class="font-semibold">Loyverse test environment — not production</p>
    <p class="mt-1">
      Target store uses <code class="rounded bg-amber-100/80 px-1.5 py-0.5 text-xs">LOYVERSE_2_*</code> credentials.
      Live webhook writes run only when <code class="rounded bg-amber-100/80 px-1.5 py-0.5 text-xs">LOYVERSE_2_MIRROR_ENABLED</code>
      is on. CLI backfill can write with <code class="rounded bg-amber-100/80 px-1.5 py-0.5 text-xs">forceProcess</code> while the live flag stays off.
    </p>
  </aside>

  <div class="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
    <article class="rounded-3xl border border-[#d3c5b8] bg-white p-5 shadow-sm">
      <p class="text-xs font-bold uppercase tracking-[0.18em] text-[#7a6550]/70">How save / mirror works</p>
      <ul class="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-[#5c4a3d]">
        <li>Eligible non-cancelled <span class="font-semibold">SALE</span> receipts only. Refunds and cancelled receipts are skipped.</li>
        <li>Deterministic ~50% cohort (<code class="text-xs">v1-sha256-50pct</code>); cohort decision is persisted and never recalculated.</li>
        <li>Live path: after production webhook processing, best-effort mirror if the live flag is enabled. Failures do not change the webhook response; Telegram only on live failures.</li>
        <li>Backfill CLI uses the same transfer service with <code class="text-xs">forceProcess</code>, so historical windows can run while live mirroring stays off.</li>
        <li>Unsupported cases (e.g. composite items, points discounts) are recorded as <code class="text-xs">unsupported</code>, not successes.</li>
      </ul>
    </article>

    <article class="rounded-3xl border border-[#d3c5b8] bg-white p-5 shadow-sm">
      <p class="text-xs font-bold uppercase tracking-[0.18em] text-[#7a6550]/70">Live gate</p>
      <dl class="mt-3 space-y-3 text-sm">
        <div class="flex items-center justify-between gap-4">
          <dt class="text-[#7a6550]">LOYVERSE_2_MIRROR_ENABLED</dt>
          <dd>
            <span
              class={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                data.mirrorEnabled
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-slate-100 text-slate-700'
              }`}
            >
              {data.mirrorEnabled ? 'on' : 'off'}
            </span>
          </dd>
        </div>
        <div class="flex items-center justify-between gap-4">
          <dt class="text-[#7a6550]">LOYVERSE_2 credentials</dt>
          <dd class="font-semibold text-[#2c2925]">
            {data.credentialsConfigured ? 'present' : 'missing'}
          </dd>
        </div>
        <div class="flex items-center justify-between gap-4">
          <dt class="text-[#7a6550]">Tracked transfer rows</dt>
          <dd class="font-semibold text-[#2c2925]">{totalTracked}</dd>
        </div>
      </dl>

      {#if statusCounts.length > 0}
        <div class="mt-4 flex flex-wrap gap-2">
          {#each statusCounts as row}
            <span class="rounded-full border border-[#e5d9cd] bg-[#faf7f3] px-2.5 py-1 text-xs font-medium text-[#5c4a3d]">
              {row.status}: {row.count}
            </span>
          {/each}
        </div>
      {/if}
    </article>
  </div>

  {#if data.dbError}
    <div class="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
      {data.dbError}
    </div>
  {/if}

  <section class="space-y-3">
    <div class="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 class="text-xl font-semibold tracking-tight text-[#2c2925]">Latest mirrored receipts</h2>
        <p class="text-sm text-[#7a6550]">
          Most recent <span class="font-semibold">succeeded</span> rows from
          <code class="text-xs">second_loyverse_receipt_transfers</code> (limit {data.recentLimit}).
        </p>
      </div>
    </div>

    {#if data.recentSucceeded.length === 0}
      <div class="rounded-2xl border border-[#d3c5b8] bg-white p-6 text-sm text-[#7a6550]">
        No succeeded mirrors recorded yet.
      </div>
    {:else}
      <div class="overflow-hidden rounded-2xl border border-[#d3c5b8] bg-white shadow-sm">
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-[#efe5db] text-sm">
            <thead class="bg-[#faf7f3] text-left text-xs uppercase tracking-wider text-[#7a6550]">
              <tr>
                <th class="px-4 py-3">Source receipt</th>
                <th class="px-4 py-3">Target receipt</th>
                <th class="px-4 py-3">Status</th>
                <th class="px-4 py-3">Attempts</th>
                <th class="px-4 py-3">Succeeded</th>
                <th class="px-4 py-3">Target date</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[#f1e8de]">
              {#each data.recentSucceeded as row}
                <tr>
                  <td class="px-4 py-3">
                    <div class="font-mono text-xs font-semibold text-[#2c2925]">{row.sourceReceiptNumber}</div>
                    <div class="mt-0.5 font-mono text-[11px] text-[#7a6550]">{row.sourceReceiptKey}</div>
                  </td>
                  <td class="px-4 py-3 font-mono text-xs font-semibold text-[#2c2925]">
                    {row.targetReceiptNumber ?? '—'}
                  </td>
                  <td class="px-4 py-3">
                    <span class="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-800">
                      {row.status}
                    </span>
                  </td>
                  <td class="px-4 py-3 text-[#5c4a3d]">{row.attemptCount}</td>
                  <td class="px-4 py-3 text-[#5c4a3d]">{formatDate(row.succeededAt)}</td>
                  <td class="px-4 py-3 text-[#5c4a3d]">{formatDate(row.targetReceiptDate)}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </div>
    {/if}
  </section>
</section>
