<script lang="ts">
  import { fly } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import { toast } from 'svelte-sonner';
  import confetti from 'canvas-confetti';
  import { Check, CheckCircle2, RefreshCw, PartyPopper, FileText } from 'lucide-svelte';
  import { deserialize } from '$app/forms';

  import {
    BIRTHDAY_ACTIVITY_ADDONS,
    BIRTHDAY_BASE_PRICING,
    BIRTHDAY_MAIN_COURSES,
    BIRTHDAY_PACKAGE_DISPLAY_NAMES,
    BIRTHDAY_PLAYGROUND_PRICING,
    BIRTHDAY_SIMPLE_TABLE_UPGRADES,
    formatThb,
    isSundayBirthdayDate
  } from '$lib/birthday-pricing';
  import { BirthdayFormState } from './birthday-form.state.svelte';
  import BirthdayStepShell from './BirthdayStepShell.svelte';
  import CapacityChoiceStep from './components/CapacityChoiceStep.svelte';
  import PlaygroundChoiceStep from './components/PlaygroundChoiceStep.svelte';
  import RulesStep from './components/RulesStep.svelte';

  const formState = new BirthdayFormState();

  const isSundayDate = $derived(isSundayBirthdayDate(formState.eventDate));

  const simpleTableBuffetPrice = BIRTHDAY_SIMPLE_TABLE_UPGRADES.find((upgrade) => upgrade.id === 'buffet')?.pricePerChild ?? 500;

  const timeOptions = Array.from({ length: 25 }, (_, i) => {
    const hour = Math.floor(i / 2) + 8;
    const minute = i % 2 === 0 ? '00' : '30';
    return `${hour.toString().padStart(2, '0')}:${minute}`;
  });

  /**
   * Direction-aware fly transition matching customer-intake flow
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

      if (result.type === 'success') {
        const data = result.data as any;
        if (data?.success) {
          formState.bookingReference = data.bookingReference;
          formState.success = true;
          
          // Trigger party confetti!
          confetti({
            particleCount: 180,
            spread: 80,
            origin: { y: 0.6 },
            colors: ['#E96A64', '#4B8B84', '#F5D061', '#D291BC', '#6CA0DC']
          });
          
          toast.success('Birthday party booking request submitted successfully!');
        } else {
          const errorMsg = data?.message || 'Failed to submit. Please try again.';
          toast.error(errorMsg);
        }
      } else if (result.type === 'failure') {
        const errorMsg = (result.data as any)?.message || 'Validation failed. Please check your entries.';
        toast.error(errorMsg);
      } else {
        toast.error('Something went wrong. Please check your connection and retry.');
      }
    } catch (e) {
      console.error('[BirthdaySubmit] Error:', e);
      toast.error('Failed to submit booking. Please check your network.');
    } finally {
      formState.submitting = false;
    }
  }

  function getNextLabel() {
    switch (formState.currentStepDef.id) {
      case 'derived-track-summary':
        if (formState.capacityBucket === 'up-to-15') return 'Choose main course';
        return 'Choose upgrades';
      case 'simple-table-upgrades':
        return formState.simpleTableBuffet ? 'Choose main course' : 'Continue';
      case 'buffet-menu':
        return 'Choose add-ons';
      case 'add-on-activities':
        return 'Add notes';
      case 'notes':
        return 'Review rules';
      default:
        return undefined;
    }
  }

  function handleNext() {
    if (formState.isLastStep) {
      if (formState.canProceed) {
        handleSubmit();
      } else {
        toast.error('Please read and agree to all rules before submitting.');
      }
    } else {
      if (formState.canProceed) {
        formState.next();
      } else {
        toast.error('Please fill in all required fields.');
      }
    }
  }
</script>

<div class="relative h-dvh w-full bg-background">
  <a
    href="/"
    class="fixed left-4 top-4 z-40 rounded-full bg-background/80 px-3 py-2 text-xs font-semibold text-muted-foreground shadow-sm ring-1 ring-border backdrop-blur transition-colors hover:text-foreground sm:left-6 sm:top-6 sm:text-sm"
  >
    ← Back to home page
  </a>

  {#if formState.success}
    <div 
      in:fly={{ y: 20, duration: 500, easing: cubicOut }}
      class="h-full w-full flex flex-col items-center justify-center p-4 sm:p-6 text-center overflow-y-auto bg-background"
    >
      <div class="max-w-md w-full space-y-4 sm:space-y-8 pb-12">
        <div class="flex justify-center">
          <div class="size-20 sm:size-28 rounded-full bg-primary/10 flex items-center justify-center animate-bounce">
            <PartyPopper class="size-10 sm:size-14 text-primary" />
          </div>
        </div>
        
        <div class="space-y-2 sm:space-y-4">
          <h2 class="text-3xl sm:text-4xl font-extrabold tracking-tight">Your party is requested!</h2>
          <p class="text-muted-foreground text-sm sm:text-base leading-relaxed">
            We have received your details and are reviewing the date and time availability.
          </p>
        </div>

        {#if formState.bookingReference}
          <div class="p-6 sm:p-8 bg-primary/5 rounded-[1.5rem] sm:rounded-[2rem] border-2 border-primary/20 space-y-2 sm:space-y-3 relative overflow-hidden group">
            <div class="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
              <CheckCircle2 class="size-16 sm:size-24 text-primary" />
            </div>
            
            <p class="text-[10px] sm:text-xs font-bold text-primary/60 uppercase tracking-[0.2em]">Booking Reference</p>
            <p class="text-2xl sm:text-4xl font-black tracking-tight text-primary break-all">{formState.bookingReference}</p>
            
            <div class="pt-2 sm:pt-4 space-y-2 text-left border-t border-primary/10">
              <div class="text-xs sm:text-sm space-y-1 text-muted-foreground">
                <p><span class="font-bold text-foreground">Kid Name:</span> {formState.childName} (Turning {formState.turningAge})</p>
                <p><span class="font-bold text-foreground">Preferred Date:</span> {formState.eventDate}</p>
                <p><span class="font-bold text-foreground">Expected Guests:</span> {formState.kidsCount} Children</p>
                <p><span class="font-bold text-foreground">Estimated Quote:</span> <span class="font-black text-primary">{formState.estimatedTotal.toLocaleString()} THB</span></p>
              </div>
              <p class="text-xs text-muted-foreground leading-relaxed pt-2">
                A copy of this summary has been saved. We will contact you shortly on <span class="font-bold text-primary">{formState.phone}</span> to finalize your contract!
              </p>
            </div>
          </div>
        {/if}

        <div class="flex flex-col gap-3">
          <!-- Print Summary/Contract Button -->
          <a
            href="/birthdays/summary?ref={formState.bookingReference}"
            target="_blank"
            class="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-4 rounded-full font-semibold hover:opacity-90 transition-all text-sm sm:text-base"
          >
            <FileText class="size-4" />
            View printable booking summary
          </a>

          <button
            onclick={() => formState.reset()}
            class="w-full flex items-center justify-center gap-2 bg-secondary/20 text-foreground py-4 rounded-full font-semibold hover:bg-secondary/30 transition-all text-sm sm:text-base"
          >
            <RefreshCw class="size-4" />
            Create another booking
          </button>
        </div>
      </div>
    </div>
  {:else}
    {#key formState.currentStepIndex}
      <div 
        in:flyTransition={{ direction: formState.direction }}
        out:flyOutTransition={{ direction: formState.direction }}
        class="h-full w-full"
      >
        <BirthdayStepShell
          title={formState.currentStepDef.title}
          explainer={formState.currentStepDef.explainer}
          required={formState.currentStepDef.required}
          currentStep={formState.currentStepIndex}
          totalSteps={formState.totalSteps}
          estimatedTotal={formState.estimatedTotal}
          showBack={formState.currentStepIndex > 0}
          showSkip={!formState.currentStepDef.required}
          nextDisabled={!formState.canProceed}
          nextLabel={getNextLabel()}
          onNext={handleNext}
          onSkip={() => formState.skip()}
          onBack={() => formState.back()}
        >
          <div class="w-full max-w-lg mx-auto space-y-4 sm:space-y-6 py-2 sm:py-4">
            {#if formState.currentStepDef.id === 'organizer'}
              <!-- Step: Organizer info -->
              <div class="space-y-5">
                <div class="space-y-1.5">
                  <label for="parentName" class="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Your Full Name</label>
                  <input
                    id="parentName"
                    type="text"
                    bind:value={formState.parentName}
                    placeholder="e.g. Sarah Connor"
                    class="w-full p-4 rounded-2xl bg-muted/40 border-2 border-transparent focus:border-primary/30 focus:ring-0 focus:bg-background transition-all text-lg font-medium"
                  />
                </div>
                
                <div class="space-y-1.5">
                  <label for="phone" class="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Phone Number</label>
                  <input
                    id="phone"
                    type="tel"
                    bind:value={formState.phone}
                    placeholder="e.g. +66 81 234 5678"
                    class="w-full p-4 rounded-2xl bg-muted/40 border-2 border-transparent focus:border-primary/30 focus:ring-0 focus:bg-background transition-all text-lg font-medium"
                  />
                </div>

                <div class="space-y-1.5">
                  <label for="email" class="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Email (Optional)</label>
                  <input
                    id="email"
                    type="email"
                    bind:value={formState.email}
                    placeholder="e.g. sarah@example.com"
                    class="w-full p-4 rounded-2xl bg-muted/40 border-2 border-transparent focus:border-primary/30 focus:ring-0 focus:bg-background transition-all text-lg font-medium"
                  />
                </div>
              </div>
            {:else if formState.currentStepDef.id === 'child-details'}
              <!-- Step: Child Details -->
              <div class="space-y-4">
                <div class="space-y-1.5">
                  <label for="childName" class="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Child's Name</label>
                  <input
                    id="childName"
                    type="text"
                    bind:value={formState.childName}
                    placeholder="e.g. Leo"
                    class="w-full p-4 rounded-2xl bg-muted/40 border-2 border-transparent focus:border-primary/30 focus:ring-0 focus:bg-background transition-all text-lg font-medium text-center sm:text-left"
                  />
                </div>

                <div class="space-y-1.5">
                  <label for="turningAge" class="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Turning Age</label>
                  <input
                    id="turningAge"
                    type="number"
                    bind:value={formState.turningAge}
                    placeholder="e.g. 5"
                    min="1"
                    max="18"
                    class="w-full p-4 rounded-2xl bg-muted/40 border-2 border-transparent focus:border-primary/30 focus:ring-0 focus:bg-background transition-all text-lg font-medium text-center sm:text-left"
                  />
                </div>
              </div>
            {:else if formState.currentStepDef.id === 'event-details'}
              <!-- Step: Event Details -->
              <div class="space-y-4">
                <div class="space-y-1.5">
                  <label for="eventDate" class="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Preferred Event Date</label>
                  <input
                    id="eventDate"
                    type="date"
                    bind:value={formState.eventDate}
                    class="w-full p-4 rounded-2xl bg-muted/40 border-2 border-transparent focus:border-primary/30 focus:ring-0 focus:bg-background transition-all text-lg font-medium text-center"
                  />
                </div>

                <div class="space-y-1.5">
                  <label for="startTime" class="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Start Time</label>
                  <select
                    id="startTime"
                    bind:value={formState.startTime}
                    class="w-full p-4 rounded-2xl bg-muted/40 border-2 border-transparent focus:border-primary/30 focus:ring-0 focus:bg-background transition-all text-lg font-medium text-center appearance-none"
                  >
                    <option value="" disabled>Select time</option>
                    {#each timeOptions as time (time)}
                      <option value={time}>{time}</option>
                    {/each}
                  </select>
                </div>

                {#if formState.eventDate && isSundayDate}
                  <p class="rounded-2xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm leading-relaxed text-amber-900">
                    This date is a Sunday — the hosted birthday base price is 10,000 THB (weekdays and Saturdays are 8,000 THB before playground).
                  </p>
                {/if}
              </div>
            {:else if formState.currentStepDef.id === 'capacity-choice'}
              <!-- Step: Capacity Bucket selection -->
              <CapacityChoiceStep 
                bind:selected={formState.capacityBucket}
                isSunday={isSundayDate}
                onSelect={(val) => formState.selectCapacity(val)}
              />
            {:else if formState.currentStepDef.id === 'kids-count'}
              <!-- Step: Expected kids count -->
              <div class="space-y-6 text-center">
                <div class="space-y-2">
                  <input
                    type="number"
                    bind:value={formState.kidsCount}
                    placeholder="0"
                    min="1"
                    class="w-full text-5xl sm:text-7xl font-extrabold bg-transparent border-none focus:ring-0 text-center text-primary placeholder:text-muted-foreground/15"
                  />
                  <div class="h-0.5 w-1/3 bg-primary/20 mx-auto rounded-full"></div>
                </div>

                <div class="p-4 rounded-2xl bg-primary/5 border border-primary/10 text-center space-y-2">
                  <p class="text-sm font-bold text-primary">
                    {#if formState.capacityBucket === 'up-to-8'}
                      {BIRTHDAY_PACKAGE_DISPLAY_NAMES.simpleTable}
                    {:else}
                      {BIRTHDAY_PACKAGE_DISPLAY_NAMES.fullHosted}
                    {/if}
                  </p>
                  <p class="text-xs text-muted-foreground leading-relaxed max-w-sm mx-auto">
                    {#if formState.capacityBucket === 'up-to-15'}
                      Hosted birthdays include up to 15 children. Extra children are added to the quote at
                      {isSundayDate ? formatThb(BIRTHDAY_BASE_PRICING.fullHosted.extraChildSunday) : formatThb(BIRTHDAY_BASE_PRICING.fullHosted.extraChildMonSat)} / child.
                      {#if formState.includePlayground}
                        Playground also adds {formatThb(BIRTHDAY_PLAYGROUND_PRICING.fullHosted.extraChildAbove15)} / child above 15.
                      {/if}
                      {#if (formState.kidsCount || 0) > 15}
                        <br />
                        <span class="text-foreground font-bold">{(formState.kidsCount || 0) - 15} extra children</span> currently added to quote.
                      {/if}
                    {:else if formState.capacityBucket === 'up-to-8'}
                      Simple Table bookings are sized for up to 8 kids. Buffet is {formatThb(simpleTableBuffetPrice)} / child if selected, and playground is {formatThb(BIRTHDAY_PLAYGROUND_PRICING.simpleTable.perChild)} / child if selected, including any accepted children above 8.
                      {#if (formState.kidsCount || 0) > 8}
                        <br />
                        <span class="text-amber-600 font-bold">Note:</span> More than 8 kids usually requires a Full Hosted package.
                      {/if}
                    {/if}
                  </p>
                </div>
              </div>
            {:else if formState.currentStepDef.id === 'playground-choice'}
              <PlaygroundChoiceStep
                bind:selected={formState.includePlayground}
                capacityBucket={formState.capacityBucket}
                kidsCount={formState.kidsCount || 0}
                onSelect={(val) => formState.selectPlayground(val)}
              />
            {:else if formState.currentStepDef.id === 'derived-track-summary'}
              <!-- Step: Derived Track Summary -->
              <div class="space-y-6">
                <div class="p-6 rounded-3xl bg-primary/5 border-2 border-primary/10 space-y-4">
                  <div class="flex justify-between items-center border-b border-primary/10 pb-4">
                    <span class="text-sm font-bold text-muted-foreground uppercase tracking-wider">Selected setup</span>
                    <span class="text-lg font-black text-primary">
                      {#if formState.derivedTrack === 'mon-sat'}
                        Mon–Sat {BIRTHDAY_PACKAGE_DISPLAY_NAMES.fullHosted}
                      {:else if formState.derivedTrack === 'sunday'}
                        Sunday {BIRTHDAY_PACKAGE_DISPLAY_NAMES.fullHosted}
                      {:else if formState.derivedTrack === 'smaller-setup'}
                        {BIRTHDAY_PACKAGE_DISPLAY_NAMES.simpleTable}
                      {/if}
                    </span>
                  </div>

                  <div class="space-y-3">
                    {#each formState.quote.lineItems as item (item.label)}
                      <div class="flex justify-between gap-4 text-sm">
                        <div>
                          <span class="text-muted-foreground">{item.label}</span>
                          {#if item.detail}
                            <p class="text-[11px] text-muted-foreground/70 mt-0.5">{item.detail}</p>
                          {/if}
                        </div>
                        <span class="font-bold shrink-0">{formatThb(item.amount)}</span>
                      </div>
                    {/each}
                  </div>

                  <div class="border-t border-primary/10 pt-4 space-y-1.5">
                    <div class="flex justify-between items-center gap-4">
                      <span class="text-sm font-bold uppercase tracking-wider text-muted-foreground">Estimated total*</span>
                      <span class="text-xl font-black text-primary">{formatThb(formState.estimatedTotal)}</span>
                    </div>
                    <p class="text-[11px] leading-snug text-muted-foreground/80">
                      *Final price is confirmed on-site after Casa Luma counts actual child attendance.
                    </p>
                  </div>
                </div>

                {#if formState.capacityBucket === 'up-to-15'}
                  <div class="rounded-3xl border border-primary/10 bg-primary/5 p-5 space-y-3">
                    <p class="text-[11px] font-bold uppercase tracking-[0.22em] text-primary/70">Included in every hosted party</p>
                    <ul class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-muted-foreground">
                      <li class="flex items-center gap-2"><Check class="size-4 text-primary" /> Garden & Pool</li>
                      <li class="flex items-center gap-2"><Check class="size-4 text-primary" /> 3 hours duration</li>
                      <li class="flex items-center gap-2"><Check class="size-4 text-primary" /> Buffet food</li>
                      <li class="flex items-center gap-2"><Check class="size-4 text-primary" /> Birthday cake</li>
                      <li class="flex items-center gap-2"><Check class="size-4 text-primary" /> Decorations</li>
                      <li class="flex items-center gap-2"><Check class="size-4 text-primary" /> Dedicated waiter</li>
                      <li class="flex items-center gap-2"><Check class="size-4 text-primary" /> Background music</li>
                    </ul>
                    <p class="text-xs leading-relaxed text-muted-foreground">
                      The Full Hosted base includes up to 15 kids. Extra children are charged separately, playground extra-child pricing applies only if playground is selected, and final per-child charges are confirmed after the on-site attendance count.
                    </p>
                  </div>
                {:else}
                  <div class="rounded-3xl border border-muted bg-muted/20 p-5 space-y-2 text-sm leading-relaxed text-muted-foreground">
                    <p class="font-bold text-foreground">{BIRTHDAY_PACKAGE_DISPLAY_NAMES.simpleTable} is parent-led.</p>
                    <p>Casa Luma provides the garden table. Buffet, cake, decorations, and playground are optional add-ons, so you only pay for what you select.</p>
                  </div>
                {/if}

                <div class="grid grid-cols-1 gap-3">
                  <div class="flex items-center justify-between p-4 rounded-2xl bg-muted/30 border border-muted">
                    <span class="text-sm font-medium">Guest count</span>
                    <span class="text-lg font-bold">{formState.kidsCount} children</span>
                  </div>
                  <div class="flex items-center justify-between p-4 rounded-2xl bg-muted/30 border border-muted">
                    <span class="text-sm font-medium">Indoor playground</span>
                    <span class="text-sm font-bold">
                      {formState.includePlayground ? 'Included as add-on' : 'Not included'}
                    </span>
                  </div>
                </div>
              </div>
            {:else if formState.currentStepDef.id === 'simple-table-upgrades'}
              <!-- Step: Table upgrades for small booking -->
              <div class="space-y-4">
                <div class="rounded-2xl border border-primary/10 bg-primary/5 px-4 py-3 text-xs sm:text-sm leading-relaxed text-muted-foreground">
                  Simple Table upgrades are optional. Buffet is charged at {formatThb(simpleTableBuffetPrice)} per child based on your guest count, including any accepted children above 8; playground is handled separately at {formatThb(BIRTHDAY_PLAYGROUND_PRICING.simpleTable.perChild)} per child if selected. Final per-child charges are confirmed after the on-site attendance count.
                </div>

                <button
                  onclick={() => { formState.simpleTableBuffet = !formState.simpleTableBuffet; }}
                  class="w-full p-4 sm:p-5 rounded-2xl border text-left flex items-center justify-between gap-4 transition-all hover:bg-muted/10 hover:border-primary/30
                    {formState.simpleTableBuffet ? 'border-primary bg-primary/5' : 'border-muted bg-background'}"
                >
                  <div class="space-y-0.5">
                    <span class="text-sm sm:text-base font-bold block">Include Buffet Menu</span>
                    <span class="text-xs text-muted-foreground">Add buffet menu for {formState.kidsCount || 0} kids (+{formatThb(simpleTableBuffetPrice)} / kid)</span>
                  </div>
                  <div class="size-6 rounded-full border-2 flex items-center justify-center transition-colors shrink-0
                    {formState.simpleTableBuffet ? 'bg-primary border-primary text-primary-foreground' : 'border-muted-foreground/30'}"
                  >
                    {#if formState.simpleTableBuffet}
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-check"><path d="M20 6 9 17l-5-5"/></svg>
                    {/if}
                  </div>
                </button>

                <button
                  onclick={() => { formState.simpleTableCake = !formState.simpleTableCake; }}
                  class="w-full p-4 sm:p-5 rounded-2xl border text-left flex items-center justify-between gap-4 transition-all hover:bg-muted/10 hover:border-primary/30
                    {formState.simpleTableCake ? 'border-primary bg-primary/5' : 'border-muted bg-background'}"
                >
                  <div class="space-y-0.5">
                    <span class="text-sm sm:text-base font-bold block">Include Birthday Cake</span>
                    <span class="text-xs text-muted-foreground">Freshly made Casa Luma Birthday Cake (+700 THB)</span>
                  </div>
                  <div class="size-6 rounded-full border-2 flex items-center justify-center transition-colors shrink-0
                    {formState.simpleTableCake ? 'bg-primary border-primary text-primary-foreground' : 'border-muted-foreground/30'}"
                  >
                    {#if formState.simpleTableCake}
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-check"><path d="M20 6 9 17l-5-5"/></svg>
                    {/if}
                  </div>
                </button>

                <button
                  onclick={() => { formState.simpleTableDecorations = !formState.simpleTableDecorations; }}
                  class="w-full p-4 sm:p-5 rounded-2xl border text-left flex items-center justify-between gap-4 transition-all hover:bg-muted/10 hover:border-primary/30
                    {formState.simpleTableDecorations ? 'border-primary bg-primary/5' : 'border-muted bg-background'}"
                >
                  <div class="space-y-0.5">
                    <span class="text-sm sm:text-base font-bold block">Include Decorations</span>
                    <span class="text-xs text-muted-foreground">Beautiful organic table decorations by venue (+500 THB)</span>
                  </div>
                  <div class="size-6 rounded-full border-2 flex items-center justify-center transition-colors shrink-0
                    {formState.simpleTableDecorations ? 'bg-primary border-primary text-primary-foreground' : 'border-muted-foreground/30'}"
                  >
                    {#if formState.simpleTableDecorations}
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-check"><path d="M20 6 9 17l-5-5"/></svg>
                    {/if}
                  </div>
                </button>
              </div>
            {:else if formState.currentStepDef.id === 'buffet-menu'}
              <!-- Step: Buffet Menu Selection -->
              <div class="space-y-4">
                <div class="rounded-2xl border border-muted bg-muted/20 px-4 py-3 text-xs sm:text-sm leading-relaxed text-muted-foreground">
                  {#if formState.capacityBucket === 'up-to-15'}
                    The buffet is included in hosted birthdays for up to 15 kids. Extra hosted children are charged separately at the child price shown in your quote.
                  {:else}
                    Buffet was added as a Simple Table upgrade and is charged at {formatThb(simpleTableBuffetPrice)} per child. Final per-child charges use the on-site attendance count.
                  {/if}
                  If the party needs more food, Casa Luma can prepare additional items at a fixed cost per item ordered.
                </div>

                {#each BIRTHDAY_MAIN_COURSES as item (item.value)}
                  <button
                    onclick={() => { formState.mainCourse = item.value; }}
                    class="w-full p-5 rounded-2xl border text-left flex items-center justify-between gap-4 transition-all hover:bg-muted/10 hover:border-primary/30
                      {formState.mainCourse === item.value ? 'border-primary bg-primary/5 shadow-md' : 'border-muted bg-background'}"
                  >
                    <div class="space-y-1">
                      <span class="text-base sm:text-lg font-bold block">{item.label}</span>
                      {#if item.desc}
                        <span class="text-xs text-muted-foreground block">{item.desc}</span>
                      {/if}
                    </div>
                    <div class="size-6 rounded-full border-2 flex items-center justify-center transition-colors shrink-0
                      {formState.mainCourse === item.value ? 'bg-primary border-primary text-primary-foreground' : 'border-muted-foreground/30'}"
                    >
                      {#if formState.mainCourse === item.value}
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-check"><path d="M20 6 9 17l-5-5"/></svg>
                      {/if}
                    </div>
                  </button>
                {/each}
              </div>
            {:else if formState.currentStepDef.id === 'add-on-activities'}
              <!-- Step: Add-on Activities -->
              <div class="space-y-4">
                {#each BIRTHDAY_ACTIVITY_ADDONS as addon (addon.id)}
                  {@const selected =
                    addon.id === 'facePainting'
                      ? formState.addonFacePainting
                      : addon.id === 'movementActivity'
                        ? formState.addonMovementActivity
                        : formState.addonPlantingWorkshop}
                  <button
                    onclick={() => {
                      if (addon.id === 'facePainting') formState.addonFacePainting = !formState.addonFacePainting;
                      else if (addon.id === 'movementActivity') formState.addonMovementActivity = !formState.addonMovementActivity;
                      else formState.addonPlantingWorkshop = !formState.addonPlantingWorkshop;
                    }}
                    class="w-full p-4 sm:p-5 rounded-2xl border text-left flex items-center justify-between gap-4 transition-all hover:bg-muted/10 hover:border-primary/30
                      {selected ? 'border-primary bg-primary/5' : 'border-muted bg-background'}"
                  >
                    <div class="space-y-0.5">
                      <span class="text-sm sm:text-base font-bold block">{addon.label}</span>
                      <span class="text-xs text-muted-foreground">
                        {addon.description} ({addon.priceLabel ?? `+${formatThb(addon.price)}`})
                      </span>
                    </div>
                    <div class="size-6 rounded-full border-2 flex items-center justify-center transition-colors shrink-0
                      {selected ? 'bg-primary border-primary text-primary-foreground' : 'border-muted-foreground/30'}"
                    >
                      {#if selected}
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-check"><path d="M20 6 9 17l-5-5"/></svg>
                      {/if}
                    </div>
                  </button>
                {/each}
              </div>
            {:else if formState.currentStepDef.id === 'notes'}
              <!-- Step: Special Notes -->
              <div class="space-y-3">
                <textarea
                  id="special-notes"
                  bind:value={formState.specialNotes}
                  placeholder="Allergies, preferred theme details, custom decorations, or anything else we can arrange for you..."
                  rows="6"
                  class="w-full p-5 rounded-2xl bg-muted/40 border-2 border-transparent focus:border-primary/30 focus:ring-0 focus:bg-background transition-all text-lg resize-none"
                ></textarea>
              </div>
            {:else if formState.currentStepDef.id === 'rules'}
              <!-- Step: Rules checklist -->
              <RulesStep bind:accepted={formState.rulesAccepted} />
            {/if}
          </div>
        </BirthdayStepShell>
      </div>
    {/key}
  {/if}
</div>

{#if formState.submitting}
  <div class="fixed inset-0 bg-background/60 backdrop-blur-sm z-50 flex flex-col items-center justify-center gap-4 animate-in fade-in duration-200">
    <div class="size-14 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
    <p class="font-bold text-xl animate-pulse tracking-tight text-primary">Creating your event booking...</p>
  </div>
{/if}

<style>
  :global(.sonner-toast) {
    border-radius: 1.5rem !important;
    padding: 1rem 1.5rem !important;
  }
</style>
