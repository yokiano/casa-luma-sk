import type { CreateLoyverseItemPayload } from '$lib/server/loyverse';

type LoyverseOptionFields = Pick<CreateLoyverseItemPayload, 'option1_name' | 'option2_name' | 'option3_name'>;

const normalize = (value?: string | null) => value?.normalize('NFC').trim() || undefined;

/**
 * Build item option fields without serializing unused option slots as null.
 * Loyverse returns INTERNAL_ERROR for some one-option create payloads when
 * empty option slots are present as JSON null; Menu Sync omits those fields.
 */
export function buildLoyverseItemOptionFields(
  optionNames: readonly (string | null | undefined)[]
): LoyverseOptionFields {
  return {
    option1_name: normalize(optionNames[0]),
    option2_name: normalize(optionNames[1]),
    option3_name: normalize(optionNames[2])
  };
}
