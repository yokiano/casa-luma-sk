<script lang="ts">
  import type { PageData } from './$types';
  let { data }: { data: PageData } = $props();

  const dateTime = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
  const when = (value: string | Date) => dateTime.format(new Date(value));
  const stateClass = (state: string) => state === 'ready'
    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
    : state === 'review'
      ? 'bg-amber-50 text-amber-800 border-amber-200'
      : 'bg-slate-50 text-slate-700 border-slate-200';
</script>

<section class="space-y-6">
  <div>
    <p class="text-sm font-bold uppercase tracking-[0.22em] text-[#7a6550]/55">Operations</p>
    <h1 class="mt-2 text-3xl font-semibold tracking-tight">Email automation</h1>
    <p class="mt-2 max-w-3xl text-sm leading-6 text-[#7a6550]">
      Selected financial emails are recorded here, classified, and sent to the email-automation Telegram group. Confirmed expenses will create a Company Ledger record; then staff attach the invoice or receipt image and complete any missing details. Unclear emails stay in review and do not create a Ledger record automatically.
    </p>
  </div>

  <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
    <div class="rounded-3xl border border-[#dfd2c5] bg-white p-5"><p class="text-xs font-bold uppercase tracking-wider text-[#7a6550]/60">Received</p><p class="mt-2 text-3xl font-semibold">{data.totals.total}</p></div>
    <div class="rounded-3xl border border-emerald-200 bg-emerald-50 p-5"><p class="text-xs font-bold uppercase tracking-wider text-emerald-800/60">Ready for ledger</p><p class="mt-2 text-3xl font-semibold text-emerald-900">{data.totals.ready}</p></div>
    <div class="rounded-3xl border border-amber-200 bg-amber-50 p-5"><p class="text-xs font-bold uppercase tracking-wider text-amber-800/60">Needs review</p><p class="mt-2 text-3xl font-semibold text-amber-900">{data.totals.review}</p></div>
    <div class="rounded-3xl border border-red-200 bg-red-50 p-5"><p class="text-xs font-bold uppercase tracking-wider text-red-800/60">Notification retry</p><p class="mt-2 text-3xl font-semibold text-red-900">{data.totals.failedNotification}</p></div>
  </div>

  <section class="rounded-3xl border border-[#dfd2c5] bg-white p-6 shadow-sm">
    <h2 class="text-lg font-semibold">Current classifications</h2>
    <div class="mt-4 grid gap-3 text-sm text-[#7a6550] md:grid-cols-2">
      <p><b class="text-[#2c2925]">Expenses:</b> K BIZ bill payment, other-bank transfer, and PromptPay success results. These are prepared for the Ledger handler.</p>
      <p><b class="text-[#2c2925]">Ignore:</b> matching “Approved” companion messages and security/admin mail. These are stored but do not notify.</p>
      <p><b class="text-[#2c2925]">Review:</b> unrecognised mail, failed K SHOP settlements, failed merchant fees, statements, and renewal notices. These notify the group.</p>
      <p><b class="text-[#2c2925]">Future:</b> DB-backed settings will make classifications, notification policy, and module handlers editable here.</p>
    </div>
  </section>

  <section class="overflow-hidden rounded-3xl border border-[#dfd2c5] bg-white shadow-sm">
    <div class="border-b border-[#dfd2c5] px-6 py-4"><h2 class="font-semibold">Recent email events</h2></div>
    {#if data.recent.length === 0}
      <p class="px-6 py-10 text-sm text-[#7a6550]">No email events yet. Once the migration is deployed, use a test fixture or forward an original sample email to see its result here.</p>
    {:else}
      <div class="overflow-x-auto"><table class="w-full text-left text-sm"><thead class="bg-[#fbf8f4] text-xs uppercase tracking-wider text-[#7a6550]"><tr><th class="px-5 py-3">Received</th><th class="px-5 py-3">Email</th><th class="px-5 py-3">Classification</th><th class="px-5 py-3">State</th><th class="px-5 py-3">Notification</th></tr></thead><tbody>
        {#each data.recent as event}<tr class="border-t border-[#eee5dc]"><td class="px-5 py-4 whitespace-nowrap">{when(event.receivedAt)}</td><td class="px-5 py-4"><p class="font-medium text-[#2c2925]">{event.subject}</p><p class="mt-1 text-xs text-[#7a6550]">{event.fromAddress}</p></td><td class="px-5 py-4">{event.subtype.replaceAll('_', ' ')}</td><td class="px-5 py-4"><span class={`rounded-full border px-2.5 py-1 text-xs font-bold ${stateClass(event.processingState)}`}>{event.processingState}</span></td><td class="px-5 py-4">{event.notificationState}</td></tr>{/each}
      </tbody></table></div>
    {/if}
  </section>
</section>
