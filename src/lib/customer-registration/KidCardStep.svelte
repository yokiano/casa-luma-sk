<script lang="ts">
  import type { Kid } from '$lib/types/intake';
  import { Trash2 } from 'lucide-svelte';
  
  interface Props {
    kid: Kid;
    onRemove: () => void;
    isRemovable: boolean;
  }
  
  let { kid = $bindable(), onRemove, isRemovable }: Props = $props();
</script>

<div class="bg-card/30 rounded-2xl p-4 sm:p-5 border border-border/50 relative shadow-sm transition-all hover:border-primary/20">
  {#if isRemovable}
    <button 
      onclick={onRemove}
      class="absolute top-2 right-2 p-1.5 text-muted-foreground/30 hover:text-destructive hover:bg-destructive/5 rounded-full transition-all"
      aria-label="Remove kid"
    >
      <Trash2 class="size-4" />
    </button>
  {/if}

  <div class="space-y-4">
    <!-- Name -->
    <div>
      <label for={`kid-name-${kid.id}`} class="block text-xs font-semibold mb-1 ml-1 text-muted-foreground capitalize tracking-wider">Kid's Name <span class="text-primary">*</span></label>
      <input 
        id={`kid-name-${kid.id}`}
        type="text" 
        bind:value={kid.name}
        class="w-full bg-background border border-muted rounded-xl px-4 py-2 text-base focus:border-primary/50 focus:ring-2 focus:ring-primary/5 outline-none transition-all placeholder:text-muted-foreground/30"
        placeholder="Kid Name"
        required
      />
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <!-- Gender -->
      <div>
        <fieldset class="space-y-1">
          <legend class="block text-xs font-semibold mb-1 ml-1 text-muted-foreground capitalize tracking-wider">Gender</legend>
          <div class="flex gap-2">
            {#each ['Boy', 'Girl'] as gender}
              <button
                class="flex-1 py-2 px-3 rounded-xl border transition-all duration-200 flex items-center justify-center gap-2 {kid.gender === gender ? 'border-primary bg-primary/5 text-primary shadow-sm shadow-primary/5' : 'border-muted bg-background text-muted-foreground hover:border-primary/30'}"
                onclick={() => (kid.gender = gender as any)}
                type="button"
              >
                <span class="font-bold text-sm">{gender}</span>
              </button>
            {/each}
          </div>
        </fieldset>
      </div>

      <!-- DOB -->
      <div>
        <div class="flex justify-between items-center mb-1 px-1">
          <label for={`kid-dob-${kid.id}`} class="block text-xs font-semibold text-muted-foreground capitalize tracking-wider">Date of Birth</label>
          <span class="text-[10px] text-muted-foreground/40 capitalize tracking-widest font-bold italic">Optional</span>
        </div>
        <input
          id={`kid-dob-${kid.id}`}
          type="date"
          bind:value={kid.dob}
          class="w-full bg-background border border-muted rounded-xl px-4 py-2 text-sm focus:border-primary/50 focus:ring-2 focus:ring-primary/5 outline-none transition-all"
        />
      </div>
    </div>
  </div>
</div>
