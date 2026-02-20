<script lang="ts">
  import type { ReceiptWithTools } from './receipt-tools';
  import { getReceiptToolsMeta } from './receipt-tools';
  import { formatAmount, formatDateTime, formatDurationMinutes, formatOptional } from './receipt-format';
  import ReceiptRowExpanded from './ReceiptRowExpanded.svelte';

  interface Props {
    receipt: ReceiptWithTools;
  }

  let { receipt }: Props = $props();

  const itemCount = $derived.by(() => {
    const items = receipt.line_items ?? [];
    return items.reduce((sum, item) => sum + (item.quantity ?? 0), 0);
  });

  const paymentSummary = $derived.by(() => {
    const payments = receipt.payments ?? [];
    if (payments.length === 0) return '—';
    const names = payments.map((payment) => payment.name || payment.type).filter(Boolean);
    return names.length > 0 ? names.join(', ') : '—';
  });

  const toolsMeta = $derived.by(() => getReceiptToolsMeta(receipt));
  const showNotConvertedFlag = $derived.by(
    () => toolsMeta.hasOneHour && toolsMeta.isNotConverted && Boolean(toolsMeta.orderStartTime)
  );
  const showUnassignedCustomer = $derived.by(() => !receipt.customer_id);
</script>

<details class="rounded-xl border border-[#e3d6c9] bg-white/70 shadow-sm">
  <summary class="flex flex-wrap items-center justify-between gap-4 px-4 py-3 text-sm text-[#2c2925] [&::-webkit-details-marker]:hidden">
    <div class="min-w-[160px]">
      <p class="text-xs uppercase tracking-wide text-[#7a6550]/70">Receipt</p>
      <p class="flex items-center gap-2 font-semibold text-[#2c2925]">
        <span>{formatOptional(receipt.receipt_number)}</span>
        {#if showNotConvertedFlag}
          <span class="inline-flex rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-700">
            overdue unhandled
          </span>
        {/if}
        {#if showUnassignedCustomer}
          <span class="inline-flex rounded-full border border-[#d8c9bb] bg-[#faf6f1] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[#7a6550]/80">
            unassigned
          </span>
        {/if}
      </p>
      <p class="text-xs text-[#7a6550]/70">
        Order #{toolsMeta.orderNumber ?? '—'}
        {#if toolsMeta.orderStartTime}
          • Start {toolsMeta.orderStartTime}
        {/if}
        {#if toolsMeta.durationMinutes !== null}
          • Duration {formatDurationMinutes(toolsMeta.durationMinutes)}
        {/if}
      </p>
    </div>
    <div class="min-w-[170px]">
      <p class="text-xs uppercase tracking-wide text-[#7a6550]/70">Created</p>
      <p>{formatDateTime(receipt.created_at ?? receipt.receipt_date)}</p>
    </div>
    <div class="min-w-[130px]">
      <p class="text-xs uppercase tracking-wide text-[#7a6550]/70">Total</p>
      <p>{formatAmount(receipt.total_money)}</p>
    </div>
    <div class="min-w-[120px]">
      <p class="text-xs uppercase tracking-wide text-[#7a6550]/70">Items</p>
      <p>{itemCount} items</p>
    </div>
    <div class="min-w-[180px]">
      <p class="text-xs uppercase tracking-wide text-[#7a6550]/70">Payments</p>
      <p class="truncate">{paymentSummary}</p>
    </div>
  </summary>
  <div class="border-t border-[#eadfd4] bg-white/80 px-4 py-4">
    <ReceiptRowExpanded {receipt} />
  </div>
</details>
