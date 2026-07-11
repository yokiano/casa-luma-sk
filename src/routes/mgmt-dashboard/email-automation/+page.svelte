<script lang="ts">
  import type { ActionData, PageData } from './$types';
  let { data, form }: { data: PageData; form: ActionData } = $props();

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

  const testResultMessage = () => {
    if (!form || form.action !== 'sendTest') return null;
    if (!form.ok) return { ok: false, text: form.error ?? 'Test send failed.' };
    if (form.sent === 'not_configured') return { ok: false, text: `Telegram not configured (missing bot token or chat id). Test for "${form.target}" was not sent.` };
    return { ok: true, text: `Test message sent to Telegram for "${form.target}".` };
  };
</script>

<section class="space-y-6">
  <div>
    <p class="text-sm font-bold uppercase tracking-[0.22em] text-[#7a6550]/55">Operations</p>
    <h1 class="mt-2 text-3xl font-semibold tracking-tight">Email automation</h1>
    <p class="mt-2 max-w-3xl text-sm leading-6 text-[#7a6550]">
      Selected operational emails are recorded here, classified, and routed to the right automation handler. Some classifications only notify or review; Ledger creation is just one handler and stays disabled unless explicitly enabled. Unclear emails stay in review and do not run side effects automatically.
    </p>
  </div>

  {#if testResultMessage()}
    <div class={`rounded-2xl border p-4 text-sm ${testResultMessage()!.ok ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-800'}`}>
      {testResultMessage()!.text}
    </div>
  {/if}

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
        <h2 class="text-lg font-semibold">Classifier rules</h2>
        <p class="mt-1 text-sm text-[#7a6550]">DB rules match first by priority. Enable, disable, and reorder them here. Each rule shows a Telegram preview rendered with the same code as production, and a Send test button that posts a demo message to the Telegram group.</p>
      </div>
      <div class="flex gap-2 text-xs font-bold uppercase tracking-wider">
        <span class="rounded-full bg-emerald-50 px-3 py-1 text-emerald-800">{activeRules().length} active</span>
        <span class="rounded-full bg-slate-100 px-3 py-1 text-slate-700">{disabledRules().length} disabled</span>
      </div>
    </div>

    {#if data.rules.length === 0}
      <p class="mt-5 text-sm text-[#7a6550]">No DB rules yet. Apply migration <code>0005</code> to seed the default rules, or insert rows manually. The classifier is using built-in fallbacks only until then.</p>
    {:else}
      <div class="mt-5 space-y-3">
        {#each data.rules as rule, i (rule.id)}
          <div class="rounded-2xl border border-[#eee5dc] bg-[#fbf8f4] p-4">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div class="min-w-0">
                <p class="font-medium text-[#2c2925]">{rule.priority}. {rule.name}</p>
                <p class="mt-1 text-xs text-[#7a6550]">{rule.classification} · {human(rule.subtype)} · handler: {rule.handlerKey} · notify: {rule.notifyPolicy}</p>
                <p class="mt-1 text-xs text-[#7a6550]">{patternSummary(rule)}</p>
              </div>
              <div class="flex items-center gap-2">
                <form method="POST" action="?/moveRule" class="contents"><input type="hidden" name="ruleId" value={rule.id} /><button class="rounded-full border border-[#eee5dc] bg-white px-2.5 py-1 text-xs font-semibold text-[#2c2925] hover:bg-[#eee5dc] disabled:opacity-40" name="direction" value="up" disabled={i === 0} aria-label="Move up">↑</button></form>
                <form method="POST" action="?/moveRule" class="contents"><input type="hidden" name="ruleId" value={rule.id} /><button class="rounded-full border border-[#eee5dc] bg-white px-2.5 py-1 text-xs font-semibold text-[#2c2925] hover:bg-[#eee5dc] disabled:opacity-40" name="direction" value="down" disabled={i === data.rules.length - 1} aria-label="Move down">↓</button></form>
                <form method="POST" action="?/toggleRule" class="contents">
                  <input type="hidden" name="ruleId" value={rule.id} />
                  <button class={`rounded-full px-3 py-1 text-xs font-semibold ${rule.enabled ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100' : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'}`} type="submit">{rule.enabled ? 'Enabled' : 'Disabled'}</button>
                </form>
              </div>
            </div>

            <div class="mt-3 grid gap-3 lg:grid-cols-2">
              <div>
                <p class="text-xs font-bold uppercase tracking-wider text-[#7a6550]/60">Telegram preview</p>
                {#if rule.preview}
                  <pre class="mt-2 whitespace-pre-wrap rounded-xl bg-[#1f1b17] p-3 text-xs leading-5 text-[#f8f3ed]">{rule.preview}</pre>
                {:else}
                  <p class="mt-2 rounded-xl border border-dashed border-[#eee5dc] bg-white p-3 text-xs text-[#7a6550]">{rule.previewNote ?? 'No preview available.'}</p>
                {/if}
              </div>
              <div class="flex flex-col justify-between gap-2">
                <p class="text-xs text-[#7a6550]">{rule.hasDummyInput ? 'Preview uses the rule\'s stored dummy_input.' : 'Add a dummy_input to enable preview and test-send.'}</p>
                <form method="POST" action="?/sendTest" class="contents">
                  <input type="hidden" name="scope" value="rule" />
                  <input type="hidden" name="ruleId" value={rule.id} />
                  <button class="self-start rounded-full bg-[#2c2925] px-4 py-2 text-xs font-semibold text-white hover:bg-[#4a4037] disabled:opacity-40" type="submit" disabled={!rule.hasDummyInput || !rule.preview}>Send test to Telegram</button>
                </form>
              </div>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </section>

  <section class="rounded-3xl border border-[#dfd2c5] bg-white p-6 shadow-sm">
    <div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h2 class="text-lg font-semibold">Built-in fallback classifiers</h2>
        <p class="mt-1 text-sm text-[#7a6550]">Code-backed matchers in <code>classifier.ts</code>. The deprecated ones are mirrored as DB rules above and run first; they stay here so previews/tests remain available and are slated for removal once the DB rules are proven. The two unrecognised fallbacks are not mirrored and remain the final catch-all.</p>
      </div>
    </div>

    <div class="mt-5 grid gap-3 lg:grid-cols-2">
      {#each data.builtinPreviews as entry (entry.key)}
        <div class="rounded-2xl border border-[#eee5dc] bg-[#fbf8f4] p-4">
          <div class="flex items-start justify-between gap-3">
            <div>
              <p class="font-medium text-[#2c2925]">{entry.label}</p>
              <p class="mt-1 text-xs text-[#7a6550]">{entry.classification} · {human(entry.subtype)}</p>
            </div>
            {#if entry.deprecated}
              <span class="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-800 border border-amber-200">deprecated</span>
            {:else}
              <span class="rounded-full bg-sky-50 px-2.5 py-1 text-xs font-bold text-sky-800 border border-sky-200">fallback</span>
            {/if}
          </div>
          <p class="mt-2 text-xs text-[#7a6550]">{entry.description}</p>
          <pre class="mt-2 whitespace-pre-wrap rounded-xl bg-[#1f1b17] p-3 text-xs leading-5 text-[#f8f3ed]">{entry.preview}</pre>
          <form method="POST" action="?/sendTest" class="mt-3 contents">
            <input type="hidden" name="scope" value="builtin" />
            <input type="hidden" name="key" value={entry.key} />
            <button class="rounded-full bg-[#2c2925] px-4 py-2 text-xs font-semibold text-white hover:bg-[#4a4037]" type="submit">Send test to Telegram</button>
          </form>
        </div>
      {/each}
    </div>
  </section>

  <section class="rounded-3xl border border-[#dfd2c5] bg-white p-6 shadow-sm">
    <h2 class="font-semibold">Default Telegram message preview</h2>
    <p class="mt-1 text-sm text-[#7a6550]">A sample ready expense rendered with the same modular templates as production. Per-rule previews above use the exact same renderer.</p>
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
