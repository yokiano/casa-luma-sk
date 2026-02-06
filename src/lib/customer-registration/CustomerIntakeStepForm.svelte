<script lang="ts">
  import { fly, fade } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import { toast } from 'svelte-sonner';
  import confetti from 'canvas-confetti';
  import { Plus, Trash2, CheckCircle2, RefreshCw, Loader2 } from 'lucide-svelte';
  import { deserialize } from '$app/forms';

  import { IntakeFormState } from './intake-form.state.svelte';
  import StepShell from './StepShell.svelte';
  import GuardianCardStep from './GuardianCardStep.svelte';
  import KidCardStep from './KidCardStep.svelte';
  import RulesApproval from './RulesApproval.svelte';

  const formState = new IntakeFormState();

  let checkingPhone = $state(false);

  /**
   * Phone check effect - debounced check for existing customer
   */
  $effect(() => {
    const phone = formState.mainPhone?.trim();
    if (phone && phone.length >= 9) { // At least a reasonable phone length
      const timer = setTimeout(async () => {
        if (formState.mainPhone !== phone) return; // Guard against rapid changes
        
        checkingPhone = true;
        try {
          const formData = new FormData();
          formData.append('phone', phone);
          
          const response = await fetch('?/check', {
            method: 'POST',
            body: formData,
            headers: {
              'x-sveltekit-action': 'true'
            }
          });
          
          const result = deserialize(await response.text());
          
          // SvelteKit action response handling
          if (result.type === 'success') {
            const data = result.data as any;
            if (data?.exists) {
              formState.foundCustomer = data.customer;
              toast.info(`Welcome back, ${data.customer.name}!`, {
                description: "We've found your details. You can continue to update them if needed.",
                duration: 5000,
              });
            } else {
              formState.foundCustomer = null;
            }
          }
        } catch (e) {
          console.error('[PhoneCheck] Error:', e);
        } finally {
          checkingPhone = false;
        }
      }, 800);
      
      return () => clearTimeout(timer);
    } else {
      formState.foundCustomer = null;
    }
  });

  /**
   * Direction-aware fly transition
   */
  const flyTransition = (node: HTMLElement, { direction }: { direction: 'forward' | 'backward' }) => {
    const x = direction === 'forward' ? 300 : -300;
    return fly(node, { x, duration: 300, easing: cubicOut });
  };

  const flyOutTransition = (node: HTMLElement, { direction }: { direction: 'forward' | 'backward' }) => {
    const x = direction === 'forward' ? -300 : 300;
    return fly(node, { x, duration: 300, easing: cubicOut });
  };

  async function handleSubmit() {
    if (formState.submitting) return;

    formState.submitting = true;
    try {
      const formData = new FormData();
      formData.append('data', JSON.stringify(formState.toFormData()));

      const response = await fetch('?/submit', {
        method: 'POST',
        body: formData,
        headers: {
          'x-sveltekit-action': 'true'
        }
      });

      const result = deserialize(await response.text());

      // SvelteKit action response handling
      if (result.type === 'success') {
        const data = result.data as any;
        if (data?.success) {
          formState.customerCode = data.customerCode;
          formState.success = true;
          
          // Trigger confetti
          confetti({
            particleCount: 150,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#E96A64', '#4B8B84', '#F5D061']
          });
          
          toast.success('Registration successful!');
        } else {
          const errorMsg = data?.message || 'Something went wrong. Please try again.';
          toast.error(errorMsg);
        }
      } else if (result.type === 'failure') {
        const errorMsg = (result.data as any)?.message || 'Validation failed. Please check your input.';
        toast.error(errorMsg);
      } else {
        toast.error('Something went wrong. Please try again.');
      }
    } catch (e) {
      console.error('Submission error:', e);
      toast.error('Failed to submit form. Please check your connection.');
    } finally {
      formState.submitting = false;
    }
  }

  function handleNext() {
    if (formState.isLastStep) {
      if (formState.canProceed()) {
        handleSubmit();
      } else {
        toast.error('Please accept the rules to continue.');
      }
    } else {
      if (formState.canProceed()) {
        formState.next();
      } else {
        toast.error('Please fill in the required fields.');
      }
    }
  }
