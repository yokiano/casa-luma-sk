<script lang="ts">
  import type { MgmtAnalyticsFilters } from '$lib/mgmt-dashboard/analytics-filters.svelte';

  type Props = { filters: MgmtAnalyticsFilters };
  let { filters }: Props = $props();

  const presenceLabel = $derived(filters.customerPresence === 'assigned' ? 'Has customer' : 'No customer');
</script>

{#if filters.activeFilterCount}
  <div class="flex flex-wrap items-center gap-2 border-t border-[#eadfd3] pt-3" aria-label="Active analytics filters">
    <span class="text-[10px] font-bold uppercase tracking-[0.16em] text-[#7a6550]/60">Filtered by</span>
    {#if filters.customer}
      <button type="button" class="rounded-full bg-[#efe6dc] px-3 py-1 text-xs font-semibold text-[#5c4a3d] hover:bg-[#e4d5c7]" onclick={() => filters.setCustomer(null)}>
        Customer: {filters.customer.label} ×
      </button>
    {/if}
    {#if filters.customerPresence !== 'all'}
      <button type="button" class="rounded-full bg-[#efe6dc] px-3 py-1 text-xs font-semibold text-[#5c4a3d] hover:bg-[#e4d5c7]" onclick={() => filters.setCustomerPresence('all')}>
        {presenceLabel} ×
      </button>
    {/if}
    {#each filters.items as item (item.id)}
      <button type="button" class="rounded-full bg-[#fff0df] px-3 py-1 text-xs font-semibold text-[#7a5532] hover:bg-[#f6dfc7]" onclick={() => filters.toggleItem(item)}>
        Item: {item.label} ×
      </button>
    {/each}
    {#each filters.paymentTypes as payment (payment.id)}
      <button type="button" class="rounded-full bg-[#e8f1ed] px-3 py-1 text-xs font-semibold text-[#49695a] hover:bg-[#d9e8e1]" onclick={() => filters.togglePaymentType(payment)}>
        Payment: {payment.label} ×
      </button>
    {/each}
    <button type="button" class="ml-auto text-xs font-bold text-[#7a6550] underline decoration-[#7a6550]/30 underline-offset-2 hover:text-[#2c2925]" onclick={() => filters.clearAll()}>
      Clear all
    </button>
  </div>
{/if}
