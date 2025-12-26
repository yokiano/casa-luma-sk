import { query, command } from '$app/server';
import { NOTION_API_KEY, LOYVERSE_STORE_ID } from '$env/static/private';
import { PosModifiersDatabase, PosModifiersResponseDTO, PosModifiersPatchDTO } from '$lib/notion-sdk/dbs/pos-modifiers';
import { loyverse, type LoyverseModifierOption } from '$lib/server/loyverse';
import * as v from 'valibot';

// Types for the UI
export type SyncStatus = 'SYNCED' | 'NOT_IN_LOYVERSE' | 'NOT_IN_NOTION' | 'MODIFIED' | 'LINKED_ONLY';

export interface ModifierOptionState {
  name: string;
  price: number;
}

export interface ModifierSyncState {
  notionId?: string;
  loyverseId?: string;
  name: string;
  options: ModifierOptionState[];
  position: number;
  active: boolean;
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

function parseOptions(jsonString?: string): ModifierOptionState[] {
  if (!jsonString) return [];
  try {
    const parsed = JSON.parse(jsonString);
    if (Array.isArray(parsed)) {
      return parsed.map((o: any) => ({
        name: o.name || '',
        price: Number(o.price) || 0
      }));
    }
    return [];
  } catch (e) {
    console.error('Failed to parse options JSON:', e);
    return [];
  }
}

function compareModifiers(notionItem: PosModifiersResponseDTO, loyverseItem: any): string[] {
  const diffs: string[] = [];
  
  // Name
  if (normalize(notionItem.properties.name.text) !== normalize(loyverseItem.name)) {
    diffs.push(`Name mismatch: "${notionItem.properties.name.text}" vs "${loyverseItem.name}"`);
  }

  // Options
  const notionOptions = parseOptions(notionItem.properties.optionsJson.text);
  const loyverseOptions: ModifierOptionState[] = loyverseItem.modifier_options.map((o: any) => ({
    name: o.name,
    price: o.price
  }));

  // Compare options length
  if (notionOptions.length !== loyverseOptions.length) {
    diffs.push(`Options count mismatch: ${notionOptions.length} vs ${loyverseOptions.length}`);
  } else {
    // Compare each option (assuming order might matter or at least existence)
    // We'll treat them as a set for comparison simplicity if order doesn't match?
    // Actually, Loyverse has 'ordering' field, Notion JSON array implies order.
    // Let's compare by index for strictness or just content?
    // Let's check if every Notion option exists in Loyverse with same price
    
    // Sort both by name to compare content regardless of order if we want loose comparison?
    // But position matters. Let's compare by index.
    
    for (let i = 0; i < notionOptions.length; i++) {
       const nOpt = notionOptions[i];
       // Try to find matching option by name in Loyverse options
       const lOpt = loyverseOptions.find(lo => normalize(lo.name) === normalize(nOpt.name));
       
       if (!lOpt) {
          diffs.push(`Option "${nOpt.name}" missing in Loyverse`);
       } else if (lOpt.price !== nOpt.price) {
          diffs.push(`Option "${nOpt.name}" price mismatch: ${nOpt.price} vs ${lOpt.price}`);
       }
    }
  }

  return diffs;
}

export const getModifierSyncStatus = query(async () => {
  const notionDb = new PosModifiersDatabase({ notionSecret: NOTION_API_KEY });

  const [notionResult, loyverseModifiers] = await Promise.all([
    notionDb.query({
      filter: {
        active: { equals: true }
      }
    }),
    loyverse.getAllModifiers()
  ]);

  const notionItems = notionResult.results.map(r => new PosModifiersResponseDTO(r));
  const syncStates: ModifierSyncState[] = [];

  const loyverseById = new Map(loyverseModifiers.map(m => [m.id, m]));
  const loyverseByName = new Map(loyverseModifiers.map(m => [normalize(m.name).toLowerCase(), m]));

  const matchedLoyverseIds = new Set<string>();

  for (const nItem of notionItems) {
    const notionLoyverseId = nItem.properties.loyverseId.rich_text?.[0]?.plain_text;
    const name = nItem.properties.name.text || 'Untitled';
    const active = nItem.properties.active ?? false;
    const options = parseOptions(nItem.properties.optionsJson.text);
    const position = nItem.properties.position ?? 0;

    let status: SyncStatus = 'NOT_IN_LOYVERSE';
    let loyverseId: string | undefined = undefined;
    let diffs: string[] = [];

    if (notionLoyverseId && loyverseById.has(notionLoyverseId)) {
      const lItem = loyverseById.get(notionLoyverseId)!;
      loyverseId = lItem.id;
      matchedLoyverseIds.add(lItem.id);

      diffs = compareModifiers(nItem, lItem);
      status = diffs.length > 0 ? 'MODIFIED' : 'SYNCED';
    } else if (loyverseByName.has(normalize(name).toLowerCase())) {
      const lItem = loyverseByName.get(normalize(name).toLowerCase())!;
      loyverseId = lItem.id;
      matchedLoyverseIds.add(lItem.id);

      status = 'LINKED_ONLY';
      diffs = compareModifiers(nItem, lItem);
    }

    syncStates.push({
      notionId: nItem.id,
      loyverseId,
      name,
      options,
      position,
      active,
      notionLoyverseIdProp: notionLoyverseId,
      status,
      diffs
    });
  }

  // Orphans
  for (const lItem of loyverseModifiers) {
    if (!matchedLoyverseIds.has(lItem.id)) {
      syncStates.push({
        notionId: undefined,
        loyverseId: lItem.id,
        name: lItem.name,
        options: lItem.modifier_options.map(o => ({ name: o.name, price: o.price })),
        position: lItem.position,
        active: true,
        status: 'NOT_IN_NOTION'
      });
    }
  }

  return syncStates;
});

export const syncModifiers = command(
  v.object({
    itemIds: v.optional(v.array(v.string())),
    deleteOrphans: v.optional(v.boolean())
  }),
  async ({ itemIds, deleteOrphans }) => {
    const notionDb = new PosModifiersDatabase({ notionSecret: NOTION_API_KEY });
    const report: SyncReport = { created: 0, updated: 0, linked: 0, deleted: 0, errors: [] };

    try {
      const [notionResult, loyverseModifiers] = await Promise.all([
        notionDb.query({
           filter: {
             active: { equals: true }
           }
        }),
        loyverse.getAllModifiers()
      ]);

      const allNotionItems = notionResult.results.map(r => new PosModifiersResponseDTO(r));
      const notionItemsToSync = allNotionItems.filter(i => !itemIds || itemIds.includes(i.id));

      const loyverseById = new Map(loyverseModifiers.map(m => [m.id, m]));
      const loyverseByName = new Map(loyverseModifiers.map(m => [normalize(m.name).toLowerCase(), m]));

      // 1. Match for orphans
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
          const options = parseOptions(nItem.properties.optionsJson.text);
          const position = nItem.properties.position ?? 0;

          let targetLoyverseItem: any;
          let isNew = false;

          if (notionLoyverseId && loyverseById.has(notionLoyverseId)) {
             targetLoyverseItem = loyverseById.get(notionLoyverseId);
          } else if (loyverseByName.has(normalize(name).toLowerCase())) {
             targetLoyverseItem = loyverseByName.get(normalize(name).toLowerCase());
             // Link in Notion
             await notionDb.updatePage(nItem.id, new PosModifiersPatchDTO({
               properties: {
                 loyverseId: targetLoyverseItem.id
               }
             }));
             report.linked++;
          } else {
            isNew = true;
          }

          const modifierOptionsPayload = options.map((opt, index) => ({
             name: opt.name,
             price: opt.price,
             ordering: index
          }));

          const payload = {
             name,
             position,
             modifier_options: modifierOptionsPayload,
             stores: [LOYVERSE_STORE_ID],
          };

          if (isNew) {
            const newItem = await loyverse.createModifier(payload);
            await notionDb.updatePage(nItem.id, new PosModifiersPatchDTO({
              properties: {
                loyverseId: newItem.id
              }
            }));
            report.created++;
          } else {
             await loyverse.updateModifier(targetLoyverseItem.id, payload);
             
             if (notionLoyverseId !== targetLoyverseItem.id) {
               await notionDb.updatePage(nItem.id, new PosModifiersPatchDTO({
                 properties: {
                   loyverseId: targetLoyverseItem.id
                 }
               }));
               report.linked++;
             }
             report.updated++;
          }

        } catch (err: any) {
          console.error(`Error syncing modifier ${nItem.properties.name.text}:`, err);
          report.errors.push(`Failed to sync "${nItem.properties.name.text}": ${err.message}`);
        }
      }

      // 3. Orphans
      if (deleteOrphans) {
        for (const lItem of loyverseModifiers) {
          if (!matchedLoyverseIds.has(lItem.id)) {
            try {
              await loyverse.deleteModifier(lItem.id);
              report.deleted++;
            } catch (err: any) {
               console.error(`Error deleting modifier ${lItem.name}:`, err);
               report.errors.push(`Failed to delete "${lItem.name}": ${err.message}`);
            }
          }
        }
      }

    } catch (err: any) {
       console.error('Fatal modifier sync error:', err);
       report.errors.push(`Fatal error: ${err.message}`);
    }

    return report;
  }
);
