<script lang="ts">
  import { goto } from '$app/navigation';
  import { toast } from 'svelte-sonner';
  import ReceiptCustomerCard from '$lib/components/receipts/ReceiptCustomerCard.svelte';
  import ReceiptRowExpanded from '$lib/components/receipts/ReceiptRowExpanded.svelte';
  import { enrichReceiptsWithTools } from '$lib/components/receipts';
  import { formatAmount, formatDateTime } from '$lib/components/receipts/receipt-format';
  import { deleteReceipt } from '$lib/receipts.remote';
  import type { PageData } from './$types';

  interface Props {
    data: PageData;
  }

  let { data }: Props = $props();
  const receipt = $derived(enrichReceiptsWithTools([data.receipt])[0]);
  let isDeleting = $state(false);

  const handleDeleteReceipt = async () => {
    const receiptNumber = data.receipt.receipt_number;
    const confirmedReceiptNumber = window.prompt(
      `Delete receipt ${receiptNumber} and all stored receipt details?\n\nType the receipt number to confirm.`
    );

    if (confirmedReceiptNumber !== receiptNumber) {
      if (confirmedReceiptNumber !== null) toast.info('Receipt delete cancelled; receipt number did not match.');
      return;
    }

    isDeleting = true;
    try {
      await deleteReceipt({ receiptNumber });
      toast.success(`Receipt ${receiptNumber} deleted.`);
      await goto('/tools/receipts');
    } catch (error) {
      console.error('receipts: failed to delete receipt', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete receipt.');
    } finally {
      isDeleting = false;
    }
  };
</script>

<svelte:head>
  <title>Receipt {data.receipt.receipt_number} · Casa Luma</title>
</svelte:head>

<div class="min-h-screen bg-[#f7efe7] px-4 py-8 text-[#2c2925]">
  <div class="mx-auto max-w-6xl space-y-6">
    <a class="text-sm font-medium text-[#7a6550] underline-offset-4 hover:underline" href="/tools/receipts">
      ← Back to receipts
    </a>

    <header class="rounded-2xl border border-[#d8c9bb] bg-white/80 p-5 shadow-sm">
      <p class="text-xs uppercase tracking-wide text-[#7a6550]/70">Receipt</p>
      <div class="mt-1 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 class="text-3xl font-semibold text-[#2c2925]">{data.receipt.receipt_number}</h1>
          <p class="mt-2 text-sm text-[#7a6550]/80">
            Created {formatDateTime(data.receipt.created_at ?? data.receipt.receipt_date)} · Total {formatAmount(data.receipt.total_money)}
          </p>
        </div>
        <div class="flex flex-col items-end gap-2">
          <!-- TODO: Owner-only once authorization exists; currently unguarded because auth is not implemented. -->
          <button
            type="button"
            class="rounded-full border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:border-red-300 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
            onclick={handleDeleteReceipt}
            disabled={isDeleting}
          >
            {isDeleting ? 'Deleting…' : 'Delete receipt'}
          </button>
          <p class="max-w-xs text-right text-xs text-[#7a6550]/70">
            Deletes the receipt, line items, totals, payments, receipt incidents, and matching receipt webhook events.
          </p>
        </div>
      </div>
    </header>

    <ReceiptCustomerCard family={data.family} customerId={data.receipt.customer_id} />

    <ReceiptRowExpanded {receipt} />
  </div>
</div>
