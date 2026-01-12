<script lang="ts">
  import type { Caregiver } from '$lib/types/intake';
  import { Phone, Minus } from 'lucide-svelte';
  
  interface Props {
    guardian: Caregiver;
    onRemove: () => void;
  }
  
  let { guardian, onRemove }: Props = $props();

  function formatPhone(value: string) {
    // Basic formatting placeholder if needed in the future
    return value;
  }
</script>

<div class="bg-card/50 rounded-xl p-5 border border-border/50 relative shadow-sm">
   <button 
    onclick={onRemove}
    class="absolute top-3 right-3 p-2 text-muted-foreground/50 hover:text-destructive transition-colors"
    aria-label="Remove guardian"
  >
    <Minus class="size-5" />
  </button>

  <div class="space-y-5 mt-2">
     <!-- Name -->
    <div>
      <label for={`caregiver-name-${guardian.id}`} class="block text-sm font-medium mb-1.5 ml-1 text-muted-foreground">Name <span class="text-destructive">*</span></label>
      <input 
        id={`caregiver-name-${guardian.id}`}
        type="text" 
        bind:value={guardian.name}
        class="w-full bg-background border border-input rounded-xl px-4 py-3 text-lg focus:ring-2 focus:ring-primary/20 outline-none transition-all placeholder:text-muted-foreground/40"
        placeholder="Caregiver Name"
        required
      />
    </div>

    <!-- Role -->
    <div>
      <p class="block text-sm font-medium mb-1.5 ml-1 text-muted-foreground">Role</p>
      <div class="flex gap-3">
        <button
          class="flex-1 py-3 px-4 rounded-xl border-2 transition-all duration-200 flex items-center justify-center gap-2 {guardian.caregiverRole === 'Parent' ? 'border-primary bg-primary/5 text-primary' : 'border-input bg-background text-muted-foreground hover:border-primary/50'}"
          onclick={() => (guardian.caregiverRole = 'Parent')}
          type="button"
        >
          <span class="font-medium">Parent</span>
        </button>
        <button
          class="flex-1 py-3 px-4 rounded-xl border-2 transition-all duration-200 flex items-center justify-center gap-2 {guardian.caregiverRole === 'Caregiver' ? 'border-primary bg-primary/5 text-primary' : 'border-input bg-background text-muted-foreground hover:border-primary/50'}"
          onclick={() => (guardian.caregiverRole = 'Caregiver')}
          type="button"
        >
          <span class="font-medium">Caregiver</span>
        </button>
      </div>
    </div>

    <!-- Contact Type -->
    <div>
        <p class="block text-sm font-medium mb-1.5 ml-1 text-muted-foreground">Contact Method</p>
        <div class="flex gap-3">
            <button
            class="flex-1 py-3 px-4 rounded-xl border-2 transition-all duration-200 flex items-center justify-center gap-2 {guardian.contactMethod === 'Thai Phone' ? 'border-primary bg-primary/5 text-primary' : 'border-input bg-background text-muted-foreground hover:border-primary/50'}"
            onclick={() => guardian.contactMethod = 'Thai Phone'}
            type="button"
            >
            <Phone class="size-5" />
            <span class="font-medium">Thai Phone</span>
            </button>
            <button
            class="flex-1 py-3 px-4 rounded-xl border-2 transition-all duration-200 flex items-center justify-center gap-2 {guardian.contactMethod === 'WhatsApp' ? 'border-[#25D366] bg-[#25D366]/5 text-[#25D366]' : 'border-input bg-background text-muted-foreground hover:border-[#25D366]/50'}"
            onclick={() => guardian.contactMethod = 'WhatsApp'}
            type="button"
            >
            <!-- WhatsApp color -->
            <div class="size-5 rounded-full bg-[#25D366] flex items-center justify-center text-white text-[10px] font-bold">WA</div>
            <span class="font-medium">WhatsApp</span>
            </button>
        </div>
    </div>

    <!-- Phone Input -->
    <div>
      <label for={`caregiver-phone-${guardian.id}`} class="block text-sm font-medium mb-1.5 ml-1 text-muted-foreground">Number <span class="text-destructive">*</span></label>
      <div class="relative">
        <span class="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium select-none">
             {guardian.contactMethod === 'Thai Phone' ? '+66' : '+'}
        </span>
        <input 
          id={`caregiver-phone-${guardian.id}`}
          type="tel" 
          bind:value={guardian.phone}
          class="w-full bg-background border border-input rounded-xl pl-14 pr-4 py-3 text-lg focus:ring-2 focus:ring-primary/20 outline-none font-mono transition-all"
          placeholder={guardian.contactMethod === 'Thai Phone' ? '81 234 5678' : 'Country Code + Number'}
          required
        />
      </div>
    </div>

    <!-- Notes -->
    <div>
        <label for={`caregiver-notes-${guardian.id}`} class="block text-sm font-medium mb-1.5 ml-1 text-muted-foreground">Notes for this caregiver</label>
        <textarea 
          id={`caregiver-notes-${guardian.id}`}
          bind:value={guardian.notes}
          rows="2"
          class="w-full bg-background border border-input rounded-xl px-4 py-3 text-base focus:ring-2 focus:ring-primary/20 outline-none resize-none transition-all placeholder:text-muted-foreground/40"
          placeholder="Occupation, interests, or anything else..."
        ></textarea>
    </div>
  </div>
</div>
