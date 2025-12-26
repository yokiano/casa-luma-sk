import { query, command } from '$app/server';
import { NOTION_API_KEY } from '$env/static/private';
import { MenuItemsDatabase, MenuItemsResponseDTO } from '$lib/notion-sdk/dbs/menu-items';
import { OpenPlayPosItemsDatabase, OpenPlayPosItemsResponseDTO } from '$lib/notion-sdk/dbs/open-play-pos-items';
import { PayForPlayItemsDatabase, PayForPlayItemsResponseDTO } from '$lib/notion-sdk/dbs/pay-for-play-items';
import { loyverse } from '$lib/server/loyverse';
import * as v from 'valibot';

export type CategorySyncStatus = 'SYNCED' | 'NOT_IN_LOYVERSE' | 'NOT_IN_NOTION' | 'UNUSED_IN_LOYVERSE';

export interface CategorySyncState {
  name: string;
  loyverseId?: string;
  status: CategorySyncStatus;
  notionCount: number; // How many items in Notion use this category
  loyverseCount: number; // How many items in Loyverse use this category
}

export interface CategorySyncResult {
  name: string;
  action: 'CREATE' | 'DELETE' | 'SKIP';
  status: 'SUCCESS' | 'ERROR';
  message?: string;
}

export interface CategorySyncReport {
  created: number;
  deleted: number;
  errors: string[];
  results: CategorySyncResult[];
}

const normalize = (str?: string | null) => str?.trim() || '';

export const getCategorySyncStatus = query(async () => {
  const menuItemsDb = new MenuItemsDatabase({ notionSecret: NOTION_API_KEY });
  const openPlayDb = new OpenPlayPosItemsDatabase({ notionSecret: NOTION_API_KEY });
  const payForPlayDb = new PayForPlayItemsDatabase({ notionSecret: NOTION_API_KEY });

  // Parallel fetch everything
  const [
    menuItemsResult,
    openPlayResult,
    payForPlayResult,
    loyverseCategories,
    loyverseItems
  ] = await Promise.all([
    menuItemsDb.query({ filter: { status: { equals: 'Active' } } }),
    openPlayDb.query({}),
    payForPlayDb.query({}),
    loyverse.getAllCategories(),
    loyverse.getAllItems()
  ]);

  const notionCategories = new Map<string, number>();

  const processItems = (items: any[]) => {
    for (const item of items) {
      const categoryName = normalize(item.properties.category?.name);
      if (categoryName) {
        notionCategories.set(categoryName, (notionCategories.get(categoryName) || 0) + 1);
      }
    }
  };

  processItems(menuItemsResult.results.map(r => new MenuItemsResponseDTO(r)));
  processItems(openPlayResult.results.map(r => new OpenPlayPosItemsResponseDTO(r)));
  processItems(payForPlayResult.results.map(r => new PayForPlayItemsResponseDTO(r)));

  const loyverseCategoryItemsCount = new Map<string, number>();
  for (const item of loyverseItems) {
    if (item.category_id) {
      loyverseCategoryItemsCount.set(item.category_id, (loyverseCategoryItemsCount.get(item.category_id) || 0) + 1);
    }
  }

  const syncStates: CategorySyncState[] = [];
  const processedLoyverseIds = new Set<string>();

  // Notion categories
  for (const [name, count] of notionCategories.entries()) {
    const lCat = loyverseCategories.find(c => normalize(c.name).toLowerCase() === name.toLowerCase());
    if (lCat) {
      processedLoyverseIds.add(lCat.id);
      syncStates.push({
        name,
        loyverseId: lCat.id,
        status: 'SYNCED',
        notionCount: count,
        loyverseCount: loyverseCategoryItemsCount.get(lCat.id) || 0
      });
    } else {
      syncStates.push({
        name,
        status: 'NOT_IN_LOYVERSE',
        notionCount: count,
        loyverseCount: 0
      });
    }
  }

  // Loyverse categories not in Notion
  for (const lCat of loyverseCategories) {
    if (!processedLoyverseIds.has(lCat.id)) {
      const loyverseCount = loyverseCategoryItemsCount.get(lCat.id) || 0;
      syncStates.push({
        name: lCat.name,
        loyverseId: lCat.id,
        status: loyverseCount === 0 ? 'UNUSED_IN_LOYVERSE' : 'NOT_IN_NOTION',
        notionCount: 0,
        loyverseCount
      });
    }
  }

  return syncStates.sort((a, b) => a.name.localeCompare(b.name));
});

export const syncCategories = command(
  v.object({
    categories: v.array(v.object({
      name: v.string(),
      action: v.enum_(['CREATE', 'DELETE'])
    }))
  }),
  async ({ categories }) => {
    const report: CategorySyncReport = { created: 0, deleted: 0, errors: [], results: [] };
    
    // Refresh current categories to get IDs for delete
    const currentLoyverseCategories = await loyverse.getAllCategories();

    for (const catToSync of categories) {
      try {
        if (catToSync.action === 'CREATE') {
          await loyverse.createCategory(catToSync.name);
          report.created++;
          report.results.push({ name: catToSync.name, action: 'CREATE', status: 'SUCCESS' });
        } else if (catToSync.action === 'DELETE') {
          const lCat = currentLoyverseCategories.find(c => normalize(c.name).toLowerCase() === normalize(catToSync.name).toLowerCase());
          if (lCat) {
            await loyverse.deleteCategory(lCat.id);
            report.deleted++;
            report.results.push({ name: catToSync.name, action: 'DELETE', status: 'SUCCESS' });
          } else {
            report.results.push({ name: catToSync.name, action: 'DELETE', status: 'SKIP', message: 'Category not found in Loyverse' });
          }
        }
      } catch (err: any) {
        console.error(`Error syncing category ${catToSync.name}:`, err);
        report.errors.push(`Failed to ${catToSync.action.toLowerCase()} category "${catToSync.name}": ${err.message}`);
        report.results.push({ name: catToSync.name, action: catToSync.action, status: 'ERROR', message: err.message });
      }
    }

    return report;
  }
);

