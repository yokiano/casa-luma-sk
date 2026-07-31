import type { LoyverseClient, LoyverseTax } from '$lib/server/loyverse-client';
import { SecondLoyverseError } from '../errors';
import { normalizeEntityName, roughlyEqualNumber } from '../normalize';
import type { EntityInventories } from './inventory';

const taxCompatible = (source: LoyverseTax, target: LoyverseTax): boolean =>
  source.type === target.type && roughlyEqualNumber(source.rate, target.rate);

export const resolveOrCreateTax = async (args: {
  sourceTax: LoyverseTax;
  targetInventory: EntityInventories;
  targetClient: LoyverseClient;
  targetStoreId: string;
}): Promise<LoyverseTax> => {
  const key = normalizeEntityName(args.sourceTax.name);
  const candidates = args.targetInventory.taxIndex.byName.get(key) ?? [];

  if (candidates.length > 1) {
    throw new SecondLoyverseError({
      code: 'AMBIGUOUS_ENTITY_NAME',
      stage: 'resolve_entities',
      message: `Multiple target taxes named "${args.sourceTax.name}"`,
      entityType: 'tax',
      entityName: args.sourceTax.name
    });
  }

  if (candidates.length === 1) {
    const existing = candidates[0];
    if (!taxCompatible(args.sourceTax, existing)) {
      throw new SecondLoyverseError({
        code: 'INCOMPATIBLE_ENTITY',
        stage: 'resolve_entities',
        message: `Target tax "${args.sourceTax.name}" has incompatible type/rate`,
        entityType: 'tax',
        entityName: args.sourceTax.name
      });
    }
    return existing;
  }

  const created = await args.targetClient.createTax({
    name: args.sourceTax.name,
    type: args.sourceTax.type,
    rate: args.sourceTax.rate,
    stores: [args.targetStoreId]
  });
  args.targetInventory.taxes.push(created);
  const bucket = args.targetInventory.taxIndex.byName.get(key) ?? [];
  bucket.push(created);
  args.targetInventory.taxIndex.byName.set(key, bucket);
  return created;
};

export const resolveTaxBySourceIdOrName = async (args: {
  sourceTaxId?: string | null;
  sourceTaxName?: string | null;
  sourceInventory: EntityInventories;
  targetInventory: EntityInventories;
  targetClient: LoyverseClient;
  targetStoreId: string;
}): Promise<LoyverseTax | null> => {
  const source =
    (args.sourceTaxId ? args.sourceInventory.taxes.find((t) => t.id === args.sourceTaxId) : undefined) ??
    (args.sourceTaxName
      ? args.sourceInventory.taxes.find((t) => normalizeEntityName(t.name) === normalizeEntityName(args.sourceTaxName))
      : undefined);

  if (!source) {
    if (!args.sourceTaxName && !args.sourceTaxId) return null;
    throw new SecondLoyverseError({
      code: 'ENTITY_NOT_FOUND',
      stage: 'resolve_entities',
      message: `Source tax not found for id=${args.sourceTaxId ?? 'n/a'} name=${args.sourceTaxName ?? 'n/a'}`,
      entityType: 'tax',
      entityName: args.sourceTaxName ?? undefined
    });
  }

  return resolveOrCreateTax({
    sourceTax: source,
    targetInventory: args.targetInventory,
    targetClient: args.targetClient,
    targetStoreId: args.targetStoreId
  });
};
