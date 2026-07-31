import type { LoyverseCategory, LoyverseClient } from '$lib/server/loyverse-client';
import { SecondLoyverseError } from '../errors';
import { normalizeEntityName } from '../normalize';
import type { EntityInventories } from './inventory';

export const resolveOrCreateCategory = async (args: {
  sourceCategory: LoyverseCategory | null | undefined;
  sourceCategoryId?: string | null;
  sourceInventory: EntityInventories;
  targetInventory: EntityInventories;
  targetClient: LoyverseClient;
}): Promise<string | null> => {
  const source =
    args.sourceCategory ??
    (args.sourceCategoryId
      ? args.sourceInventory.categories.find((c) => c.id === args.sourceCategoryId)
      : undefined);

  if (!source?.name) return null;

  const key = normalizeEntityName(source.name);
  const candidates = args.targetInventory.categoryIndex.byName.get(key) ?? [];
  if (candidates.length > 1) {
    throw new SecondLoyverseError({
      code: 'AMBIGUOUS_ENTITY_NAME',
      stage: 'resolve_entities',
      message: `Multiple target categories named "${source.name}"`,
      entityType: 'category',
      entityName: source.name
    });
  }
  if (candidates.length === 1) return candidates[0].id;

  const created = await args.targetClient.createCategory(source.name, source.color);
  args.targetInventory.categories.push(created);
  const bucket = args.targetInventory.categoryIndex.byName.get(key) ?? [];
  bucket.push(created);
  args.targetInventory.categoryIndex.byName.set(key, bucket);
  return created.id;
};
