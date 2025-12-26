<script lang="ts">
  import { CategorySyncStateUI } from '../category-sync.svelte';
  
  const state = new CategorySyncStateUI();
</script>

<div>
  <div class="flex justify-between items-center mb-6">
    <div>
      <h2 class="text-xl font-bold">Categories</h2>
      <p class="text-gray-500 text-sm">Sync and clean Loyverse categories based on Notion data</p>
    </div>
    <div class="flex items-center gap-4">
      <label class="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
        <input 
          type="checkbox" 
          bind:checked={state.hideSynced} 
          class="rounded border-gray-300 text-black focus:ring-black"
        />
        Hide Synced
      </label>

      <div class="h-6 w-px bg-gray-300"></div>

      <label class="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
        <input 
          type="checkbox" 
          bind:checked={state.deleteUnused} 
          class="rounded border-gray-300 text-black focus:ring-black"
        />
        Clean unused / Not in Notion
      </label>
      
      <div class="h-6 w-px bg-gray-300"></div>

      <button 
        class="bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded text-sm font-medium transition-colors"
        onclick={() => state.fetchStatus()}
        disabled={state.loading || state.syncing}
      >
        Refresh
      </button>
      <button 
        class="bg-black text-white px-4 py-2 rounded text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors"
        onclick={() => state.syncAll()}
        disabled={state.loading || state.syncing || state.categoriesToSync.length === 0}
      >
        {state.syncing ? 'Syncing...' : `Sync All (${state.categoriesToSync.length})`}
      </button>
    </div>
  </div>

  {#if state.error}
    <div class="bg-red-50 text-red-600 p-4 rounded mb-6 border border-red-200">
      Error: {state.error}
    </div>
  {/if}

  {#if state.lastReport}
    <div class="bg-green-50 text-green-700 p-4 rounded mb-6 border border-green-200">
      <h3 class="font-bold mb-2">Sync Report</h3>
      <ul class="list-disc list-inside">
        <li>Created: {state.lastReport.created}</li>
        <li>Deleted: {state.lastReport.deleted}</li>
      </ul>
      {#if state.lastReport.errors.length > 0}
        <div class="mt-2 text-red-600">
          <p class="font-bold">Errors:</p>
          <ul class="list-disc list-inside">
            {#each state.lastReport.errors as err}
              <li>{err}</li>
            {/each}
          </ul>
        </div>
      {/if}
    </div>
  {/if}

  <div class="bg-white rounded-lg border shadow-sm overflow-hidden">
    {#if state.loading}
      <div class="p-8 text-center text-gray-500">
        Loading categories...
      </div>
    {:else}
      <table class="w-full text-left text-sm">
        <thead class="bg-gray-50 border-b">
          <tr>
            <th class="p-4 font-medium text-gray-500">Category Name</th>
            <th class="p-4 font-medium text-gray-500">Notion Usage</th>
            <th class="p-4 font-medium text-gray-500">Loyverse Usage</th>
            <th class="p-4 font-medium text-gray-500">Status</th>
            <th class="p-4 font-medium text-gray-500 text-right">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y">
          {#each state.filteredCategories as cat}
            <tr class="hover:bg-gray-50 transition-all border-l-4 {cat.isSyncing ? 'border-l-blue-500 bg-blue-50/30 animate-pulse' : cat.syncResult?.status === 'SUCCESS' ? 'border-l-green-500 bg-green-50/10' : cat.syncResult?.status === 'ERROR' ? 'border-l-red-500 bg-red-50/10' : 'border-l-transparent'}">
              <td class="p-4 font-medium">
                <div class="flex flex-col">
                  <span>{cat.name}</span>
                  {#if cat.isSyncing}
                    <span class="text-[10px] text-blue-500 font-bold uppercase tracking-wider animate-bounce mt-0.5">Syncing...</span>
                  {/if}
                </div>
              </td>
              <td class="p-4 text-gray-600">
                <span class={cat.notionCount > 0 ? 'text-black font-medium' : 'text-gray-400 italic'}>
                  {cat.notionCount} item{cat.notionCount === 1 ? '' : 's'}
                </span>
              </td>
              <td class="p-4 text-gray-600">
                <span class={cat.loyverseCount > 0 ? 'text-black font-medium' : 'text-gray-400 italic'}>
                  {cat.loyverseCount} item{cat.loyverseCount === 1 ? '' : 's'}
                </span>
              </td>
              <td class="p-4">
                {#if cat.status === 'SYNCED'}
                  <span class="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-medium">Synced</span>
                {:else if cat.status === 'NOT_IN_LOYVERSE'}
                  <span class="bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full text-xs font-medium">New</span>
                {:else if cat.status === 'UNUSED_IN_LOYVERSE'}
                  <span class="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs font-medium">Unused</span>
                {:else if cat.status === 'NOT_IN_NOTION'}
                  <span class="bg-red-50 text-red-600 px-2 py-1 rounded-full text-xs font-medium border border-red-100">Not in Notion</span>
                {:else}
                  <span class="bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-xs font-medium">{cat.status}</span>
                {/if}
              </td>
              <td class="p-4 text-right">
                {#if cat.status === 'NOT_IN_LOYVERSE'}
                  <button 
                    class="text-blue-600 hover:text-blue-800 text-xs font-medium disabled:opacity-50"
                    onclick={() => state.syncSingle(cat.name, 'CREATE')}
                    disabled={state.syncing || cat.isSyncing}
                  >
                    Create
                  </button>
                {:else if cat.status === 'UNUSED_IN_LOYVERSE' || cat.status === 'NOT_IN_NOTION'}
                  <button 
                    class="text-red-600 hover:text-red-800 text-xs font-medium disabled:opacity-50"
                    onclick={() => state.syncSingle(cat.name, 'DELETE')}
                    disabled={state.syncing || cat.isSyncing}
                  >
                    Delete
                  </button>
                {/if}
              </td>
            </tr>
          {:else}
            <tr>
              <td colspan="5" class="p-12 text-center text-gray-400">
                <div class="flex flex-col items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="opacity-20"><path d="M3 7V5c0-1.1.9-2 2-2h2"/><path d="M17 3h2c1.1 0 2 .9 2 2v2"/><path d="M21 17v2c0 1.1-.9 2-2 2h-2"/><path d="M7 21H5c-1.1 0-2-.9-2-2v-2"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><path d="M9 9h.01"/><path d="M15 9h.01"/></svg>
                  <p>No categories found matching filters.</p>
                </div>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    {/if}
  </div>
</div>

