<script lang="ts">
  import * as Command from "$lib/components/ui/command";
  import { cn } from "$lib/utils";
  import PlusIcon from "@lucide/svelte/icons/plus";
  import CheckIcon from "@lucide/svelte/icons/check";

  interface Props {
    options: string[];
    value?: string | null;
    placeholder?: string;
    emptyMessage?: string;
    class?: string;
    id?: string;
    onAdd?: (newValue: string) => void;
    onSelect?: (selectedValue: string) => void;
  }

  let {
    options = [],
    value = $bindable<string | null>(null),
    placeholder = 'Select or add...',
    emptyMessage = 'No options found.',
    class: className,
    id,
    onAdd,
    onSelect
  }: Props = $props();

  let searchValue = $state('');
  let open = $state(false);

  const filteredOptions = $derived.by(() => {
    if (!searchValue.trim()) return options;
    const query = searchValue.toLowerCase().trim();
    return options.filter((opt) => opt.toLowerCase().includes(query));
  });

  const exactMatch = $derived(
    options.some((opt) => opt.toLowerCase() === searchValue.toLowerCase().trim())
  );

  const showAddOption = $derived(searchValue.trim() && !exactMatch);

  function handleSelect(selectedValue: string) {
    value = selectedValue;
    onSelect?.(selectedValue);
    open = false;
    searchValue = '';
  }

  function handleAddNew() {
    const newValue = searchValue.trim();
    if (newValue && !exactMatch) {
      onAdd?.(newValue);
      value = newValue;
      open = false;
      searchValue = '';
    }
  }
</script>

<div class={cn('relative', className)}>
  <button
    type="button"
    class="flex h-10 w-full items-center justify-between rounded-2xl border border-[#d9d0c7] bg-white px-4 py-2 text-sm focus:border-[#7a6550] focus:outline-none focus:ring-2 focus:ring-[#cdb69f]/40"
    onclick={() => (open = !open)}
    id={id}
  >
    <span class={cn(!value && 'text-[#7a6550]/50')}>
      {value || placeholder}
    </span>
    <svg
      class="h-4 w-4 opacity-50 transition-transform {open ? 'rotate-180' : ''}"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
    </svg>
  </button>

  {#if open}
    <div
      class="absolute z-50 mt-2 w-full rounded-2xl border border-[#d9d0c7] bg-white shadow-lg"
    >
      <Command.Root class="rounded-2xl border-0">
        <Command.Input
          bind:value={searchValue}
          placeholder={placeholder}
          class="border-0 border-b border-[#d9d0c7] focus:ring-0"
        />
        <Command.List class="max-h-[200px]">
          <Command.Empty>{emptyMessage}</Command.Empty>
          <Command.Group>
            {#each filteredOptions as option (option)}
              <Command.Item
                value={option}
                onSelect={() => handleSelect(option)}
                class="cursor-pointer"
              >
                <CheckIcon class={cn('mr-2 h-4 w-4', value === option ? 'opacity-100' : 'opacity-0')} />
                <span>{option}</span>
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
        </Command.List>
      </Command.Root>
    </div>
  {/if}
</div>

<!-- Close on outside click -->
<svelte:document
  onclick={(e) => {
    if (open && !(e.target as HTMLElement).closest('.relative')) {
      open = false;
      searchValue = '';
    }
  }}
/>

