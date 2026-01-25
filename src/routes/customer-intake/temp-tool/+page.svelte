<script lang="ts">
  import { enhance } from '$app/forms';
  import { replaceState } from '$app/navigation';
  import { page } from '$app/stores';
  import { fade } from 'svelte/transition';
  import { toast } from 'svelte-sonner';

  let { data } = $props();

  $effect(() => {
    if (data.authorized && $page.url.searchParams.has('secret')) {
      const newUrl = new URL($page.url);
      newUrl.searchParams.delete('secret');
      replaceState(newUrl, $page.state);
    }
  });

  let submitting = $state(false);
  let testResults = $state<Array<{
    id: string;
    oldName: string;
    newName: string;
    code: string | null;
    willChange: boolean;
  }> | null>(null);

  let migrationResults = $state<{
    message: string;
    updatedCount: number;
    skippedNoCode: number;
    skippedAlready: number;
    totalCustomers: number;
    updates: string[];
    skipSamples: string[];
    errors: string[];
    logs: string[];
  } | null>(null);
</script>

{#if data.authorized}
  <div class="max-w-4xl mx-auto p-6 space-y-8">
  <div class="space-y-2">
    <h1 class="text-3xl font-bold text-primary">Customer Intake Temp Tool</h1>
    <p class="text-muted-foreground">
      This is a non-customer-facing utility. It renames Loyverse customers to include their customer code.
    </p>
    <p class="text-sm text-amber-700 font-medium">
      Expected format: <span class="font-mono">Family Name [CODE]</span>
    </p>
  </div>

  <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
    <form
      method="POST"
      action="?/testLoyverseRename"
      use:enhance={() => {
        submitting = true;
        testResults = null;
        return async ({ result }) => {
          submitting = false;
          if (result.type === 'success') {
            const data = result.data as any;
            testResults = data.results;
            toast.success(`Checked ${data.results.length} customers.`);
          } else {
            toast.error('Test failed');
          }
        };
      }}
    >
      <button
        type="submit"
        disabled={submitting}
        class="w-full py-3 px-4 rounded-xl bg-slate-200 text-slate-800 hover:bg-slate-300 transition-colors font-semibold"
      >
        Test Rename (First 5)
      </button>
    </form>

    <form
      method="POST"
      action="?/renameAllLoyverseCustomers"
      use:enhance={() => {
        if (!confirm('Rename ALL Loyverse customers? This cannot be easily undone.')) return;
        submitting = true;
        migrationResults = null;
        return async ({ result }) => {
          submitting = false;
          if (result.type === 'success') {
            const data = result.data as any;
            migrationResults = data;
            toast.success(data.message);
          } else {
            toast.error('Rename failed');
          }
        };
      }}
    >
      <button
        type="submit"
        disabled={submitting}
        class="w-full py-3 px-4 rounded-xl bg-amber-200 text-amber-900 hover:bg-amber-300 transition-colors font-semibold"
      >
        Apply Rename to ALL
      </button>
    </form>
  </div>

  {#if testResults}
    <div class="bg-white border border-slate-200 rounded-2xl p-5 space-y-4" in:fade>
      <h2 class="text-lg font-semibold text-slate-700">Test Results</h2>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="text-left text-slate-500">
              <th class="py-2">Old Name</th>
              <th class="py-2">New Name</th>
              <th class="py-2">Code</th>
              <th class="py-2">Will Change</th>
            </tr>
          </thead>
          <tbody>
            {#each testResults as r}
              <tr class="border-t border-slate-100">
                <td class="py-2 font-mono">{r.oldName}</td>
                <td class="py-2 font-mono">{r.newName}</td>
                <td class="py-2 font-mono">{r.code ?? '-'}</td>
                <td class="py-2">{r.willChange ? 'Yes' : 'No'}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>
  {/if}

  {#if migrationResults}
    <div class="bg-white border border-slate-200 rounded-2xl p-5 space-y-5" in:fade>
      <div class="flex flex-wrap gap-3 items-center justify-between">
        <h2 class="text-lg font-semibold text-slate-700">Migration Results</h2>
        <div class="text-xs font-mono bg-slate-100 px-3 py-1 rounded">
          Total: {migrationResults.totalCustomers} | Updated: {migrationResults.updatedCount}
        </div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
        <div class="bg-slate-50 border border-slate-200 rounded-lg p-3">
          <div class="text-slate-500">Skipped: No Code</div>
          <div class="text-xl font-bold">{migrationResults.skippedNoCode}</div>
        </div>
        <div class="bg-slate-50 border border-slate-200 rounded-lg p-3">
          <div class="text-slate-500">Skipped: Already OK</div>
          <div class="text-xl font-bold">{migrationResults.skippedAlready}</div>
        </div>
        <div class="bg-slate-50 border border-slate-200 rounded-lg p-3">
          <div class="text-slate-500">Errors</div>
          <div class="text-xl font-bold text-red-600">{migrationResults.errors.length}</div>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="space-y-2">
          <h3 class="font-semibold text-slate-700">Updated Names</h3>
          {#if migrationResults.updates.length > 0}
            <div class="max-h-64 overflow-y-auto border border-slate-100 rounded-lg p-2 space-y-1">
              {#each migrationResults.updates as update}
                <div class="text-xs font-mono text-slate-600 border-b border-slate-100 pb-1 last:border-0">
                  {update}
                </div>
              {/each}
            </div>
          {:else}
            <p class="text-sm text-slate-500 italic">No names needed updating.</p>
          {/if}
        </div>

        <div class="space-y-2">
          <h3 class="font-semibold text-slate-700">Skip Samples</h3>
          {#if migrationResults.skipSamples.length > 0}
            <div class="max-h-64 overflow-y-auto border border-slate-100 rounded-lg p-2 space-y-1">
              {#each migrationResults.skipSamples as skip}
                <div class="text-xs font-mono text-slate-600 border-b border-slate-100 pb-1 last:border-0">
                  {skip}
                </div>
              {/each}
            </div>
          {:else}
            <p class="text-sm text-slate-500 italic">No skip samples available.</p>
          {/if}
        </div>
      </div>

      {#if migrationResults.errors.length > 0}
        <div class="space-y-2">
          <h3 class="font-semibold text-red-600">Errors</h3>
          <div class="max-h-48 overflow-y-auto border border-red-100 rounded-lg p-2 space-y-1">
            {#each migrationResults.errors as error}
              <div class="text-xs font-mono text-red-700 border-b border-red-100 pb-1 last:border-0">
                {error}
              </div>
            {/each}
          </div>
        </div>
      {/if}

      <div class="space-y-2">
        <h3 class="font-semibold text-slate-700">Server Logs (from action response)</h3>
        <div class="bg-slate-900 text-slate-100 rounded-lg p-3 text-xs font-mono whitespace-pre-wrap">
          {migrationResults.logs.join('\n')}
        </div>
      </div>
    </div>
  {/if}
  </div>
{:else}
  <div class="flex min-h-[60vh] flex-col items-center justify-center p-8 text-center">
    <div class="mb-6 rounded-full bg-secondary/10 p-6 text-primary">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="48"
        height="48"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="lucide lucide-map-pin"
      >
        <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
        <circle cx="12" cy="10" r="3" />
      </svg>
    </div>
    <h1 class="mb-4 text-2xl font-bold text-foreground">
      In-Person Access Only
    </h1>
    <p class="max-w-md text-muted-foreground">
      This tool is available only on-site. Please use the access link or QR code provided at Casa Luma.
    </p>
  </div>
{/if}
