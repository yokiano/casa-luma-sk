import { query, command } from '$app/server';
import { NOTION_API_KEY } from '$env/static/private';
import { OpenPlayPosItemsDatabase, OpenPlayPosItemsResponseDTO, OpenPlayPosItemsPatchDTO } from '$lib/notion-sdk/dbs/open-play-pos-items';
import { loyverse } from '$lib/server/loyverse';
import * as v from 'valibot';
import type { MenuItemSyncState, SyncReport, ItemSyncResult, SyncStatus } from './menu-sync.remote';

// Helper to normalize strings for comparison
const normalize = (str?: string | null) => str?.trim() || '';

// Helper to build description from Notion properties
function buildDescription(item: OpenPlayPosItemsResponseDTO): string {
  const parts = [];
  if (item.properties.duration.text) parts.push(`Duration: ${item.properties.duration.text}`);
  if (item.properties.access.text) parts.push(`Access: ${item.properties.access.text}`);
  if (item.properties.workshopsIncluded.text) parts.push(`Workshops: ${item.properties.workshopsIncluded.text}`);
  if (item.properties.perks.values.length > 0) parts.push(`Perks: ${item.properties.perks.values.join(', ')}`);
  if (item.properties.foodDiscount.text) parts.push(`Food Discount: ${item.properties.foodDiscount.text}`);
  return parts.join('\n');
}

// Helper to compare Notion and Loyverse items
function compareOpenPlayItems(
  notionItem: OpenPlayPosItemsResponseDTO, 
  loyverseItem: any, 
  loyverseCategories: Map<string, any>
): string[] {
  const diffs: string[] = [];
  
  if (normalize(notionItem.properties.name.text) !== normalize(loyverseItem.item_name)) {
    diffs.push(`Name mismatch: "${notionItem.properties.name.text}" vs "${loyverseItem.item_name}"`);
  }
  
  // Compare Price
  const notionPrice = notionItem.properties.priceBaht ?? 0;
  const loyversePrice = loyverseItem.variants[0]?.default_price ?? 0;
  
  if (notionPrice !== loyversePrice) {
    diffs.push(`Price mismatch: ${notionPrice} vs ${loyversePrice}`);
  }

  // Compare Description
  const notionDesc = normalize(buildDescription(notionItem));
  const loyverseDesc = normalize(loyverseItem.description);
  
  // Loyverse description might have different line endings or whitespace
  if (notionDesc !== loyverseDesc) {
    diffs.push('Description mismatch');
  }

  // Compare Category
  const notionCategory = notionItem.properties.category?.name || 'Uncategorized';
  const loyverseCategory = loyverseItem.category_id ? loyverseCategories.get(loyverseItem.category_id)?.name : undefined;

  if (notionCategory !== (loyverseCategory || 'Uncategorized')) {
    diffs.push(`Category mismatch: "${notionCategory}" vs "${loyverseCategory || 'Uncategorized'}"`);
  }

  return diffs;
}

