import type {
  CreateLoyverseItemPayload,
  LoyverseItem,
  LoyverseVariant
} from '$lib/server/loyverse';

export type OpenPlayVariantDefinition = {
  variant_id?: string;
  option1_value?: string;
  option2_value?: string;
  option3_value?: string;
  price: number;
  sku?: string;
  barcode?: string;
};

const normalize = (value?: string | null) => value?.normalize('NFC').trim() ?? '';
const readOptionalString = (record: Record<string, unknown>, key: string, label: string): string | undefined => {
  const value = record[key];
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string') throw new Error(`${label} must be a string when provided.`);
  const normalized = normalize(value);
  return normalized || undefined;
};

export const variantOptionKey = (variant: {
  option1_value?: string;
  option2_value?: string;
  option3_value?: string;
}) => [variant.option1_value, variant.option2_value, variant.option3_value]
  .map((value) => normalize(value).toLocaleLowerCase())
  .join('\u0000');

export function parseOpenPlayVariants(
  jsonString: string | undefined,
  optionNames: readonly (string | undefined)[]
): OpenPlayVariantDefinition[] {
  if (!jsonString?.trim()) throw new Error('Variants JSON is required when Has variants is enabled.');

  let value: unknown;
  try {
    value = JSON.parse(jsonString);
  } catch {
    throw new Error('Variants JSON is not valid JSON.');
  }
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error('Variants JSON must be a non-empty array.');
  }

  const normalizedOptionNames = optionNames.map((name) => normalize(name));
  const configuredOptionCount = normalizedOptionNames.filter(Boolean).length;
  if (configuredOptionCount < 1 || configuredOptionCount > 3 || normalizedOptionNames.slice(0, configuredOptionCount).some((name) => !name) || normalizedOptionNames.slice(configuredOptionCount).some(Boolean)) {
    throw new Error('Variant option names must be contiguous and contain between one and three names.');
  }

  const variants = value.map((raw, index): OpenPlayVariantDefinition => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      throw new Error(`Variant ${index + 1} must be an object.`);
    }
    const record = raw as Record<string, unknown>;
    const option1 = record.option1_value !== undefined
      ? readOptionalString(record, 'option1_value', `Variant ${index + 1} option 1`)
      : record.option1 !== undefined
        ? readOptionalString(record, 'option1', `Variant ${index + 1} option 1`)
        : readOptionalString(record, 'name', `Variant ${index + 1} option 1`);
    const option2 = record.option2_value !== undefined
      ? readOptionalString(record, 'option2_value', `Variant ${index + 1} option 2`)
      : readOptionalString(record, 'option2', `Variant ${index + 1} option 2`);
    const option3 = record.option3_value !== undefined
      ? readOptionalString(record, 'option3_value', `Variant ${index + 1} option 3`)
      : readOptionalString(record, 'option3', `Variant ${index + 1} option 3`);
    const options = [option1, option2, option3];

    for (let optionIndex = 0; optionIndex < configuredOptionCount; optionIndex += 1) {
      if (!options[optionIndex]) {
        throw new Error(`Variant ${index + 1} is missing option ${optionIndex + 1}.`);
      }
    }
    for (let optionIndex = configuredOptionCount; optionIndex < options.length; optionIndex += 1) {
      if (options[optionIndex]) {
        throw new Error(`Variant ${index + 1} has option ${optionIndex + 1}, but no matching option name is configured.`);
      }
    }

    const rawPrice = record.price ?? record.default_price;
    if (typeof rawPrice !== 'number' || !Number.isFinite(rawPrice) || rawPrice < 0) {
      throw new Error(`Variant ${index + 1} has an invalid or missing numeric price.`);
    }

    return {
      variant_id: readOptionalString(record, 'variant_id', `Variant ${index + 1} variant_id`),
      option1_value: option1,
      option2_value: option2,
      option3_value: option3,
      price: rawPrice,
      sku: readOptionalString(record, 'sku', `Variant ${index + 1} SKU`),
      barcode: readOptionalString(record, 'barcode', `Variant ${index + 1} barcode`)
    };
  });

  const assertUnique = (label: string, values: Array<string | undefined>) => {
    const seen = new Set<string>();
    for (const rawValue of values) {
      const normalized = normalize(rawValue).toLocaleLowerCase();
      if (!normalized) continue;
      if (seen.has(normalized)) throw new Error(`Variants JSON contains a duplicate ${label}: ${rawValue}`);
      seen.add(normalized);
    }
  };
  assertUnique('option combination', variants.map(variantOptionKey));
  assertUnique('variant_id', variants.map((variant) => variant.variant_id));
  assertUnique('SKU', variants.map((variant) => variant.sku));
  assertUnique('barcode', variants.map((variant) => variant.barcode));

  return variants;
}

