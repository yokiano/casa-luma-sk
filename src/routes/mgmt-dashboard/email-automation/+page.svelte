<script lang="ts">
  import type { PageData } from './$types';
  let { data }: { data: PageData } = $props();

  const dateTime = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
  const when = (value: string | Date) => dateTime.format(new Date(value));
  const stateClass = (state: string) => state === 'ready' || state === 'ledger_created'
    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
    : state === 'review'
      ? 'bg-amber-50 text-amber-800 border-amber-200'
      : state === 'retry_pending'
        ? 'bg-red-50 text-red-800 border-red-200'
        : 'bg-slate-50 text-slate-700 border-slate-200';
  const activeRules = () => data.rules.filter((rule) => rule.enabled);
  const disabledRules = () => data.rules.filter((rule) => !rule.enabled);
  const human = (value: string | null | undefined) => value ? value.replaceAll('_', ' ') : 'built-in fallback';
  const patternSummary = (rule: PageData['rules'][number]) => [
    rule.senderPattern ? `from: ${rule.senderPattern}` : null,
    rule.subjectPattern ? `subject: ${rule.subjectPattern}` : null,
    Array.isArray(rule.bodyPatterns) && rule.bodyPatterns.length > 0 ? `body: ${rule.bodyPatterns.length} all-match` : null,
    rule.bodyPatterns && !Array.isArray(rule.bodyPatterns) && typeof rule.bodyPatterns === 'object' ? 'body: custom match' : null
  ].filter(Boolean).join(' · ') || 'No pattern restrictions';
</script>

