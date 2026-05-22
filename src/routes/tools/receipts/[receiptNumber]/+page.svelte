<script lang="ts">
  import ReceiptRowExpanded from '$lib/components/receipts/ReceiptRowExpanded.svelte';
  import { enrichReceiptsWithTools } from '$lib/components/receipts';
  import { formatAmount, formatDateTime } from '$lib/components/receipts/receipt-format';
  import type { PageData } from './$types';

  interface Props {
    data: PageData;
  }

  let { data }: Props = $props();
  const receipt = $derived(enrichReceiptsWithTools([data.receipt])[0]);
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
      </div>
    </header>

    <ReceiptRowExpanded {receipt} />
  </div>
</div>
