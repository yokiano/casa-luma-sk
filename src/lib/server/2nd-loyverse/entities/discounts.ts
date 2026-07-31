import type { LoyverseClient, LoyverseDiscount } from '$lib/server/loyverse-client';
import { SecondLoyverseError } from '../errors';
import { normalizeEntityName, roughlyEqualNumber } from '../normalize';
import type { EntityInventories } from './inventory';

const isPointsDiscount = (discount: Pick<LoyverseDiscount, 'type'> | { type?: string }) =>
  discount.type === 'DISCOUNT_BY_POINTS';

const discountCompatible = (source: LoyverseDiscount, target: LoyverseDiscount): boolean => {
  if (source.type !== target.type) return false;
  if (source.type === 'FIXED_PERCENT' || source.type === 'VARIABLE_PERCENT') {
    return roughlyEqualNumber(source.discount_percent ?? null, target.discount_percent ?? null) || source.type === 'VARIABLE_PERCENT';
  }
  if (source.type === 'FIXED_AMOUNT') {
    return roughlyEqualNumber(source.discount_amount ?? null, target.discount_amount ?? null);
  }
  // VARIABLE_AMOUNT: type match is enough; value is set on the receipt.
  return true;
};

export const resolveOrCreateDiscount = async (args: {
  sourceDiscount: LoyverseDiscount;
  targetInventory: EntityInventories;
  targetClient: LoyverseClient;
  targetStoreId: string;
}): Promise<LoyverseDiscount> => {
  if (isPointsDiscount(args.sourceDiscount)) {
    throw new SecondLoyverseError({
      code: 'UNSUPPORTED_POINTS_DISCOUNT',
      stage: 'resolve_entities',
      message: `Points discount "${args.sourceDiscount.name}" is unsupported without customers/loyalty`,
      entityType: 'discount',
      entityName: args.sourceDiscount.name
    });
  }

  const key = normalizeEntityName(args.sourceDiscount.name);
  const candidates = args.targetInventory.discountIndex.byName.get(key) ?? [];

  if (candidates.length > 1) {
    throw new SecondLoyverseError({
      code: 'AMBIGUOUS_ENTITY_NAME',
      stage: 'resolve_entities',
      message: `Multiple target discounts named "${args.sourceDiscount.name}"`,
      entityType: 'discount',
      entityName: args.sourceDiscount.name
    });
  }

  if (candidates.length === 1) {
    const existing = candidates[0];
    if (isPointsDiscount(existing) || !discountCompatible(args.sourceDiscount, existing)) {
      throw new SecondLoyverseError({
        code: 'INCOMPATIBLE_ENTITY',
        stage: 'resolve_entities',
        message: `Target discount "${args.sourceDiscount.name}" is incompatible with source definition`,
        entityType: 'discount',
        entityName: args.sourceDiscount.name
      });
    }
    return existing;
  }

  const created = await args.targetClient.createDiscount({
    name: args.sourceDiscount.name,
    type: args.sourceDiscount.type,
    discount_amount:
      args.sourceDiscount.type === 'FIXED_AMOUNT' || args.sourceDiscount.type === 'VARIABLE_AMOUNT'
        ? (args.sourceDiscount.discount_amount ?? 0)
        : args.sourceDiscount.discount_amount,
    discount_percent:
      args.sourceDiscount.type === 'FIXED_PERCENT' || args.sourceDiscount.type === 'VARIABLE_PERCENT'
        ? (args.sourceDiscount.discount_percent ?? 0)
        : args.sourceDiscount.discount_percent,
    stores: [args.targetStoreId],
    restricted_access: args.sourceDiscount.restricted_access
  });
  args.targetInventory.discounts.push(created);
  const bucket = args.targetInventory.discountIndex.byName.get(key) ?? [];
  bucket.push(created);
  args.targetInventory.discountIndex.byName.set(key, bucket);
  return created;
};

export const resolveDiscountBySourceIdOrName = async (args: {
  sourceDiscountId?: string | null;
  sourceDiscountName?: string | null;
  sourceDiscountType?: string | null;
  sourceDiscountPercent?: number | null;
  sourceDiscountAmount?: number | null;
  sourceInventory: EntityInventories;
  targetInventory: EntityInventories;
  targetClient: LoyverseClient;
  targetStoreId: string;
}): Promise<LoyverseDiscount> => {
  let source =
    (args.sourceDiscountId
      ? args.sourceInventory.discounts.find((d) => d.id === args.sourceDiscountId)
      : undefined) ??
    (args.sourceDiscountName
      ? args.sourceInventory.discounts.find(
          (d) => normalizeEntityName(d.name) === normalizeEntityName(args.sourceDiscountName)
        )
      : undefined);

  if (!source && args.sourceDiscountName && args.sourceDiscountType) {
    // Synthetic definition from receipt payload when inventory lookup fails.
    source = {
      id: args.sourceDiscountId ?? `synthetic:${args.sourceDiscountName}`,
      name: args.sourceDiscountName,
      type: args.sourceDiscountType as LoyverseDiscount['type'],
      discount_percent: args.sourceDiscountPercent ?? undefined,
      discount_amount: args.sourceDiscountAmount ?? undefined
    };
  }

  if (!source) {
    throw new SecondLoyverseError({
      code: 'ENTITY_NOT_FOUND',
      stage: 'resolve_entities',
      message: `Source discount not found for id=${args.sourceDiscountId ?? 'n/a'} name=${args.sourceDiscountName ?? 'n/a'}`,
      entityType: 'discount',
      entityName: args.sourceDiscountName ?? undefined
    });
  }

  if (
    (source.type === 'FIXED_PERCENT' || source.type === 'VARIABLE_PERCENT') &&
    source.discount_percent == null &&
    args.sourceDiscountPercent != null
  ) {
    source = { ...source, discount_percent: args.sourceDiscountPercent };
  }
  if (
    (source.type === 'FIXED_AMOUNT' || source.type === 'VARIABLE_AMOUNT') &&
    source.discount_amount == null &&
    args.sourceDiscountAmount != null
  ) {
    source = { ...source, discount_amount: args.sourceDiscountAmount };
  }

  return resolveOrCreateDiscount({
    sourceDiscount: source,
    targetInventory: args.targetInventory,
    targetClient: args.targetClient,
    targetStoreId: args.targetStoreId
  });
};
