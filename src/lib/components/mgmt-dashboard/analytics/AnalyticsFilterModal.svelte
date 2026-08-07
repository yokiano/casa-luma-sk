<script lang="ts">
  import { Funnel } from 'lucide-svelte';
  import * as Dialog from '$lib/components/ui/dialog';
  import type { MgmtAnalyticsCustomerPresence, MgmtAnalyticsFilters } from '$lib/mgmt-dashboard/analytics-filters.svelte';
  import AnalyticsFilterSearch from './AnalyticsFilterSearch.svelte';

  type Props = { filters: MgmtAnalyticsFilters };
  let { filters }: Props = $props();
  let open = $state(false);

  const customerPresenceOptions: Array<{ value: MgmtAnalyticsCustomerPresence; label: string }> = [
    { value: 'all', label: 'All receipts' },
    { value: 'assigned', label: 'Has customer' },
    { value: 'unassigned', label: 'No customer' }
  ];
</script>

<Dialog.Root bind:open>
  <Dialog.Trigger
    class="inline-flex h-9 items-center gap-2 rounded-full border border-[#d8c9bb] bg-white px-3 text-xs font-bold text-[#7a6550] transition hover:border-[#7a6550]"
  >
    <Funnel size={14} />
    Filters
    {#if filters.activeFilterCount}
      <span class="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#7a6550] px-1.5 text-[10px] text-white">{filters.activeFilterCount}</span>
    {/if}
  </Dialog.Trigger>

  <Dialog.Content class="max-h-[90vh] overflow-y-auto border-[#d3c5b8] bg-[#fdfbf9] sm:max-w-2xl">
    <Dialog.Header>
      <Dialog.Title class="text-xl font-semibold text-[#2c2925]">Filter analytics</Dialog.Title>
      <Dialog.Description class="text-sm text-[#7a6550]">
        Find options only when you search. Multiple items or payment types match receipts containing any selected option.
      </Dialog.Description>
    </Dialog.Header>

    <div class="space-y-6">
      <AnalyticsFilterSearch
        kind="customer"
        label="Customer"
        placeholder="Search family/member names, phones, emails, or codes…"
        selected={filters.customer ? [filters.customer] : []}
        multiple={false}
        onToggle={(option) => filters.setCustomer(filters.customer?.id === option.id ? null : option)}
      />

      <div class="space-y-2">
        <p class="text-sm font-bold text-[#2c2925]">Customer assignment</p>
        <div class="flex flex-wrap gap-2" aria-label="Customer assignment filter">
          {#each customerPresenceOptions as option}
            <button
              type="button"
              class="rounded-full border px-3 py-1.5 text-xs font-semibold transition {filters.customerPresence === option.value ? 'border-[#7a6550] bg-[#7a6550] text-white' : 'border-[#d8c9bb] bg-white text-[#7a6550] hover:border-[#7a6550]'}"
              onclick={() => filters.setCustomerPresence(option.value)}
            >
              {option.label}
            </button>
          {/each}
        </div>
      </div>

      <AnalyticsFilterSearch
        kind="item"
        label="Items included in receipt"
        placeholder="Search sold items…"
        selected={filters.items}
        onToggle={(option) => filters.toggleItem(option)}
      />

      <AnalyticsFilterSearch
        kind="payment"
        label="Payment type"
        placeholder="Search payment types…"
        selected={filters.paymentTypes}
        onToggle={(option) => filters.togglePaymentType(option)}
      />
    </div>

    <Dialog.Footer class="flex-row justify-between sm:justify-between">
      <button
        type="button"
        class="rounded-full px-4 py-2 text-sm font-semibold text-[#7a6550] hover:bg-[#f1e9e1] disabled:opacity-40"
        disabled={!filters.activeFilterCount}
        onclick={() => filters.clearAll()}
      >
        Clear all
      </button>
      <button type="button" class="rounded-full bg-[#2c2925] px-5 py-2 text-sm font-bold text-white hover:bg-[#7a6550]" onclick={() => (open = false)}>
        Done
      </button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
