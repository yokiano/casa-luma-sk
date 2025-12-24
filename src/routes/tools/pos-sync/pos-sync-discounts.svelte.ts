import { getDiscountSyncStatus, syncDiscounts, type DiscountSyncState as DiscountSyncItem, type SyncReport } from '$lib/discount-sync.remote';

export class DiscountSyncState {
  items = $state<DiscountSyncItem[]>([]);
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
      this.items = await getDiscountSyncStatus();
    } catch (e: any) {
      this.error = e.message || 'Failed to fetch discount status';
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
      this.lastReport = await syncDiscounts({ 
        deleteOrphans: this.deleteOrphans 
      });
      await this.fetchStatus();
    } catch (e: any) {
      this.error = e.message || 'Failed to sync discounts';
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
      this.lastReport = await syncDiscounts({ itemIds });
      await this.fetchStatus();
    } catch (e: any) {
      this.error = e.message || 'Failed to sync discounts';
      console.error(e);
    } finally {
      this.syncing = false;
    }
  }
}
