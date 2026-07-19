<script lang="ts">
  import { toast } from 'svelte-sonner';
  import { ChevronDown, SlidersHorizontal } from 'lucide-svelte';
  import {
    moveEmailClassificationRule,
    sendEmailAutomationTestForRule,
    toggleEmailClassificationRule
  } from '$lib/email-automation.remote';
  import type { RulePreview } from '$lib/server/email-automation/dashboard';

  let { rules, onRefresh }: { rules: RulePreview[]; onRefresh: () => Promise<void> } = $props();

  let expandedRules = $state<Record<number, boolean>>({});
  const toggleRuleExpand = (id: number) => {
    expandedRules[id] = !expandedRules[id];
  };

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

  const onToggleRule = async (ruleId: number, currentName: string) => {
    const toastId = toast.loading('Toggling rule…');
    try {
      const result = await toggleEmailClassificationRule({ ruleId });
      if (!result.ok) { toast.error('Failed', { id: toastId, description: result.error }); return; }
      await onRefresh();
      toast.success(`${currentName} ${result.enabled ? 'enabled' : 'disabled'}`, { id: toastId });
    } catch (e) {
      toast.error('Failed to toggle rule', { id: toastId, description: e instanceof Error ? e.message : undefined });
    }
  };

  const onMoveRule = async (ruleId: number, direction: 'up' | 'down', name: string) => {
    const toastId = toast.loading('Reordering…');
    try {
      await moveEmailClassificationRule({ ruleId, direction });
      await onRefresh();
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
</script>

<!-- Classifier rules (compact data table with expandable rows) -->
<details class="group rounded-3xl border border-[#dfd2c5] bg-white shadow-sm">
  <summary class="flex cursor-pointer list-none items-center justify-between px-5 py-4">
    <div>
      <span class="flex items-center gap-2 font-semibold"><SlidersHorizontal size={18} />Classifier rules</span>
      <span class="ml-3 text-xs text-[#7a6550]">{rules.filter(r => r.enabled).length} active · {rules.filter(r => !r.enabled).length} disabled</span>
    </div>
    <ChevronDown size={18} class="text-[#7a6550] transition-transform group-open:rotate-180" />
  </summary>
  <div class="border-t border-[#eee5dc]">
    {#if rules.length === 0}
      <p class="px-5 py-8 text-sm text-[#7a6550]">No DB rules yet. The classifier is using built-in fallbacks only.</p>
    {:else}
      <!-- Header row -->
      <div class="hidden grid-cols-[2.5rem_1fr_9rem_7rem_8rem] items-center gap-2 border-b border-[#eee5dc] bg-[#fbf8f4] px-5 py-2 text-xs font-bold uppercase tracking-wider text-[#7a6550]/70 md:grid">
        <span></span><span>Name</span><span>Class · subtype</span><span>Handler</span><span class="text-right">Actions</span>
      </div>
      {#each rules as rule, i (rule.id)}
        <div class="border-b border-[#eee5dc] last:border-b-0">
          <!-- Collapsed row -->
          <div class="grid grid-cols-[2.5rem_1fr_auto] items-center gap-2 px-5 py-3 md:grid-cols-[2.5rem_1fr_9rem_7rem_8rem]">
            <button class="flex h-6 w-6 items-center justify-center rounded-full text-[#7a6550] hover:bg-[#efe6dc]" onclick={() => toggleRuleExpand(rule.id)} aria-label={expandedRules[rule.id] ? 'Collapse rule' : 'Expand rule'} aria-expanded={Boolean(expandedRules[rule.id])} aria-controls={`rule-details-${rule.id}`}>
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
              <button class="rounded-full border border-[#eee5dc] px-2 py-1 text-xs font-medium text-[#7a6550] hover:bg-[#efe6dc] disabled:opacity-30" onclick={() => onMoveRule(rule.id, 'down', rule.name)} disabled={i === rules.length - 1} aria-label="Move down">↓</button>
              <button class={`rounded-full border px-2.5 py-1 text-xs font-semibold transition ${rule.enabled ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'border-slate-200 bg-slate-100 text-slate-500 hover:bg-slate-200'}`} onclick={() => onToggleRule(rule.id, rule.name)}>{rule.enabled ? 'On' : 'Off'}</button>
              <button class="rounded-full border border-[#eee5dc] px-2.5 py-1 text-xs font-medium text-[#7a6550] hover:bg-[#efe6dc] disabled:opacity-30 disabled:hover:bg-white" onclick={() => onSendTestRule(rule.id)} disabled={!rule.hasDummyInput || !rule.preview}>Test</button>
            </div>
          </div>
          <!-- Keep the controlled panel mounted so aria-controls always resolves. -->
          <div id={`rule-details-${rule.id}`} class="grid gap-4 bg-[#fbf8f4] px-5 py-4 md:grid-cols-2" hidden={!expandedRules[rule.id]}>
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
        </div>
      {/each}
    {/if}
  </div>
</details>
