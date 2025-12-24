<script lang="ts">
  import { ModifierSyncState } from '../pos-sync-modifiers.svelte';
  
  const state = new ModifierSyncState();
</script>

<div>
  <div class="flex justify-between items-center mb-6">
    <div>
      <h2 class="text-xl font-bold">Modifiers</h2>
      <p class="text-gray-500 text-sm">Sync Notion Modifiers to Loyverse</p>
    </div>
    <div class="flex items-center gap-4">
      <label class="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
        <input 
          type="checkbox" 
          bind:checked={state.deleteOrphans} 
          class="rounded border-gray-300 text-black focus:ring-black"
        />
        Delete items not in Notion
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
        disabled={state.loading || state.syncing || state.itemsToSync.length === 0}
      >
        {state.syncing ? 'Syncing...' : `Sync All (${state.itemsToSync.length})`}
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
        <li>Updated: {state.lastReport.updated}</li>
        <li>Linked: {state.lastReport.linked}</li>
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
        Loading modifiers...
      </div>
    {:else}
      <table class="w-full text-left text-sm">
        <thead class="bg-gray-50 border-b">
          <tr>
            <th class="p-4 font-medium text-gray-500">Name</th>
            <th class="p-4 font-medium text-gray-500">Options</th>
            <th class="p-4 font-medium text-gray-500">Status</th>
            <th class="p-4 font-medium text-gray-500">Details</th>
            <th class="p-4 font-medium text-gray-500 text-right">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y">
          {#each state.items as item}
            <tr class="hover:bg-gray-50 transition-colors">
              <td class="p-4 font-medium">
                {item.name}
              </td>
              <td class="p-4 text-gray-600">
                 {item.options.length} options
                 {#if item.options.length > 0}
                  <div class="text-xs text-gray-400 mt-1">
                    {item.options.map(o => o.name).slice(0, 3).join(', ')}{item.options.length > 3 ? '...' : ''}
                  </div>
                 {/if}
              </td>
              <td class="p-4">
                {#if item.status === 'SYNCED'}
                  <span class="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-medium">Synced</span>
                {:else if item.status === 'NOT_IN_LOYVERSE'}
                  <span class="bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full text-xs font-medium">New</span>
                {:else if item.status === 'MODIFIED'}
                  <span class="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-medium">Modified</span>
                {:else if item.status === 'LINKED_ONLY'}
                  <span class="bg-purple-100 text-purple-700 px-2 py-1 rounded-full text-xs font-medium">Linking</span>
                {:else if item.status === 'NOT_IN_NOTION'}
                  <span class="bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs font-medium">Orphan</span>
                {:else}
                  <span class="bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-xs font-medium">{item.status}</span>
                {/if}
              </td>
              <td class="p-4 text-gray-500">
                {#if item.diffs && item.diffs.length > 0}
                  <ul class="list-disc list-inside text-xs text-red-500">
                    {#each item.diffs as diff}
                      <li>{diff}</li>
                    {/each}
                  </ul>
                {:else if item.status === 'NOT_IN_LOYVERSE'}
                  <span class="text-xs">Will be created in Loyverse</span>
                {:else if item.status === 'NOT_IN_NOTION'}
                  {#if state.deleteOrphans}
                    <span class="text-xs text-red-600 font-medium">Will be deleted</span>
                  {:else}
                     <span class="text-xs">Enable delete option to remove</span>
                  {/if}
                {/if}
              </td>
              <td class="p-4 text-right">
                {#if item.status !== 'SYNCED' && item.status !== 'NOT_IN_NOTION'}
                  <button 
                    class="text-blue-600 hover:text-blue-800 text-xs font-medium"
                    onclick={() => item.notionId && state.syncSelected([item.notionId])}
                    disabled={state.syncing}
                  >
                    Sync
                  </button>
                {/if}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    {/if}
  </div>
</div>
