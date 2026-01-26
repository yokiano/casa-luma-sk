<script lang="ts">
  import type { Kid } from '$lib/types/intake';
  import { Minus } from 'lucide-svelte';
  
  interface Props {
    kid: Kid;
    onRemove: () => void;
  }
  
  let { kid = $bindable(), onRemove }: Props = $props();
</script>

<div class="bg-card/50 rounded-xl p-5 border border-border/50 relative shadow-sm">
  <button 
    onclick={onRemove}
    class="absolute top-3 right-3 p-2 text-muted-foreground/50 hover:text-destructive transition-colors"
    aria-label="Remove kid"
  >
    <Minus class="size-5" />
  </button>

  <div class="space-y-5 mt-2">
    <!-- Name -->
    <div>
      <label for={`kid-name-${kid.id}`} class="block text-sm font-medium mb-1.5 ml-1 text-muted-foreground">Name <span class="text-destructive">*</span></label>
      <input 
        id={`kid-name-${kid.id}`}
        type="text" 
        bind:value={kid.name}
        class="w-full bg-background border border-input rounded-xl px-4 py-3 text-lg focus:ring-2 focus:ring-primary/20 outline-none transition-all placeholder:text-muted-foreground/40"
        placeholder="Kid's Name"
        required
      />
    </div>

    <div class="grid grid-cols-2 gap-4">
        <!-- Gender -->
        <div class="col-span-2 sm:col-span-1">
             <fieldset class="space-y-1">
               <legend class="block text-sm font-medium mb-1.5 ml-1 text-muted-foreground">Gender</legend>
             <div class="flex gap-3">
                <button
                class="flex-1 py-3 px-4 rounded-xl border-2 transition-all duration-200 flex flex-col items-center gap-1 {kid.gender === 'Boy' ? 'border-primary bg-primary/5 text-primary' : 'border-input bg-background text-muted-foreground hover:border-primary/50'}"
                onclick={() => kid.gender = 'Boy'}
                type="button"
                >
                <span class="font-medium">Boy</span>
                </button>
                <button
                class="flex-1 py-3 px-4 rounded-xl border-2 transition-all duration-200 flex flex-col items-center gap-1 {kid.gender === 'Girl' ? 'border-primary bg-primary/5 text-primary' : 'border-input bg-background text-muted-foreground hover:border-primary/50'}"
                onclick={() => kid.gender = 'Girl'}
                type="button"
                >
                <span class="font-medium">Girl</span>
                </button>
            </div>
             </fieldset>
        </div>

        <!-- DOB -->
        <div class="col-span-2 sm:col-span-1">
          <div class="flex justify-between items-center">
            <label for={`kid-dob-${kid.id}`} class="block text-sm font-medium mb-1.5 ml-1 text-muted-foreground">DOB</label>
            <span class="text-[10px] text-muted-foreground uppercase tracking-wider font-medium"
              >Optional</span
            >
          </div>
          <input
            id={`kid-dob-${kid.id}`}
            type="date"
            bind:value={kid.dob}
            class="w-full bg-background border border-input rounded-xl px-4 py-3 text-base focus:ring-2 focus:ring-primary/20 outline-none transition-all"
          />
        </div>
    </div>

    <!-- Notes -->
    <div>
        <label for={`kid-notes-${kid.id}`} class="block text-sm font-medium mb-1.5 ml-1 text-muted-foreground">Notes for this kid</label>
        <textarea 
          id={`kid-notes-${kid.id}`}
          bind:value={kid.notes}
          rows="2"
          class="w-full bg-background border border-input rounded-xl px-4 py-3 text-base focus:ring-2 focus:ring-primary/20 outline-none resize-none transition-all placeholder:text-muted-foreground/40"
          placeholder="Allergies, personality, or specific needs..."
        ></textarea>
    </div>
  </div>
</div>
