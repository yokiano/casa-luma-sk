import { command, query } from '$app/server';
import { NOTION_API_KEY } from '$env/static/private';
import { OpenPlayPosItemsDatabase } from '$lib/notion-sdk/dbs/open-play-pos-items/db';
import { OpenPlayPosItemsPatchDTO } from '$lib/notion-sdk/dbs/open-play-pos-items/patch.dto';
import { OpenPlayPosItemsResponseDTO } from '$lib/notion-sdk/dbs/open-play-pos-items/response.dto';
import { loyverse, type CreateLoyverseItemPayload, type LoyverseItem } from '$lib/server/loyverse';
import { buildLoyverseItemOptionFields } from '$lib/loyverse-item-sync.logic';
import {
  buildOpenPlayDescription,
  changesOpenPlayOptionStructure,
  compareOpenPlayVariants,
  parseOpenPlayVariants,
  reconcileOpenPlayVariants,
  writeBackVariantIds,
  type OpenPlayVariantDefinition
} from '$lib/open-play-sync.logic';
import type { ItemSyncResult, MenuItemSyncState, SyncReport, SyncStatus } from './menu-sync.remote';
import * as v from 'valibot';

const normalize = (value?: string | null) => value?.normalize('NFC').trim() ?? '';
const normalizedName = (value?: string | null) => normalize(value).toLocaleLowerCase();

async function fetchAllPages(db: OpenPlayPosItemsDatabase) {
  const results: unknown[] = [];
  let startCursor: string | undefined;
  do {
    const response = await db.query({ page_size: 100, start_cursor: startCursor } as never);
    results.push(...response.results);
    startCursor = response.has_more && response.next_cursor ? response.next_cursor : undefined;
  } while (startCursor);
  return results;
}

function resolveNotionLoyverseId(item: OpenPlayPosItemsResponseDTO): string | undefined {
  const canonical = normalize(item.properties.loyverseId.text);
  const legacy = normalize(item.properties.id.text);
  if (canonical && legacy && canonical !== legacy) {
    throw new Error(`Conflicting Notion ID (${legacy}) and LoyverseID (${canonical}) values.`);
  }
  return canonical || legacy || undefined;
}

function getOptionNames(item: OpenPlayPosItemsResponseDTO): [string | undefined, string | undefined, string | undefined] {
  return [
    item.properties.variantOption_1Name.text,
    item.properties.variantOption_2Name.text,
    item.properties.variantOption_3Name.text
  ];
}

function getConfiguredVariants(item: OpenPlayPosItemsResponseDTO): OpenPlayVariantDefinition[] {
  if (!item.properties.hasVariants) return [];
  return parseOpenPlayVariants(item.properties.variantsJson.text, getOptionNames(item));
}

function buildDescription(item: OpenPlayPosItemsResponseDTO): string {
  return buildOpenPlayDescription({
    description: item.properties.description.text,
    thaiDescription: item.properties.thaiDescription.text,
    duration: item.properties.duration.text,
    workshopsIncluded: item.properties.workshopsIncluded.text,
    perks: item.properties.perks.values,
    foodDiscount: item.properties.foodDiscount.text
  });
}

function compareOpenPlayItems(
  notionItem: OpenPlayPosItemsResponseDTO,
  loyverseItem: LoyverseItem,
  loyverseCategories: Map<string, { name: string }>
): string[] {
  const diffs: string[] = [];
  const notionName = normalize(notionItem.properties.name.text);
  if (notionName !== normalize(loyverseItem.item_name)) {
    diffs.push(`Name mismatch: "${notionName}" vs "${normalize(loyverseItem.item_name)}"`);
  }

  if (normalize(buildDescription(notionItem)) !== normalize(loyverseItem.description)) {
    diffs.push('Description mismatch');
  }

  const notionCategory = notionItem.properties.category?.name || 'Uncategorized';
  const loyverseCategory = loyverseItem.category_id
    ? loyverseCategories.get(loyverseItem.category_id)?.name || 'Uncategorized'
    : 'Uncategorized';
  if (notionCategory !== loyverseCategory) {
    diffs.push(`Category mismatch: "${notionCategory}" vs "${loyverseCategory}"`);
  }

  if (notionItem.properties.hasVariants) {
    diffs.push(...compareOpenPlayVariants(getConfiguredVariants(notionItem), loyverseItem, getOptionNames(notionItem)));
  } else {
    const notionPrice = notionItem.properties.priceBaht ?? 0;
    if (loyverseItem.variants.length !== 1) {
      diffs.push(`Variant count mismatch for simple item: 1 vs ${loyverseItem.variants.length}`);
    }
    const loyversePrice = loyverseItem.variants[0]?.default_price ?? 0;
    if (notionPrice !== loyversePrice) diffs.push(`Price mismatch: ${notionPrice} vs ${loyversePrice}`);
    if (normalize(loyverseItem.option1_name) || normalize(loyverseItem.option2_name) || normalize(loyverseItem.option3_name)) {
      diffs.push('Simple item still has Loyverse option names');
    }
  }

  return diffs;
}

