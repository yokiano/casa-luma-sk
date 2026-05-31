<script lang="ts">
  import { Blocks, TreePine } from 'lucide-svelte';
  import {
    getPlaygroundAddonPreview,
    formatThb,
    type BirthdayCapacityBucket
  } from '$lib/birthday-pricing';

  interface Props {
    selected: boolean | null;
    capacityBucket: BirthdayCapacityBucket | null;
    kidsCount: number;
    onSelect: (value: boolean) => void;
  }

  let { selected = $bindable(), capacityBucket, kidsCount, onSelect }: Props = $props();

  const preview = $derived(getPlaygroundAddonPreview(capacityBucket, kidsCount));
</script>

<div class="grid grid-cols-1 gap-4 sm:gap-6 mt-2 sm:mt-4 w-full max-w-2xl mx-auto pb-8">
  <button
    type="button"
    onclick={() => onSelect(true)}
    class="flex flex-col sm:flex-row items-stretch rounded-[1.5rem] sm:rounded-[2rem] border-2 text-left transition-all overflow-hidden relative group
      {selected === true
        ? 'border-primary bg-primary/5 shadow-lg shadow-primary/5 scale-[1.02]'
        : 'border-muted hover:border-primary/40 hover:bg-muted/30 hover:scale-[1.01]'}"
  >
    <div class="p-6 flex flex-row sm:flex-col justify-between sm:justify-center items-center sm:items-center sm:w-52 border-b sm:border-b-0 sm:border-r border-muted bg-muted/10 shrink-0 gap-3">
      <div class="size-14 rounded-2xl bg-background shadow-md border flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
        <Blocks class="size-7" />
      </div>
      <div class="text-right sm:text-center space-y-1">
        <span class="text-xs font-bold text-muted-foreground block uppercase tracking-wider">Add-on</span>
        <span class="text-sm font-black text-foreground block tracking-tight leading-tight">
          {preview.withPlayground > 0 ? formatThb(preview.withPlayground) : 'Priced at next step'}
        </span>
      </div>
    </div>
    <div class="p-6 flex-1 flex flex-col justify-center space-y-2">
      <span class="text-lg sm:text-xl font-bold tracking-tight block">With playground</span>
      <p class="text-xs sm:text-sm text-muted-foreground leading-relaxed">
        Guaranteed indoor playground access for your party guests.
      </p>
      {#if preview.label}
        <span class="inline-block px-2 py-0.5 rounded-md bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wide">
          {preview.label}
        </span>
      {/if}
    </div>
  </button>

  <button
    type="button"
    onclick={() => onSelect(false)}
    class="flex flex-col sm:flex-row items-stretch rounded-[1.5rem] sm:rounded-[2rem] border-2 text-left transition-all overflow-hidden relative group
      {selected === false
        ? 'border-primary bg-primary/5 shadow-lg shadow-primary/5 scale-[1.02]'
        : 'border-muted hover:border-primary/40 hover:bg-muted/30 hover:scale-[1.01]'}"
  >
    <div class="p-6 flex flex-row sm:flex-col justify-between sm:justify-center items-center sm:items-center sm:w-52 border-b sm:border-b-0 sm:border-r border-muted bg-muted/10 shrink-0 gap-3">
      <div class="size-14 rounded-2xl bg-background shadow-md border flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
        <TreePine class="size-7" />
      </div>
      <div class="text-right sm:text-center space-y-1">
        <span class="text-xs font-bold text-muted-foreground block uppercase tracking-wider">Add-on</span>
        <span class="text-sm font-black text-foreground block tracking-tight leading-tight">0 THB</span>
      </div>
    </div>
    <div class="p-6 flex-1 flex flex-col justify-center space-y-2">
      <span class="text-lg sm:text-xl font-bold tracking-tight block">Without playground</span>
      <p class="text-xs sm:text-sm text-muted-foreground leading-relaxed">
        Keep the celebration in the garden and pool — no indoor playground add-on.
      </p>
    </div>
  </button>
</div>
