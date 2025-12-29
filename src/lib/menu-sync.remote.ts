import { query, command } from '$app/server';
import { NOTION_API_KEY } from '$env/static/private';
import { MenuItemsDatabase, MenuItemsResponseDTO, MenuItemsPatchDTO } from '$lib/notion-sdk/dbs/menu-items';
import { PosModifiersDatabase, PosModifiersResponseDTO } from '$lib/notion-sdk/dbs/pos-modifiers';
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
  hasVariants?: boolean;
  modifiersCount?: number;
}

export interface ItemSyncResult {
  notionId?: string;
  loyverseId?: string;
  name: string;
  action: 'CREATE' | 'UPDATE' | 'LINK' | 'DELETE' | 'SKIP';
  status: 'SUCCESS' | 'ERROR';
  message?: string;
}

export interface SyncReport {
  created: number;
  updated: number;
  linked: number;
  deleted: number;
  errors: string[];
  itemResults: ItemSyncResult[];
}

// Helper to normalize strings for comparison
const normalize = (str?: string | null) => str?.trim() || '';

interface ParsedVariant {
  option1_value?: string;
  option2_value?: string;
  option3_value?: string;
  price?: number;
  sku?: string;
  barcode?: string;
}

function parseVariants(jsonString?: string): ParsedVariant[] {
  if (!jsonString) return [];
  try {
    const parsed = JSON.parse(jsonString);
    if (Array.isArray(parsed)) {
      return parsed.map((v: any) => ({
        option1_value: v.option1_value || v.name || v.option1 || undefined,
        option2_value: v.option2_value || v.option2 || undefined,
        option3_value: v.option3_value || v.option3 || undefined,
        price: Number(v.price ?? v.default_price ?? 0),
        sku: v.sku,
        barcode: v.barcode
      }));
    }
    return [];
  } catch (e) {
    console.error('Failed to parse variants JSON:', e);
    return [];
  }
}

