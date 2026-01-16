import { query, command } from '$app/server';
import { NOTION_API_KEY } from '$env/static/private';
import { PosDiscountsDatabase, PosDiscountsResponseDTO, PosDiscountsPatchDTO } from '$lib/notion-sdk/dbs/pos-discounts';
import { loyverse } from '$lib/server/loyverse';
import * as v from 'valibot';

// Types for the UI
export type SyncStatus = 'SYNCED' | 'NOT_IN_LOYVERSE' | 'NOT_IN_NOTION' | 'MODIFIED' | 'LINKED_ONLY';

export interface DiscountSyncState {
  notionId?: string;
  loyverseId?: string;
  name: string;
  type: 'FIXED_PERCENT' | 'FIXED_AMOUNT' | 'VARIABLE_PERCENT' | 'VARIABLE_AMOUNT' | 'DISCOUNT_BY_POINTS';
  value: number; // Percent or Amount
  active: boolean;
  restrictedAccess: boolean;
  notionLoyverseIdProp?: string;
  status: SyncStatus;
  diffs?: string[];
}

export interface SyncReport {
  created: number;
  updated: number;
  linked: number;
  deleted: number;
  errors: string[];
}

const normalize = (str?: string | null) => str?.trim() || '';

function compareDiscounts(notionItem: PosDiscountsResponseDTO, loyverseItem: any): string[] {
  const diffs: string[] = [];

  // Name
  if (normalize(notionItem.properties.name.text) !== normalize(loyverseItem.name)) {
    diffs.push(`Name mismatch: "${notionItem.properties.name.text}" vs "${loyverseItem.name}"`);
  }

  // Type & Value
  // Notion has separate "Type" select and "Value" number
  // Loyverse has "type" string and either "discount_percent" or "discount_amount"
  
  const notionType = notionItem.properties.type?.name; // Percentage, Amount
  const notionValue = notionItem.properties.value ?? 0;

  let loyverseValue = 0;
  let loyverseType = loyverseItem.type;

  if (notionType === 'Percentage') {
    if (loyverseType !== 'FIXED_PERCENT') {
       diffs.push(`Type mismatch: Percentage vs ${loyverseType}`);
    } else {
       loyverseValue = loyverseItem.discount_percent || 0;
    }
  } else if (notionType === 'Amount') {
    if (loyverseType !== 'FIXED_AMOUNT') {
       diffs.push(`Type mismatch: Amount vs ${loyverseType}`);
    } else {
       loyverseValue = loyverseItem.discount_amount || 0;
    }
  } else {
    // If Notion type is unset or unknown
     diffs.push(`Notion Type unknown: ${notionType}`);
  }

  if (notionValue !== loyverseValue) {
      diffs.push(`Value mismatch: ${notionValue} vs ${loyverseValue}`);
  }

  // Restricted Access
  const notionRestricted = notionItem.properties.restrictedAccess ?? false;
  const loyverseRestricted = loyverseItem.restricted_access ?? false;

  if (notionRestricted !== loyverseRestricted) {
    diffs.push(`Restricted Access mismatch: ${notionRestricted} vs ${loyverseRestricted}`);
  }

  return diffs;
}

export const getDiscountSyncStatus = query(async () => {
  const notionDb = new PosDiscountsDatabase({ notionSecret: NOTION_API_KEY });

  const [notionResult, loyverseDiscounts] = await Promise.all([
    notionDb.query({
      filter: {
        active: { equals: true }
      }
    }),
    loyverse.getAllDiscounts()
  ]);

  const notionItems = notionResult.results.map(r => new PosDiscountsResponseDTO(r));
  const syncStates: DiscountSyncState[] = [];

  const loyverseById = new Map(loyverseDiscounts.map(d => [d.id, d]));
  const loyverseByName = new Map(loyverseDiscounts.map(d => [normalize(d.name).toLowerCase(), d]));

  const matchedLoyverseIds = new Set<string>();

  for (const nItem of notionItems) {
    const notionLoyverseId = nItem.properties.loyverseId.rich_text?.[0]?.plain_text;
    const name = nItem.properties.name.text || 'Untitled';
    const active = nItem.properties.active ?? false;
    
    // Determine type/value for UI
    const nType = nItem.properties.type?.name;
    const type = nType === 'Percentage' ? 'FIXED_PERCENT' : (nType === 'Amount' ? 'FIXED_AMOUNT' : 'FIXED_AMOUNT'); // Default fallback?
    const value = nItem.properties.value ?? 0;
    const restrictedAccess = nItem.properties.restrictedAccess ?? false;

    let status: SyncStatus = 'NOT_IN_LOYVERSE';
    let loyverseId: string | undefined = undefined;
    let diffs: string[] = [];

    if (notionLoyverseId && loyverseById.has(notionLoyverseId)) {
      const lItem = loyverseById.get(notionLoyverseId)!;
      loyverseId = lItem.id;
      matchedLoyverseIds.add(lItem.id);

      diffs = compareDiscounts(nItem, lItem);
      status = diffs.length > 0 ? 'MODIFIED' : 'SYNCED';
    } else if (loyverseByName.has(normalize(name).toLowerCase())) {
      const lItem = loyverseByName.get(normalize(name).toLowerCase())!;
      loyverseId = lItem.id;
      matchedLoyverseIds.add(lItem.id);

      status = 'LINKED_ONLY';
      diffs = compareDiscounts(nItem, lItem);
    }

    syncStates.push({
      notionId: nItem.id,
      loyverseId,
      name,
      type,
      value,
      active,
      restrictedAccess,
      notionLoyverseIdProp: notionLoyverseId,
      status,
      diffs
    });
  }

  // Orphans
  for (const lItem of loyverseDiscounts) {
    if (!matchedLoyverseIds.has(lItem.id)) {
      syncStates.push({
        notionId: undefined,
        loyverseId: lItem.id,
        name: lItem.name,
        type: lItem.type,
        value: (lItem.type === 'FIXED_PERCENT' ? lItem.discount_percent : lItem.discount_amount) || 0,
        active: true, // If it's in Loyverse (and we filtered deleted), it's "active" in sense of existence
        restrictedAccess: lItem.restricted_access || false,
        status: 'NOT_IN_NOTION'
      });
    }
  }

  return syncStates;
});

