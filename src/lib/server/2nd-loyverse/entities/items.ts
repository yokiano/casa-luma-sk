import { buildLoyverseItemOptionFields } from '$lib/loyverse-item-sync.logic';
import type { LoyverseClient, LoyverseItem, LoyverseVariant } from '$lib/server/loyverse-client';
import { SecondLoyverseError } from '../errors';
import { normalizeEntityName, roughlyEqualNumber, variantOptionTupleKey } from '../normalize';
import { resolveOrCreateCategory } from './categories';
import type { EntityInventories } from './inventory';
import { resolveOrCreateModifierOption } from './modifiers';
import { resolveOrCreateTax } from './taxes';

const activeVariants = (item: LoyverseItem) => (item.variants ?? []).filter((v) => !v.deleted_at);

const itemOptionNames = (item: LoyverseItem) =>
  [item.option1_name, item.option2_name, item.option3_name].map((v) => normalizeEntityName(v ?? ''));

/** Avoid Loyverse duplicate-SKU errors across the target account. */
const uniqueSkuForTarget = (
  desired: string | null | undefined,
  targetInventory: EntityInventories,
  excludeItemId?: string
): string | undefined => {
  const base = desired?.trim();
  if (!base) return undefined;
  const taken = new Set<string>();
  for (const item of targetInventory.items) {
    if (excludeItemId && item.id === excludeItemId) continue;
    for (const variant of activeVariants(item)) {
      if (variant.sku) taken.add(normalizeEntityName(variant.sku));
    }
  }
  if (!taken.has(normalizeEntityName(base))) return base;
  for (let i = 2; i < 50; i += 1) {
    const candidate = `${base}-m${i}`;
    if (!taken.has(normalizeEntityName(candidate))) return candidate;
  }
  return `${base}-${Date.now().toString(36).slice(-4)}`;
};

const variantMatches = (variant: LoyverseVariant, optionValues: Array<string | null | undefined>, sku?: string | null) => {
  const tuple = variantOptionTupleKey([variant.option1_value, variant.option2_value, variant.option3_value]);
  const wanted = variantOptionTupleKey(optionValues);
  if (tuple === wanted && wanted.replace(/\u0001/g, '').length > 0) return true;
  if (sku && variant.sku && normalizeEntityName(variant.sku) === normalizeEntityName(sku)) return true;
  // Single default variant with empty options on both sides.
  if (!wanted.replace(/\u0001/g, '') && !tuple.replace(/\u0001/g, '')) return true;
  return false;
};

const findVariantOnItem = (
  item: LoyverseItem,
  args: {
    optionValues?: Array<string | null | undefined>;
    sku?: string | null;
    variantName?: string | null;
    sourceVariant?: LoyverseVariant;
  }
): LoyverseVariant[] => {
  const variants = activeVariants(item);
  const optionValues =
    args.optionValues ??
    (args.sourceVariant
      ? [args.sourceVariant.option1_value, args.sourceVariant.option2_value, args.sourceVariant.option3_value]
      : args.variantName
        ? args.variantName.split(' / ').map((part) => part.trim())
        : []);

  const byTuple = variants.filter((variant) => variantMatches(variant, optionValues, args.sku));
  if (byTuple.length) return byTuple;

  if (args.sku) {
    const bySku = variants.filter((v) => normalizeEntityName(v.sku) === normalizeEntityName(args.sku));
    if (bySku.length) return bySku;
  }

  if (variants.length === 1 && !optionValues.some(Boolean) && !args.sku) {
    return variants;
  }

  return [];
};