// Helper to compare Notion and Loyverse items
function compareItems(
  notionItem: MenuItemsResponseDTO, 
  loyverseItem: any, 
  loyverseCategories: Map<string, any>,
  notionModifiersMap: Map<string, string> // Notion Page ID -> Loyverse Modifier ID
): string[] {
  const diffs: string[] = [];
  
  if (normalize(notionItem.properties.name.text) !== normalize(loyverseItem.item_name)) {
    diffs.push(`Name mismatch: "${notionItem.properties.name.text}" vs "${loyverseItem.item_name}"`);
  }
  
  const hasVariants = notionItem.properties.hasVariants ?? false;

  if (hasVariants) {
     // Compare Variants
     const notionVariants = parseVariants(notionItem.properties.variantsJson.text);
     const loyverseVariants = loyverseItem.variants || [];

     // Compare Option Names
     const nOp1 = normalize(notionItem.properties.variantOption_1Name.text);
     const lOp1 = normalize(loyverseItem.option1_name);
     if (nOp1 !== lOp1) diffs.push(`Option 1 Name mismatch: "${nOp1}" vs "${lOp1}"`);

     const nOp2 = normalize(notionItem.properties.variantOption_2Name.text);
     const lOp2 = normalize(loyverseItem.option2_name);
     if (nOp2 !== lOp2 && (nOp2 || lOp2)) diffs.push(`Option 2 Name mismatch: "${nOp2}" vs "${lOp2}"`);
     
     const nOp3 = normalize(notionItem.properties.variantOption_3Name.text);
     const lOp3 = normalize(loyverseItem.option3_name);
     if (nOp3 !== lOp3 && (nOp3 || lOp3)) diffs.push(`Option 3 Name mismatch: "${nOp3}" vs "${lOp3}"`);

     // Compare Variant Count
     if (notionVariants.length !== loyverseVariants.length) {
        diffs.push(`Variant count mismatch: ${notionVariants.length} vs ${loyverseVariants.length}`);
     } else {
        // Compare values loosely
        for (const nVar of notionVariants) {
           // Find matching variant in Loyverse by options
           const lVar = loyverseVariants.find((lv: any) => 
              normalize(lv.option1_value) === normalize(nVar.option1_value) &&
              normalize(lv.option2_value) === normalize(nVar.option2_value) &&
              normalize(lv.option3_value) === normalize(nVar.option3_value)
           );
           
           if (!lVar) {
              diffs.push(`Variant ${nVar.option1_value}/${nVar.option2_value} missing in Loyverse`);
           } else {
              if (nVar.price !== lVar.default_price) {
                 diffs.push(`Price mismatch for ${nVar.option1_value}: ${nVar.price} vs ${lVar.default_price}`);
              }
           }
        }
     }

  } else {
    // Simple Item Comparison
    // Compare Price (Notion is number, Loyverse has variants)
    const notionPrice = notionItem.properties.price ?? 0;
    // Assuming simple item with one variant or taking the first variant's price
    const loyversePrice = loyverseItem.variants[0]?.default_price ?? 0;
    
    if (notionPrice !== loyversePrice) {
      diffs.push(`Price mismatch: ${notionPrice} vs ${loyversePrice}`);
    }
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

  // Compare Image Presence
  const notionImage = notionItem.properties.image?.urls?.[0];
  if (notionImage && !loyverseItem.image_url) {
    diffs.push('Image missing in Loyverse');
  }

  // Compare Modifiers
  const notionModifierPageIds = notionItem.properties.modifiersIds || [];
  // Map Notion IDs to expected Loyverse IDs
  const expectedLoyverseModifierIds = new Set(
    notionModifierPageIds
      .map(id => notionModifiersMap.get(id))
      .filter(id => id !== undefined) as string[]
  );
  
  const actualLoyverseModifierIds = new Set((loyverseItem.modifier_ids || []) as string[]);

  if (expectedLoyverseModifierIds.size !== actualLoyverseModifierIds.size) {
     diffs.push(`Modifiers count mismatch: ${expectedLoyverseModifierIds.size} vs ${actualLoyverseModifierIds.size}`);
  } else {
     for (const id of expectedLoyverseModifierIds) {
        if (!actualLoyverseModifierIds.has(id)) {
           diffs.push(`Modifier mismatch: One or more modifiers missing/different`);
           break;
        }
     }
  }

  return diffs;
}

export const getMenuSyncStatus = query(async () => {
  const notionDb = new MenuItemsDatabase({ notionSecret: NOTION_API_KEY });
  const modifiersDb = new PosModifiersDatabase({ notionSecret: NOTION_API_KEY });
  
  // Parallel fetch
  const [notionResult, notionModifiersResult, loyverseItems, loyverseCategoriesList, loyverseModifiers] = await Promise.all([
    notionDb.query({
      filter: {
        status: { equals: 'Active' }
      }
    }),
    modifiersDb.query({
      filter: {
        active: { equals: true }
      }
    }),
    loyverse.getAllItems(),
    loyverse.getAllCategories(),
    loyverse.getAllModifiers()
  ]);

  const notionItems = notionResult.results.map(r => new MenuItemsResponseDTO(r));
  const notionModifiers = notionModifiersResult.results.map(r => new PosModifiersResponseDTO(r));
  
  // Build map of Notion Page ID -> Loyverse ID for modifiers
  const notionModifiersMap = new Map<string, string>();
  for (const mod of notionModifiers) {
     const lid = mod.properties.loyverseId.text;
     if (lid) {
        notionModifiersMap.set(mod.id, lid);
     }
  }

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
    const hasVariants = nItem.properties.hasVariants ?? false;
    const modifiersCount = nItem.properties.modifiersIds?.length || 0;
    
    let status: SyncStatus = 'NOT_IN_LOYVERSE';
    let loyverseId: string | undefined = undefined;
    let diffs: string[] = [];

    if (notionLoyverseId && loyverseById.has(notionLoyverseId)) {
      // Linked by ID
      const lItem = loyverseById.get(notionLoyverseId)!;
      loyverseId = lItem.id;
      matchedLoyverseIds.add(lItem.id);
      
      diffs = compareItems(nItem, lItem, loyverseCategories, notionModifiersMap);
      status = diffs.length > 0 ? 'MODIFIED' : 'SYNCED';
    } else if (loyverseByName.has(normalize(name).toLowerCase())) {
      // Found by name but not linked via ID property
      const lItem = loyverseByName.get(normalize(name).toLowerCase())!;
      loyverseId = lItem.id;
      matchedLoyverseIds.add(lItem.id);

      status = 'LINKED_ONLY'; // Needs to update Notion with ID
      diffs = compareItems(nItem, lItem, loyverseCategories, notionModifiersMap);
    }

    syncStates.push({
      notionId: nItem.id,
      loyverseId,
      name,
      category,
      imageUrl,
      notionLoyverseIdProp: notionLoyverseId,
      status,
      diffs,
      hasVariants,
      modifiersCount
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
    deleteOrphans: v.optional(v.boolean()), // If true, delete Loyverse items not in Notion
    forceImageSync: v.optional(v.boolean()) // If true, re-upload images even if item is synced
  }),
  async ({ itemIds, deleteOrphans, forceImageSync }) => {
    const notionDb = new MenuItemsDatabase({ notionSecret: NOTION_API_KEY });
    const modifiersDb = new PosModifiersDatabase({ notionSecret: NOTION_API_KEY });
    const report: SyncReport = { created: 0, updated: 0, linked: 0, deleted: 0, errors: [], itemResults: [] };

    try {
      // Fetch data - Only sync Active items from Notion
      const [notionResult, notionModifiersResult, loyverseItems, loyverseCategoriesList, loyverseModifiers] = await Promise.all([
        notionDb.query({
          filter: {
            status: { equals: 'Active' }
          }
        }),
        modifiersDb.query({
          filter: {
            active: { equals: true }
          }
        }),
        loyverse.getAllItems(),
        loyverse.getAllCategories(),
      loyverse.getAllModifiers()
    ]);

    const allNotionItems = notionResult.results.map(r => new MenuItemsResponseDTO(r));
      const notionModifiers = notionModifiersResult.results.map(r => new PosModifiersResponseDTO(r));
      
      // Build map of Notion Page ID -> Loyverse ID for modifiers
      const notionModifiersMap = new Map<string, string>();
      for (const mod of notionModifiers) {
         const lid = mod.properties.loyverseId.text;
         if (lid) {
            notionModifiersMap.set(mod.id, lid);
         }
      }
      
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
      const loyverseCategories = new Map(loyverseCategoriesList.map(c => [c.id, c]));

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
        let currentAction: 'CREATE' | 'UPDATE' | 'LINK' | 'DELETE' | 'SKIP' = 'UPDATE';
        try {
          const notionLoyverseId = nItem.properties.loyverseId?.rich_text?.[0]?.plain_text;
          const name = nItem.properties.name.text || 'Untitled';
          const description = nItem.properties.description.text || '';
          const categoryName = nItem.properties.category?.name || 'Uncategorized';
          const imageUrl = nItem.properties.image?.urls?.[0];
          
          const hasVariants = nItem.properties.hasVariants ?? false;
          
          const categoryId = await resolveCategoryId(categoryName);

          // Resolve Modifiers
          const notionModifierIds = nItem.properties.modifiersIds || [];
          const modifiersIds = notionModifierIds
             .map(id => notionModifiersMap.get(id))
             .filter(id => id !== undefined) as string[];

          let targetLoyverseItem: any;
          let isNew = false;

          // 1. Resolve Target
          if (notionLoyverseId && loyverseById.has(notionLoyverseId)) {
            targetLoyverseItem = loyverseById.get(notionLoyverseId);
            currentAction = 'UPDATE';
          } else if (loyverseByName.has(normalize(name).toLowerCase())) {
            targetLoyverseItem = loyverseByName.get(normalize(name).toLowerCase());
            // Need to link in Notion
            await notionDb.updatePage(nItem.id, new MenuItemsPatchDTO({
              properties: {
                loyverseId: targetLoyverseItem.id
              }
            }));
            report.linked++;
            currentAction = 'LINK';
          } else {
            isNew = true;
            currentAction = 'CREATE';
          }

          // Optimization: Skip if already synced
          if (!isNew && targetLoyverseItem) {
            const diffs = compareItems(nItem, targetLoyverseItem, loyverseCategories, notionModifiersMap);
            if (diffs.length === 0 && (!forceImageSync || !imageUrl)) {
              report.itemResults.push({
                notionId: nItem.id,
                loyverseId: targetLoyverseItem.id,
                name,
                action: 'SKIP',
                status: 'SUCCESS',
                message: currentAction === 'LINK' ? 'Linked in Notion, Loyverse matches' : 'Already in sync'
              });
              continue;
            }
          }

          // Construct Payload
          const payload: any = {
             item_name: name,
             description,
             category_id: categoryId,
             modifier_ids: modifiersIds, 
             option1_name: undefined,
             option2_name: undefined,
             option3_name: undefined,
             variants: []
          };

          if (hasVariants) {
             const notionVariants = parseVariants(nItem.properties.variantsJson.text);
             payload.option1_name = nItem.properties.variantOption_1Name.text || null;
             payload.option2_name = nItem.properties.variantOption_2Name.text || null;
             payload.option3_name = nItem.properties.variantOption_3Name.text || null;
             
             if (notionVariants.length > 0) {
                 // Map Notion variants to Loyverse structure
                 payload.variants = notionVariants.map(nv => ({
                    option1_value: nv.option1_value,
                    option2_value: nv.option2_value,
                    option3_value: nv.option3_value,
                    default_price: nv.price,
                    sku: nv.sku,
                    barcode: nv.barcode,
                    default_pricing_type: 'FIXED'
                 }));
             } 

             if (!isNew && targetLoyverseItem) {
                 const existingVariants = targetLoyverseItem.variants || [];
                 payload.variants = payload.variants.map((pv: any) => {
                     // Try to find matching existing variant
                     const existing = existingVariants.find((ev: any) => 
                        normalize(ev.option1_value) === normalize(pv.option1_value) &&
                        normalize(ev.option2_value) === normalize(pv.option2_value) &&
                        normalize(ev.option3_value) === normalize(pv.option3_value)
                     );
                     
                     if (existing) {
                         return { ...pv, variant_id: existing.variant_id };
                     }
                     return pv;
                 });
             }

          } else {
             // Simple Item
             const price = nItem.properties.price ?? 0;
             const variant: any = {
                default_price: price,
                default_pricing_type: 'FIXED'
             };
             
             // If updating, preserve the main variant ID
             if (!isNew && targetLoyverseItem && targetLoyverseItem.variants && targetLoyverseItem.variants.length > 0) {
                 variant.variant_id = targetLoyverseItem.variants[0].variant_id;
             }
             
             payload.variants = [variant];
          }

          // 2. Perform Action
          if (isNew) {
            // Create in Loyverse
            const newItem = await loyverse.createItem(payload);

            // Upload Image if exists
            if (imageUrl) {
              try {
                await loyverse.uploadImage(newItem.id, imageUrl);
              } catch (imgErr: any) {
                console.warn(`[Image Sync] Warning: Could not upload image for new item "${name}": ${imgErr.message}`);
                report.errors.push(`Image upload failed for "${name}" (Item created/updated anyway)`);
              }
            }
            
            // Update Notion with new ID
            await notionDb.updatePage(nItem.id, new MenuItemsPatchDTO({
              properties: {
                loyverseId: newItem.id
              }
            }));
            report.created++;
            report.itemResults.push({
              notionId: nItem.id,
              loyverseId: newItem.id,
              name,
              action: 'CREATE',
              status: 'SUCCESS'
            });
          } else {
            // Update in Loyverse
            let finalLid = targetLoyverseItem.id;
            try {
              await loyverse.updateItem(targetLoyverseItem.id, payload);
            } catch (err: any) {
              // Handle "You cannot add or delete options" error by recreating the item
              if (err.message && err.message.includes('You cannot add or delete options')) {
                console.warn(`Recreating item "${name}" because option structure changed.`);
                
                // 1. Delete existing
                await loyverse.deleteItem(targetLoyverseItem.id);
                
                // 2. Create new
                const newItem = await loyverse.createItem(payload);
                finalLid = newItem.id;
                
                // 3. Upload image if needed
                if (imageUrl) {
                  try {
                    await loyverse.uploadImage(newItem.id, imageUrl);
                  } catch (imgErr) {
                    console.warn(`Failed to upload image for recreated item ${name}:`, imgErr);
                  }
                }

                // 4. Update Notion with new ID
                await notionDb.updatePage(nItem.id, new MenuItemsPatchDTO({
                  properties: {
                    loyverseId: newItem.id
                  }
                }));
                
                report.updated++; // Count as update since it was an existing sync
                report.linked++;  // Relinked
                report.itemResults.push({
                  notionId: nItem.id,
                  loyverseId: newItem.id,
                  name,
                  action: 'UPDATE',
                  status: 'SUCCESS',
                  message: 'Recreated due to option changes'
                });
                continue; // Skip the rest of the loop for this item
              } else {
                throw err; // Re-throw other errors
              }
            }

            // Upload Image if exists
            if (imageUrl) {
              try {
                await loyverse.uploadImage(finalLid, imageUrl);
              } catch (imgErr: any) {
                 console.warn(`[Image Sync] Warning: Could not upload image for item "${name}": ${imgErr.message}`);
              }
            }
            
            // Ensure Notion has the ID
            if (notionLoyverseId !== finalLid) {
               await notionDb.updatePage(nItem.id, new MenuItemsPatchDTO({
                properties: {
                  loyverseId: finalLid
                }
              }));
              report.linked++;
            }
            
            report.updated++;
            report.itemResults.push({
              notionId: nItem.id,
              loyverseId: finalLid,
              name,
              action: currentAction === 'LINK' ? 'LINK' : 'UPDATE',
              status: 'SUCCESS'
            });
          }

        } catch (err: any) {
          console.error(`Error syncing item ${nItem.properties.name.text}:`, err);
          const msg = `Failed to sync "${nItem.properties.name.text}": ${err.message}`;
          report.errors.push(msg);
          report.itemResults.push({
            notionId: nItem.id,
            name: nItem.properties.name.text || 'Untitled',
            action: currentAction,
            status: 'ERROR',
            message: err.message
          });
        }
      }

      // Handle Orphans (Delete)
      if (deleteOrphans) {
        for (const lItem of loyverseItems) {
          if (!matchedLoyverseIds.has(lItem.id)) {
             try {
               await loyverse.deleteItem(lItem.id);
               report.deleted++;
               report.itemResults.push({
                 loyverseId: lItem.id,
                 name: lItem.item_name,
                 action: 'DELETE',
                 status: 'SUCCESS'
               });
             } catch (err: any) {
               console.error(`Error deleting item ${lItem.item_name}:`, err);
               report.errors.push(`Failed to delete "${lItem.item_name}": ${err.message}`);
               report.itemResults.push({
                 loyverseId: lItem.id,
                 name: lItem.item_name,
                 action: 'DELETE',
                 status: 'ERROR',
                 message: err.message
               });
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
