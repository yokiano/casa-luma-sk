<script lang="ts">
  import { toast } from 'svelte-sonner';
  import { Ban, ChevronDown, Settings } from 'lucide-svelte';
  import { saveEmailAutomationSettings } from '$lib/email-automation.remote';
  import type { EmailAutomationSettings } from '$lib/server/email-automation/settings';

  type Props = {
    settings: EmailAutomationSettings;
    onRefresh: () => Promise<void>;
  };

  let { settings, onRefresh }: Props = $props();

  const createForm = (value: EmailAutomationSettings) => ({
    automationEnabled: value.automationEnabled,
    ledgerEnabled: value.ledgerEnabled,
    notificationsEnabled: value.notificationsEnabled,
    ignoredSendersText: value.ignoredSenders.join('\n'),
    ledgerAllowedSendersText: value.ledgerAllowedSenders.join('\n'),
    ledgerMaxAmountThb: value.ledgerMaxAmountThb
  });
  type SettingsForm = ReturnType<typeof createForm>;
  const emptyForm = (): SettingsForm => ({
    automationEnabled: false,
    ledgerEnabled: false,
    notificationsEnabled: false,
    ignoredSendersText: '',
    ledgerAllowedSendersText: '',
    ledgerMaxAmountThb: 1
  });
  const copySettings = (value: EmailAutomationSettings): EmailAutomationSettings => ({
    ...value,
    ignoredSenders: [...value.ignoredSenders],
    ledgerAllowedSenders: [...value.ledgerAllowedSenders]
  });
  const settingsSignature = (value: EmailAutomationSettings) => JSON.stringify({
    automationEnabled: value.automationEnabled,
    ledgerEnabled: value.ledgerEnabled,
    notificationsEnabled: value.notificationsEnabled,
    ignoredSenders: [...value.ignoredSenders].sort(),
    ledgerAllowedSenders: [...value.ledgerAllowedSenders].sort(),
    ledgerMaxAmountThb: value.ledgerMaxAmountThb
  });

  // Initialize through the effect so props stay reactive and the compiler does
  // not capture only the first SSR settings object.
  let form = $state<SettingsForm>(emptyForm());
  let lastSyncedForm = $state<SettingsForm>(emptyForm());
  let lastSyncedSignature = $state('');
  let baseSettings = $state<EmailAutomationSettings | null>(null);
  let savingSettings = $state(false);

  const formMatches = (left: SettingsForm, right: SettingsForm) =>
    left.automationEnabled === right.automationEnabled &&
    left.ledgerEnabled === right.ledgerEnabled &&
    left.notificationsEnabled === right.notificationsEnabled &&
    left.ignoredSendersText === right.ignoredSendersText &&
    left.ledgerAllowedSendersText === right.ledgerAllowedSendersText &&
    left.ledgerMaxAmountThb === right.ledgerMaxAmountThb;

  $effect(() => {
    const incomingSignature = settingsSignature(settings);
    if (incomingSignature === lastSyncedSignature) return;

    // Dashboard refreshes also update unrelated data. Do not erase an in-progress
    // edit unless this form still matches the last settings snapshot we rendered.
    if (lastSyncedSignature && !formMatches(form, lastSyncedForm)) return;

    const nextForm = createForm(settings);
    form = nextForm;
    lastSyncedForm = createForm(settings);
    lastSyncedSignature = incomingSignature;
    baseSettings = copySettings(settings);
  });

  const parseSenders = (value: string) => Array.from(new Set(value.split(/[\n,]+/).map((entry) => entry.trim().toLowerCase()).filter(Boolean)));

  const onSaveSettings = async () => {
    savingSettings = true;
    const toastId = toast.loading('Saving settings…');
    try {
      const ignoredSenders = parseSenders(form.ignoredSendersText);
      const savedBaseSettings = baseSettings ?? copySettings(settings);
      const addedIgnoredSenders = ignoredSenders.filter((sender) => !savedBaseSettings.ignoredSenders.includes(sender));
      const confirmIgnoredSenderBypassRisk = addedIgnoredSenders.length === 0 || window.confirm(`Add ${addedIgnoredSenders.length} sender${addedIgnoredSenders.length === 1 ? '' : 's'} to the ignored list?\n\nVisible sender addresses may be spoofed. Matching future messages will bypass handlers, review creation, and Telegram notifications.`);
      if (!confirmIgnoredSenderBypassRisk) {
        toast.info('Settings not saved', { id: toastId, description: 'Ignored sender addition was cancelled.' });
        return;
      }
      const ledgerAllowedSenders = parseSenders(form.ledgerAllowedSendersText);
      await saveEmailAutomationSettings({
        automationEnabled: form.automationEnabled,
        ledgerEnabled: form.ledgerEnabled,
        notificationsEnabled: form.notificationsEnabled,
        ignoredSenders,
        ledgerAllowedSenders,
        ledgerMaxAmountThb: form.ledgerMaxAmountThb,
        baseSettings: savedBaseSettings,
        confirmIgnoredSenderBypassRisk
      });
      await onRefresh();
      toast.success('Settings saved', { id: toastId, description: 'Automation settings updated in Neon.' });
    } catch (e) {
      toast.error('Failed to save settings', { id: toastId, description: e instanceof Error ? e.message : undefined });
    } finally {
      savingSettings = false;
    }
  };
