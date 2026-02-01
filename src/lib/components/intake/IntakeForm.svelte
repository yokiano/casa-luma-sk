<script lang="ts">
  import { enhance } from "$app/forms";
  import { browser } from '$app/environment';
  import type { IntakeFormData } from "$lib/types/intake";
  import { toast } from 'svelte-sonner';
  import { fade } from 'svelte/transition';
  import { untrack } from 'svelte';
  import PersonListEditor from "./PersonListEditor.svelte";
  import KidCard from "./KidCard.svelte";
  import GuardianCard from "./GuardianCard.svelte";
  
  let formData = $state<IntakeFormData>({
    familyName: "",
    mainPhone: "",
    email: "",
    kids: [],
    caregivers: [],
    livesInPhangan: null,
    nationality: "",
    dietaryPreference: "None",
    howDidYouHear: "",
    specialNotes: "",
  });

  let submitting = $state(false);
  let success = $state(false);
  let submittedCustomerCode = $state<string | undefined>(undefined);
  let existingCustomer = $state<{ name: string; code: string | undefined } | null>(null);
  let checkingExistence = $state(false);

  async function checkExistence() {
    if (success) return;
    if (!formData.mainPhone && !formData.email) {
      existingCustomer = null;
      return;
    }

    checkingExistence = true;
    try {
      const data = new FormData();
      data.append('phone', formData.mainPhone || '');
      data.append('email', formData.email || '');

      const response = await fetch('?/check', {
        method: 'POST',
        body: data
      });

      if (response.ok) {
        const result = await response.json();
        // SvelteKit action response is nested in 'data'
        const actionData = JSON.parse(result.data);
        if (actionData && actionData[1] && actionData[1].exists) {
          existingCustomer = actionData[1].customer;
        } else {
          existingCustomer = null;
        }
      }
    } catch (e) {
      console.error('Check existence failed:', e);
    } finally {
      checkingExistence = false;
    }
  }

  let checkTimeout: ReturnType<typeof setTimeout>;
  
  $effect(() => {
    // track specific fields
    const phone = formData.mainPhone;
    const email = formData.email;
    const isSuccess = success;

    untrack(() => {
      if (isSuccess) return;
      if (phone || email) {
        clearTimeout(checkTimeout);
        checkTimeout = setTimeout(checkExistence, 1000);
      } else {
        existingCustomer = null;
      }
    });
  });

  async function runConfetti() {
    if (!browser) return;

    const mod = await import('canvas-confetti');
    const confetti = (mod as unknown as { default?: (opts: unknown) => void }).default ?? (mod as unknown as (opts: unknown) => void);

    confetti({
      particleCount: 120,
      spread: 70,
      startVelocity: 35,
      scalar: 0.9,
      origin: { y: 0.7 },
      colors: ['#5c4a3d', '#d4a373', '#e7d8c9', '#b08968'],
    });
  }

  function resetForm() {
    success = false;
    submittedCustomerCode = undefined;
    formData = {
      familyName: "",
      mainPhone: "",
      email: "",
      kids: [],
      caregivers: [],
      livesInPhangan: null,
      nationality: "",
      dietaryPreference: "None",
      howDidYouHear: "",
      specialNotes: "",
    };
  }

  function addKid() {
    formData.kids = [
      ...formData.kids,
      { id: crypto.randomUUID(), name: "", gender: "Boy", dob: "" },
    ];
  }

  function removeKid(id: string) {
    formData.kids = formData.kids.filter((k) => k.id !== id);
  }

  function addCaregiver() {
    formData.caregivers = [
      ...formData.caregivers,
      {
        id: crypto.randomUUID(),
        name: "",
        caregiverRole: "Parent",
        contactMethod: "WhatsApp",
        phone: "",
      },
    ];
  }

  function removeCaregiver(id: string) {
    formData.caregivers = formData.caregivers.filter((g) => g.id !== id);
  }
</script>

