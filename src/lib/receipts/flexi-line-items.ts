import type { LoyverseReceiptLineItem } from '$lib/receipts/types';
import {
  FLEXI_CHECKOUT_ITEM_ID,
  FLEXI_CHECKOUT_MAX_HOURS,
  FLEXI_CHECKOUT_SKU_PREFIX,
  FLEXI_CHECKOUT_VARIANT_HOURS_BY_ID,
  FLEXI_ENTRANCE_ITEM_ID,
  FLEXI_ENTRANCE_MAX_KIDS,
  FLEXI_ENTRANCE_SKU_PREFIX,
  FLEXI_ENTRANCE_VARIANT_KIDS_BY_ID,
  LEGACY_FLEXI_SINGLE_HOUR_SKU,
  LEGACY_FLEXI_SINGLE_HOUR_VARIANT_ID
} from '$lib/receipts/open-play-items';

export type FlexiLineClassification =
  | { kind: 'unrelated' }
  | { kind: 'entrance'; kids: number; quantity: 1; variantId?: string }
  | { kind: 'checkout'; hours: number; quantity: 1; legacy: boolean; variantId?: string }
  | { kind: 'invalid-entrance'; reason: string }
  | { kind: 'invalid-checkout'; reason: string };

type FlexiSummaryError = { lineItem: LoyverseReceiptLineItem; reason: string };

const normalize = (value?: string | null) => value?.normalize('NFC').trim() ?? '';

const parseConfiguredValue = (sku: string | undefined, prefix: string): number | null => {
  const normalizedSku = normalize(sku);
  if (!normalizedSku.startsWith(prefix)) return null;
  const raw = normalizedSku.slice(prefix.length);
  if (!/^\d{2}$/.test(raw)) return Number.NaN;
  return Number(raw);
};

const getQuantity = (lineItem: LoyverseReceiptLineItem): number | undefined =>
  typeof lineItem.quantity === 'number' && Number.isFinite(lineItem.quantity)
    ? lineItem.quantity
    : undefined;

const isConfiguredEntranceLine = (lineItem: LoyverseReceiptLineItem) =>
  (Boolean(FLEXI_ENTRANCE_ITEM_ID) && lineItem.item_id === FLEXI_ENTRANCE_ITEM_ID) ||
  (!FLEXI_ENTRANCE_ITEM_ID && parseConfiguredValue(lineItem.sku, FLEXI_ENTRANCE_SKU_PREFIX) !== null);

const isConfiguredCheckoutLine = (lineItem: LoyverseReceiptLineItem) =>
  lineItem.item_id === FLEXI_CHECKOUT_ITEM_ID ||
  parseConfiguredValue(lineItem.sku, FLEXI_CHECKOUT_SKU_PREFIX) !== null;

const invalidQuantity = (quantity: number | undefined, label: string) =>
  quantity === undefined
    ? `${label} quantity is missing; it must be exactly 1.`
    : `${label} quantity must be 1; select the value as the variant.`;