</script>

<div class="h-dvh w-full overflow-hidden bg-background">
  {#if formState.success}
    <div 
      in:fly={{ y: 20, duration: 500, easing: cubicOut }}
      class="h-full w-full flex flex-col items-center justify-center p-6 text-center"
    >
      <div class="max-w-md w-full space-y-8">
        <div class="flex justify-center">
          <div class="size-24 rounded-full bg-primary/10 flex items-center justify-center">
            <CheckCircle2 class="size-12 text-primary" />
          </div>
        </div>
        
        <div class="space-y-4">
          <h2 class="text-4xl font-bold tracking-tight">You're all set!</h2>
          <p class="text-xl text-muted-foreground leading-relaxed">
            Thank you for registering with Casa Luma. We're excited to have your family with us.
          </p>
        </div>

        {#if formState.customerCode}
          <div class="p-8 bg-primary/5 rounded-[2.5rem] border-2 border-primary/20 space-y-3 relative overflow-hidden group">
            <div class="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
              <CheckCircle2 class="size-24 text-primary" />
            </div>
            
            <p class="text-xs font-bold text-primary/60 uppercase tracking-[0.2em]">Your Family Code</p>
            <p class="text-6xl font-black tracking-tighter text-primary">{formState.customerCode}</p>
            
            <div class="pt-4 space-y-2">
              <p class="text-sm font-semibold text-foreground/80">
                This is your unique family code (starts with the first 2 letters of your family name).
              </p>
              <p class="text-sm text-muted-foreground leading-relaxed">
                Please remember it for <span class="text-primary font-bold">faster check-in</span> and when <span class="text-primary font-bold">ordering food</span> at our cafe.
              </p>
            </div>
          </div>
        {/if}

        <button
          onclick={() => formState.reset()}
          class="w-full flex items-center justify-center gap-2 bg-foreground text-background py-5 rounded-full font-semibold text-lg hover:opacity-90 transition-all active:scale-95"
        >
          <RefreshCw class="size-5" />
          Submit another registration
        </button>
      </div>
    </div>
  {:else}
    {#key formState.currentStep}
      <div 
        in:flyTransition={{ direction: formState.direction }}
        out:flyOutTransition={{ direction: formState.direction }}
        class="h-full w-full"
      >
        <StepShell
          title={formState.currentStepDef.title}
          explainer={formState.currentStepDef.explainer}
          required={formState.currentStepDef.required}
          currentStep={formState.currentStep}
          totalSteps={formState.totalSteps}
          showBack={formState.currentStep > 0}
          showSkip={!formState.currentStepDef.required}
          nextDisabled={!formState.canProceed()}
          onNext={handleNext}
          onSkip={() => formState.skip()}
          onBack={() => formState.back()}
        >
          {#if formState.currentStepDef.id === 'residency'}
            {@render residencyStep()}
          {:else}
            <div class="w-full max-w-lg mx-auto space-y-8 py-4">
              {#if formState.currentStepDef.id === 'family-name'}
                {@render familyNameStep()}
              {:else}
                {#if formState.currentStepDef.id === 'phone'}
                  {@render phoneStep()}
                {:else if formState.currentStepDef.id === 'guardians'}
                  {@render guardiansStep()}
                {:else if formState.currentStepDef.id === 'kids'}
                  {@render kidsStep()}
                {:else if formState.currentStepDef.id === 'extras'}
                  {@render extrasStep()}
                {:else if formState.currentStepDef.id === 'rules'}
                  {@render rulesStep()}
                {/if}
              {/if}
            </div>
          {/if}
        </StepShell>
      </div>
    {/key}
  {/if}
</div>

{#if formState.submitting}
  <div class="fixed inset-0 bg-background/60 backdrop-blur-sm z-50 flex flex-col items-center justify-center gap-4">
    <div class="size-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
    <p class="font-medium text-lg animate-pulse">Submitting your registration...</p>
  </div>
{/if}

<!-- Step Snippets -->

{#snippet residencyStep()}
  <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mt-4 w-full max-w-2xl mx-auto">
    <button
      onclick={() => { formState.livesInPhangan = true; formState.next(); }}
      class="flex flex-col items-center justify-center p-6 sm:p-8 rounded-[2rem] border-2 transition-all text-center gap-4 group
        {formState.livesInPhangan === true ? 'border-primary bg-primary/5 shadow-xl shadow-primary/10' : 'border-muted hover:border-primary/40 hover:bg-muted/30'}"
    >
      <div class="size-16 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
        <span class="text-3xl">🏝️</span>
      </div>
      <div class="space-y-1">
        <span class="text-xl font-bold block tracking-tight">I live in Koh Phangan</span>
        <span class="text-xs text-muted-foreground leading-relaxed italic">Local resident with a home base on the island</span>
      </div>
    </button>

    <button
      onclick={() => { formState.livesInPhangan = false; formState.next(); }}
      class="flex flex-col items-center justify-center p-6 sm:p-8 rounded-[2rem] border-2 transition-all text-center gap-4 group
        {formState.livesInPhangan === false ? 'border-primary bg-primary/5 shadow-xl shadow-primary/10' : 'border-muted hover:border-primary/40 hover:bg-muted/30'}"
    >
      <div class="size-16 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
        <span class="text-3xl">🧳</span>
      </div>
      <div class="space-y-1">
        <span class="text-xl font-bold block tracking-tight">I'm only visiting</span>
        <span class="text-xs text-muted-foreground leading-relaxed italic">Tourist or short-term visitor enjoying the island</span>
      </div>
    </button>
  </div>
{/snippet}

{#snippet familyNameStep()}
  <div class="space-y-4">
    <input
      type="text"
      bind:value={formState.familyName}
      placeholder="e.g. Smith"
      class="w-full text-4xl sm:text-6xl font-bold bg-transparent border-none focus:ring-0 placeholder:text-muted-foreground/20 text-center sm:text-left"
      autofocus
    />
    <div class="h-px w-full bg-gradient-to-r from-primary to-transparent opacity-30"></div>
  </div>
{/snippet}

{#snippet phoneStep()}
  <div class="space-y-4">
    <div class="relative">
      <input
        type="tel"
        bind:value={formState.mainPhone}
        placeholder="+66..."
        class="w-full text-4xl sm:text-6xl font-bold bg-transparent border-none focus:ring-0 placeholder:text-muted-foreground/20 text-center sm:text-left"
        autofocus
      />
      {#if checkingPhone}
        <div class="absolute right-0 top-1/2 -translate-y-1/2">
          <Loader2 class="size-6 animate-spin text-primary/40" />
        </div>
      {/if}
    </div>
    <div class="h-px w-full bg-gradient-to-r from-primary to-transparent opacity-30"></div>
    
    {#if formState.foundCustomer}
      <div in:fade class="flex items-center gap-2 text-primary font-medium animate-in fade-in slide-in-from-top-2 justify-center sm:justify-start">
        <CheckCircle2 class="size-5" />
        <span class="text-lg">Welcome back, {formState.foundCustomer.name}!</span>
      </div>
    {/if}
  </div>
{/snippet}

{#snippet guardiansStep()}
  <div class="space-y-6">
    {#each formState.caregivers as _, i (formState.caregivers[i].id)}
      <div class="relative group">
        <GuardianCardStep 
          bind:guardian={formState.caregivers[i]}
          onRemove={() => formState.removeCaregiver(formState.caregivers[i].id)}
          isRemovable={formState.caregivers.length > 1}
        />
      </div>
    {/each}

    <button
      onclick={() => formState.addCaregiver()}
      class="w-full py-4 rounded-3xl border-2 border-dashed border-muted-foreground/20 hover:border-primary/40 hover:bg-primary/5 transition-all flex items-center justify-center gap-2 text-muted-foreground hover:text-primary font-medium"
    >
      <Plus class="size-5" />
      Add another guardian
    </button>
  </div>
{/snippet}

{#snippet kidsStep()}
  <div class="space-y-6">
    {#each formState.kids as _, i (formState.kids[i].id)}
      <div class="relative group">
        <KidCardStep 
          bind:kid={formState.kids[i]}
          onRemove={() => formState.removeKid(formState.kids[i].id)}
          isRemovable={formState.kids.length > 1}
        />
      </div>
    {/each}

    <button
      onclick={() => formState.addKid()}
      class="w-full py-4 rounded-3xl border-2 border-dashed border-muted-foreground/20 hover:border-primary/40 hover:bg-primary/5 transition-all flex items-center justify-center gap-2 text-muted-foreground hover:text-primary font-medium"
    >
      <Plus class="size-5" />
      Add another child
    </button>
  </div>
{/snippet}

{#snippet extrasStep()}
  <div class="space-y-8">
    <div class="space-y-3">
      <div class="flex items-center gap-2 ml-1">
        <span class="text-lg">🌏</span>
        <label for="nationality" class="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Nationality</label>
      </div>
      <input
        id="nationality"
        type="text"
        bind:value={formState.nationality}
        placeholder="Which country are you from?"
        class="w-full p-5 rounded-2xl bg-muted/50 border-none focus:ring-2 focus:ring-primary/20 transition-all text-lg"
      />
    </div>

    <div class="space-y-3">
      <label for="dietary" class="text-sm font-semibold text-muted-foreground uppercase tracking-wider ml-1">Dietary Preferences</label>
      <select
        id="dietary"
        bind:value={formState.dietaryPreference}
        class="w-full p-5 rounded-2xl bg-muted/50 border-none focus:ring-2 focus:ring-primary/20 transition-all text-lg appearance-none"
      >
        <option value="None">No specific dietary requirements</option>
        <option value="Vegetarian">Vegetarian</option>
        <option value="Vegan">Vegan</option>
        <option value="Gluten-Free">Gluten-Free</option>
        <option value="Dairy-Free">Dairy-Free</option>
        <option value="Other">Other (please specify in notes)</option>
      </select>
    </div>

    <div class="space-y-3">
      <label for="how-heard" class="text-sm font-semibold text-muted-foreground uppercase tracking-wider ml-1">How did you hear about us?</label>
      <input
        id="how-heard"
        type="text"
        bind:value={formState.howDidYouHear}
        placeholder="Instagram, Friend, Google, etc."
        class="w-full p-5 rounded-2xl bg-muted/50 border-none focus:ring-2 focus:ring-primary/20 transition-all text-lg"
      />
    </div>

    <div class="space-y-3">
      <label for="special-notes" class="text-sm font-semibold text-muted-foreground uppercase tracking-wider ml-1">Any special notes?</label>
      <textarea
        id="special-notes"
        bind:value={formState.specialNotes}
        placeholder="Allergies, preferences, or anything else we should know?"
        rows="3"
        class="w-full p-5 rounded-2xl bg-muted/50 border-none focus:ring-2 focus:ring-primary/20 transition-all text-lg resize-none"
      ></textarea>
    </div>
  </div>
{/snippet}

{#snippet rulesStep()}
  <div class="w-full">
    <RulesApproval bind:accepted={formState.rulesAccepted} />
  </div>
{/snippet}

<style>
  :global(.sonner-toast) {
    border-radius: 1.5rem !important;
    padding: 1rem 1.5rem !important;
  }
</style>
