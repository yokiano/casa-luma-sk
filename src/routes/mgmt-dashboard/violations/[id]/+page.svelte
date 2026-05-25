<script lang="ts">
  let { data } = $props();

  const pretty = (value: unknown) => JSON.stringify(value, null, 2);

  const formatDate = (value: string | Date | null) => {
    if (!value) return '-';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString();
  };
</script>

<svelte:head>
  <title>Violation Incident #{data.incident.id} · Mgmt Dashboard</title>
</svelte:head>

<section class="space-y-6">
  <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
    <div>
      <p class="text-sm font-bold uppercase tracking-[0.22em] text-[#7a6550]/55">Violation incident</p>
      <h1 class="mt-2 text-3xl font-semibold tracking-tight text-[#2c2925]">Incident #{data.incident.id}</h1>
    </div>
    <div class="flex gap-3 text-sm">
      <a class="font-semibold text-[#7a6550] underline" href="/mgmt-dashboard/violations">Back to violations</a>
      <a class="font-semibold text-[#7a6550] underline" href={`/tools/incidents/${data.incident.id}`}>Old tools view</a>
    </div>
  </div>

  {#if data.violations.length}
    <div class="grid gap-3 md:grid-cols-2">
      {#each data.violations as violation}
        <article class="rounded-2xl border border-[#dfd2c5] bg-white p-4 shadow-sm">
          <h2 class="font-bold text-[#2c2925]">{violation.label}</h2>
          <p class="mt-1 font-mono text-xs text-[#7a6550]">{violation.code}</p>
          <p class="mt-2 text-sm text-[#5c4a3d]">{violation.description}</p>
          <p class="mt-2 text-xs text-[#7a6550]/80"><b>Protects from:</b> {violation.protectsFrom}</p>
        </article>
      {/each}
    </div>
  {/if}

  <article class="space-y-4 rounded-3xl border border-[#d3c5b8] bg-white p-5 shadow-sm">
    <div class="grid gap-3 text-sm text-[#5c4a3d] sm:grid-cols-2">
      <p><span class="font-semibold text-[#2c2925]">Top-level code:</span> {data.incident.code}</p>
      <p><span class="font-semibold text-[#2c2925]">Severity:</span> {data.incident.severity}</p>
      <p><span class="font-semibold text-[#2c2925]">Source:</span> {data.incident.source}</p>
      <p><span class="font-semibold text-[#2c2925]">Created:</span> {formatDate(data.incident.createdAt)}</p>
      <p><span class="font-semibold text-[#2c2925]">Receipt key:</span> {data.incident.receiptKey ?? '—'}</p>
      <p><span class="font-semibold text-[#2c2925]">Merchant:</span> {data.incident.merchantId ?? '—'}</p>
      <p><span class="font-semibold text-[#2c2925]">Notified:</span> {data.incident.notified ? 'yes' : 'no'}</p>
      <p><span class="font-semibold text-[#2c2925]">Notified at:</span> {formatDate(data.incident.notifiedAt)}</p>
    </div>

    <div>
      <p class="text-xs font-semibold uppercase tracking-wider text-[#7a6550]/70">Message</p>
      <p class="mt-1 text-sm text-[#2c2925]">{data.incident.message}</p>
    </div>

    {#if data.incident.notifyError}
      <div class="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
        Notification error: {data.incident.notifyError}
      </div>
    {/if}

    <div>
      <p class="text-xs font-semibold uppercase tracking-wider text-[#7a6550]/70">Context</p>
      <pre class="mt-2 overflow-x-auto rounded-xl bg-[#f8f3ec] p-3 text-xs text-[#3f342c]">{pretty(data.incident.context)}</pre>
    </div>

    <div>
      <p class="text-xs font-semibold uppercase tracking-wider text-[#7a6550]/70">Payload</p>
      <pre class="mt-2 overflow-x-auto rounded-xl bg-[#f8f3ec] p-3 text-xs text-[#3f342c]">{pretty(data.incident.payload)}</pre>
    </div>

    {#if data.incident.errorMessage || data.incident.errorStack}
      <div>
        <p class="text-xs font-semibold uppercase tracking-wider text-[#7a6550]/70">Error</p>
        <pre class="mt-2 overflow-x-auto rounded-xl bg-[#f8f3ec] p-3 text-xs text-[#3f342c]">{pretty({
          name: data.incident.errorName,
          message: data.incident.errorMessage,
          stack: data.incident.errorStack
        })}</pre>
      </div>
    {/if}
  </article>
</section>
