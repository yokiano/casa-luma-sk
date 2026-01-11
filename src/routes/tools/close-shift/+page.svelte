<script lang="ts">
  import { CloseShiftState } from './CloseShiftState.svelte';
  import ShiftsReviewSection from '$lib/components/tools/close-shift/sections/ShiftsReviewSection.svelte';
  import GeneralInfoSection from '$lib/components/tools/close-shift/sections/GeneralInfoSection.svelte';
  import CashCountSection from '$lib/components/tools/close-shift/sections/CashCountSection.svelte';
  import OtherPaymentsSection from '$lib/components/tools/close-shift/sections/OtherPaymentsSection.svelte';
  import SummarySection from '$lib/components/tools/close-shift/sections/SummarySection.svelte';
  import { toast } from 'svelte-sonner';
  import { fade } from 'svelte/transition';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  const shiftState = new CloseShiftState();
  let uploadedFile = $state<string | null>(null);

  // Define denominations for ordered iteration (High to Low)
  const denominations = ['1000', '500', '100', '50', '20', '10', '5', '2', '1'] as const;

  async function handleSubmit() {
    if (shiftState.isSubmitting) return;

    const result = await shiftState.submit();
    if (result?.success) {
      toast.success('Shift closed successfully!');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (shiftState.error) {
      toast.error(shiftState.error);
    }
  }

  function handleReset() {
    if (confirm('Are you sure you want to reset the form?')) {
      shiftState.reset();
      uploadedFile = null;
      toast.info('Form reset');
    }
  }
</script>

<div class="container max-w-4xl mx-auto py-8 px-4 space-y-8">
  <div class="flex justify-between items-center border-b pb-4">
    <div>
      <h1 class="text-3xl font-bold tracking-tight text-[#5c4a3d]">Close Shift</h1>
      <p class="text-muted-foreground mt-1">End of shift report and cash reconciliation</p>
    </div>
    {#if shiftState.success}
      <button 
        onclick={handleReset}
        class="bg-secondary text-primary px-4 py-2 rounded-lg font-medium hover:bg-secondary/80 transition-colors"
      >
        Start New Report
      </button>
    {/if}
  </div>

  {#if shiftState.success}
    <div in:fade class="bg-green-50 border border-green-200 rounded-xl p-8 text-center space-y-4">
      <div class="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-green-600 text-3xl">
        ✓
      </div>
      <h2 class="text-2xl font-bold text-green-800">Shift Closed Successfully!</h2>
      <p class="text-green-700">The report has been saved to Notion.</p>
    </div>
  {:else}
    <div class="space-y-6">
      {#if data.shiftsLoadFailed}
        <div class="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Couldn’t load shifts right now. The close-shift report still works, but the shifts sections may be empty.
        </div>
      {/if}

      <ShiftsReviewSection
        title="Today’s Shifts"
        mode="today"
        shifts={data.todayShifts}
        employeesById={data.employeesById}
      />

      <ShiftsReviewSection
        title="Tomorrow’s Shifts"
        mode="tomorrow"
        shifts={data.tomorrowShifts}
        employeesById={data.employeesById}
      />
    </div>

    <div class="grid gap-8 md:grid-cols-2">
      <!-- Left Column: Inputs -->
      <div class="space-y-8">
        <!-- Step 1: General Info -->
        <GeneralInfoSection shiftState={shiftState} managers={data.managers} />

        <!-- Step 2: Cash Count -->
        <CashCountSection shiftState={shiftState} {denominations} />

        <!-- Step 3: Other Payments -->
        <OtherPaymentsSection shiftState={shiftState} />
      </div>

      <!-- Right Column: Summary & Submit -->
      <div class="space-y-8">
        <SummarySection shiftState={shiftState} bind:uploadedFile onSubmit={handleSubmit} />
      </div>
    </div>
  {/if}
</div>
