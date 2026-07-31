import type { LoyversePaymentType } from '$lib/server/loyverse-client';
import { SecondLoyverseError } from '../errors';
import { normalizeEntityName } from '../normalize';
import type { EntityInventories } from './inventory';

export const resolvePaymentTypeByName = (
  sourceName: string | undefined | null,
  targetInventory: EntityInventories
): LoyversePaymentType => {
  const key = normalizeEntityName(sourceName);
  if (!key) {
    throw new SecondLoyverseError({
      code: 'PAYMENT_TYPE_MISSING',
      stage: 'resolve_entities',
      message: 'Source receipt payment is missing a payment type name',
      entityType: 'payment_type'
    });
  }

  const candidates = targetInventory.paymentTypeIndex.byName.get(key) ?? [];
  if (candidates.length === 0) {
    throw new SecondLoyverseError({
      code: 'PAYMENT_TYPE_MISSING',
      stage: 'resolve_entities',
      message: `Target payment type not found for name "${sourceName}". Create it manually with a matching name.`,
      entityType: 'payment_type',
      entityName: sourceName ?? undefined
    });
  }
  if (candidates.length > 1) {
    throw new SecondLoyverseError({
      code: 'AMBIGUOUS_ENTITY_NAME',
      stage: 'resolve_entities',
      message: `Multiple target payment types named "${sourceName}"`,
      entityType: 'payment_type',
      entityName: sourceName ?? undefined
    });
  }
  return candidates[0];
};
