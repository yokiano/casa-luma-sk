import { query, command } from '$app/server';
import { NOTION_API_KEY } from '$env/static/private';
import { MenuItemsDatabase, MenuItemsResponseDTO, MenuItemsPatchDTO } from '$lib/notion-sdk/dbs/menu-items';
import { loyverse } from '$lib/server/loyverse';
import * as v from 'valibot';

// Types for the UI
export type SyncStatus = 'SYNCED' | 'NOT_IN_LOYVERSE' | 'NOT_IN_NOTION' | 'MODIFIED' | 'LINKED_ONLY';

export interface MenuItemSyncState {
  notionId?: string; // Optional because NOT_IN_NOTION items won't have it
  loyverseId?: string;
  name: string;
  category: string;
  imageUrl?: string;
  notionLoyverseIdProp?: string; // The value in the Notion "LoyverseID" property
  status: SyncStatus;
  diffs?: string[]; // Description of differences if MODIFIED
}

export interface SyncReport {
  created: number;
  updated: number;
  linked: number;
  deleted: number;
  errors: string[];
}

// Helper to normalize strings for comparison
const normalize = (str?: string | null) => str?.trim() || '';

// Helper to compare Notion and Loyverse items
function compareItems(notionItem: MenuItemsResponseDTO, loyverseItem: any, loyverseCategories: Map<string, any>): string[] {
  const diffs: string[] = [];
  
  if (normalize(notionItem.properties.name.text) !== normalize(loyverseItem.item_name)) {
    diffs.push(`Name mismatch: "${notionItem.properties.name.text}" vs "${loyverseItem.item_name}"`);
  }
  
  // Compare Price (Notion is number, Loyverse has variants)
  const notionPrice = notionItem.properties.price ?? 0;
  // Assuming simple item with one variant or taking the first variant's price
  const loyversePrice = loyverseItem.variants[0]?.default_price ?? 0;
  
  if (notionPrice !== loyversePrice) {
    diffs.push(`Price mismatch: ${notionPrice} vs ${loyversePrice}`);
  }

  // Compare Description
  const notionDesc = normalize(notionItem.properties.description.text);
  const loyverseDesc = normalize(loyverseItem.description);
  
  if (notionDesc !== loyverseDesc) {
    diffs.push('Description mismatch');
  }

  // Compare Category
  // We use the Notion category name as the source of truth
  const notionCategory = notionItem.properties.category?.name || 'Uncategorized';
  const loyverseCategory = loyverseItem.category_id ? loyverseCategories.get(loyverseItem.category_id)?.name : undefined;

  if (notionCategory !== (loyverseCategory || 'Uncategorized')) {
    diffs.push(`Category mismatch: "${notionCategory}" vs "${loyverseCategory || 'Uncategorized'}"`);
  }

  return diffs;
}

