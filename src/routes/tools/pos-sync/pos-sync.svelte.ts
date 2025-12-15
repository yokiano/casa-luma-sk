import { getMenuSyncStatus, syncMenuItems, type MenuItemSyncState, type SyncReport } from '$lib/menu-sync.remote';

export class MenuSyncState {
  items = $state<MenuItemSyncState[]>([]);
  loading = $state(false);
  syncing = $state(false);
  lastReport = $state<SyncReport | null>(null);
  error = $state<string | null>(null);
  
  // Options
  deleteOrphans = $state(false);

  // Computed: Items that need attention
  itemsToSync = $derived(this.items.filter(i => 
    i.status === 'NOT_IN_LOYVERSE' || 
    i.status === 'MODIFIED' || 
    i.status === 'LINKED_ONLY' ||
    (this.deleteOrphans && i.status === 'NOT_IN_NOTION')
  ));

  constructor() {
    this.fetchStatus();
  }

  async fetchStatus() {
    this.loading = true;
    this.error = null;
    try {
      this.items = await getMenuSyncStatus();
    } catch (e: any) {
      this.error = e.message || 'Failed to fetch status';
      console.error(e);
    } finally {
      this.loading = false;
    }
  }

  async syncAll() {
    this.syncing = true;
    this.lastReport = null;
    this.error = null;
    try {
      // Sync everything
      this.lastReport = await syncMenuItems({ 
        deleteOrphans: this.deleteOrphans 
      });
      // Refresh status after sync
      await this.fetchStatus();
    } catch (e: any) {
      this.error = e.message || 'Failed to sync items';
      console.error(e);
    } finally {
      this.syncing = false;
    }
  }

  async syncSelected(itemIds: string[]) {
    this.syncing = true;
    this.lastReport = null;
    this.error = null;
    try {
      // Note: We intentionally don't pass deleteOrphans here as this is a partial sync
      // unless we want to support deleting specific orphaned items which would require passing their IDs somehow?
      // But itemIds are Notion IDs. Orphans don't have Notion IDs.
      // So syncSelected can't really target orphans with the current API design unless we change input to accept Loyverse IDs too.
      // For now, syncSelected only updates Notion -> Loyverse.
      
      this.lastReport = await syncMenuItems({ itemIds });
      await this.fetchStatus();
    } catch (e: any) {
      this.error = e.message || 'Failed to sync items';
      console.error(e);
    } finally {
      this.syncing = false;
    }
  }
}
