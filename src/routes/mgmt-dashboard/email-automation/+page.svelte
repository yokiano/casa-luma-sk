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
  const stateClass = (state: string) => state === 'ready' || state === 'ledger_created'
    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
    : state === 'review'
      ? 'bg-amber-50 text-amber-800 border-amber-200'
      : state === 'retry_pending'
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

  // Settings form state
  let automationEnabled = $state(dashboard.settings.automationEnabled);
  let ledgerEnabled = $state(dashboard.settings.ledgerEnabled);
  let notificationsEnabled = $state(dashboard.settings.notificationsEnabled);
  let savingSettings = $state(false);
  $effect(() => { automationEnabled = dashboard.settings.automationEnabled; ledgerEnabled = dashboard.settings.ledgerEnabled; notificationsEnabled = dashboard.settings.notificationsEnabled; });

  // Ignored emails toggle
  let showIgnored = $state(false);
  const ignoredEvents = $derived(dashboard.recent.filter((e) => e.processingState === 'ignored'));
  const visibleEvents = $derived(showIgnored ? dashboard.recent : dashboard.recent.filter((e) => e.processingState !== 'ignored'));

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
      await saveEmailAutomationSettings({ automationEnabled, ledgerEnabled, notificationsEnabled });
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
      Selected operational emails are recorded, classified, and routed to automation handlers. Ledger creation stays disabled unless explicitly enabled. Unclear emails stay in review and do not run side effects automatically.
    </p>
  </div>

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
          <span><b class="block text-[#2c2925]">Ledger writes enabled</b><span class="text-[#7a6550]">Allows ready expense rules to create Financial Ledger rows.</span></span>
        </label>
        <label class="flex items-start gap-3 rounded-2xl border border-[#eee5dc] bg-[#fbf8f4] p-4 text-sm">
          <input class="mt-1" type="checkbox" bind:checked={notificationsEnabled} />
          <span><b class="block text-[#2c2925]">Telegram notifications</b><span class="text-[#7a6550]">When off, events are stored but Telegram is not sent.</span></span>
        </label>
      </div>
      <button class="mt-4 rounded-full bg-[#2c2925] px-4 py-2 text-sm font-semibold text-white hover:bg-[#4a4037] disabled:opacity-50" onclick={onSaveSettings} disabled={savingSettings}>Save settings</button>
    </div>
  </details>

  <!-- Totals -->
  <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
    <div class="rounded-3xl border border-[#dfd2c5] bg-white p-5"><p class="text-xs font-bold uppercase tracking-wider text-[#7a6550]/60">Received</p><p class="mt-2 text-3xl font-semibold">{dashboard.totals.total}</p></div>
    <div class="rounded-3xl border border-emerald-200 bg-emerald-50 p-5"><p class="text-xs font-bold uppercase tracking-wider text-emerald-800/60">Ready for action</p><p class="mt-2 text-3xl font-semibold text-emerald-900">{dashboard.totals.ready}</p></div>
    <div class="rounded-3xl border border-amber-200 bg-amber-50 p-5"><p class="text-xs font-bold uppercase tracking-wider text-amber-800/60">Needs review</p><p class="mt-2 text-3xl font-semibold text-amber-900">{dashboard.totals.review}</p></div>
    <div class="rounded-3xl border border-slate-200 bg-slate-50 p-5"><p class="text-xs font-bold uppercase tracking-wider text-slate-700/60">Ignored</p><p class="mt-2 text-3xl font-semibold text-slate-900">{dashboard.totals.ignored}</p></div>
  </div>

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
      <div class="overflow-x-auto"><table class="w-full text-left text-sm"><thead class="bg-[#fbf8f4] text-xs uppercase tracking-wider text-[#7a6550]"><tr><th class="px-5 py-3">Received</th><th class="px-5 py-3">Email</th><th class="px-5 py-3">Classification</th><th class="px-5 py-3">State</th><th class="px-5 py-3">Notification</th></tr></thead><tbody>
        {#each visibleEvents as event}<tr class="border-t border-[#eee5dc]"><td class="px-5 py-4 whitespace-nowrap">{when(event.receivedAt)}</td><td class="px-5 py-4"><p class="font-medium text-[#2c2925]">{event.subject}</p><p class="mt-1 text-xs text-[#7a6550]">{event.fromAddress}</p></td><td class="px-5 py-4">{event.subtype.replaceAll('_', ' ')}</td><td class="px-5 py-4"><span class={`rounded-full border px-2.5 py-1 text-xs font-bold ${stateClass(event.processingState)}`}>{event.processingState}</span></td><td class="px-5 py-4">{event.notificationState}</td></tr>{/each}
      </tbody></table></div>
    {/if}
  </section>
</section>