export const getOpenPlaySyncStatus = query(async () => {
  const notionDb = new OpenPlayPosItemsDatabase({ notionSecret: NOTION_API_KEY });
  
  // Parallel fetch
  const [notionResult, loyverseItems, loyverseCategoriesList] = await Promise.all([
    notionDb.query({}),
    loyverse.getAllItems(),
    loyverse.getAllCategories()
  ]);

  const notionItems = notionResult.results.map(r => new OpenPlayPosItemsResponseDTO(r));
  
  const syncStates: MenuItemSyncState[] = [];
  
  const loyverseById = new Map(loyverseItems.map(i => [i.id, i]));
  const loyverseByName = new Map(loyverseItems.map(i => [normalize(i.item_name).toLowerCase(), i]));
  const loyverseCategories = new Map(loyverseCategoriesList.map(c => [c.id, c]));

  // Collect all unique categories used by Open Play Items in Notion (normalized for comparison)
  const notionOpenPlayCategories = new Set<string>();
  for (const nItem of notionItems) {
    const cat = nItem.properties.category?.name;
    if (cat) notionOpenPlayCategories.add(normalize(cat).toLowerCase());
  }

  const matchedLoyverseIds = new Set<string>();

  for (const nItem of notionItems) {
    const notionLoyverseId = nItem.properties.id.text;
    const name = nItem.properties.name.text || 'Untitled';
    const category = nItem.properties.category?.name || 'Uncategorized';
    const imageUrl = nItem.cover.url;
    
    let status: SyncStatus = 'NOT_IN_LOYVERSE';
    let loyverseId: string | undefined = undefined;
    let diffs: string[] = [];

    if (notionLoyverseId && loyverseById.has(notionLoyverseId)) {
      const lItem = loyverseById.get(notionLoyverseId)!;
      loyverseId = lItem.id;
      matchedLoyverseIds.add(lItem.id);
      
      diffs = compareOpenPlayItems(nItem, lItem, loyverseCategories);
      
      // Compare image presence (optional, if we want to show it in diffs)
      if (imageUrl && !lItem.image_url) {
        diffs.push('Image missing in Loyverse');
      }

      status = diffs.length > 0 ? 'MODIFIED' : 'SYNCED';
    } else if (loyverseByName.has(normalize(name).toLowerCase())) {
      const lItem = loyverseByName.get(normalize(name).toLowerCase())!;
      loyverseId = lItem.id;
      matchedLoyverseIds.add(lItem.id);

      status = 'LINKED_ONLY';
      diffs = compareOpenPlayItems(nItem, lItem, loyverseCategories);
    }

    syncStates.push({
      notionId: nItem.id,
      loyverseId,
      name,
      category,
      imageUrl,
      notionLoyverseIdProp: notionLoyverseId,
      status,
      diffs
    });
  }

  // Find orphaned Loyverse items - only consider items whose category is used by Open Play Items
  for (const lItem of loyverseItems) {
    if (!matchedLoyverseIds.has(lItem.id)) {
      const catName = lItem.category_id ? (loyverseCategories.get(lItem.category_id)?.name || '') : '';
      const normalizedCat = normalize(catName).toLowerCase();

      // Only show as orphan if category is one used by Open Play Items in Notion
      if (notionOpenPlayCategories.has(normalizedCat)) {
        syncStates.push({
          notionId: undefined,
          loyverseId: lItem.id,
          name: lItem.item_name,
          category: catName || 'Uncategorized',
          status: 'NOT_IN_NOTION'
        });
      }
    }
  }

  return syncStates;
});