function buildNameMap(items: LoyverseItem[]) {
  const map = new Map<string, LoyverseItem[]>();
  for (const item of items) {
    const key = normalizedName(item.item_name);
    map.set(key, [...(map.get(key) ?? []), item]);
  }
  return map;
}

function findUnambiguousNameMatch(name: string, byName: Map<string, LoyverseItem[]>): LoyverseItem | undefined {
  const matches = byName.get(normalizedName(name)) ?? [];
  if (matches.length > 1) throw new Error(`Multiple Loyverse items match the name "${name}".`);
  return matches[0];
}

const CREATE_RECONCILIATION_DELAYS_MS = [0, 300, 1_000, 2_000] as const;
const wait = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function reconcileCreatedItem(name: string, itemId?: string): Promise<LoyverseItem> {
  let lastReadError: unknown;
  for (const delay of CREATE_RECONCILIATION_DELAYS_MS) {
    if (delay) await wait(delay);
    let refreshedItems: LoyverseItem[];
    try {
      refreshedItems = await loyverse.getAllItems();
      lastReadError = undefined;
    } catch (error) {
      lastReadError = error;
      continue;
    }

    if (itemId) {
      const byId = refreshedItems.find((item) => item.id === itemId);
      if (byId) return byId;
      continue;
    }

    const matches = refreshedItems.filter((item) => normalizedName(item.item_name) === normalizedName(name));
    if (matches.length > 1) {
      throw new Error(`Multiple Loyverse items now match "${name}".`);
    }
    if (matches[0]) return matches[0];
  }
  if (lastReadError) {
    const message = lastReadError instanceof Error ? lastReadError.message : String(lastReadError);
    throw new Error(`Loyverse create reconciliation could not read items: ${message}`);
  }
  throw new Error(
    itemId
      ? `Loyverse item ${itemId} was not readable after synchronization.`
      : `No unique Loyverse item named "${name}" appeared after synchronization.`
  );
}

async function ensureFullLoyverseItem(
  synced: LoyverseItem,
  name: string,
  itemId?: string
): Promise<LoyverseItem> {
  if (synced.id && Array.isArray(synced.variants) && synced.variants.length > 0) return synced;
  // Loyverse may acknowledge a write without returning the full item. Read it
  // back before writing identities to Notion so an acknowledged create cannot
  // leave the row permanently unlinked.
  return reconcileCreatedItem(name, itemId ?? synced.id);
}

function createPayload(
  notionItem: OpenPlayPosItemsResponseDTO,
  categoryId: string | undefined,
  existing?: LoyverseItem
): { payload: CreateLoyverseItemPayload; configuredVariants: OpenPlayVariantDefinition[] } {
  const configuredVariants = getConfiguredVariants(notionItem);
  const payload: CreateLoyverseItemPayload = {
    item_name: notionItem.properties.name.text || 'Untitled',
    description: buildDescription(notionItem),
    category_id: categoryId,
    // Keep the Open Play create shape aligned with Menu Sync. Loyverse can
    // return INTERNAL_ERROR when unused option slots are serialized as null.
    modifier_ids: [],
    ...buildLoyverseItemOptionFields(getOptionNames(notionItem)),
    variants: []
  };

  if (notionItem.properties.hasVariants) {
    payload.variants = reconcileOpenPlayVariants(configuredVariants, existing?.variants ?? []);
  } else {
    payload.variants = [{
      ...(existing?.variants[0] ? { variant_id: existing.variants[0].variant_id } : {}),
      default_price: notionItem.properties.priceBaht ?? 0,
      default_pricing_type: 'FIXED'
    }];
  }

  return { payload, configuredVariants };
}

