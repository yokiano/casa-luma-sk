<script lang="ts" generics="T extends { id: string }">
  import { Plus } from 'lucide-svelte';
  import { type Snippet } from 'svelte';
  import { flip } from 'svelte/animate';
  import { fade, slide } from 'svelte/transition';

  interface Props {
    title: string;
    items: T[];
    emptyText?: string;
    addButtonText: string;
    // Snippet for rendering each item card
    itemRenderer: Snippet<[T, () => void]>; // item, remove callback
    onAdd: () => void;
    onRemove: (id: string) => void;
  }

  let { 
    title, 
    items = $bindable(), 
    emptyText = "No items added yet",
    addButtonText,
    itemRenderer,
    onAdd,
    onRemove 
  }: Props = $props();
</script>

<div class="space-y-4">
  <div class="flex items-center justify-between px-1">
    <h3 class="text-xl font-semibold text-foreground">{title}</h3>
    <span class="text-sm font-medium text-muted-foreground bg-secondary/30 px-2.5 py-0.5 rounded-full">
      {items.length}
    </span>
  </div>

  <div class="space-y-4">
    {#each items as item (item.id)}
      <div animate:flip={{ duration: 300 }} transition:slide={{ axis: 'y', duration: 300 }}>
        {@render itemRenderer(item, () => onRemove(item.id))}
      </div>
    {/each}

    <button
      onclick={onAdd}
      type="button"
      class="w-full py-4 bg-[#5c4a3d] rounded-xl flex items-center justify-center gap-2 text-white hover:bg-[#5c4a3d]/90 active:scale-[0.99] transition-all group cursor-pointer shadow-md"
    >
      <div class="size-8 rounded-full bg-white/20 flex items-center justify-center group-hover:bg-white/30 transition-colors">
        <Plus class="size-5" />
      </div>
      <span class="font-bold text-lg">{addButtonText}</span>
    </button>
  </div>
</div>