export function classifyFlexiLineItem(lineItem: LoyverseReceiptLineItem): FlexiLineClassification {
  if (isConfiguredCheckoutLine(lineItem)) {
    const quantity = getQuantity(lineItem);
    const variantId = normalize(lineItem.variant_id) || undefined;
    const skuHours = parseConfiguredValue(lineItem.sku, FLEXI_CHECKOUT_SKU_PREFIX);
    const mappedHours = variantId ? FLEXI_CHECKOUT_VARIANT_HOURS_BY_ID[variantId] : undefined;

    if (skuHours !== null && lineItem.item_id !== FLEXI_CHECKOUT_ITEM_ID) {
      return { kind: 'invalid-checkout', reason: 'Checkout SKU does not belong to the configured Flexi Checkout item.' };
    }
    if (mappedHours !== undefined && skuHours !== null && (!Number.isFinite(skuHours) || mappedHours !== skuHours)) {
      return { kind: 'invalid-checkout', reason: 'Checkout variant ID and SKU select different visit punch totals.' };
    }

    // Historical receipts used the optionless first variant and quantity as the
    // number of punches. New variants carry the visit's total punches and require quantity 1.
    if ((variantId === LEGACY_FLEXI_SINGLE_HOUR_VARIANT_ID || (!variantId && normalize(lineItem.sku) === LEGACY_FLEXI_SINGLE_HOUR_SKU)) && skuHours === null) {
      if (quantity === undefined || !Number.isInteger(quantity) || quantity <= 0) {
        return { kind: 'invalid-checkout', reason: 'Legacy Flexi quantity must be a positive integer.' };
      }
      return { kind: 'checkout', hours: quantity, quantity: 1, legacy: true, variantId };
    }

    // Once exact variant IDs have been captured, an explicit unknown ID must not
    // be rescued by a contradictory SKU. Before that capture, the stable SKU is
    // the deliberately temporary migration contract.
    const exactVariantIdsConfigured = Object.keys(FLEXI_CHECKOUT_VARIANT_HOURS_BY_ID).length > 1;
    if (variantId && mappedHours === undefined && exactVariantIdsConfigured) {
      return { kind: 'invalid-checkout', reason: 'Checkout variant ID is not in the configured immutable variant map.' };
    }
    const hours = mappedHours ?? skuHours;
    if (hours === null || hours === undefined || !Number.isInteger(hours) || hours < 1 || hours > FLEXI_CHECKOUT_MAX_HOURS) {
      return {
        kind: 'invalid-checkout',
        reason: 'Checkout variant is missing or is not a configured 1–8 hour variant.'
      };
    }
    if (quantity !== 1) {
      return { kind: 'invalid-checkout', reason: invalidQuantity(quantity, 'Flexi Checkout') };
    }
    return { kind: 'checkout', hours, quantity: 1, legacy: false, variantId };
  }

  if (isConfiguredEntranceLine(lineItem)) {
    const quantity = getQuantity(lineItem);
    const variantId = normalize(lineItem.variant_id) || undefined;
    const skuKids = parseConfiguredValue(lineItem.sku, FLEXI_ENTRANCE_SKU_PREFIX);
    const kids = variantId ? FLEXI_ENTRANCE_VARIANT_KIDS_BY_ID[variantId] : undefined;
    if (FLEXI_ENTRANCE_ITEM_ID && skuKids !== null && lineItem.item_id !== FLEXI_ENTRANCE_ITEM_ID) {
      return { kind: 'invalid-entrance', reason: 'Entrance SKU does not belong to the configured Flexi Entrance item.' };
    }
    if (kids !== undefined && skuKids !== null && (!Number.isFinite(skuKids) || kids !== skuKids)) {
      return { kind: 'invalid-entrance', reason: 'Entrance variant ID and SKU select different child counts.' };
    }
    const exactVariantIdsConfigured = Object.keys(FLEXI_ENTRANCE_VARIANT_KIDS_BY_ID).length > 0;
    if (variantId && kids === undefined && exactVariantIdsConfigured) {
      return { kind: 'invalid-entrance', reason: 'Entrance variant ID is not in the configured immutable variant map.' };
    }
    const selectedKids = kids ?? skuKids;

    if (selectedKids === null || selectedKids === undefined || !Number.isInteger(selectedKids) || selectedKids < 1 || selectedKids > FLEXI_ENTRANCE_MAX_KIDS) {
      return { kind: 'invalid-entrance', reason: 'Entrance variant is missing or is not a configured 1–5 kid variant.' };
    }
    if (quantity !== 1) {
      return { kind: 'invalid-entrance', reason: invalidQuantity(quantity, 'Flexi Entrance') };
    }
    return { kind: 'entrance', kids: selectedKids, quantity: 1, variantId };
  }

  return { kind: 'unrelated' };
}

export const isFlexiOperationalLineItem = (lineItem: LoyverseReceiptLineItem) =>
  classifyFlexiLineItem(lineItem).kind !== 'unrelated';

export type FlexiCheckoutSummary = {
  matched: boolean;
  hours: number;
  validLineCount: number;
  invalid: FlexiSummaryError[];
};

export function summarizeFlexiCheckout(lineItems: LoyverseReceiptLineItem[] = []): FlexiCheckoutSummary {
  const valid = lineItems.flatMap((lineItem) => {
    const classification = classifyFlexiLineItem(lineItem);
    return classification.kind === 'checkout' ? [{ lineItem, classification }] : [];
  });
  const invalid = lineItems.flatMap((lineItem) => {
    const classification = classifyFlexiLineItem(lineItem);
    return classification.kind === 'invalid-checkout' ? [{ lineItem, reason: classification.reason }] : [];
  });

  if (valid.length > 1) {
    invalid.push({
      lineItem: valid[1].lineItem,
      reason: 'A receipt may contain only one Flexi Checkout line; select the total holes punched for this visit once.'
    });
  }

  return {
    matched: valid.length > 0 || invalid.length > 0,
    hours: valid.length === 1 && invalid.length === 0 ? valid[0].classification.hours : 0,
    validLineCount: valid.length,
    invalid
  };
}

export function summarizeFlexiEntrance(lineItems: LoyverseReceiptLineItem[] = []) {
  let kids = 0;
  const invalid: FlexiSummaryError[] = [];
  let matched = false;

  for (const lineItem of lineItems) {
    const classification = classifyFlexiLineItem(lineItem);
    if (classification.kind === 'entrance') {
      matched = true;
      kids += classification.kids;
    } else if (classification.kind === 'invalid-entrance') {
      matched = true;
      invalid.push({ lineItem, reason: classification.reason });
    }
  }

  return { matched, kids, invalid };
}