async function writeBackLoyverseIdentity(
  notionDb: OpenPlayPosItemsDatabase,
  notionItem: OpenPlayPosItemsResponseDTO,
  synced: LoyverseItem,
  configuredVariants: OpenPlayVariantDefinition[]
) {
  const properties: ConstructorParameters<typeof OpenPlayPosItemsPatchDTO>[0]['properties'] = {
    loyverseId: synced.id
  };
  // Keep a non-empty legacy ID untouched, but backfill it whenever blank so
  // older readers remain linked even when LoyverseID was populated first.
  if (!normalize(notionItem.properties.id.text)) {
    properties.id = synced.id;
  }
  if (notionItem.properties.hasVariants) {
    properties.variantsJson = JSON.stringify(writeBackVariantIds(configuredVariants, synced.variants));
  }
  await notionDb.updatePage(notionItem.id, new OpenPlayPosItemsPatchDTO({ properties }));
}

export const getOpenPlaySyncStatus = query(async () => {
  const notionDb = new OpenPlayPosItemsDatabase({ notionSecret: NOTION_API_KEY });
  const [notionRaw, loyverseItems, categoryList] = await Promise.all([
    fetchAllPages(notionDb),
    loyverse.getAllItems(),
    loyverse.getAllCategories()
  ]);
  const notionItems = notionRaw.map((item) => new OpenPlayPosItemsResponseDTO(item as never));
  const loyverseById = new Map(loyverseItems.map((item) => [item.id, item]));
  const loyverseByName = buildNameMap(loyverseItems);
  const categories = new Map(categoryList.map((category) => [category.id, category]));
  const matchedLoyverseIds = new Set<string>();
  const states: MenuItemSyncState[] = [];

  for (const notionItem of notionItems) {
    const name = notionItem.properties.name.text || 'Untitled';
    const category = notionItem.properties.category?.name || 'Uncategorized';
    try {
      const configuredId = resolveNotionLoyverseId(notionItem);
      let target: LoyverseItem | undefined;
      let linkedByName = false;
      if (configuredId) {
        target = loyverseById.get(configuredId);
        if (!target) {
          states.push({
            notionId: notionItem.id,
            name,
            category,
            imageUrl: notionItem.cover.url,
            notionLoyverseIdProp: configuredId,
            status: 'NOT_IN_LOYVERSE',
            diffs: [`Configured Loyverse item ${configuredId} was not found. Automatic name relinking is blocked.`],
            hasVariants: notionItem.properties.hasVariants
          });
          continue;
        }
      } else {
        target = findUnambiguousNameMatch(name, loyverseByName);
        linkedByName = Boolean(target);
      }

      if (!target) {
        // Parsing here makes invalid variant JSON visible before the user presses Sync.
        getConfiguredVariants(notionItem);
        states.push({
          notionId: notionItem.id,
          name,
          category,
          imageUrl: notionItem.cover.url,
          status: 'NOT_IN_LOYVERSE',
          hasVariants: notionItem.properties.hasVariants
        });
        continue;
      }

      matchedLoyverseIds.add(target.id);
      const diffs = compareOpenPlayItems(notionItem, target, categories);
      const status: SyncStatus = linkedByName ? 'LINKED_ONLY' : diffs.length ? 'MODIFIED' : 'SYNCED';
      states.push({
        notionId: notionItem.id,
        loyverseId: target.id,
        name,
        category,
        imageUrl: notionItem.cover.url,
        notionLoyverseIdProp: configuredId,
        status,
        diffs,
        hasVariants: notionItem.properties.hasVariants
      });
    } catch (error) {
      states.push({
        notionId: notionItem.id,
        name,
        category,
        imageUrl: notionItem.cover.url,
        status: 'MODIFIED',
        diffs: [error instanceof Error ? error.message : String(error)],
        hasVariants: notionItem.properties.hasVariants
      });
    }
  }

  const managedCategories = new Set(
    notionItems.map((item) => normalizedName(item.properties.category?.name)).filter(Boolean)
  );
  for (const item of loyverseItems) {
    if (matchedLoyverseIds.has(item.id)) continue;
    const category = item.category_id ? categories.get(item.category_id)?.name || '' : '';
    if (!managedCategories.has(normalizedName(category))) continue;
    states.push({
      loyverseId: item.id,
      name: item.item_name,
      category: category || 'Uncategorized',
      status: 'NOT_IN_NOTION',
      warnings: ['Read-only orphan candidate. Open Play sync never deletes unmatched Loyverse items.']
    });
  }

  return states;
});

