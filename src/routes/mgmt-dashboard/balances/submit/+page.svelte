<script lang="ts">
  import { enhance } from '$app/forms';
  import { ArrowLeft, CheckCircle2, Info, Save } from 'lucide-svelte';

  let { data, form } = $props();
  let submitting = $state(false);

  const value = (field: 'observedAt' | 'kbankBalance' | 'safeBalance' | 'notes') =>
    form?.values?.[field] ?? data[field === 'observedAt' ? 'defaultObservedAt' : field] ?? '';

  const submitEnhance = () => {
    submitting = true;
    return async ({ update }: { update: () => Promise<void> }) => {
      await update();
      submitting = false;
    };
  };
</script>

<svelte:head>
  <title>Submit balances · Mgmt Dashboard</title>
</svelte:head>

<section class="mx-auto max-w-3xl space-y-6">
  <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
    <div>
      <a href="/mgmt-dashboard/reconciliation" class="inline-flex items-center gap-1 text-sm font-semibold text-[#7a6550] hover:text-[#2c2925]"><ArrowLeft size={15} /> Reconciliation</a>
      <p class="mt-5 text-sm font-bold uppercase tracking-[0.22em] text-[#7a6550]/55">Daily close</p>
      <h1 class="mt-2 text-3xl font-semibold tracking-tight">Submit bank and safe balances</h1>
      <p class="mt-2 max-w-2xl text-sm text-[#7a6550]">Record the KBank balance and the full Safe / Cash on hand count at one observation time.</p>
    </div>
  </div>

  {#if form?.success}
    <div class="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-950 shadow-sm">
      <div class="flex items-start gap-3">
        <CheckCircle2 class="mt-0.5 shrink-0 text-emerald-700" size={20} />
        <div>
          <p class="font-bold">{form.duplicate ? 'This submission was already recorded.' : 'Balances submitted for review.'}</p>
          <p class="mt-1 text-sm">Two Observed snapshots were saved with Status = Needs Review. Submission key: {form.submissionKey}</p>
          <a class="mt-3 inline-flex rounded-full bg-emerald-700 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-800" href="/mgmt-dashboard/reconciliation">Open reconciliation</a>
        </div>
      </div>
    </div>
  {:else if form?.error}
    <div class="rounded-3xl border border-red-200 bg-red-50 p-5 text-sm text-red-900 shadow-sm">
      <p class="font-bold">Balance submission was not completed.</p>
      <p class="mt-1">{form.error}</p>
      {#if form?.fieldErrors}
        <ul class="mt-2 list-disc pl-5">
          {#each Object.values(form.fieldErrors) as message}
            <li>{message}</li>
          {/each}
        </ul>
      {/if}
      <p class="mt-2 text-xs">If one snapshot was saved before the error, retry this same form. The system will retry only the missing snapshot.</p>
    </div>
  {/if}

  <form method="POST" use:enhance={submitEnhance} class="space-y-6 rounded-3xl border border-[#dfd2c5] bg-white p-6 shadow-sm sm:p-8">
    <input type="hidden" name="submissionKey" value={form?.values?.submissionKey ?? data.submissionKey} />

    <div class="rounded-2xl border border-[#eadfd3] bg-[#fffaf4] p-4 text-sm text-[#7a6550]">
      <p class="flex items-center gap-2 font-bold text-[#2c2925]"><Info size={16} /> Before submitting</p>
      <ul class="mt-2 list-disc space-y-1 pl-5">
        <li>Use the KBiz available balance for KBank.</li>
        <li>Count all cash in the safe, including daily bags and backup/change cash.</li>
        <li>Do not enter negative values. This form creates Observed snapshots only, not ledger movements.</li>
      </ul>
    </div>

    <div>
      <label for="observedAt" class="text-sm font-bold text-[#2c2925]">Observation time <span class="font-normal text-[#7a6550]">(Bangkok)</span></label>
      <input id="observedAt" name="observedAt" type="datetime-local" required value={value('observedAt')} class="mt-2 block w-full rounded-2xl border border-[#d3c5b8] bg-white px-4 py-3 text-[#2c2925] focus:border-[#7a6550] focus:outline-none focus:ring-1 focus:ring-[#7a6550]" />
      {#if form?.fieldErrors?.observedAt}<p class="mt-1 text-xs font-semibold text-red-700">{form.fieldErrors.observedAt}</p>{/if}
    </div>

    <div class="grid gap-5 sm:grid-cols-2">
      <div>
        <label for="kbankBalance" class="text-sm font-bold text-[#2c2925]">KBank balance <span class="font-normal text-[#7a6550]">(THB)</span></label>
        <input id="kbankBalance" name="kbankBalance" type="number" min="0" max="1000000000" step="0.01" required inputmode="decimal" value={value('kbankBalance')} class="mt-2 block w-full rounded-2xl border border-[#d3c5b8] bg-white px-4 py-3 text-right tabular-nums text-[#2c2925] focus:border-[#7a6550] focus:outline-none focus:ring-1 focus:ring-[#7a6550]" />
        {#if form?.fieldErrors?.kbankBalance}<p class="mt-1 text-xs font-semibold text-red-700">{form.fieldErrors.kbankBalance}</p>{/if}
      </div>
      <div>
        <label for="safeBalance" class="text-sm font-bold text-[#2c2925]">Safe / Cash on hand <span class="font-normal text-[#7a6550]">(THB)</span></label>
        <input id="safeBalance" name="safeBalance" type="number" min="0" max="1000000000" step="0.01" required inputmode="decimal" value={value('safeBalance')} class="mt-2 block w-full rounded-2xl border border-[#d3c5b8] bg-white px-4 py-3 text-right tabular-nums text-[#2c2925] focus:border-[#7a6550] focus:outline-none focus:ring-1 focus:ring-[#7a6550]" />
        {#if form?.fieldErrors?.safeBalance}<p class="mt-1 text-xs font-semibold text-red-700">{form.fieldErrors.safeBalance}</p>{/if}
      </div>
    </div>

    <div>
      <label for="notes" class="text-sm font-bold text-[#2c2925]">Notes <span class="font-normal text-[#7a6550]">(optional)</span></label>
      <textarea id="notes" name="notes" rows="3" maxlength="1000" value={value('notes')} placeholder="For example: KBiz checked after close; backup bag included." class="mt-2 block w-full rounded-2xl border border-[#d3c5b8] bg-white px-4 py-3 text-[#2c2925] placeholder-[#7a6550]/45 focus:border-[#7a6550] focus:outline-none focus:ring-1 focus:ring-[#7a6550]"></textarea>
      {#if form?.fieldErrors?.notes}<p class="mt-1 text-xs font-semibold text-red-700">{form.fieldErrors.notes}</p>{/if}
    </div>

    <button type="submit" disabled={submitting} class="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#7a6550] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#2c2925] disabled:cursor-not-allowed disabled:opacity-60">
      <Save size={17} /> {submitting ? 'Saving snapshots…' : 'Submit balances'}
    </button>
  </form>
</section>