<section class="space-y-6">
  <div>
    <p class="text-sm font-bold uppercase tracking-[0.22em] text-[#7a6550]/55">Operations</p>
    <h1 class="mt-2 text-3xl font-semibold tracking-tight">Email automation</h1>
    <p class="mt-2 max-w-3xl text-sm leading-6 text-[#7a6550]">
      Selected operational emails are recorded here, classified, and routed to the right automation handler. Some classifications only notify or review; Ledger creation is just one handler and stays disabled unless explicitly enabled. Unclear emails stay in review and do not run side effects automatically.
    </p>
  </div>

  <form method="POST" action="?/settings" class="rounded-3xl border border-[#dfd2c5] bg-white p-5 shadow-sm">
    <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div>
        <h2 class="font-semibold">Automation settings</h2>
        <p class="mt-1 text-sm text-[#7a6550]">Runtime switches stored in Neon. These replace deploy-time env toggles for normal operations.</p>
      </div>
      <button class="rounded-full bg-[#2c2925] px-4 py-2 text-sm font-semibold text-white hover:bg-[#4a4037]" type="submit">Save settings</button>
    </div>
    <div class="mt-4 grid gap-3 md:grid-cols-3">
      <label class="flex items-start gap-3 rounded-2xl border border-[#eee5dc] bg-[#fbf8f4] p-4 text-sm">
        <input class="mt-1" type="checkbox" name="automationEnabled" checked={data.settings.automationEnabled} />
        <span><b class="block text-[#2c2925]">Automation enabled</b><span class="text-[#7a6550]">When off, incoming emails are stored as ignored and no handlers run.</span></span>
      </label>
      <label class="flex items-start gap-3 rounded-2xl border border-[#eee5dc] bg-[#fbf8f4] p-4 text-sm">
        <input class="mt-1" type="checkbox" name="ledgerEnabled" checked={data.settings.ledgerEnabled} />
        <span><b class="block text-[#2c2925]">Ledger writes enabled</b><span class="text-[#7a6550]">Allows ready expense rules with the Ledger handler to create Financial Ledger rows.</span></span>
      </label>
      <label class="flex items-start gap-3 rounded-2xl border border-[#eee5dc] bg-[#fbf8f4] p-4 text-sm">
        <input class="mt-1" type="checkbox" name="notificationsEnabled" checked={data.settings.notificationsEnabled} />
        <span><b class="block text-[#2c2925]">Telegram notifications</b><span class="text-[#7a6550]">When off, events are stored but Telegram is not sent.</span></span>
      </label>
    </div>
  </form>

  <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
    <div class="rounded-3xl border border-[#dfd2c5] bg-white p-5"><p class="text-xs font-bold uppercase tracking-wider text-[#7a6550]/60">Received</p><p class="mt-2 text-3xl font-semibold">{data.totals.total}</p></div>
    <div class="rounded-3xl border border-emerald-200 bg-emerald-50 p-5"><p class="text-xs font-bold uppercase tracking-wider text-emerald-800/60">Ready for action</p><p class="mt-2 text-3xl font-semibold text-emerald-900">{data.totals.ready}</p></div>
    <div class="rounded-3xl border border-amber-200 bg-amber-50 p-5"><p class="text-xs font-bold uppercase tracking-wider text-amber-800/60">Needs review</p><p class="mt-2 text-3xl font-semibold text-amber-900">{data.totals.review}</p></div>
    <div class="rounded-3xl border border-slate-200 bg-slate-50 p-5"><p class="text-xs font-bold uppercase tracking-wider text-slate-700/60">Ignored</p><p class="mt-2 text-3xl font-semibold text-slate-900">{data.totals.ignored}</p></div>
  </div>

  <section class="rounded-3xl border border-[#dfd2c5] bg-white p-6 shadow-sm">
    <div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h2 class="text-lg font-semibold">Classifier overview</h2>
        <p class="mt-1 text-sm text-[#7a6550]">Enabled DB rules match first by priority. Built-in safe fallbacks still apply when no DB rule matches.</p>
      </div>
      <div class="flex gap-2 text-xs font-bold uppercase tracking-wider">
        <span class="rounded-full bg-emerald-50 px-3 py-1 text-emerald-800">{activeRules().length} active DB rules</span>
        <span class="rounded-full bg-slate-100 px-3 py-1 text-slate-700">{disabledRules().length} disabled</span>
      </div>
    </div>

    <div class="mt-5 grid gap-4 lg:grid-cols-2">
      <div class="rounded-2xl border border-[#eee5dc] p-4">
        <h3 class="font-semibold">DB-backed rules</h3>
        {#if data.rules.length === 0}
          <p class="mt-3 text-sm text-[#7a6550]">No DB rules yet. The classifier is using built-in fallbacks only.</p>
        {:else}
          <div class="mt-3 space-y-3">
            {#each data.rules as rule}
              <div class="rounded-2xl border border-[#eee5dc] bg-[#fbf8f4] p-3">
                <div class="flex items-start justify-between gap-3">
                  <div>
                    <p class="font-medium text-[#2c2925]">{rule.priority}. {rule.name}</p>
                    <p class="mt-1 text-xs text-[#7a6550]">{rule.classification} · {human(rule.subtype)} · handler: {rule.handlerKey}</p>
                  </div>
                  <span class={`rounded-full px-2.5 py-1 text-xs font-bold ${rule.enabled ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>{rule.enabled ? 'enabled' : 'disabled'}</span>
                </div>
                <p class="mt-2 text-xs text-[#7a6550]">{patternSummary(rule)}</p>
                <p class="mt-1 text-xs text-[#7a6550]">Notify: {rule.notifyPolicy}</p>
              </div>
            {/each}
          </div>
        {/if}
      </div>

      <div class="rounded-2xl border border-[#eee5dc] p-4">
        <h3 class="font-semibold">Built-in fallback rules</h3>
        <div class="mt-3 grid gap-3 text-sm text-[#7a6550]">
          <p><b class="text-[#2c2925]">Expenses:</b> K BIZ bill payment, other-bank transfer, and PromptPay success results. These route to the Ledger handler only when Ledger is enabled.</p>
          <p><b class="text-[#2c2925]">Ignore:</b> matching “Approved” companion messages and security/admin mail. These are stored but do not notify.</p>
          <p><b class="text-[#2c2925]">Review:</b> unrecognised mail, failed K SHOP settlements, failed merchant fees, statements, and renewal notices. These notify the group.</p>
          <p><b class="text-[#2c2925]">Generic routing:</b> classifier results carry classification, subtype, notification policy, and handler key so non-Ledger operations can be added without changing the Worker.</p>
        </div>
      </div>
    </div>
  </section>

  <section class="rounded-3xl border border-[#dfd2c5] bg-white p-6 shadow-sm">
    <h2 class="font-semibold">Telegram message preview</h2>
    <p class="mt-1 text-sm text-[#7a6550]">Preview uses the same renderer as production notifications. Templates are currently code-backed; moving template bodies to Neon is the recommended next step when copy needs to change without deploys.</p>
    <pre class="mt-4 whitespace-pre-wrap rounded-2xl bg-[#1f1b17] p-4 text-sm leading-6 text-[#f8f3ed]">{data.notificationPreview}</pre>
  </section>

  <div class="grid gap-4 xl:grid-cols-2">
    <section class="rounded-3xl border border-[#dfd2c5] bg-white p-6 shadow-sm">
      <h2 class="font-semibold">Recent classification outcomes</h2>
      {#if data.subtypes.length === 0}
        <p class="mt-4 text-sm text-[#7a6550]">No classified events yet.</p>
      {:else}
        <div class="mt-4 overflow-x-auto"><table class="w-full text-left text-sm"><thead class="bg-[#fbf8f4] text-xs uppercase tracking-wider text-[#7a6550]"><tr><th class="px-4 py-3">Subtype</th><th class="px-4 py-3">State</th><th class="px-4 py-3">Count</th><th class="px-4 py-3">Latest</th></tr></thead><tbody>
          {#each data.subtypes as row}<tr class="border-t border-[#eee5dc]"><td class="px-4 py-3"><p class="font-medium text-[#2c2925]">{human(row.subtype)}</p><p class="text-xs text-[#7a6550]">{row.classification}</p></td><td class="px-4 py-3"><span class={`rounded-full border px-2.5 py-1 text-xs font-bold ${stateClass(row.processingState)}`}>{row.processingState}</span></td><td class="px-4 py-3">{row.count}</td><td class="px-4 py-3 whitespace-nowrap">{when(row.latestReceivedAt)}</td></tr>{/each}
        </tbody></table></div>
      {/if}
    </section>

    <section class="rounded-3xl border border-[#dfd2c5] bg-white p-6 shadow-sm">
      <h2 class="font-semibold">Rule and handler activity</h2>
      {#if data.handlers.length === 0}
        <p class="mt-4 text-sm text-[#7a6550]">No DB-backed rule matches recorded yet. Built-in fallback matches are shown as fallback activity.</p>
      {:else}
        <div class="mt-4 overflow-x-auto"><table class="w-full text-left text-sm"><thead class="bg-[#fbf8f4] text-xs uppercase tracking-wider text-[#7a6550]"><tr><th class="px-4 py-3">Rule</th><th class="px-4 py-3">Handler</th><th class="px-4 py-3">Count</th><th class="px-4 py-3">Latest</th></tr></thead><tbody>
          {#each data.handlers as row}<tr class="border-t border-[#eee5dc]"><td class="px-4 py-3">{row.matchedRuleName ?? 'built-in fallback'}</td><td class="px-4 py-3">{row.handlerKey ?? 'none'}</td><td class="px-4 py-3">{row.count}</td><td class="px-4 py-3 whitespace-nowrap">{when(row.latestReceivedAt)}</td></tr>{/each}
        </tbody></table></div>
      {/if}
    </section>
  </div>

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