<div class="max-w-lg mx-auto p-4 sm:p-6 space-y-8">
  <div class="flex justify-between items-center">
    <div class="w-10"></div>
  </div>

  {#if success}
    <div in:fade class="space-y-6">
      <div class="text-center space-y-4">
        <div class="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-green-700 text-3xl">
          ✓
        </div>
        <h1 class="text-3xl sm:text-4xl font-bold tracking-tight text-[#5c4a3d]">
          Registration received
        </h1>
        <p class="text-muted-foreground text-base leading-relaxed">
          Thank you. We saved your details and will contact you if we need anything else.
        </p>

        {#if submittedCustomerCode}
          <div class="mt-8 p-6 bg-secondary/20 rounded-2xl border-2 border-secondary/30 inline-block mx-auto">
            <p class="text-sm font-medium text-secondary-foreground/60 uppercase tracking-widest mb-1">Your Family Code</p>
            <p class="text-5xl font-black text-primary tracking-tighter">{submittedCustomerCode}</p>
            <p class="text-xs text-muted-foreground mt-3 italic">Please show this code to our staff when checking in.</p>
          </div>
        {/if}
      </div>

      <button
        type="button"
        class="w-full bg-secondary text-primary font-semibold text-lg py-4 rounded-xl hover:bg-secondary/80 transition-colors"
        onclick={() => {
          resetForm();
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      >
        Submit another registration
      </button>
    </div>
  {:else}
    <div class="text-center space-y-4">
      <div class="space-y-2">
        <h1 class="text-3xl sm:text-4xl font-bold text-primary tracking-tight">
          Welcome to Casa Luma
        </h1>
        <p class="text-xl sm:text-2xl font-semibold text-secondary">
          We want to know you better
        </p>
      </div>
      <div
        class="bg-red-50 p-4 rounded-2xl border border-red-200 max-w-sm mx-auto"
      >
        <p class="text-sm text-red-400/80 leading-relaxed font-medium">
          We ask for this information to help us keep everyone safe and to provide
          the best experience for your family. Rest assured, your details won’t be
          stored or shared.
        </p>
      </div>
    </div>

    <form
      method="POST"
      action="?/submit"
      use:enhance={() => {
        submitting = true;
        return async ({ update, result }) => {
          submitting = false;

          if (result.type === 'success') {
            const data = result.data as unknown as { success?: boolean; message?: string; customerCode?: string };
            if (data?.success) {
              success = true;
              submittedCustomerCode = data.customerCode;
              toast.success('Sent successfully');
              await runConfetti();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            } else {
              toast.error(data?.message ?? 'Submission failed');
            }
          } else if (result.type === 'failure') {
            const data = result.data as unknown as { message?: string };
            toast.error(data?.message ?? 'Please review the form and try again');
          } else if (result.type === 'error') {
            toast.error('Server error');
          }

          if (result.type !== 'success') {
            await update();
          }
        };
      }}
      class="space-y-10"
    >
      <input type="hidden" name="data" value={JSON.stringify(formData)} />

    <div class="space-y-6">
      <div class="space-y-3 bg-card/30 p-5 rounded-2xl border border-border/30">
        <label for="familyName" class="text-lg font-semibold block"
          >Family Name <span class="text-destructive">*</span></label
        >
        <input
          id="familyName"
          type="text"
          bind:value={formData.familyName}
          class="w-full bg-background border border-input rounded-xl px-4 py-3 text-lg focus:ring-2 focus:ring-primary/20 outline-none transition-all"
          placeholder="Only the family (last) name."
          required
        />
      </div>

      <div class="space-y-3 bg-card/30 p-5 rounded-2xl border border-border/30">
        <label for="mainPhone" class="text-lg font-semibold block"
          >Main Phone <span class="text-destructive">*</span></label
        >
        <input
          id="mainPhone"
          type="tel"
          bind:value={formData.mainPhone}
          class="w-full bg-background border border-input rounded-xl px-4 py-3 text-lg focus:ring-2 focus:ring-primary/20 outline-none transition-all"
          placeholder="+66 81 234 5678"
          required
        />
        <div class="space-y-2 px-1">
          <p class="text-xs text-muted-foreground italic">
            This is our primary way to reach you about your child.
          </p>
          <p class="text-sm text-amber-600 font-medium leading-relaxed">
            We will never send any message or call you without reason. This is
            only for safety and to ensure we can reach you immediately if needed.
          </p>
        </div>
      </div>

      {#if existingCustomer}
        <div in:fade class="bg-amber-50 border border-amber-200 p-4 rounded-2xl space-y-2">
          <div class="flex items-center gap-2 text-amber-800 font-semibold">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-alert-circle"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
            Existing Customer Found
          </div>
          <p class="text-sm text-amber-700 leading-relaxed">
            A customer named <strong>{existingCustomer.name}</strong> 
            {existingCustomer.code ? `(Code: ${existingCustomer.code})` : ''} 
            is already registered with this phone/email. 
            <br/><br/>
            <strong>Staff:</strong> If this is a return visit, you can search for them in Loyverse. If this is a new family using a shared phone, you may proceed.
          </p>
        </div>
      {/if}

      <div class="space-y-3 bg-card/30 p-5 rounded-2xl border border-border/30">
        <div class="flex justify-between items-center">
          <label for="email" class="text-lg font-semibold block"
            >Main Email</label
          >
          <span
            class="text-xs text-muted-foreground uppercase tracking-wider font-medium"
            >Optional</span
          >
        </div>
        <input
          id="email"
          type="email"
          bind:value={formData.email}
          class="w-full bg-background border border-input rounded-xl px-4 py-3 text-lg focus:ring-2 focus:ring-primary/20 outline-none transition-all"
          placeholder="your@email.com"
        />
        <p class="text-xs text-muted-foreground px-1 italic">
          We don't send spam, only occasional important updates regarding Casa
          Luma.
        </p>
      </div>
    </div>

    <PersonListEditor
      title="Kids"
      bind:items={formData.kids}
      addButtonText="Add Kid"
      onAdd={addKid}
      onRemove={removeKid}
    >
      {#snippet itemRenderer(kid, i, onRemove)}
        <KidCard bind:kid={formData.kids[i]} {onRemove} />
      {/snippet}
    </PersonListEditor>

    <div class="space-y-4">
      <PersonListEditor
        title="Parents / Caregivers"
        bind:items={formData.caregivers}
        addButtonText="Add Caregiver"
        onAdd={addCaregiver}
        onRemove={removeCaregiver}
      >
        {#snippet itemRenderer(caregiver, i, onRemove)}
          <GuardianCard bind:guardian={formData.caregivers[i]} {onRemove} />
        {/snippet}
      </PersonListEditor>
      <div class="bg-card/30 p-4 rounded-xl border border-border/30">
        <p class="text-sm text-muted-foreground leading-relaxed italic">
          Please include anyone who might show up with the child, including
          nannies or other regular caregivers. This is a safety measure.
        </p>
      </div>
      {#if formData.caregivers.length === 0}
        <p class="text-sm text-destructive font-medium px-1">
          At least one caregiver is required.
        </p>
      {/if}
    </div>

    <div class="space-y-6 pt-6 border-t border-border/50">
      <h3 class="text-xl font-semibold px-1">Additional Info</h3>

      <div class="space-y-2">
        <label
          for="nationality"
          class="block font-medium px-1 text-muted-foreground"
          >Where are you from? (Nationality)</label
        >
        <input
          id="nationality"
          type="text"
          bind:value={formData.nationality}
          class="w-full bg-background border border-input rounded-xl px-4 py-3 text-lg focus:ring-2 focus:ring-primary/20 outline-none transition-all"
          placeholder="e.g. French, Thai, Israeli..."
        />
      </div>

      <div class="space-y-3">
        <p class="block font-medium px-1 text-muted-foreground">
          Dietary Preferences
        </p>
        <div class="grid grid-cols-2 gap-3">
          {#each ["None", "Vegetarian", "Vegan", "Gluten Free"] as pref}
            <button
              type="button"
              class="py-3 px-4 rounded-xl border-2 transition-all font-medium {formData.dietaryPreference ===
              pref
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-input bg-background text-muted-foreground hover:border-primary/30'}"
              onclick={() => (formData.dietaryPreference = pref)}
            >
              {pref}
            </button>
          {/each}
          <div class="col-span-2">
            <input
              type="text"
              placeholder="Other allergies or preferences..."
              class="w-full bg-background border border-input rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary/20 outline-none transition-all"
              oninput={(e) => {
                const val = e.currentTarget.value;
                if (
                  val &&
                  !["None", "Vegetarian", "Vegan", "Gluten Free"].includes(val)
                ) {
                  formData.dietaryPreference = val;
                }
              }}
              value={["None", "Vegetarian", "Vegan", "Gluten Free"].includes(
                formData.dietaryPreference,
              )
                ? ""
                : formData.dietaryPreference}
            />
          </div>
        </div>
      </div>

      <div class="space-y-3">
        <p class="block font-medium px-1 text-muted-foreground">
          Do you live in Koh Phangan?
        </p>
        <div class="flex gap-3">
          <button
            type="button"
            class="flex-1 py-3 px-4 rounded-xl border-2 transition-all font-medium {formData.livesInPhangan ===
            true
              ? 'border-primary bg-primary/10 text-primary'
              : 'border-input bg-background text-muted-foreground hover:border-primary/30'}"
            onclick={() => (formData.livesInPhangan = true)}
          >
            Yes
          </button>
          <button
            type="button"
            class="flex-1 py-3 px-4 rounded-xl border-2 transition-all font-medium {formData.livesInPhangan ===
            false
              ? 'border-primary bg-primary/10 text-primary'
              : 'border-input bg-background text-muted-foreground hover:border-primary/30'}"
            onclick={() => (formData.livesInPhangan = false)}
          >
            No
          </button>
        </div>
      </div>

      <div class="space-y-2">
        <label
          for="howDidYouHear"
          class="block font-medium px-1 text-muted-foreground"
          >How did you hear about us?</label
        >
        <div class="relative">
          <select
            id="howDidYouHear"
            bind:value={formData.howDidYouHear}
            class="w-full bg-background border border-input rounded-xl px-4 py-3 text-lg focus:ring-2 focus:ring-primary/20 outline-none appearance-none"
          >
            <option value="" disabled selected>Select an option</option>
            <option value="instagram">Instagram</option>
            <option value="facebook">Facebook</option>
            <option value="google">Google Maps/Search</option>
            <option value="friend">Friend / Word of Mouth</option>
            <option value="walkin">Walk-in</option>
            <option value="other">Other</option>
          </select>
          <div
            class="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="lucide lucide-chevron-down"><path d="m6 9 6 6 6-6" /></svg
            >
          </div>
        </div>
      </div>

      <div class="space-y-2">
        <label
          for="specialNotes"
          class="block font-medium px-1 text-muted-foreground"
          >Special Notes / Requirements</label
        >
        <textarea
          id="specialNotes"
          bind:value={formData.specialNotes}
          rows="3"
          class="w-full bg-background border border-input rounded-xl px-4 py-3 text-lg focus:ring-2 focus:ring-primary/20 outline-none resize-none transition-all"
          placeholder="Allergies, accessibility needs, or other notes..."
        ></textarea>
      </div>
    </div>

    <div class="pt-4 pb-12">
      <button
        type="submit"
        disabled={submitting || formData.caregivers.length === 0}
        class="w-full bg-primary text-primary-foreground font-bold text-xl py-4 rounded-xl shadow-lg hover:bg-primary/90 hover:shadow-xl hover:-translate-y-0.5 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
      >
        {submitting ? "Submitting..." : "Complete Registration"}
      </button>
    </div>
    </form>
  {/if}
</div>