export const getMenuSyncStatus = query(async () => {
  const notionDb = new MenuItemsDatabase({ notionSecret: NOTION_API_KEY });
  
  // Parallel fetch - Only sync Active items from Notion
  const [notionResult, loyverseItems, loyverseCategoriesList] = await Promise.all([
    notionDb.query({
      filter: {
        status: { equals: 'Active' }
      }
    }),
    loyverse.getAllItems(),
    loyverse.getAllCategories()
  ]);

  const notionItems = notionResult.results.map(r => new MenuItemsResponseDTO(r));
  const syncStates: MenuItemSyncState[] = [];
  
  // Create a map of Loyverse items for easy lookup
  // Map by ID and Name
  const loyverseById = new Map(loyverseItems.map(i => [i.id, i]));
  const loyverseByName = new Map(loyverseItems.map(i => [normalize(i.item_name).toLowerCase(), i]));
  const loyverseCategories = new Map(loyverseCategoriesList.map(c => [c.id, c]));

  // Track which Loyverse items are matched
  const matchedLoyverseIds = new Set<string>();

  for (const nItem of notionItems) {
    const notionLoyverseId = nItem.properties.loyverseId?.rich_text?.[0]?.plain_text;
    const name = nItem.properties.name.text || 'Untitled';
    const category = nItem.properties.category?.name || 'Uncategorized';
    const imageUrl = nItem.properties.image?.urls?.[0]; // Get first image URL if available
    
    let status: SyncStatus = 'NOT_IN_LOYVERSE';
    let loyverseId: string | undefined = undefined;
    let diffs: string[] = [];

    if (notionLoyverseId && loyverseById.has(notionLoyverseId)) {
      // Linked by ID
      const lItem = loyverseById.get(notionLoyverseId)!;
      loyverseId = lItem.id;
      matchedLoyverseIds.add(lItem.id);
      
      diffs = compareItems(nItem, lItem, loyverseCategories);
      status = diffs.length > 0 ? 'MODIFIED' : 'SYNCED';
    } else if (loyverseByName.has(normalize(name).toLowerCase())) {
      // Found by name but not linked via ID property
      const lItem = loyverseByName.get(normalize(name).toLowerCase())!;
      loyverseId = lItem.id;
      matchedLoyverseIds.add(lItem.id);

      status = 'LINKED_ONLY'; // Needs to update Notion with ID
      diffs = compareItems(nItem, lItem, loyverseCategories);
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

  // Find orphaned Loyverse items
  for (const lItem of loyverseItems) {
    if (!matchedLoyverseIds.has(lItem.id)) {
      syncStates.push({
        notionId: undefined,
        loyverseId: lItem.id,
        name: lItem.item_name,
        category: lItem.category_id ? (loyverseCategories.get(lItem.category_id)?.name || 'Uncategorized') : 'Uncategorized',
        status: 'NOT_IN_NOTION',
        imageUrl: lItem.image_url
      });
    }
  }

  return syncStates;
});

export const syncMenuItems = command(
  v.object({
    itemIds: v.optional(v.array(v.string())), // Optional list of Notion IDs to sync.
    deleteOrphans: v.optional(v.boolean()) // If true, delete Loyverse items not in Notion
  }),
  async ({ itemIds, deleteOrphans }) => {
    const notionDb = new MenuItemsDatabase({ notionSecret: NOTION_API_KEY });
    const report: SyncReport = { created: 0, updated: 0, linked: 0, deleted: 0, errors: [] };

    try {
      // Fetch data - Only sync Active items from Notion
      const [notionResult, loyverseItems, loyverseCategoriesList] = await Promise.all([
        notionDb.query({
          filter: {
            status: { equals: 'Active' }
          }
        }),
        loyverse.getAllItems(),
        loyverse.getAllCategories()
      ]);

      const allNotionItems = notionResult.results.map(r => new MenuItemsResponseDTO(r));
      
      // Filter items to sync (Create/Update)
      const notionItemsToSync = allNotionItems
        .filter(i => !itemIds || itemIds.includes(i.id));

      const loyverseById = new Map(loyverseItems.map(i => [i.id, i]));
      const loyverseByName = new Map(loyverseItems.map(i => [normalize(i.item_name).toLowerCase(), i]));
      
      // Category Cache (Name -> ID)
      const categoryCache = new Map(loyverseCategoriesList.map(c => [normalize(c.name).toLowerCase(), c.id]));

      // Helper to get or create category
      const resolveCategoryId = async (categoryName: string) => {
        const normalizedName = normalize(categoryName).toLowerCase();
        if (categoryCache.has(normalizedName)) {
          return categoryCache.get(normalizedName)!;
        }
        
        // Create new category
        const newCat = await loyverse.createCategory(categoryName);
        categoryCache.set(normalizedName, newCat.id);
        return newCat.id;
      };

      // Track matched Loyverse IDs for orphan detection (using ALL Notion items)
      const matchedLoyverseIds = new Set<string>();

      // First pass: Match all Notion items to identify orphans
      for (const nItem of allNotionItems) {
         const notionLoyverseId = nItem.properties.loyverseId?.rich_text?.[0]?.plain_text;
         const name = nItem.properties.name.text || 'Untitled';

         if (notionLoyverseId && loyverseById.has(notionLoyverseId)) {
            matchedLoyverseIds.add(notionLoyverseId);
         } else if (loyverseByName.has(normalize(name).toLowerCase())) {
            const lItem = loyverseByName.get(normalize(name).toLowerCase())!;
            matchedLoyverseIds.add(lItem.id);
         }
      }

      // Sync Loop (Create/Update/Link)
      for (const nItem of notionItemsToSync) {
        try {
          const notionLoyverseId = nItem.properties.loyverseId?.rich_text?.[0]?.plain_text;
          const name = nItem.properties.name.text || 'Untitled';
          const description = nItem.properties.description.text || '';
          const price = nItem.properties.price ?? 0;
          const categoryName = nItem.properties.category?.name || 'Uncategorized';
          const imageUrl = nItem.properties.image?.urls?.[0];

          const categoryId = await resolveCategoryId(categoryName);

          let targetLoyverseItem: any;
          let isNew = false;

          // 1. Resolve Target
          if (notionLoyverseId && loyverseById.has(notionLoyverseId)) {
            targetLoyverseItem = loyverseById.get(notionLoyverseId);
          } else if (loyverseByName.has(normalize(name).toLowerCase())) {
            targetLoyverseItem = loyverseByName.get(normalize(name).toLowerCase());
            // Need to link in Notion
            await notionDb.updatePage(nItem.id, new MenuItemsPatchDTO({
              properties: {
                loyverseId: targetLoyverseItem.id
              }
            }));
            report.linked++;
          } else {
            isNew = true;
          }

          // 2. Perform Action
          if (isNew) {
            // Create in Loyverse
            const newItem = await loyverse.createItem({
              item_name: name,
              description: description,
              category_id: categoryId,
              variants: [{
                default_price: price,
                default_pricing_type: 'FIXED'
              }]
            });

            // Upload Image if exists
            if (imageUrl) {
              try {
                await loyverse.uploadImage(newItem.id, imageUrl);
              } catch (imgErr) {
                console.warn(`Failed to upload image for new item ${name}:`, imgErr);
                report.errors.push(`Image upload failed for "${name}"`);
              }
            }
            
            // Update Notion with new ID
            await notionDb.updatePage(nItem.id, new MenuItemsPatchDTO({
              properties: {
                loyverseId: newItem.id
              }
            }));
            report.created++;
          } else {
            // Update in Loyverse
            
            const variants = targetLoyverseItem.variants.map((v: any, index: number) => {
               const variantUpdate: any = {
                 variant_id: v.variant_id,
                 sku: v.sku,
                 option1_value: v.option1_value,
                 option2_value: v.option2_value,
                 option3_value: v.option3_value,
                 barcode: v.barcode,
                 cost: v.cost,
                 purchase_cost: v.purchase_cost,
                 default_pricing_type: v.default_pricing_type,
                 default_price: v.default_price,
               };

               // Update the first variant with price
               if (index === 0) {
                 variantUpdate.default_price = price;
                 variantUpdate.default_pricing_type = 'FIXED';
               }
               return variantUpdate;
            });

            await loyverse.updateItem(targetLoyverseItem.id, {
              item_name: name,
              description: description,
              category_id: categoryId,
              track_stock: targetLoyverseItem.track_stock,
              sold_by_weight: targetLoyverseItem.sold_by_weight,
              is_composite: targetLoyverseItem.is_composite,
              variants: variants
            });

            // Upload Image if exists
            if (imageUrl) {
              try {
                await loyverse.uploadImage(targetLoyverseItem.id, imageUrl);
              } catch (imgErr) {
                 console.warn(`Failed to upload image for item ${name}:`, imgErr);
              }
            }
            
            // Ensure Notion has the ID
            if (notionLoyverseId !== targetLoyverseItem.id) {
               await notionDb.updatePage(nItem.id, new MenuItemsPatchDTO({
                properties: {
                  loyverseId: targetLoyverseItem.id
                }
              }));
              report.linked++;
            }
            
            report.updated++;
          }

        } catch (err: any) {
          console.error(`Error syncing item ${nItem.properties.name.text}:`, err);
          report.errors.push(`Failed to sync "${nItem.properties.name.text}": ${err.message}`);
        }
      }

      // Handle Orphans (Delete)
      if (deleteOrphans) {
        for (const lItem of loyverseItems) {
          if (!matchedLoyverseIds.has(lItem.id)) {
             try {
               await loyverse.deleteItem(lItem.id);
               report.deleted++;
             } catch (err: any) {
               console.error(`Error deleting item ${lItem.item_name}:`, err);
               report.errors.push(`Failed to delete "${lItem.item_name}": ${err.message}`);
             }
          }
        }
      }

    } catch (err: any) {
      console.error('Fatal sync error:', err);
      report.errors.push(`Fatal error: ${err.message}`);
    }

    return report;
  }
);
