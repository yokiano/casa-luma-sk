<script lang="ts">
  import { Mail } from 'lucide-svelte';
  import type { DashboardData } from '$lib/server/email-automation/dashboard';

  let {
    events,
    onQuickReview
  }: {
    events: DashboardData['recent'];
    onQuickReview: (eventId: number) => void;
  } = $props();

  let showIgnored = $state(false);
  const ignoredEvents = $derived(events.filter((event) => event.processingState === 'ignored'));
  const visibleEvents = $derived(showIgnored ? events : events.filter((event) => event.processingState !== 'ignored'));

  const dateTime = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
  const when = (value: string | Date) => dateTime.format(new Date(value));
  const stateClass = (state: string) => state === 'ready' || state === 'ledger_created' || state === 'done'
    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
    : state === 'review' || state === 'waiting' || state === 'in_progress'
      ? 'bg-amber-50 text-amber-800 border-amber-200'
      : state === 'retry_pending' || state === 'failed'
        ? 'bg-red-50 text-red-800 border-red-200'
        : 'bg-slate-50 text-slate-700 border-slate-200';
</script>

<!-- Recent events (ignored hidden behind toggle) -->
<section class="overflow-hidden rounded-3xl border border-[#dfd2c5] bg-white shadow-sm">
  <div class="flex items-center justify-between border-b border-[#dfd2c5] px-5 py-4">
    <span class="flex items-center gap-2 font-semibold"><Mail size={18} />Recent email events</span>
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
      {#each visibleEvents as event}<tr class="border-t border-[#eee5dc]"><td class="px-5 py-4 whitespace-nowrap">{when(event.receivedAt)}</td><td class="px-5 py-4"><p class="font-medium text-[#2c2925]">{event.subject}</p><p class="mt-1 text-xs text-[#7a6550]">{event.fromAddress}</p></td><td class="px-5 py-4">{event.subtype.replaceAll('_', ' ')}</td><td class="px-5 py-4"><span class={`rounded-full border px-2.5 py-1 text-xs font-bold ${stateClass(event.processingState)}`}>{event.processingState}</span></td><td class="px-5 py-4">{event.notificationState}</td><td class="px-5 py-4"><div class="flex items-center gap-3 whitespace-nowrap"><button type="button" class="font-medium text-[#6d4c35] underline" onclick={() => onQuickReview(event.id)}>Quick view</button><a class="font-medium text-[#6d4c35] underline" href={`/mgmt-dashboard/email-automation/${event.id}`}>Explain / act</a></div></td></tr>{/each}
    </tbody></table></div>
  {/if}
</section>