export const syncOpenPlayItems = command(
  v.object({
    itemIds: v.optional(v.array(v.string())),
    deleteOrphans: v.optional(v.boolean()),
    forceImageSync: v.optional(v.boolean())
  }),
  async ({ itemIds, deleteOrphans, forceImageSync }) => {
    const notionDb = new OpenPlayPosItemsDatabase({ notionSecret: NOTION_API_KEY });
    const report: SyncReport = { created: 0, updated: 0, linked: 0, deleted: 0, errors: [], itemResults: [] };

    try {
      const [notionResult, loyverseItems, loyverseCategoriesList] = await Promise.all([
        notionDb.query({}),
        loyverse.getAllItems(),
        loyverse.getAllCategories()
      ]);

      const allNotionItems = notionResult.results.map(r => new OpenPlayPosItemsResponseDTO(r));
      const notionItemsToSync = allNotionItems.filter(i => !itemIds || itemIds.includes(i.id));

      const loyverseById = new Map(loyverseItems.map(i => [i.id, i]));
      const loyverseByName = new Map(loyverseItems.map(i => [normalize(i.item_name).toLowerCase(), i]));
      const loyverseCategories = new Map(loyverseCategoriesList.map(c => [c.id, c]));
      const categoryCache = new Map(loyverseCategoriesList.map(c => [normalize(c.name).toLowerCase(), c.id]));

      const resolveCategoryId = async (categoryName: string) => {
        const normalizedName = normalize(categoryName).toLowerCase();
        if (categoryCache.has(normalizedName)) return categoryCache.get(normalizedName)!;
        const newCat = await loyverse.createCategory(categoryName);
        categoryCache.set(normalizedName, newCat.id);
        return newCat.id;
      };

      // Collect all unique categories used by Open Play Items in Notion (normalized for comparison)
      const notionOpenPlayCategories = new Set<string>();
      for (const nItem of allNotionItems) {
        const cat = nItem.properties.category?.name;
        if (cat) notionOpenPlayCategories.add(normalize(cat).toLowerCase());
      }

      const matchedLoyverseIds = new Set<string>();
      for (const nItem of allNotionItems) {
         const notionLoyverseId = nItem.properties.id.text;
         const name = nItem.properties.name.text || 'Untitled';
         if (notionLoyverseId && loyverseById.has(notionLoyverseId)) {
            matchedLoyverseIds.add(notionLoyverseId);
         } else if (loyverseByName.has(normalize(name).toLowerCase())) {
            matchedLoyverseIds.add(loyverseByName.get(normalize(name).toLowerCase())!.id);
         }
      }

      for (const nItem of notionItemsToSync) {
        let currentAction: 'CREATE' | 'UPDATE' | 'LINK' | 'DELETE' | 'SKIP' = 'UPDATE';
        try {
          const notionLoyverseId = nItem.properties.id.text;
          const name = nItem.properties.name.text || 'Untitled';
          const description = buildDescription(nItem);
          const categoryName = nItem.properties.category?.name || 'Uncategorized';
          const categoryId = await resolveCategoryId(categoryName);
          const price = nItem.properties.priceBaht ?? 0;
          const imageUrl = nItem.cover.url;

          let targetLoyverseItem: any;
          let isNew = false;

          if (notionLoyverseId && loyverseById.has(notionLoyverseId)) {
            targetLoyverseItem = loyverseById.get(notionLoyverseId);
            currentAction = 'UPDATE';
          } else if (loyverseByName.has(normalize(name).toLowerCase())) {
            targetLoyverseItem = loyverseByName.get(normalize(name).toLowerCase());
            await notionDb.updatePage(nItem.id, new OpenPlayPosItemsPatchDTO({
              properties: { id: targetLoyverseItem.id }
            }));
            report.linked++;
            currentAction = 'LINK';
          } else {
            isNew = true;
            currentAction = 'CREATE';
          }

          if (!isNew && targetLoyverseItem) {
            const diffs = compareOpenPlayItems(nItem, targetLoyverseItem, loyverseCategories);
            if (diffs.length === 0 && (!forceImageSync || !imageUrl)) {
              report.itemResults.push({
                notionId: nItem.id,
                loyverseId: targetLoyverseItem.id,
                name,
                action: 'SKIP',
                status: 'SUCCESS',
                message: 'Already in sync'
              });
              continue;
            }
          }

          const payload: any = {
             item_name: name,
             description,
             category_id: categoryId,
             variants: [{
                default_price: price,
                default_pricing_type: 'FIXED'
             }]
          };

          if (!isNew && targetLoyverseItem && targetLoyverseItem.variants?.[0]) {
             payload.variants[0].variant_id = targetLoyverseItem.variants[0].variant_id;
          }

          let finalLid: string;
          if (isNew) {
            const newItem = await loyverse.createItem(payload);
            finalLid = newItem.id;
            await notionDb.updatePage(nItem.id, new OpenPlayPosItemsPatchDTO({
              properties: { id: finalLid }
            }));
            report.created++;
          } else {
            finalLid = targetLoyverseItem.id;
            await loyverse.updateItem(finalLid, payload);
            if (notionLoyverseId !== finalLid) {
               await notionDb.updatePage(nItem.id, new OpenPlayPosItemsPatchDTO({
                properties: { id: finalLid }
              }));
              report.linked++;
            }
            report.updated++;
          }

          // Upload image if available
          if (imageUrl) {
            try {
              await loyverse.uploadImage(finalLid, imageUrl);
            } catch (imgErr: any) {
              console.warn(`[Image Sync] Warning: Could not upload image for open play item "${name}": ${imgErr.message}`);
              report.errors.push(`Image upload failed for "${name}" (Item synced anyway)`);
            }
          }

          report.itemResults.push({ 
            notionId: nItem.id, 
            loyverseId: finalLid, 
            name, 
            action: isNew ? 'CREATE' : (currentAction === 'LINK' ? 'LINK' : 'UPDATE'), 
            status: 'SUCCESS' 
          });
        } catch (err: any) {
          console.error(`Error syncing open play item ${nItem.properties.name.text}:`, err);
          report.errors.push(`Failed to sync "${nItem.properties.name.text}": ${err.message}`);
          report.itemResults.push({
            notionId: nItem.id,
            name: nItem.properties.name.text || 'Untitled',
            action: currentAction,
            status: 'ERROR',
            message: err.message
          });
        }
      }

      // Handle Orphans (Delete) - only delete items whose category is used by Open Play Items
      if (deleteOrphans) {
        for (const lItem of loyverseItems) {
          if (!matchedLoyverseIds.has(lItem.id)) {
             const catName = lItem.category_id ? (loyverseCategories.get(lItem.category_id)?.name || '') : '';
             const normalizedCat = normalize(catName).toLowerCase();

             // Only delete if category is one used by Open Play Items in Notion
             if (notionOpenPlayCategories.has(normalizedCat)) {
               try {
                 await loyverse.deleteItem(lItem.id);
                 report.deleted++;
                 report.itemResults.push({ loyverseId: lItem.id, name: lItem.item_name, action: 'DELETE', status: 'SUCCESS' });
               } catch (err: any) {
                 report.errors.push(`Failed to delete "${lItem.item_name}": ${err.message}`);
                 report.itemResults.push({ loyverseId: lItem.id, name: lItem.item_name, action: 'DELETE', status: 'ERROR', message: err.message });
               }
             }
          }
        }
      }
    } catch (err: any) {
      console.error('Fatal open play sync error:', err);
      report.errors.push(`Fatal error: ${err.message}`);
    }

    return report;
  }
);
