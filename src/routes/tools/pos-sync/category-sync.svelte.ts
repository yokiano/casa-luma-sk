import { getCategorySyncStatus, syncCategories, type CategorySyncState, type CategorySyncReport, type CategorySyncResult } from '$lib/category-sync.remote';

export interface CategoryExtended extends CategorySyncState {
  isSyncing?: boolean;
  syncResult?: CategorySyncResult;
}

export class CategorySyncStateUI {
  categories = $state<CategoryExtended[]>([]);
  loading = $state(false);
  syncing = $state(false);
  lastReport = $state<CategorySyncReport | null>(null);
  error = $state<string | null>(null);
  
  // Options
  deleteUnused = $state(false);
  hideSynced = $state(false);

  // Computed: Filtered categories
  filteredCategories = $derived(this.categories.filter(c => {
    if (this.hideSynced && c.status === 'SYNCED') return false;
    return true;
  }));

  // Computed: Categories that need action
  categoriesToSync = $derived(this.categories.filter(c => 
    c.status === 'NOT_IN_LOYVERSE' || 
    (this.deleteUnused && (c.status === 'UNUSED_IN_LOYVERSE' || c.status === 'NOT_IN_NOTION'))
  ));

  constructor() {
    this.fetchStatus();
  }

  async fetchStatus() {
    this.loading = true;
    this.error = null;
    try {
      const results = await getCategorySyncStatus();
      this.categories = results.map(newCat => {
        const existing = this.categories.find(c => c.name === newCat.name);
        return {
          ...newCat,
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
    
    const payload = this.categoriesToSync.map(c => ({
      name: c.name,
      action: c.status === 'NOT_IN_LOYVERSE' ? 'CREATE' as const : 'DELETE' as const
    }));

    // Mark items as syncing
    this.categories.forEach(c => {
      if (payload.some(p => p.name === c.name)) {
        c.isSyncing = true;
        c.syncResult = undefined;
      }
    });

    try {
      const report = await syncCategories({ categories: payload });
      this.lastReport = report;
      // Refresh status after sync
      await this.fetchStatus();
    } catch (e: any) {
      this.error = e.message || 'Failed to sync categories';
      console.error(e);
    } finally {
      this.syncing = false;
      this.categories.forEach(c => c.isSyncing = false);
    }
  }

  async syncSingle(name: string, action: 'CREATE' | 'DELETE') {
    this.syncing = true;
    this.lastReport = null;
    this.error = null;

    const cat = this.categories.find(c => c.name === name);
    if (cat) {
      cat.isSyncing = true;
      cat.syncResult = undefined;
    }

    try {
      const report = await syncCategories({ 
        categories: [{ name, action }] 
      });
      this.lastReport = report;
      await this.fetchStatus();
    } catch (e: any) {
      this.error = e.message || 'Failed to sync category';
      console.error(e);
    } finally {
      this.syncing = false;
      if (cat) cat.isSyncing = false;
    }
  }
}

