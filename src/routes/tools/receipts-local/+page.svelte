<script lang="ts">
  let { data } = $props();

  const formatMoney = (value: number | null) => {
    if (value === null || Number.isNaN(value)) return '-';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
  };

  const formatDate = (value: string | Date | null) => {
    if (!value) return '-';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString();
  };
</script>

<section class="space-y-6">
  <header class="space-y-2">
    <h2 class="text-2xl font-semibold text-[#2c2925]">Webhook Receipts (Local DB)</h2>
    <p class="text-sm text-[#7a6550]/80">
      Temporary monitor page for Loyverse webhook receipts persisted in PostgreSQL.
    </p>
  </header>

  {#if data.dbError}
    <div class="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
      {data.dbError}
    </div>
  {/if}

  {#if data.receipts.length === 0}
    <div class="rounded-2xl border border-[#d3c5b8] bg-white p-6 text-sm text-[#7a6550]">
      No receipts stored yet. Send webhook traffic to `/api/webhooks/receipt`.
    </div>
  {:else}
    <div class="space-y-4">
      {#each data.receipts as receipt}
        <article class="rounded-2xl border border-[#d3c5b8] bg-white p-5 shadow-sm">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 class="text-base font-semibold text-[#2c2925]">Receipt {receipt.receiptNumber}</h3>
              <p class="text-xs text-[#7a6550]">Merchant: {receipt.merchantId} · Store: {receipt.storeId ?? '-'}</p>
            </div>
            <div class="text-right">
              <p class="text-sm font-semibold text-[#2c2925]">{formatMoney(receipt.totalMoney)}</p>
              <p class="text-xs text-[#7a6550]">Updated: {formatDate(receipt.updatedFromEventAt)}</p>
            </div>
          </div>

          <div class="mt-3 grid gap-2 text-sm text-[#5c4a3d] sm:grid-cols-3">
            <p>Tax: {formatMoney(receipt.totalTax)}</p>
            <p>Discount: {formatMoney(receipt.totalDiscount)}</p>
            <p>Type: {receipt.receiptType ?? '-'}</p>
          </div>

          <div class="mt-4">
            <p class="text-xs font-semibold uppercase tracking-wider text-[#7a6550]/70">Line Items</p>
            <div class="mt-2 space-y-1 text-sm">
              {#each receipt.lineItems as line}
                <div class="flex justify-between gap-4">
                  <span>{line.itemName ?? 'Unknown item'} x {line.quantity ?? 0}</span>
                  <span>{formatMoney(line.totalMoney)}</span>
                </div>
              {/each}
            </div>
          </div>

          <div class="mt-4">
            <p class="text-xs font-semibold uppercase tracking-wider text-[#7a6550]/70">Payments</p>
            <div class="mt-2 space-y-1 text-sm">
              {#each receipt.payments as payment}
                <div class="flex justify-between gap-4">
                  <span>{payment.name ?? payment.type ?? 'Unknown payment'}</span>
                  <span>{formatMoney(payment.moneyAmount)}</span>
                </div>
              {/each}
            </div>
          </div>
        </article>
      {/each}
    </div>
  {/if}
</section>
