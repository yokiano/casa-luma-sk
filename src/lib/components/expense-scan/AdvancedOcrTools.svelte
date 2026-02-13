<script lang="ts">
  import { toast } from 'svelte-sonner';
  import type { ScannedSlip } from './SlipCard.svelte';

  interface Props {
    slips: ScannedSlip[];
  }

  let { slips }: Props = $props();
  let expanded = $state(false);

  function copyAllAsTestCases() {
    const validSlips = slips.filter(s => s.rawText && s.status === 'scanned');
    if (validSlips.length === 0) {
      toast.error('No scanned slips with raw text to copy');
      return;
    }

    const testCases = validSlips.map(slip => ({
      id: `generated-${slip.id}-${Date.now()}`,
      name: slip.parsedRecipientName || slip.fileName || 'Unknown Recipient',
      rawText: slip.rawText,
      expected: {
        transactionId: slip.parsedTransactionId,
        date: slip.parsedDate,
        amount: slip.parsedAmount,
        recipientName: slip.parsedRecipientName,
        memo: slip.parsedTitle
      }
    }));

    const formatted = JSON.stringify(testCases, null, 2);
    navigator.clipboard.writeText(formatted);
    toast.success(`Copied ${testCases.length} test cases to clipboard`);
  }
</script>

<div class="mt-8 rounded-3xl border border-dashed border-[#d8c9bb] p-6">
  <div class="flex items-center justify-between">
    <div>
      <h3 class="text-lg font-semibold text-[#2c2925]">Advanced OCR Tools</h3>
      <p class="text-sm text-[#5c4a3d]/70">Tools for debugging and improving the OCR engine.</p>
    </div>
    <button
      type="button"
      onclick={() => (expanded = !expanded)}
      class="rounded-full border border-[#d8c9bb] px-4 py-2 text-sm font-semibold text-[#7a6550] hover:bg-[#f6f1eb]"
    >
      {expanded ? 'Hide Tools' : 'Show Tools'}
    </button>
  </div>

  {#if expanded}
    <div class="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div class="rounded-2xl border border-[#e0d6cc] bg-white p-4">
        <h4 class="font-semibold text-[#2c2925]">Regression Testing</h4>
        <p class="mt-1 text-xs text-[#5c4a3d]/70">
          Copy all currently scanned slips as JSON test cases to be added to the regression test suite.
        </p>
        <button
          type="button"
          onclick={copyAllAsTestCases}
          disabled={slips.length === 0}
          class="mt-4 w-full rounded-xl bg-[#7a6550] py-2 text-sm font-semibold text-white hover:bg-[#5c4a3d] disabled:opacity-50"
        >
          Copy All as Test Cases
        </button>
      </div>
    </div>
  {/if}
</div>
