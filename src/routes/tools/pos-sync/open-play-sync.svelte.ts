import { getOpenPlaySyncStatus, syncOpenPlayItems } from '$lib/open-play-sync.remote';
import type { MenuItemExtended } from './pos-sync.svelte';
import type { SyncReport } from '$lib/menu-sync.remote';

export class OpenPlaySyncState {
  items = $state<MenuItemExtended[]>([]);
  loading = $state(false);
  syncing = $state(false);
  lastReport = $state<SyncReport | null>(null);
  error = $state<string | null>(null);
  
  // Open Play orphan candidates are intentionally read-only to protect linked POS identities.
  hideSynced = $state(false);
  // Computed: Filtered items
  filteredItems = $derived(this.items.filter(i => {
    if (this.hideSynced && i.status === 'SYNCED') return false;
    return true;
  }));

  // Computed: Items that need attention
  itemsToSync = $derived(this.items.filter(i => 
    i.status === 'NOT_IN_LOYVERSE' || 
    i.status === 'MODIFIED' ||
    i.status === 'LINKED_ONLY'
  ));

  constructor() {
    this.fetchStatus();
  }

  async fetchStatus() {
    this.loading = true;
    this.error = null;
    try {
      const results = await getOpenPlaySyncStatus();
      this.items = results.map(newItem => {
        const existing = this.items.find(i => 
          (i.notionId && i.notionId === newItem.notionId) || 
          (i.loyverseId && i.loyverseId === newItem.loyverseId)
        );
        return {
          ...newItem,
          syncResult: existing?.syncResult
        };
      });
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
    
    // Mark items as syncing
    const notionIdsToSync = this.itemsToSync.map((item) => item.notionId).filter(Boolean) as string[];
    this.items.forEach(i => {
      if (i.notionId && notionIdsToSync.includes(i.notionId)) {
        i.isSyncing = true;
        i.syncResult = undefined;
      }
    });

    try {
      const report = await syncOpenPlayItems({ itemIds: notionIdsToSync });
      this.applyReport(report);
      await this.fetchStatus();
    } catch (e: any) {
      this.error = e.message || 'Failed to sync items';
      console.error(e);
    } finally {
      this.syncing = false;
      this.items.forEach(i => i.isSyncing = false);
    }
  }

  async syncSelected(itemIds: string[]) {
    this.syncing = true;
    this.lastReport = null;
    this.error = null;

    this.items.forEach(i => {
      if (i.notionId && itemIds.includes(i.notionId)) {
        i.isSyncing = true;
        i.syncResult = undefined;
      }
    });

    try {
      const report = await syncOpenPlayItems({ 
        itemIds
      });
      this.applyReport(report);
      await this.fetchStatus();
    } catch (e: any) {
      this.error = e.message || 'Failed to sync items';
      console.error(e);
    } finally {
      this.syncing = false;
      this.items.forEach(i => i.isSyncing = false);
    }
  }

  private applyReport(report: SyncReport) {
    this.lastReport = report;
    report.itemResults.forEach(res => {
      const item = this.items.find(i => 
        (res.notionId && i.notionId === res.notionId) || 
        (res.loyverseId && i.loyverseId === res.loyverseId)
      );
      if (item) {
        item.syncResult = res;
      }
    });
  }
}