export function reconcileOpenPlayVariants(
  desired: OpenPlayVariantDefinition[],
  existing: LoyverseVariant[]
): CreateLoyverseItemPayload['variants'] {
  const byId = new Map(existing.map((variant) => [variant.variant_id, variant]));
  const bySku = new Map(existing.filter((variant) => normalize(variant.sku)).map((variant) => [normalize(variant.sku).toLocaleLowerCase(), variant]));
  const byOptions = new Map(existing.map((variant) => [variantOptionKey(variant), variant]));
  const usedIds = new Set<string>();

  return desired.map((variant, index) => {
    let match: LoyverseVariant | undefined;
    if (variant.variant_id) {
      match = byId.get(variant.variant_id);
      if (!match) throw new Error(`Configured variant_id ${variant.variant_id} does not belong to the linked Loyverse item.`);
    }
    if (!match && variant.sku) match = bySku.get(normalize(variant.sku).toLocaleLowerCase());
    if (!match) match = byOptions.get(variantOptionKey(variant));
    // The old Open Play model had one optionless variant. Preserve it as the first
    // configured variant instead of replacing historical receipt identity.
    if (!match && index === 0 && existing.length === 1 && !variantOptionKey(existing[0]).replaceAll('\u0000', '')) {
      match = existing[0];
    }
    if (match && usedIds.has(match.variant_id)) {
      throw new Error(`Loyverse variant ${match.variant_id} matched more than one configured variant.`);
    }
    if (match) usedIds.add(match.variant_id);

    return {
      ...(match ? { variant_id: match.variant_id } : {}),
      option1_value: variant.option1_value,
      option2_value: variant.option2_value,
      option3_value: variant.option3_value,
      default_price: variant.price,
      default_pricing_type: 'FIXED' as const,
      sku: variant.sku,
      barcode: variant.barcode
    };
  });
}

export function writeBackVariantIds(
  configured: OpenPlayVariantDefinition[],
  synced: LoyverseVariant[]
): OpenPlayVariantDefinition[] {
  const bySku = new Map(synced.filter((variant) => normalize(variant.sku)).map((variant) => [normalize(variant.sku).toLocaleLowerCase(), variant]));
  const byOptions = new Map(synced.map((variant) => [variantOptionKey(variant), variant]));

  return configured.map((variant) => {
    const match = variant.variant_id
      ? synced.find((candidate) => candidate.variant_id === variant.variant_id)
      : (variant.sku ? bySku.get(normalize(variant.sku).toLocaleLowerCase()) : undefined)
        || byOptions.get(variantOptionKey(variant));
    if (!match) throw new Error(`Loyverse did not return an ID for variant ${variantOptionKey(variant)}.`);
    return { ...variant, variant_id: match.variant_id };
  });
}

export function buildOpenPlayDescription(input: {
  description?: string;
  thaiDescription?: string;
  duration?: string;
  workshopsIncluded?: string;
  perks?: string[];
  foodDiscount?: string;
}): string {
  const english = normalize(input.description);
  const thai = normalize(input.thaiDescription);
  if (english || thai) {
    return [english ? `EN\n${english}` : '', thai ? `ไทย\n${thai}` : ''].filter(Boolean).join('\n\n');
  }

  const parts: string[] = [];
  if (normalize(input.duration)) parts.push(`Duration: ${normalize(input.duration)}`);
  if (normalize(input.workshopsIncluded)) parts.push(`Workshops: ${normalize(input.workshopsIncluded)}`);
  if (input.perks?.length) parts.push(`Perks: ${input.perks.join(', ')}`);
  if (normalize(input.foodDiscount)) parts.push(`Food Discount: ${normalize(input.foodDiscount)}`);
  return parts.join('\n');
}

export function compareOpenPlayVariants(
  configured: OpenPlayVariantDefinition[],
  item: LoyverseItem,
  optionNames: readonly (string | undefined)[]
): string[] {
  const diffs: string[] = [];
  const actualOptionNames = [item.option1_name, item.option2_name, item.option3_name];
  optionNames.forEach((name, index) => {
    if (normalize(name) !== normalize(actualOptionNames[index])) {
      diffs.push(`Option ${index + 1} name mismatch: "${normalize(name)}" vs "${normalize(actualOptionNames[index])}"`);
    }
  });

  if (configured.length !== item.variants.length) {
    diffs.push(`Variant count mismatch: ${configured.length} vs ${item.variants.length}`);
  }

  const actualById = new Map(item.variants.map((variant) => [variant.variant_id, variant]));
  const actualBySku = new Map(item.variants.filter((variant) => normalize(variant.sku)).map((variant) => [normalize(variant.sku).toLocaleLowerCase(), variant]));
  const actualByOptions = new Map(item.variants.map((variant) => [variantOptionKey(variant), variant]));
  const matchedActualIds = new Set<string>();

  for (const variant of configured) {
    const actual = variant.variant_id
      ? actualById.get(variant.variant_id)
      : (variant.sku ? actualBySku.get(normalize(variant.sku).toLocaleLowerCase()) : undefined)
        || actualByOptions.get(variantOptionKey(variant));
    const label = [variant.option1_value, variant.option2_value, variant.option3_value].filter(Boolean).join(' / ');
    if (!actual) {
      diffs.push(`Variant missing in Loyverse: ${label}`);
      continue;
    }
    matchedActualIds.add(actual.variant_id);
    if (variantOptionKey(variant) !== variantOptionKey(actual)) diffs.push(`Variant options mismatch: ${label}`);
    if ((actual.default_price ?? 0) !== variant.price) diffs.push(`Variant price mismatch for ${label}: ${variant.price} vs ${actual.default_price ?? 0}`);
    if (normalize(variant.sku) !== normalize(actual.sku)) diffs.push(`Variant SKU mismatch for ${label}`);
    if (normalize(variant.barcode) !== normalize(actual.barcode)) diffs.push(`Variant barcode mismatch for ${label}`);
  }

  for (const actual of item.variants) {
    if (!matchedActualIds.has(actual.variant_id)) {
      diffs.push(`Unexpected Loyverse variant: ${[actual.option1_value, actual.option2_value, actual.option3_value].filter(Boolean).join(' / ') || actual.variant_id}`);
    }
  }

  return diffs;
}