export const syncOpenPlayItems = command(
  v.object({ itemIds: v.optional(v.array(v.string())) }),
  async ({ itemIds }) => {
    const notionDb = new OpenPlayPosItemsDatabase({ notionSecret: NOTION_API_KEY });
    const report: SyncReport = { created: 0, updated: 0, linked: 0, deleted: 0, errors: [], itemResults: [] };

    try {
      const [notionRaw, loyverseItems, categoryList] = await Promise.all([
        fetchAllPages(notionDb),
        loyverse.getAllItems(),
        loyverse.getAllCategories()
      ]);
      const allNotionItems = notionRaw.map((item) => new OpenPlayPosItemsResponseDTO(item as never));
      const notionItems = allNotionItems.filter((item) => !itemIds || itemIds.includes(item.id));
      const loyverseById = new Map(loyverseItems.map((item) => [item.id, item]));
      const loyverseByName = buildNameMap(loyverseItems);
      const categories = new Map(categoryList.map((category) => [category.id, category]));
      // Validate every selected row before any category, Loyverse, or Notion write.
      // This prevents a later malformed or structurally blocked Flexi row from
      // leaving an earlier row half-synced.
      for (const notionItem of notionItems) {
        const configuredId = resolveNotionLoyverseId(notionItem);
        getConfiguredVariants(notionItem);
        const name = notionItem.properties.name.text || 'Untitled';
        const target = configuredId
          ? loyverseById.get(configuredId)
          : findUnambiguousNameMatch(name, loyverseByName);
        if (target && changesOpenPlayOptionStructure(target, getOptionNames(notionItem))) {
          throw new Error(
            `Cannot sync "${name}": Loyverse API cannot add or delete variant options on an existing item. Create a new Loyverse item or configure its option structure in Back Office, then relink this Notion row. No external writes were attempted.`
          );
        }
      }
      const categoryCache = new Map(categoryList.map((category) => [normalizedName(category.name), category.id]));

      const resolveCategoryId = async (name: string) => {
        const key = normalizedName(name);
        const existing = categoryCache.get(key);
        if (existing) return existing;
        const created = await loyverse.createCategory(name);
        categoryCache.set(key, created.id);
        categories.set(created.id, created);
        return created.id;
      };

      for (const notionItem of notionItems) {
        let action: ItemSyncResult['action'] = 'UPDATE';
        const name = notionItem.properties.name.text || 'Untitled';
        try {
          const configuredId = resolveNotionLoyverseId(notionItem);
          let target: LoyverseItem | undefined;
          let linkedByName = false;
          if (configuredId) {
            target = loyverseById.get(configuredId);
            if (!target) throw new Error(`Configured Loyverse item ${configuredId} was not found. Refusing to recreate it by name.`);
          } else {
            target = findUnambiguousNameMatch(name, loyverseByName);
            linkedByName = Boolean(target);
          }

          // Loyverse rejects API updates that add or remove an item's option slots.
          // Block before any write so migrations must use Back Office or a new item.
          if (target && changesOpenPlayOptionStructure(target, getOptionNames(notionItem))) {
            throw new Error(
              'Loyverse API cannot add or delete variant options on an existing item. Create a new Loyverse item or configure its option structure in Back Office, then relink this Notion row. No API update was attempted.'
            );
          }

          // Validate variant JSON and build the complete payload before creating a
          // missing category. Malformed input must not cause any external mutation.
          const { payload, configuredVariants } = createPayload(notionItem, undefined, target);
          const categoryName = notionItem.properties.category?.name || 'Uncategorized';
          const categoryId = await resolveCategoryId(categoryName);
          payload.category_id = categoryId;

          if (target) {
            const diffs = compareOpenPlayItems(notionItem, target, categories);
            if (linkedByName) action = 'LINK';
            const needsCanonicalLink = !normalize(notionItem.properties.loyverseId.text);
            if (!diffs.length && !needsCanonicalLink) {
              report.itemResults.push({
                notionId: notionItem.id,
                loyverseId: target.id,
                name,
                action: linkedByName ? 'LINK' : 'SKIP',
                status: 'SUCCESS',
                message: linkedByName ? 'Linked existing Loyverse item by unique name.' : 'Already in sync'
              });
              continue;
            }
            if (!diffs.length && needsCanonicalLink) {
              await writeBackLoyverseIdentity(notionDb, notionItem, target, configuredVariants);
              report.linked += 1;
              report.itemResults.push({
                notionId: notionItem.id,
                loyverseId: target.id,
                name,
                action: 'LINK',
                status: 'SUCCESS',
                message: 'Added canonical LoyverseID while preserving the legacy ID field.'
              });
              continue;
            }
          }

          let synced: LoyverseItem;
          let recoveredCreateError: string | undefined;
          if (target) {
            action = linkedByName ? 'LINK' : 'UPDATE';
            if (linkedByName) report.linked += 1;
            synced = await loyverse.updateItem(target.id, payload);
            report.updated += 1;
          } else {
            action = 'CREATE';
            try {
              synced = await loyverse.createItem(payload);
            } catch (error) {
              // A create can commit even when Loyverse returns 500. Re-read the
              // exact name before allowing another attempt, preventing duplicates.
              const originalMessage = error instanceof Error ? error.message : String(error);
              let recovered: LoyverseItem;
              try {
                recovered = await reconcileCreatedItem(name);
              } catch (reconciliationError) {
                const reconciliationMessage = reconciliationError instanceof Error ? reconciliationError.message : String(reconciliationError);
                throw new Error(`Create failed (${originalMessage}). ${reconciliationMessage}. Verify Loyverse manually before retrying; the create result is ambiguous.`);
              }
              const recoveryDiffs = compareOpenPlayItems(notionItem, recovered, categories);
              if (recoveryDiffs.length) {
                throw new Error(`Create failed (${originalMessage}) and a same-name Loyverse item appeared with differences: ${recoveryDiffs.join('; ')}. Inspect it before syncing again.`);
              }
              synced = recovered;
              recoveredCreateError = originalMessage;
              action = 'LINK';
            }
            if (recoveredCreateError) report.linked += 1;
            else report.created += 1;
          }

          synced = await ensureFullLoyverseItem(synced, name, target?.id);
          await writeBackLoyverseIdentity(notionDb, notionItem, synced, configuredVariants);
          report.itemResults.push({
            notionId: notionItem.id,
            loyverseId: synced.id,
            name,
            action,
            status: 'SUCCESS',
            message: recoveredCreateError
              ? `Recovered the created Loyverse item after its API response failed, then wrote its IDs back to Notion. Original error: ${recoveredCreateError}`
              : notionItem.properties.hasVariants
                ? `Synchronized ${synced.variants.length} variants and wrote their IDs back to Notion.`
                : undefined,
            variantIds: notionItem.properties.hasVariants
              ? synced.variants.map((variant) => ({
                  option1Value: variant.option1_value,
                  option2Value: variant.option2_value,
                  option3Value: variant.option3_value,
                  variantId: variant.variant_id
                }))
              : undefined
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          report.errors.push(`Failed to sync "${name}": ${message}`);
          report.itemResults.push({ notionId: notionItem.id, name, action, status: 'ERROR', message });
        }
      }
    } catch (error) {
      report.errors.push(`Fatal error: ${error instanceof Error ? error.message : String(error)}`);
    }

    return report;
  }
);
