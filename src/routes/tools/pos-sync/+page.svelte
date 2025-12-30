<script lang="ts">
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import MenuSyncTab from './tabs/MenuSyncTab.svelte';
  import CategorySyncTab from './tabs/CategorySyncTab.svelte';
  import DiscountSyncTab from './tabs/DiscountSyncTab.svelte';
  import ModifierSyncTab from './tabs/ModifierSyncTab.svelte';
  import OpenPlaySyncTab from './tabs/OpenPlaySyncTab.svelte';
  import PayForPlaySyncTab from './tabs/PayForPlaySyncTab.svelte';
  import StoreSyncTab from './tabs/StoreSyncTab.svelte';

  const tabs = [
    { id: 'menu', label: 'Menu Items', component: MenuSyncTab },
    { id: 'categories', label: 'Categories', component: CategorySyncTab },
    { id: 'modifiers', label: 'Modifiers', component: ModifierSyncTab },
    { id: 'discounts', label: 'Discounts', component: DiscountSyncTab },
    { id: 'open-play', label: 'Open Play / Memberships', component: OpenPlaySyncTab },
    { id: 'pay-for-play', label: 'Pay for Play', component: PayForPlaySyncTab },
    { id: 'store-items', label: 'Store Items', component: StoreSyncTab }
  ];

  let activeTabId = $derived(page.url.searchParams.get('tab') || 'menu');

  const activeTab = $derived(tabs.find(t => t.id === activeTabId));

  function handleTabClick(id: string) {
    const url = new URL(page.url);
    url.searchParams.set('tab', id);
    goto(url, { replaceState: true, keepFocus: true, noScroll: true });
  }
</script>

<div class="container mx-auto py-8">
  <div class="mb-8">
    <h1 class="text-2xl font-bold mb-2">POS Sync (Loyverse)</h1>
    <p class="text-gray-500">Sync items from various Notion databases to Loyverse POS.</p>
  </div>

  <!-- Tabs Navigation -->
  <div class="flex border-b border-gray-200 mb-8 overflow-x-auto">
    {#each tabs as tab}
      <button
        class={`px-6 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
          activeTabId === tab.id
            ? 'border-black text-black'
            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
        }`}
        onclick={() => handleTabClick(tab.id)}
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