export const syncDiscounts = command(
  v.object({
    itemIds: v.optional(v.array(v.string())),
    deleteOrphans: v.optional(v.boolean())
  }),
  async ({ itemIds, deleteOrphans }) => {
    const notionDb = new PosDiscountsDatabase({ notionSecret: NOTION_API_KEY });
    const report: SyncReport = { created: 0, updated: 0, linked: 0, deleted: 0, errors: [] };

    try {
      const [notionResult, loyverseDiscounts] = await Promise.all([
        notionDb.query({
           filter: {
             active: { equals: true }
           }
        }),
        loyverse.getAllDiscounts()
      ]);

      const allNotionItems = notionResult.results.map(r => new PosDiscountsResponseDTO(r));
      const notionItemsToSync = allNotionItems.filter(i => !itemIds || itemIds.includes(i.id));

      const loyverseById = new Map(loyverseDiscounts.map(d => [d.id, d]));
      const loyverseByName = new Map(loyverseDiscounts.map(d => [normalize(d.name).toLowerCase(), d]));

      // 1. Match for orphans check (using ALL Notion items)
      const matchedLoyverseIds = new Set<string>();
      for (const nItem of allNotionItems) {
         const notionLoyverseId = nItem.properties.loyverseId.rich_text?.[0]?.plain_text;
         const name = nItem.properties.name.text || 'Untitled';
         
         if (notionLoyverseId && loyverseById.has(notionLoyverseId)) {
            matchedLoyverseIds.add(notionLoyverseId);
         } else if (loyverseByName.has(normalize(name).toLowerCase())) {
            const lItem = loyverseByName.get(normalize(name).toLowerCase())!;
            matchedLoyverseIds.add(lItem.id);
         }
      }

      // 2. Sync Loop
      for (const nItem of notionItemsToSync) {
        try {
          const notionLoyverseId = nItem.properties.loyverseId.rich_text?.[0]?.plain_text;
          const name = nItem.properties.name.text || 'Untitled';
          const nType = nItem.properties.type?.name;
          const value = nItem.properties.value ?? 0;
          const restrictedAccess = nItem.properties.restrictedAccess ?? false;

          // Map Notion Type to Loyverse Type
          let type: 'FIXED_PERCENT' | 'FIXED_AMOUNT' = 'FIXED_AMOUNT';
          if (nType === 'Percentage') type = 'FIXED_PERCENT';
          else if (nType === 'Amount') type = 'FIXED_AMOUNT';
          
          let targetLoyverseItem: any;
          let isNew = false;

          if (notionLoyverseId && loyverseById.has(notionLoyverseId)) {
             targetLoyverseItem = loyverseById.get(notionLoyverseId);
          } else if (loyverseByName.has(normalize(name).toLowerCase())) {
             targetLoyverseItem = loyverseByName.get(normalize(name).toLowerCase());
             // Link in Notion
             await notionDb.updatePage(nItem.id, new PosDiscountsPatchDTO({
               properties: {
                 loyverseId: targetLoyverseItem.id
               }
             }));
             report.linked++;
          } else {
            isNew = true;
          }

          const payload: any = {
            name,
            type,
            restricted_access: restrictedAccess,
            // Stores: default to all (undefined)
          };
          
          if (type === 'FIXED_PERCENT') {
            payload.discount_percent = value;
            payload.discount_amount = undefined; 
          } else {
            payload.discount_amount = value;
            payload.discount_percent = undefined;
          }

          if (isNew) {
            const newItem = await loyverse.createDiscount(payload);
            await notionDb.updatePage(nItem.id, new PosDiscountsPatchDTO({
              properties: {
                loyverseId: newItem.id
              }
            }));
            report.created++;
          } else {
             // Update
             await loyverse.updateDiscount(targetLoyverseItem.id, payload);
             
             if (notionLoyverseId !== targetLoyverseItem.id) {
               await notionDb.updatePage(nItem.id, new PosDiscountsPatchDTO({
                 properties: {
                   loyverseId: targetLoyverseItem.id
                 }
               }));
               report.linked++; // Was linked during process
             }
             report.updated++;
          }

        } catch (err: any) {
          console.error(`Error syncing discount ${nItem.properties.name.text}:`, err);
          report.errors.push(`Failed to sync "${nItem.properties.name.text}": ${err.message}`);
        }
      }

      // 3. Orphans
      if (deleteOrphans) {
        for (const lItem of loyverseDiscounts) {
          if (!matchedLoyverseIds.has(lItem.id)) {
            try {
              await loyverse.deleteDiscount(lItem.id);
              report.deleted++;
            } catch (err: any) {
               console.error(`Error deleting discount ${lItem.name}:`, err);
               if (err.message && (err.message.includes('404') || err.message.includes('NOT_FOUND'))) {
                 report.errors.push(`Warning: Discount "${lItem.name}" could not be deleted (404 Not Found). It may have been already deleted.`);
               } else {
                 report.errors.push(`Failed to delete "${lItem.name}": ${err.message}`);
               }
            }
          }
        }
      }

    } catch (err: any) {
       console.error('Fatal discount sync error:', err);
       report.errors.push(`Fatal error: ${err.message}`);
    }

    return report;
  }
);
