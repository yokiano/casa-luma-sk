<script lang="ts">
  import type { Caregiver } from '$lib/types/intake';
  import { Trash2 } from 'lucide-svelte';
  
  interface Props {
    guardian: Caregiver;
    onRemove: () => void;
    isRemovable: boolean;
  }
  
  let { guardian = $bindable(), onRemove, isRemovable }: Props = $props();
</script>

<div class="bg-card/30 rounded-2xl p-4 sm:p-5 border border-border/50 relative shadow-sm transition-all hover:border-primary/20">
  {#if isRemovable}
    <button 
      onclick={onRemove}
      class="absolute top-2 right-2 p-1.5 text-muted-foreground/30 hover:text-destructive hover:bg-destructive/5 rounded-full transition-all"
      aria-label="Remove guardian"
    >
      <Trash2 class="size-4" />
    </button>
  {/if}

  <div class="space-y-4">
    <!-- Name and Role Row -->
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <label for={`caregiver-name-${guardian.id}`} class="block text-xs font-semibold mb-1 ml-1 text-muted-foreground capitalize tracking-wider">Name <span class="text-primary">*</span></label>
        <input 
          id={`caregiver-name-${guardian.id}`}
          type="text" 
          bind:value={guardian.name}
          class="w-full bg-background border border-muted rounded-xl px-4 py-2 text-base focus:border-primary/50 focus:ring-2 focus:ring-primary/5 outline-none transition-all placeholder:text-muted-foreground/30"
          placeholder="Guardian Name"
          required
        />
      </div>

      <div>
        <p class="block text-xs font-semibold mb-1 ml-1 text-muted-foreground capitalize tracking-wider">Role</p>
        <div class="flex gap-2">
          {#each ['Parent', 'Caregiver'] as role}
            <button
              class="flex-1 py-2 px-3 rounded-xl border transition-all duration-200 flex items-center justify-center gap-2 {guardian.caregiverRole === role ? 'border-primary bg-primary/5 text-primary shadow-sm shadow-primary/5' : 'border-muted bg-background text-muted-foreground hover:border-primary/30'}"
              onclick={() => (guardian.caregiverRole = role as any)}
              type="button"
            >
              <span class="font-bold text-sm">{role}</span>
            </button>
          {/each}
        </div>
      </div>
    </div>

    <!-- Contact Method and Phone Row -->
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div class="space-y-1">
        <p class="block text-xs font-semibold mb-1 ml-1 text-muted-foreground capitalize tracking-wider">Contact Method</p>
        <div class="flex gap-2">
          <button
            class="flex-1 py-2 px-3 rounded-xl border transition-all duration-200 flex items-center justify-center gap-2 {guardian.contactMethod === 'Thai Phone' ? 'border-primary bg-primary/5 text-primary shadow-sm shadow-primary/5' : 'border-muted bg-background text-muted-foreground hover:border-primary/30'}"
            onclick={() => guardian.contactMethod = 'Thai Phone'}
            type="button"
          >
            <span class="text-base">🇹🇭</span>
            <span class="font-bold text-xs whitespace-nowrap">Thai Phone</span>
          </button>
          <button
            class="flex-1 py-2 px-3 rounded-xl border transition-all duration-200 flex items-center justify-center gap-2 {guardian.contactMethod === 'WhatsApp' ? 'border-[#25D366] bg-[#25D366]/5 text-[#25D366] shadow-sm shadow-[#25D366]/5' : 'border-muted bg-background text-muted-foreground hover:border-[#25D366]/30'}"
            onclick={() => guardian.contactMethod = 'WhatsApp'}
            type="button"
          >
            <span class="text-base">💬</span>
            <span class="font-bold text-xs whitespace-nowrap">WhatsApp</span>
          </button>
        </div>
      </div>

      <div>
        <label for={`caregiver-phone-${guardian.id}`} class="block text-xs font-semibold mb-1 ml-1 text-muted-foreground capitalize tracking-wider">Phone Number</label>
        <input 
          id={`caregiver-phone-${guardian.id}`}
          type="tel" 
          bind:value={guardian.phone}
          class="w-full bg-background border border-muted rounded-xl px-4 py-2 text-base focus:border-primary/50 focus:ring-2 focus:ring-primary/5 outline-none font-mono transition-all placeholder:text-muted-foreground/30"
          placeholder={guardian.contactMethod === 'Thai Phone' ? '+66 81 234 5678' : '+Country Code'}
        />
      </div>
    </div>
  </div>
</div>
