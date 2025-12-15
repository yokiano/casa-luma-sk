<script lang="ts">
  import MenuSyncTab from './tabs/MenuSyncTab.svelte';

  const tabs = [
    { id: 'menu', label: 'Menu Items', component: MenuSyncTab },
    { id: 'open-play', label: 'Open Play / Memberships', component: null },
    { id: 'pay-for-play', label: 'Pay for Play', component: null },
    { id: 'store-items', label: 'Store Items', component: null }
  ];

  let activeTabId = $state('menu');

  const activeTab = $derived(tabs.find(t => t.id === activeTabId));
</script>

<div class="container mx-auto py-8">
  <div class="mb-8">
    <h1 class="text-2xl font-bold mb-2">POS Sync (Loyverse)</h1>
    <p class="text-gray-500">Sync items from various Notion databases to Loyverse POS.</p>
  </div>

  <!-- Tabs Navigation -->
  <div class="flex border-b border-gray-200 mb-8">
    {#each tabs as tab}
      <button
        class={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
          activeTabId === tab.id
            ? 'border-black text-black'
            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
        }`}
        onclick={() => (activeTabId = tab.id)}
      >
        {tab.label}
      </button>
    {/each}
  </div>

  <!-- Tab Content -->
  <div class="min-h-[400px]">
    {#if activeTab?.component}
      <activeTab.component />
    {:else}
      <div class="flex flex-col items-center justify-center h-64 text-gray-400 bg-gray-50 rounded-lg border border-dashed">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="mb-4"><path d="M21 12a9 9 0 1 1-6.219-8.56"/><path d="M12 2v20"/><path d="M22 12h-2"/><path d="M12 7h-2"/><path d="M12 17h-2"/><path d="m16 20 4.5-4.5"/></svg>
        <p class="font-medium">Sync for {activeTab?.label} is coming soon.</p>
      </div>
    {/if}
  </div>
</div>
