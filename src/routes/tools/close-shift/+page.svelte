<script lang="ts">
  import { tick } from 'svelte';
  import { focusValidationField } from '$lib/forms/validation-focus';
  import { CloseShiftState } from './CloseShiftState.svelte';
  import GeneralInfoSection from '$lib/components/tools/close-shift/sections/GeneralInfoSection.svelte';
  import CashCountSection from '$lib/components/tools/close-shift/sections/CashCountSection.svelte';
  import OtherPaymentsSection from '$lib/components/tools/close-shift/sections/OtherPaymentsSection.svelte';
  import ShiftExpensesSection from '$lib/components/tools/close-shift/sections/ShiftExpensesSection.svelte';
  import SummarySection from '$lib/components/tools/close-shift/sections/SummarySection.svelte';
  import { toast } from 'svelte-sonner';
  import { fade } from 'svelte/transition';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  const shiftState = new CloseShiftState();
  let suppliers = $state(data.suppliers);
  let uploadedFile = $state<string | null>(null);
  let submitAttempted = $state(false);
  const validationIssues = $derived(
    submitAttempted ? shiftState.getValidationIssues({ categories: data.categories, departments: data.departments }) : []
  );

  // Define denominations for ordered iteration (High to Low)
  const denominations = ['1000', '500', '100', '50', '20', '10', '5', '2', '1'] as const;

  async function focusValidationIssue(fieldId: string) {
    await tick();
    await focusValidationField(fieldId);
  }

  async function handleSubmit() {
    if (shiftState.isSubmitting) return;

    submitAttempted = true;
    const issues = shiftState.getValidationIssues({ categories: data.categories, departments: data.departments });
    if (issues.length > 0) {
      toast.error(issues[0].message);
      await focusValidationIssue(issues[0].fieldId);
      return;
    }

    const result = await shiftState.submit({
      categories: data.categories,
      departments: data.departments,
      posSummaryDataUrl: uploadedFile
    });
    if (result?.success) {
      submitAttempted = false;
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
      submitAttempted = false;
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
    <div class="grid gap-8 md:grid-cols-2">
      <!-- Left Column: Inputs -->
      <div class="space-y-8">
        <!-- Step 1: General Info -->
        <GeneralInfoSection shiftState={shiftState} validationIssues={validationIssues} />

        <!-- Step 2: Cash Count -->
        <CashCountSection shiftState={shiftState} {denominations} validationIssues={validationIssues} />

        <!-- Step 3: Other Payments -->
        <OtherPaymentsSection shiftState={shiftState} validationIssues={validationIssues} />

        <!-- Step 4: Shift Expenses -->
        <ShiftExpensesSection
          shiftState={shiftState}
          categories={data.categories}
          departments={data.departments}
          {suppliers}
          onSupplierCreated={(supplier) => suppliers = [...suppliers, supplier].sort((a, b) => a.name.localeCompare(b.name))}
          validationIssues={validationIssues}
        />
      </div>

      <!-- Right Column: Summary & Submit -->
      <div class="space-y-8">
        <SummarySection shiftState={shiftState} bind:uploadedFile onSubmit={handleSubmit} />
      </div>
    </div>
  {/if}
</div>
