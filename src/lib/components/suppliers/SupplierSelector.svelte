<script lang="ts">
  import * as Command from "$lib/components/ui/command";
  import * as Popover from "$lib/components/ui/popover";
  import { cn } from "$lib/utils";
  import PlusIcon from "@lucide/svelte/icons/plus";
  import CheckIcon from "@lucide/svelte/icons/check";
  import { createSupplier } from "$lib/suppliers.remote";
  import { toast } from "svelte-sonner";

  interface Supplier {
    id: string;
    name: string;
  }

  interface Props {
    suppliers: Supplier[];
    value?: string | null;
    placeholder?: string;
    class?: string;
    onSelect?: (supplierId: string) => void;
    onSupplierCreated?: (newSupplier: Supplier) => void;
  }

  let {
    suppliers = [],
    value = $bindable<string | null>(null),
    placeholder = 'Select supplier...',
    class: className,
    onSelect,
    onSupplierCreated
  }: Props = $props();

  let searchValue = $state('');
  let open = $state(false);
  let isCreating = $state(false);

  const filteredSuppliers = $derived.by(() => {
    if (!searchValue.trim()) return suppliers;
    const query = searchValue.toLowerCase().trim();
    return suppliers.filter((s) => s.name.toLowerCase().includes(query));
  });

  const selectedSupplier = $derived(
    suppliers.find((s) => s.id === value)
  );

  const exactMatch = $derived(
    suppliers.some((s) => s.name.toLowerCase() === searchValue.toLowerCase().trim())
  );

  const showAddOption = $derived(searchValue.trim() && !exactMatch && !isCreating);

  $effect(() => {
    if (!open) {
      searchValue = '';
    }
  });

  function handleSelect(supplierId: string) {
    value = supplierId;
    onSelect?.(supplierId);
    open = false;
    searchValue = '';
  }

  async function handleAddNew() {
    const newName = searchValue.trim();
    if (!newName || isCreating) return;

    isCreating = true;
    try {
      const result = await createSupplier({ name: newName });
      toast.success(`Supplier "${newName}" created`);
      
      // Update local value immediately
      value = result.id;
      onSelect?.(result.id);
      
      // Notify parent to refresh/update the suppliers list
      onSupplierCreated?.(result);
      
      open = false;
      searchValue = '';
    } catch (err: any) {
      toast.error('Failed to create supplier', { description: err.message });
    } finally {
      isCreating = false;
    }
  }
</script>

<Popover.Root bind:open>
  <Popover.Trigger
    class={cn(
      'flex h-10 w-full items-center justify-between rounded-2xl border border-[#d9d0c7] bg-white px-4 py-2 text-sm transition-colors hover:border-[#7a6550] focus:border-[#7a6550] focus:outline-none focus:ring-2 focus:ring-[#cdb69f]/40 disabled:opacity-50',
      className
    )}
    disabled={isCreating}
  >
    <span class={cn('truncate', !selectedSupplier && 'text-[#7a6550]/50')}>
      {selectedSupplier?.name || placeholder}
    </span>
    <svg
      class="ml-2 h-4 w-4 shrink-0 opacity-50 transition-transform {open ? 'rotate-180' : ''}"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
    </svg>
  </Popover.Trigger>

  <Popover.Content
    class="w-[var(--bits-popover-anchor-width)] p-0 rounded-2xl border border-[#d9d0c7] bg-white shadow-lg overflow-hidden"
    sideOffset={8}
  >
    <Command.Root class="rounded-2xl border-0">
      <Command.Input
        bind:value={searchValue}
        placeholder="Search suppliers..."
        class="border-0 border-b border-[#d9d0c7] focus:ring-0"
      />
      <Command.List class="max-h-[300px] overflow-y-auto">
        {#if isCreating}
          <div class="p-4 text-center text-sm text-[#5c4a3d]/60">
            Creating supplier...
          </div>
        {:else}
          <Command.Empty>
            <div class="p-2 text-sm text-[#5c4a3d]/60">No supplier found.</div>
          </Command.Empty>
          <Command.Group>
            <Command.Item
              value=""
              onSelect={() => handleSelect('')}
              class="cursor-pointer"
            >
              <CheckIcon class={cn('mr-2 h-4 w-4', !value ? 'opacity-100' : 'opacity-0')} />
              <span class="italic text-[#5c4a3d]/60">None</span>
            </Command.Item>
            
            {#each filteredSuppliers as supplier (supplier.id)}
              <Command.Item
                value={supplier.name}
                onSelect={() => handleSelect(supplier.id)}
                class="cursor-pointer"
              >
                <CheckIcon class={cn('mr-2 h-4 w-4', value === supplier.id ? 'opacity-100' : 'opacity-0')} />
                <span>{supplier.name}</span>
              </Command.Item>
            {/each}

            {#if showAddOption}
              <Command.Separator />
              <Command.Item
                value={searchValue}
                onSelect={handleAddNew}
                class="cursor-pointer text-[#7a6550] font-semibold"
              >
                <PlusIcon class="mr-2 h-4 w-4" />
                <span>Add "{searchValue.trim()}"</span>
              </Command.Item>
            {/if}
          </Command.Group>
        {/if}
      </Command.List>
    </Command.Root>
  </Popover.Content>
</Popover.Root>
