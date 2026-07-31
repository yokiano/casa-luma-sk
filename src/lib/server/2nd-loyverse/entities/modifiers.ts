import type { LoyverseClient, LoyverseModifier, LoyverseModifierOption } from '$lib/server/loyverse-client';
import { SecondLoyverseError } from '../errors';
import { normalizeEntityName, roughlyEqualNumber } from '../normalize';
import type { EntityInventories } from './inventory';

type ModifierOptionLike = LoyverseModifierOption & { id?: string };

const getOptionId = (option: ModifierOptionLike): string | undefined => {
  const value = option.option_id || option.id;
  return value?.trim() || undefined;
};

const findOption = (modifier: LoyverseModifier, optionName: string): LoyverseModifierOption[] => {
  const key = normalizeEntityName(optionName);
  return (modifier.modifier_options ?? []).filter(
    (option) => !option.deleted_at && normalizeEntityName(option.name) === key
  );
};

export const resolveOrCreateModifierOption = async (args: {
  sourceModifierName?: string | null;
  sourceOptionName?: string | null;
  sourceOptionPrice?: number | null;
  sourceModifierOptionId?: string | null;
  sourceInventory: EntityInventories;
  targetInventory: EntityInventories;
  targetClient: LoyverseClient;
  targetStoreId: string;
}): Promise<{ modifier: LoyverseModifier; option: LoyverseModifierOption; optionId: string }> => {
  let sourceModifier: LoyverseModifier | undefined;
  let sourceOption: LoyverseModifierOption | undefined;

  if (args.sourceModifierOptionId) {
    for (const modifier of args.sourceInventory.modifiers) {
      const option = (modifier.modifier_options ?? []).find(
        (o) => getOptionId(o) === args.sourceModifierOptionId
      );
      if (option) {
        sourceModifier = modifier;
        sourceOption = option;
        break;
      }
    }
  }

  if (!sourceModifier && args.sourceModifierName) {
    const key = normalizeEntityName(args.sourceModifierName);
    sourceModifier = args.sourceInventory.modifiers.find((m) => normalizeEntityName(m.name) === key);
  }

  if (!sourceOption && sourceModifier && args.sourceOptionName) {
    sourceOption = findOption(sourceModifier, args.sourceOptionName)[0];
  }

  const modifierName = sourceModifier?.name ?? args.sourceModifierName;
  const optionName = sourceOption?.name ?? args.sourceOptionName;
  const optionPrice = sourceOption?.price ?? args.sourceOptionPrice ?? 0;

  if (!modifierName || !optionName) {
    throw new SecondLoyverseError({
      code: 'ENTITY_NOT_FOUND',
      stage: 'resolve_entities',
      message: 'modifier option is missing parent or option name',
      entityType: 'modifier'
    });
  }

  const key = normalizeEntityName(modifierName);
  const candidates = args.targetInventory.modifierIndex.byName.get(key) ?? [];
  if (candidates.length > 1) {
    throw new SecondLoyverseError({
      code: 'AMBIGUOUS_ENTITY_NAME',
      stage: 'resolve_entities',
      message: `Multiple target modifiers named "${modifierName}"`,
      entityType: 'modifier',
      entityName: modifierName
    });
  }

  if (candidates.length === 1) {
    const targetModifier = candidates[0];
    const optionCandidates = findOption(targetModifier, optionName);
    if (optionCandidates.length > 1) {
      throw new SecondLoyverseError({
        code: 'AMBIGUOUS_ENTITY_NAME',
        stage: 'resolve_entities',
        message: `Multiple options named "${optionName}" under modifier "${modifierName}"`,
        entityType: 'modifier',
        entityName: `${modifierName}/${optionName}`
      });
    }
    if (optionCandidates.length === 1) {
      const option = optionCandidates[0];
      if (!roughlyEqualNumber(option.price, optionPrice)) {
        throw new SecondLoyverseError({
          code: 'INCOMPATIBLE_ENTITY',
          stage: 'resolve_entities',
          message: `Target modifier option "${modifierName}/${optionName}" price mismatch`,
          entityType: 'modifier',
          entityName: `${modifierName}/${optionName}`
        });
      }
      const optionId = getOptionId(option);
      if (!optionId) {
        throw new SecondLoyverseError({
          code: 'TARGET_VALIDATION',
          stage: 'resolve_entities',
          message: `Target modifier option "${modifierName}/${optionName}" missing option id`,
          entityType: 'modifier',
          entityName: `${modifierName}/${optionName}`
        });
      }
      return { modifier: targetModifier, option, optionId };
    }

    // Append the missing option; preserve existing options (non-destructive).
    const existingOptions = (targetModifier.modifier_options ?? [])
      .filter((o) => !o.deleted_at)
      .map((o, index) => ({
        name: o.name,
        price: o.price,
        ordering: o.ordering ?? index
      }));
    const nextOrdering =
      existingOptions.reduce((max, o) => Math.max(max, o.ordering ?? 0), -1) + 1;
    const updated = await args.targetClient.updateModifier(targetModifier.id, {
      name: targetModifier.name,
      position: targetModifier.position,
      stores: targetModifier.stores?.length ? targetModifier.stores : [args.targetStoreId],
      modifier_options: [
        ...existingOptions,
        { name: optionName, price: optionPrice, ordering: nextOrdering }
      ]
    });

    const index = args.targetInventory.modifiers.findIndex((m) => m.id === targetModifier.id);
    if (index >= 0) args.targetInventory.modifiers[index] = updated;
    else args.targetInventory.modifiers.push(updated);
    args.targetInventory.modifierIndex.byName.set(key, [updated]);

    const appended =
      findOption(updated, optionName)[0] ??
      updated.modifier_options.find((o) => normalizeEntityName(o.name) === normalizeEntityName(optionName));
    const appendedId = appended ? getOptionId(appended) : undefined;
    if (!appended || !appendedId) {
      throw new SecondLoyverseError({
        code: 'TARGET_VALIDATION',
        stage: 'resolve_entities',
        message: `Updated modifier "${modifierName}" but option "${optionName}" was not returned`,
        entityType: 'modifier',
        entityName: `${modifierName}/${optionName}`
      });
    }
    return { modifier: updated, option: appended, optionId: appendedId };
  }

  const optionsToCreate =
    sourceModifier?.modifier_options
      ?.filter((o) => !o.deleted_at)
      .map((o, index) => ({
        name: o.name,
        price: o.price,
        ordering: o.ordering ?? index
      })) ?? [{ name: optionName, price: optionPrice, ordering: 0 }];

  const created = await args.targetClient.createModifier({
    name: modifierName,
    position: sourceModifier?.position ?? 0,
    stores: [args.targetStoreId],
    modifier_options: optionsToCreate
  });

  args.targetInventory.modifiers.push(created);
  const bucket = args.targetInventory.modifierIndex.byName.get(key) ?? [];
  bucket.push(created);
  args.targetInventory.modifierIndex.byName.set(key, bucket);

  const createdOption =
    findOption(created, optionName)[0] ??
    created.modifier_options.find((o) => normalizeEntityName(o.name) === normalizeEntityName(optionName));

  if (!createdOption) {
    throw new SecondLoyverseError({
      code: 'TARGET_VALIDATION',
      stage: 'resolve_entities',
      message: `Created modifier "${modifierName}" but option "${optionName}" was not returned`,
      entityType: 'modifier',
      entityName: `${modifierName}/${optionName}`
    });
  }

  const optionId = getOptionId(createdOption);
  if (!optionId) {
    throw new SecondLoyverseError({
      code: 'TARGET_VALIDATION',
      stage: 'resolve_entities',
      message: `Created modifier option "${modifierName}/${optionName}" missing option id in API response`,
      entityType: 'modifier',
      entityName: `${modifierName}/${optionName}`
    });
  }

  return { modifier: created, option: createdOption, optionId };
};
