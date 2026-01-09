<script lang="ts">
  import type { Kid } from '$lib/types/intake';
  import { Minus, Plus } from 'lucide-svelte';
  
  interface Props {
    kid: Kid;
    onRemove: () => void;
  }
  
  let { kid, onRemove }: Props = $props();
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
      <label class="block text-sm font-medium mb-1.5 ml-1 text-muted-foreground">Name <span class="text-destructive">*</span></label>
      <input 
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
             <label class="block text-sm font-medium mb-1.5 ml-1 text-muted-foreground">Gender</label>
             <div class="flex gap-3">
                <button
                class="flex-1 py-3 px-4 rounded-xl border-2 transition-all duration-200 flex flex-col items-center gap-1 {kid.gender === 'boy' ? 'border-primary bg-primary/5 text-primary' : 'border-input bg-background text-muted-foreground hover:border-primary/50'}"
                onclick={() => kid.gender = 'boy'}
                type="button"
                >
                <span class="font-medium">Boy</span>
                </button>
                <button
                class="flex-1 py-3 px-4 rounded-xl border-2 transition-all duration-200 flex flex-col items-center gap-1 {kid.gender === 'girl' ? 'border-primary bg-primary/5 text-primary' : 'border-input bg-background text-muted-foreground hover:border-primary/50'}"
                onclick={() => kid.gender = 'girl'}
                type="button"
                >
                <span class="font-medium">Girl</span>
                </button>
            </div>
        </div>

        <!-- Age -->
        <div class="col-span-2 sm:col-span-1">
            <label class="block text-sm font-medium mb-1.5 ml-1 text-muted-foreground">Age</label>
            <div class="flex items-center gap-3 bg-background border border-input rounded-xl p-1.5">
                <button 
                class="size-10 rounded-lg bg-secondary/30 text-secondary-foreground flex items-center justify-center hover:bg-secondary/50 active:scale-95 transition-all"
                onclick={() => kid.age = Math.max(0, kid.age - 1)}
                type="button"
                >
                <Minus class="size-5" />
                </button>
                <span class="text-xl font-bold flex-1 text-center">{kid.age}</span>
                <button 
                class="size-10 rounded-lg bg-primary/20 text-primary-foreground flex items-center justify-center hover:bg-primary/30 active:scale-95 transition-all"
                onclick={() => kid.age = kid.age + 1}
                type="button"
                >
                <Plus class="size-5 text-primary" />
                </button>
            </div>
        </div>
    </div>

    <!-- Notes -->
    <div>
        <label class="block text-sm font-medium mb-1.5 ml-1 text-muted-foreground">Notes for this kid</label>
        <textarea 
          bind:value={kid.notes}
          rows="2"
          class="w-full bg-background border border-input rounded-xl px-4 py-3 text-base focus:ring-2 focus:ring-primary/20 outline-none resize-none transition-all placeholder:text-muted-foreground/40"
          placeholder="Allergies, personality, or specific needs..."
        ></textarea>
    </div>
  </div>
</div>
