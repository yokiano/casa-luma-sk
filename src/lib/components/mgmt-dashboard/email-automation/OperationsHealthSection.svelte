<script lang="ts">
  import { Activity, ChevronDown } from 'lucide-svelte';
  import type { OperationsHealth } from '$lib/server/email-automation/dashboard';
  import { formatAge, formatDateTime } from './presentation';

  let { health }: { health: OperationsHealth } = $props();
  const staleCount = $derived(health.staleActionLeases + health.staleNotificationLeases);
  const failedCount = $derived(health.failedActions + health.failedNotifications);
</script>

<!-- Durable queue state only. No scheduler heartbeat is inferred from event timestamps. -->
<details class="group rounded-3xl border border-[#dfd2c5] bg-white shadow-sm">
  <summary class="flex cursor-pointer list-none items-center justify-between px-5 py-4">
    <div class="flex items-center gap-2"><Activity size={18} /><span class="font-semibold">Operations health</span><span class="ml-1 text-xs text-[#7a6550]">live database state</span></div>
    <ChevronDown size={18} class="text-[#7a6550] transition-transform group-open:rotate-180" />
  </summary>
  <div class="grid gap-3 border-t border-[#eee5dc] p-5 lg:grid-cols-2">
    <article class={`rounded-2xl border p-4 ${health.oldestDueAt ? 'border-amber-200 bg-amber-50' : 'border-emerald-200 bg-emerald-50'}`}>
      <h3 class="font-semibold">Due work</h3>
      {#if health.oldestDueAt}<p class="mt-1 text-sm"><b>Oldest due: {formatAge(health.oldestDueAt)}</b> ({formatDateTime(health.oldestDueAt)}).</p><p class="mt-2 text-sm">This item is waiting for processing. Automatic retries are not configured, so open its event and use the recovery control shown there. Ledger retries still require the same canary gates as intake.</p>{:else}<p class="mt-1 text-sm">No action or Telegram item is currently overdue. Processing is manual until an automatic scheduler is configured.</p>{/if}
    </article>
    <article class={`rounded-2xl border p-4 ${staleCount ? 'border-red-200 bg-red-50' : 'border-emerald-200 bg-emerald-50'}`}>
      <h3 class="font-semibold">Interrupted work reservations</h3><p class="mt-1 text-sm"><b>{staleCount}</b> active past their expiry ({health.staleActionLeases} actions, {health.staleNotificationLeases} notifications).</p>
      {#if staleCount}<p class="mt-2 text-sm">A processor reserved this work but did not finish. Do not treat it as completed. Open the affected event and use the available recovery control after confirming the result.</p>{/if}
    </article>
    <article class={`rounded-2xl border p-4 ${failedCount ? 'border-red-200 bg-red-50' : 'border-emerald-200 bg-emerald-50'}`}>
      <h3 class="font-semibold">Exhausted retries</h3><p class="mt-1 text-sm"><b>{failedCount}</b> terminal ({health.failedActions} actions, {health.failedNotifications} notifications).</p>
      {#if health.failedActions}<p class="mt-2 text-sm">Open each event and inspect attempts. Reconcile before retry when duplicate external creation is possible.</p>{/if}{#if health.failedNotifications}<p class="mt-2 text-sm">Confirm Telegram configuration, then use “Retry Telegram only”. It cannot rerun the external action.</p>{/if}
    </article>
    <article class={`rounded-2xl border p-4 ${health.parserWarnings24h ? 'border-amber-200 bg-amber-50' : 'border-emerald-200 bg-emerald-50'}`}>
      <h3 class="font-semibold">Parser safety warnings, last 24h</h3><p class="mt-1 text-sm"><b>{health.parserWarnings24h}</b> incomplete or unidentified parser results.</p>
      {#if health.latestParserWarningEventId}<p class="mt-2 text-sm"><a class="font-semibold underline" href={`/mgmt-dashboard/email-automation/${health.latestParserWarningEventId}`}>Open latest warning</a>{health.latestParserWarningAt ? ` from ${formatDateTime(health.latestParserWarningAt)}` : ''}. Keep financial work in review and inspect the original email. Never manually promote incomplete MIME.</p>{/if}
    </article>
    <article class="rounded-2xl border border-sky-200 bg-sky-50 p-4 lg:col-span-2"><h3 class="font-semibold text-sky-950">Automatic retries: not configured</h3><p class="mt-1 text-sm text-sky-950">Email intake and manager recovery work now. There is no automatic retry timer, so due work remains visible here and event pages show the available manual controls. If automatic retries are later approved, Vercel Cron every five minutes is the recommended option. It would process retries only and could not unlock Ledger.</p></article>
  </div>
</details>