</script>

<details class="group rounded-3xl border border-[#dfd2c5] bg-white shadow-sm">
  <summary class="flex cursor-pointer list-none items-center justify-between px-5 py-4">
    <span class="flex items-center gap-2 font-semibold"><Settings size={18} />Automation settings</span>
    <ChevronDown size={18} class="text-[#7a6550] transition-transform group-open:rotate-180" />
  </summary>
  <div class="border-t border-[#eee5dc] px-5 pb-5 pt-4">
    <p class="mb-4 text-sm text-[#7a6550]">Runtime switches stored in Neon. These replace deploy-time env toggles.</p>
    <div class="grid gap-3 md:grid-cols-3">
      <label class="flex items-start gap-3 rounded-2xl border border-[#eee5dc] bg-[#fbf8f4] p-4 text-sm">
        <input class="mt-1" type="checkbox" bind:checked={form.automationEnabled} disabled={savingSettings} />
        <span><b class="block text-[#2c2925]">Automation enabled</b><span class="text-[#7a6550]">When off, emails are stored as ignored.</span></span>
      </label>
      <label class="flex items-start gap-3 rounded-2xl border border-[#eee5dc] bg-[#fbf8f4] p-4 text-sm">
        <input class="mt-1" type="checkbox" bind:checked={form.ledgerEnabled} disabled={savingSettings} />
        <span><b class="block text-[#2c2925]">Company Ledger canary</b><span class="text-[#7a6550]">When on, Ledger writes are still allowed only if the deployment canary flag, dashboard sender allowlist, complete MIME, amount limit, reference, and idempotency checks pass. Turn this off as the emergency stop.</span></span>
      </label>
      <label class="flex items-start gap-3 rounded-2xl border border-[#eee5dc] bg-[#fbf8f4] p-4 text-sm">
        <input class="mt-1" type="checkbox" bind:checked={form.notificationsEnabled} disabled={savingSettings} />
        <span><b class="block text-[#2c2925]">Telegram notifications</b><span class="text-[#7a6550]">When off, events are stored but Telegram is not sent.</span></span>
      </label>
    </div>
    <div class="mt-4 grid gap-3 lg:grid-cols-[2fr_1fr]">
      <label class="block rounded-2xl border border-[#eee5dc] bg-[#fbf8f4] p-4 text-sm">
        <b class="block text-[#2c2925]">Ledger canary allowed senders</b>
        <span class="mt-1 block text-xs leading-5 text-[#7a6550]">One exact visible sender email or domain per line. Stored in Neon dashboard settings, not Vercel env.</span>
        <textarea class="mt-3 min-h-28 w-full rounded-xl border border-[#dfd2c5] bg-white p-3 font-mono text-xs" bind:value={form.ledgerAllowedSendersText} disabled={savingSettings} placeholder="kbiz@kasikornbank.com&#10;yardenavir@gmail.com"></textarea>
      </label>
      <label class="block rounded-2xl border border-[#eee5dc] bg-[#fbf8f4] p-4 text-sm">
        <b class="block text-[#2c2925]">Ledger max amount (THB)</b>
        <span class="mt-1 block text-xs leading-5 text-[#7a6550]">Canary hard limit before a Ledger write can run.</span>
        <input class="mt-3 w-full rounded-xl border border-[#dfd2c5] bg-white p-3 text-sm" type="number" min="1" step="1" bind:value={form.ledgerMaxAmountThb} disabled={savingSettings} />
      </label>
    </div>
    <label class="mt-4 block rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm">
      <span class="flex items-center gap-2 font-semibold text-slate-900"><Ban size={16} />Ignored sender list</span>
      <span class="mt-1 block text-xs leading-5 text-slate-600">One exact sender email per line. This highest-priority safety rule stores matching emails as ignored and skips all handlers, Ledger work, reviews, and Telegram notifications. Adding entries requires a spoofing/bypass confirmation and writes a manager audit entry. Use this instead of creating an ignore classification rule.</span>
      <textarea class="mt-3 min-h-28 w-full rounded-xl border border-slate-200 bg-white p-3 font-mono text-xs" bind:value={form.ignoredSendersText} disabled={savingSettings} placeholder="trusted-sender@example.com&#10;notifications@bank.example"></textarea>
    </label>
    <button class="mt-4 rounded-full bg-[#2c2925] px-4 py-2 text-sm font-semibold text-white hover:bg-[#4a4037] disabled:opacity-50" onclick={onSaveSettings} disabled={savingSettings}>{savingSettings ? 'Saving settings…' : 'Save settings'}</button>
  </div>
</details>