export const resolveOrCreateItemVariant = async (args: {
  sourceItemId?: string | null;
  sourceVariantId?: string | null;
  itemName?: string | null;
  variantName?: string | null;
  sku?: string | null;
  price?: number | null;
  cost?: number | null;
  sourceInventory: EntityInventories;
  targetInventory: EntityInventories;
  targetClient: LoyverseClient;
  targetStoreId: string;
  /** Modifier IDs already resolved for attachment when creating. */
  targetModifierIds?: string[];
  /** Tax IDs already resolved for attachment when creating. */
  targetTaxIds?: string[];
}): Promise<{ item: LoyverseItem; variant: LoyverseVariant }> => {
  const sourceItem =
    (args.sourceItemId ? args.sourceInventory.items.find((i) => i.id === args.sourceItemId) : undefined) ??
    (args.itemName
      ? args.sourceInventory.items.find((i) => normalizeEntityName(i.item_name) === normalizeEntityName(args.itemName))
      : undefined);

  if (sourceItem?.is_composite) {
    throw new SecondLoyverseError({
      code: 'UNSUPPORTED_COMPOSITE',
      stage: 'resolve_entities',
      message: `Composite item "${sourceItem.item_name}" is unsupported in v1`,
      entityType: 'item',
      entityName: sourceItem.item_name
    });
  }

  const sourceVariant =
    (args.sourceVariantId
      ? sourceItem
        ? activeVariants(sourceItem).find((v) => v.variant_id === args.sourceVariantId)
        : args.sourceInventory.items
            .flatMap((item) => activeVariants(item).map((variant) => ({ item, variant })))
            .find((entry) => entry.variant.variant_id === args.sourceVariantId)?.variant
      : undefined) ??
    (sourceItem
      ? findVariantOnItem(sourceItem, {
          sku: args.sku,
          variantName: args.variantName
        })[0]
      : undefined);

  const itemName = sourceItem?.item_name ?? args.itemName;
  if (!itemName) {
    throw new SecondLoyverseError({
      code: 'ENTITY_NOT_FOUND',
      stage: 'resolve_entities',
      message: `Source item not found for variant ${args.sourceVariantId ?? args.sku ?? 'unknown'}`,
      entityType: 'item'
    });
  }

  if (sourceItem) {
    // Ensure category/taxes/modifiers needed for create path are resolved lazily elsewhere;
    // matching uses name only.
  }

  const key = normalizeEntityName(itemName);
  const candidates = args.targetInventory.itemIndex.byName.get(key) ?? [];
  if (candidates.length > 1) {
    throw new SecondLoyverseError({
      code: 'AMBIGUOUS_ENTITY_NAME',
      stage: 'resolve_entities',
      message: `Multiple target items named "${itemName}"`,
      entityType: 'item',
      entityName: itemName
    });
  }

  if (candidates.length === 1) {
    const targetItem = candidates[0];
    if (targetItem.is_composite) {
      throw new SecondLoyverseError({
        code: 'UNSUPPORTED_COMPOSITE',
        stage: 'resolve_entities',
        message: `Target item "${itemName}" is composite`,
        entityType: 'item',
        entityName: itemName
      });
    }

    const sourceOptions = itemOptionNames(sourceItem ?? ({ option1_name: null } as LoyverseItem));
    const targetOptions = itemOptionNames(targetItem);
    if (sourceItem && sourceOptions.join('|') !== targetOptions.join('|')) {
      throw new SecondLoyverseError({
        code: 'INCOMPATIBLE_ENTITY',
        stage: 'resolve_entities',
        message: `Target item "${itemName}" has incompatible option structure`,
        entityType: 'item',
        entityName: itemName
      });
    }

    const matches = findVariantOnItem(targetItem, {
      sourceVariant,
      sku: args.sku ?? sourceVariant?.sku,
      variantName: args.variantName
    });
    if (matches.length > 1) {
      throw new SecondLoyverseError({
        code: 'AMBIGUOUS_ENTITY_NAME',
        stage: 'resolve_entities',
        message: `Multiple variants matched on target item "${itemName}"`,
        entityType: 'item',
        entityName: itemName
      });
    }
    if (matches.length === 1) {
      return { item: targetItem, variant: matches[0] };
    }

    // If both sides only have a single variant, use it even when historical IDs diverged.
    const targetOnly = activeVariants(targetItem);
    if (targetOnly.length === 1 && (!sourceItem || activeVariants(sourceItem).length <= 1)) {
      return { item: targetItem, variant: targetOnly[0] };
    }

    // Compatible option structure but missing variant: append when we know option values.
    const optionValues = sourceVariant
      ? [sourceVariant.option1_value, sourceVariant.option2_value, sourceVariant.option3_value]
      : args.variantName
        ? args.variantName.split(' / ').map((part) => part.trim())
        : [];

    if (targetItem.option1_name && !optionValues[0]) {
      throw new SecondLoyverseError({
        code: 'UNSUPPORTED_RECEIPT',
        stage: 'resolve_entities',
        message: `Historical variant for "${itemName}" is missing from source inventory and option values are unknown`,
        entityType: 'item',
        entityName: itemName
      });
    }

    if (sourceVariant || optionValues[0]) {
      const existingVariants = targetOnly.map((variant) => ({
        variant_id: variant.variant_id,
        sku: variant.sku,
        option1_value: variant.option1_value,
        option2_value: variant.option2_value,
        option3_value: variant.option3_value,
        barcode: variant.barcode,
        cost: variant.cost,
        purchase_cost: variant.purchase_cost,
        default_pricing_type: variant.default_pricing_type ?? 'FIXED',
        default_price: variant.default_price ?? 0
      }));

      const newVariant = {
        sku: uniqueSkuForTarget(args.sku ?? sourceVariant?.sku, args.targetInventory, targetItem.id),
        option1_value: optionValues[0],
        option2_value: optionValues[1],
        option3_value: optionValues[2],
        barcode: sourceVariant?.barcode,
        cost: sourceVariant?.cost ?? args.cost ?? undefined,
        purchase_cost: sourceVariant?.purchase_cost,
        default_pricing_type: sourceVariant?.default_pricing_type ?? 'FIXED',
        default_price: sourceVariant?.default_price ?? args.price ?? 0
      };

      const updated = await args.targetClient.updateItem(targetItem.id, {
        item_name: targetItem.item_name,
        ...buildLoyverseItemOptionFields([
          targetItem.option1_name,
          targetItem.option2_name,
          targetItem.option3_name
        ]),
        variants: [...existingVariants, newVariant]
      });

      const index = args.targetInventory.items.findIndex((item) => item.id === targetItem.id);
      if (index >= 0) args.targetInventory.items[index] = updated;
      else args.targetInventory.items.push(updated);
      args.targetInventory.itemIndex.byName.set(key, [updated]);

      const afterMatches = findVariantOnItem(updated, {
        sourceVariant,
        sku: args.sku ?? sourceVariant?.sku,
        variantName: args.variantName
      });
      if (afterMatches.length === 1) {
        return { item: updated, variant: afterMatches[0] };
      }
    }

    throw new SecondLoyverseError({
      code: 'UNSUPPORTED_RECEIPT',
      stage: 'resolve_entities',
      message: `Cannot resolve variant for "${itemName}" (historical source variant missing; current item has multiple options)`,
      entityType: 'item',
      entityName: itemName
    });
  }

  // Create receipt-minimal item.
  const categoryId = await resolveOrCreateCategory({
    sourceCategoryId: sourceItem?.category_id,
    sourceInventory: args.sourceInventory,
    targetInventory: args.targetInventory,
    targetClient: args.targetClient
  });

  const taxIds: string[] = [...(args.targetTaxIds ?? [])];
  if (sourceItem?.tax_ids?.length) {
    for (const sourceTaxId of sourceItem.tax_ids) {
      const sourceTax = args.sourceInventory.taxes.find((t) => t.id === sourceTaxId);
      if (!sourceTax) continue;
      const targetTax = await resolveOrCreateTax({
        sourceTax,
        targetInventory: args.targetInventory,
        targetClient: args.targetClient,
        targetStoreId: args.targetStoreId
      });
      if (!taxIds.includes(targetTax.id)) taxIds.push(targetTax.id);
    }
  }

  const modifierIds: string[] = [...(args.targetModifierIds ?? [])];
  if (sourceItem?.modifier_ids?.length) {
    for (const sourceModifierId of sourceItem.modifier_ids) {
      const sourceModifier = args.sourceInventory.modifiers.find((m) => m.id === sourceModifierId);
      if (!sourceModifier?.modifier_options?.length) continue;
      const firstOption = sourceModifier.modifier_options.find((o) => !o.deleted_at);
      if (!firstOption) continue;
      const resolved = await resolveOrCreateModifierOption({
        sourceModifierName: sourceModifier.name,
        sourceOptionName: firstOption.name,
        sourceOptionPrice: firstOption.price,
        sourceModifierOptionId: firstOption.option_id,
        sourceInventory: args.sourceInventory,
        targetInventory: args.targetInventory,
        targetClient: args.targetClient,
        targetStoreId: args.targetStoreId
      });
      if (!modifierIds.includes(resolved.modifier.id)) modifierIds.push(resolved.modifier.id);
    }
  }

  const optionFields = buildLoyverseItemOptionFields([
    sourceItem?.option1_name,
    sourceItem?.option2_name,
    sourceItem?.option3_name
  ]);

  const variantsPayload =
    sourceItem && activeVariants(sourceItem).length
      ? activeVariants(sourceItem).map((variant) => ({
          sku: uniqueSkuForTarget(variant.sku, args.targetInventory),
          option1_value: variant.option1_value,
          option2_value: variant.option2_value,
          option3_value: variant.option3_value,
          barcode: variant.barcode,
          cost: variant.cost ?? args.cost ?? undefined,
          purchase_cost: variant.purchase_cost,
          default_pricing_type: variant.default_pricing_type ?? 'FIXED',
          default_price: variant.default_price ?? args.price ?? 0
        }))
      : [
          {
            sku: uniqueSkuForTarget(args.sku ?? undefined, args.targetInventory),
            default_pricing_type: 'FIXED' as const,
            default_price: args.price ?? 0,
            cost: args.cost ?? undefined
          }
        ];

  const created = await args.targetClient.createItem({
    item_name: itemName,
    description: sourceItem?.description,
    category_id: categoryId,
    track_stock: sourceItem?.track_stock ?? false,
    sold_by_weight: sourceItem?.sold_by_weight ?? false,
    is_composite: false,
    modifier_ids: modifierIds.length ? modifierIds : undefined,
    ...optionFields,
    variants: variantsPayload
  });

  // Attach taxes via update if needed (create payload may not accept tax_ids on all accounts).
  let finalItem = created;
  if (taxIds.length) {
    try {
      finalItem = await args.targetClient.updateItem(created.id, {
        // tax_ids is on LoyverseItem but not CreateLoyverseItemPayload; send via partial update cast.
        ...( { tax_ids: taxIds } as Record<string, unknown> )
      } as Parameters<LoyverseClient['updateItem']>[1]);
    } catch {
      // Keep created item; line_taxes on receipt still apply.
      finalItem = created;
    }
  }

  args.targetInventory.items.push(finalItem);
  const bucket = args.targetInventory.itemIndex.byName.get(key) ?? [];
  bucket.push(finalItem);
  args.targetInventory.itemIndex.byName.set(key, bucket);

  const matches = findVariantOnItem(finalItem, {
    sourceVariant,
    sku: args.sku ?? sourceVariant?.sku,
    variantName: args.variantName
  });
  if (!matches.length) {
    const fallback = activeVariants(finalItem)[0];
    if (!fallback) {
      throw new SecondLoyverseError({
        code: 'TARGET_VALIDATION',
        stage: 'resolve_entities',
        message: `Created item "${itemName}" but no variant was returned`,
        entityType: 'item',
        entityName: itemName
      });
    }
    return { item: finalItem, variant: fallback };
  }
  if (matches.length > 1) {
    // Prefer SKU tie-break.
    const bySku = matches.filter(
      (v) => args.sku && v.sku && normalizeEntityName(v.sku) === normalizeEntityName(args.sku)
    );
    if (bySku.length === 1) return { item: finalItem, variant: bySku[0] };
  }
  return { item: finalItem, variant: matches[0] };
};

// silence unused roughlyEqualNumber if pricing checks expand later
void roughlyEqualNumber;
