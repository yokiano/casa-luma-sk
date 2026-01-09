<script lang="ts">
  import { CloseShiftState } from './CloseShiftState.svelte';
  import FileDropZone from '$lib/components/ui/FileDropZone.svelte';
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
    <div class="grid gap-8 md:grid-cols-2">
      <!-- Left Column: Inputs -->
      <div class="space-y-8">
        <!-- Step 1: General Info -->
        <section class="space-y-4 bg-white p-6 rounded-2xl border border-[#e6e1db] shadow-sm">
          <h2 class="text-xl font-semibold text-[#5c4a3d] flex items-center gap-2">
            <span class="bg-[#5c4a3d] text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">1</span>
            General Info
          </h2>
          
          <div class="grid gap-4">
            <div class="space-y-2">
              <label for="closerName" class="text-sm font-medium">Closer Name</label>
              <select
                id="closerName"
                bind:value={shiftState.closerId}
                onchange={(e) => {
                  const manager = data.managers.find(m => m.id === e.currentTarget.value);
                  if (manager) {
                    shiftState.closerName = manager.name;
                    shiftState.closerPersonId = (manager as any).personId;
                  }
                }}
                class="w-full rounded-xl border border-input bg-background px-3 py-3 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="" disabled selected>Select closer...</option>
                {#each data.managers as manager}
                  <option value={manager.id}>{manager.name}</option>
                {/each}
              </select>
            </div>

            <div class="space-y-2">
              <label for="expectedCash" class="text-sm font-medium">Expected Cash (from POS)</label>
              <div class="relative">
                <span class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">฿</span>
                <input 
                  id="expectedCash"
                  type="number"
                  inputmode="decimal"
                  step="0.01"
                  bind:value={shiftState.expectedCash}
                  placeholder="0.00"
                  class="w-full rounded-xl border border-input bg-background pl-8 pr-3 py-3 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
              </div>
            </div>
          </div>
        </section>

        <!-- Step 2: Cash Count -->
        <section class="space-y-4 bg-white p-6 rounded-2xl border border-[#e6e1db] shadow-sm">
          <div class="flex justify-between items-start mb-2">
            <div>
              <h2 class="text-xl font-semibold text-[#5c4a3d] flex items-center gap-2">
                <span class="bg-[#5c4a3d] text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">2</span>
                Cash Count
              </h2>
              <p class="text-xs text-muted-foreground mt-1 ml-8">Enter the quantity of each bill/coin</p>
            </div>
            <div class="text-right flex flex-col items-end gap-1">
              <div class="text-xs text-muted-foreground">Actual Cash</div>
              <div class="text-xl font-mono font-bold text-[#5c4a3d]">฿{shiftState.actualCash.toLocaleString()}</div>
              {#if shiftState.actualCash > 0}
                <button 
                  onclick={() => shiftState.clearBillCounts()}
                  class="text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded transition-colors"
                >
                  Clear All
                </button>
              {/if}
            </div>
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {#each denominations as denom}
              <div class="bg-gray-50 p-3 rounded-xl border border-gray-200 hover:border-[#5c4a3d]/30 transition-all flex flex-col gap-2 relative">
                {#if shiftState.billCounts[denom as keyof typeof shiftState.billCounts] > 0}
                  <button 
                    onclick={() => shiftState.billCounts[denom as keyof typeof shiftState.billCounts] = 0}
                    class="absolute -top-2 -right-2 bg-white text-gray-400 hover:text-red-500 border shadow-sm rounded-full w-8 h-8 flex items-center justify-center text-sm z-20"
                    title="Clear"
                    tabindex="-1"
                  >
                    ✕
                  </button>
                {/if}
                <label for="denom-{denom}" class="text-center font-bold text-[#5c4a3d] text-lg block">{denom}</label>
                
                <input 
                  id="denom-{denom}"
                  type="number"
                  inputmode="numeric" 
                  min="0"
                  placeholder="0"
                  bind:value={shiftState.billCounts[denom as keyof typeof shiftState.billCounts]}
                  class="w-full bg-white border border-gray-300 rounded-lg py-2 px-1 text-center text-xl font-medium focus:outline-none focus:ring-2 focus:ring-[#5c4a3d]/20 focus:border-[#5c4a3d]"
                  onfocus={(e) => e.currentTarget.select()}
                />
                
                <div class="text-center text-xs text-muted-foreground font-mono">
                  = ฿{(shiftState.billCounts[denom as keyof typeof shiftState.billCounts] * Number(denom)).toLocaleString()}
                </div>
              </div>
            {/each}
          </div>
        </section>

        <!-- Step 3: Other Payments -->
        <section class="space-y-4 bg-white p-6 rounded-2xl border border-[#e6e1db] shadow-sm">
          <h2 class="text-xl font-semibold text-[#5c4a3d] flex items-center gap-2">
            <span class="bg-[#5c4a3d] text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">3</span>
            Other Payments
          </h2>
          
          <div class="grid gap-4">
            <div class="space-y-2">
              <label for="scanPayments" class="text-sm font-medium">Scan / Transfer Total</label>
              <div class="relative">
                <span class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">฿</span>
                <input 
                  id="scanPayments"
                  type="number"
                  inputmode="decimal"
                  step="0.01"
                  bind:value={shiftState.paymentMethods.scan}
                  class="w-full rounded-xl border border-input bg-background pl-8 pr-3 py-3 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
              </div>
            </div>

            <div class="space-y-2">
              <label for="cardPayments" class="text-sm font-medium">Credit Card Total</label>
              <div class="relative">
                <span class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">฿</span>
                <input 
                  id="cardPayments"
                  type="number"
                  inputmode="decimal" 
                  step="0.01"
                  bind:value={shiftState.paymentMethods.card}
                  class="w-full rounded-xl border border-input bg-background pl-8 pr-3 py-3 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
              </div>
            </div>
          </div>
        </section>
      </div>

      <!-- Right Column: Summary & Submit -->
      <div class="space-y-8">
        <section class="space-y-6 bg-[#f9f7f4] p-6 rounded-2xl border border-[#e6e1db] sticky top-8">
          <h2 class="text-xl font-semibold text-[#5c4a3d]">Summary</h2>

          <div class="space-y-4">
            <div class="flex justify-between items-center text-sm">
              <span class="text-muted-foreground">Expected Cash</span>
              <span class="font-medium">฿{shiftState.expectedCash.toLocaleString()}</span>
            </div>
            <div class="flex justify-between items-center text-sm">
              <span class="text-muted-foreground">Actual Cash Count</span>
              <span class="font-medium">฿{shiftState.actualCash.toLocaleString()}</span>
            </div>
            <div class="h-px bg-border"></div>
            <div class="flex justify-between items-center text-lg font-bold">
              <span>Difference</span>
              <span class={shiftState.difference === 0 ? 'text-green-600' : 'text-red-500'}>
                {shiftState.difference > 0 ? '+' : ''}฿{shiftState.difference.toLocaleString()}
              </span>
            </div>
          </div>

          <div class="space-y-2">
            <label for="notes" class="text-sm font-medium">Notes & Explanations</label>
            <textarea 
              id="notes"
              bind:value={shiftState.notes}
              rows="4"
              class="w-full rounded-xl border border-input bg-white px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
              placeholder="Explain any discrepancies or add shift notes..."
            ></textarea>
          </div>

          <div class="space-y-2">
            <span class="text-sm font-medium">Shift Summary (POS Print)</span>
            <FileDropZone 
              onFileSelect={(file) => uploadedFile = file}
              value={uploadedFile}
            />
            <p class="text-xs text-muted-foreground text-center italic">
              * File upload currently only for display, not yet saved.
            </p>
          </div>

          <div class="pt-4">
            <button 
              onclick={handleSubmit}
              disabled={shiftState.isSubmitting || !shiftState.closerId}
              class="w-full bg-[#5c4a3d] text-white font-bold py-3 px-4 rounded-xl shadow-md hover:bg-[#4a3b30] hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
            >
              {shiftState.isSubmitting ? 'Submitting...' : 'Submit Report'}
            </button>
            {#if !shiftState.closerId}
              <p class="text-xs text-red-500 text-center mt-2">Please select closer name</p>
            {/if}
            {#if shiftState.error}
              <p class="text-sm text-red-500 text-center mt-2 bg-red-50 p-2 rounded-lg border border-red-100">
                {shiftState.error}
              </p>
            {/if}
          </div>
        </section>
      </div>
    </div>
  {/if}
</div>
