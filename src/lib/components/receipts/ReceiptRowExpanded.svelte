<script lang="ts">
  import type { LoyverseReceipt } from '$lib/server/loyverse';
  import { formatAmount, formatDateTime, formatOptional } from './receipt-format';

  interface Props {
    receipt: LoyverseReceipt;
  }

  let { receipt }: Props = $props();

  const items = $derived(receipt.line_items ?? []);
  const payments = $derived(receipt.payments ?? []);
  const discounts = $derived(receipt.total_discounts ?? []);
  const taxes = $derived(receipt.total_taxes ?? []);

  const itemsCount = $derived.by(() => {
    return items.reduce((sum, item) => sum + (item.quantity ?? 0), 0);
  });
</script>

<article class="rounded-2xl border border-[#d8c9bb] bg-white/90 p-5 shadow-sm">
  <header class="flex flex-wrap items-start justify-between gap-4">
    <div>
      <p class="text-xs uppercase tracking-wide text-[#7a6550]/70">Receipt</p>
      <h3 class="text-lg font-semibold text-[#2c2925]">{formatOptional(receipt.receipt_number)}</h3>
      <p class="mt-1 text-sm text-[#7a6550]/80">
        {formatOptional(receipt.receipt_type)} · {itemsCount} items
      </p>
    </div>
    <div class="text-right">
      <p class="text-xs uppercase tracking-wide text-[#7a6550]/70">Total</p>
      <p class="text-xl font-semibold text-[#2c2925]">{formatAmount(receipt.total_money)}</p>
    </div>
  </header>

  <div class="mt-4 grid gap-3 text-sm text-[#2c2925] md:grid-cols-2">
    <div class="rounded-xl border border-[#eadfd4] bg-[#faf6f1] p-3">
      <p class="text-xs uppercase tracking-wide text-[#7a6550]/70">Timing</p>
      <div class="mt-2 space-y-1">
        <p><span class="text-[#7a6550]/80">Created:</span> {formatDateTime(receipt.created_at)}</p>
        <p><span class="text-[#7a6550]/80">Receipt date:</span> {formatDateTime(receipt.receipt_date)}</p>
        <p><span class="text-[#7a6550]/80">Updated:</span> {formatDateTime(receipt.updated_at)}</p>
        <p><span class="text-[#7a6550]/80">Cancelled:</span> {formatDateTime(receipt.cancelled_at)}</p>
      </div>
    </div>
    <div class="rounded-xl border border-[#eadfd4] bg-[#faf6f1] p-3">
      <p class="text-xs uppercase tracking-wide text-[#7a6550]/70">Context</p>
      <div class="mt-2 space-y-1">
        <p><span class="text-[#7a6550]/80">Order:</span> {formatOptional(receipt.order)}</p>
        <p><span class="text-[#7a6550]/80">Source:</span> {formatOptional(receipt.source)}</p>
        <p><span class="text-[#7a6550]/80">Dining option:</span> {formatOptional(receipt.dining_option)}</p>
        <p><span class="text-[#7a6550]/80">Refund for:</span> {formatOptional(receipt.refund_for)}</p>
        <p><span class="text-[#7a6550]/80">Note:</span> {formatOptional(receipt.note)}</p>
      </div>
    </div>
  </div>

  <div class="mt-4 grid gap-3 text-sm text-[#2c2925] md:grid-cols-3">
    <div class="rounded-xl border border-[#eadfd4] bg-white p-3">
      <p class="text-xs uppercase tracking-wide text-[#7a6550]/70">Associations</p>
      <div class="mt-2 space-y-1">
        <p><span class="text-[#7a6550]/80">Customer:</span> {formatOptional(receipt.customer_id)}</p>
        <p><span class="text-[#7a6550]/80">Employee:</span> {formatOptional(receipt.employee_id)}</p>
        <p><span class="text-[#7a6550]/80">Store:</span> {formatOptional(receipt.store_id)}</p>
        <p><span class="text-[#7a6550]/80">POS device:</span> {formatOptional(receipt.pos_device_id)}</p>
      </div>
    </div>
    <div class="rounded-xl border border-[#eadfd4] bg-white p-3">
      <p class="text-xs uppercase tracking-wide text-[#7a6550]/70">Totals</p>
      <div class="mt-2 space-y-1">
        <p><span class="text-[#7a6550]/80">Subtotal:</span> {formatAmount(receipt.total_money)}</p>
        <p><span class="text-[#7a6550]/80">Discounts:</span> {formatAmount(receipt.total_discount)}</p>
        <p><span class="text-[#7a6550]/80">Tax:</span> {formatAmount(receipt.total_tax)}</p>
        <p><span class="text-[#7a6550]/80">Tip:</span> {formatAmount(receipt.tip)}</p>
        <p><span class="text-[#7a6550]/80">Surcharge:</span> {formatAmount(receipt.surcharge)}</p>
      </div>
    </div>
    <div class="rounded-xl border border-[#eadfd4] bg-white p-3">
      <p class="text-xs uppercase tracking-wide text-[#7a6550]/70">Points</p>
      <div class="mt-2 space-y-1">
        <p><span class="text-[#7a6550]/80">Earned:</span> {formatAmount(receipt.points_earned)}</p>
        <p><span class="text-[#7a6550]/80">Deducted:</span> {formatAmount(receipt.points_deducted)}</p>
        <p><span class="text-[#7a6550]/80">Balance:</span> {formatAmount(receipt.points_balance)}</p>
      </div>
    </div>
  </div>

  <section class="mt-5">
    <h4 class="text-sm font-semibold uppercase tracking-wide text-[#7a6550]/80">Line items</h4>
    {#if items.length === 0}
      <p class="mt-2 text-sm text-[#7a6550]/70">No line items found.</p>
    {:else}
      <div class="mt-3 overflow-x-auto">
        <table class="min-w-full border-separate border-spacing-y-2 text-sm text-[#2c2925]">
          <thead>
            <tr class="text-left text-xs uppercase tracking-wide text-[#7a6550]/70">
              <th class="px-3 py-1">Item</th>
              <th class="px-3 py-1">Quantity</th>
              <th class="px-3 py-1">Price</th>
              <th class="px-3 py-1">Gross</th>
              <th class="px-3 py-1">Total</th>
              <th class="px-3 py-1">Cost</th>
              <th class="px-3 py-1">Discounts</th>
            </tr>
          </thead>
          <tbody>
            {#each items as item}
              <tr class="rounded-xl bg-[#faf6f1]">
                <td class="px-3 py-2">
                  <div class="font-medium">{formatOptional(item.item_name)}</div>
                  <div class="text-xs text-[#7a6550]/70">{formatOptional(item.variant_name)}</div>
                  <div class="text-xs text-[#7a6550]/70">{formatOptional(item.sku)}</div>
                  <div class="text-xs text-[#7a6550]/70">{formatOptional(item.line_note)}</div>
                  {#if item.line_modifiers && item.line_modifiers.length > 0}
                    <div class="mt-1 text-xs text-[#7a6550]/70">
                      Modifiers:
                      {#each item.line_modifiers as modifier}
                        <span class="mr-2">{formatOptional(modifier.name)} {formatAmount(modifier.price)}</span>
                      {/each}
                    </div>
                  {/if}
                  {#if item.line_taxes && item.line_taxes.length > 0}
                    <div class="mt-1 text-xs text-[#7a6550]/70">
                      Taxes:
                      {#each item.line_taxes as tax}
                        <span class="mr-2">{formatOptional(tax.name || tax.type)} {formatAmount(tax.money_amount)}</span>
                      {/each}
                    </div>
                  {/if}
                </td>
                <td class="px-3 py-2">{item.quantity ?? 0}</td>
                <td class="px-3 py-2">{formatAmount(item.price)}</td>
                <td class="px-3 py-2">{formatAmount(item.gross_total_money)}</td>
                <td class="px-3 py-2">{formatAmount(item.total_money)}</td>
                <td class="px-3 py-2">{formatAmount(item.cost_total ?? item.cost)}</td>
                <td class="px-3 py-2">
                  {#if item.line_discounts && item.line_discounts.length > 0}
                    {#each item.line_discounts as discount}
                      <div class="text-xs">
                        {formatOptional(discount.name || discount.type)} · {formatAmount(discount.money_amount)}
                      </div>
                    {/each}
                  {:else}
                    <span class="text-xs text-[#7a6550]/70">—</span>
                  {/if}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </section>

  <section class="mt-5 grid gap-4 md:grid-cols-2">
    <div>
      <h4 class="text-sm font-semibold uppercase tracking-wide text-[#7a6550]/80">Payments</h4>
      {#if payments.length === 0}
        <p class="mt-2 text-sm text-[#7a6550]/70">No payments recorded.</p>
      {:else}
        <div class="mt-2 space-y-2 text-sm text-[#2c2925]">
          {#each payments as payment}
            <div class="flex items-center justify-between rounded-xl border border-[#eadfd4] bg-white px-3 py-2">
              <div>
                <p class="font-medium">{formatOptional(payment.name || payment.type)}</p>
                <p class="text-xs text-[#7a6550]/70">{formatDateTime(payment.paid_at)}</p>
              </div>
              <div class="text-right">{formatAmount(payment.money_amount)}</div>
            </div>
          {/each}
        </div>
      {/if}
    </div>
    <div>
      <h4 class="text-sm font-semibold uppercase tracking-wide text-[#7a6550]/80">Discounts & Taxes</h4>
      <div class="mt-2 space-y-3">
        <div>
          <p class="text-xs uppercase tracking-wide text-[#7a6550]/70">Discounts</p>
          {#if discounts.length === 0}
            <p class="mt-1 text-sm text-[#7a6550]/70">No discounts.</p>
          {:else}
            <div class="mt-2 space-y-1 text-sm">
              {#each discounts as discount}
                <div class="flex items-center justify-between">
                  <span>{formatOptional(discount.name || discount.type)}</span>
                  <span>{formatAmount(discount.money_amount)}</span>
                </div>
              {/each}
            </div>
          {/if}
        </div>
        <div>
          <p class="text-xs uppercase tracking-wide text-[#7a6550]/70">Taxes</p>
          {#if taxes.length === 0}
            <p class="mt-1 text-sm text-[#7a6550]/70">No taxes.</p>
          {:else}
            <div class="mt-2 space-y-1 text-sm">
              {#each taxes as tax}
                <div class="flex items-center justify-between">
                  <span>{formatOptional(tax.name || tax.type)}</span>
                  <span>{formatAmount(tax.money_amount)}</span>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      </div>
    </div>
  </section>
</article>
