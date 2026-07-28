import { MEMBERSHIP_PURCHASE_ITEMS } from './automations/membership-items';

// Open Play Loyverse item IDs used by receipt validation.
// Source of truth: Notion "Open Play POS Items" database. The relevant pages currently expose
// these UUIDs via the Notion item ID/userDefined ID field, while the LoyverseID field is blank.
export const MEMBER_VALID_VISIT_ITEM_ID = 'dd4303a3-0bfb-49ed-95bc-fd65b853d22b';
export const LEGACY_FLEXI_CHECKOUT_ITEM_ID = 'a94027fa-dd55-43d2-a031-b358877f4752';
/** Replace after the additive Checkout item is created; keep the legacy ID above forever. */
export const FLEXI_CHECKOUT_ITEM_ID = LEGACY_FLEXI_CHECKOUT_ITEM_ID;
export const FLEXI_CHECKOUT_ITEM_IDS: readonly string[] = Array.from(new Set([
  FLEXI_CHECKOUT_ITEM_ID,
  LEGACY_FLEXI_CHECKOUT_ITEM_ID
]));
/** Filled after the additive Loyverse sync creates Flexi Entrance. */
export const FLEXI_ENTRANCE_ITEM_ID: string | undefined = undefined;
export const LEGACY_FLEXI_SINGLE_HOUR_VARIANT_ID = '1ac06b7d-7b94-4f7b-98d3-be0b93a5f930';
export const LEGACY_FLEXI_SINGLE_HOUR_SKU = '10143';
/** Stable pre-sync SKU contracts. Exact variant IDs are added after Loyverse sync. */
export const FLEXI_ENTRANCE_SKU_PREFIX = 'FLEXI-ENTRANCE-KIDS-';
export const FLEXI_CHECKOUT_SKU_PREFIX = 'FLEXI-CHECKOUT-HOURS-';
export const FLEXI_ENTRANCE_VARIANT_KIDS_BY_ID: Readonly<Record<string, number>> = {};
export const FLEXI_CHECKOUT_VARIANT_HOURS_BY_ID: Readonly<Record<string, number>> = {
  [LEGACY_FLEXI_SINGLE_HOUR_VARIANT_ID]: 1
};
export const FLEXI_ENTRANCE_MAX_KIDS = 5;
export const FLEXI_CHECKOUT_MAX_HOURS = 8;
export const FLEXIBLE_RESIDENT_ITEM_ID = '483c66bc-ee06-411c-95b6-f39a7491d09a';
export const FLEXIBLE_REGULAR_ITEM_ID = '360020d1-3ecd-43c2-97c8-c6ff4da754d4';

export const FLEXI_CARD_ITEM_IDS = [FLEXIBLE_RESIDENT_ITEM_ID, FLEXIBLE_REGULAR_ITEM_ID] as const;

/**
 * Only these configured Open Play POS items make a missing customer actionable.
 * Restaurant, store, and unknown-item receipts are intentionally outside this set.
 */
export const OPEN_PLAY_CUSTOMER_REQUIRED_ITEM_IDS = [
  MEMBER_VALID_VISIT_ITEM_ID,
  ...FLEXI_CHECKOUT_ITEM_IDS,
  ...(FLEXI_ENTRANCE_ITEM_ID ? [FLEXI_ENTRANCE_ITEM_ID] : []),
  ...FLEXI_CARD_ITEM_IDS,
  ...MEMBERSHIP_PURCHASE_ITEMS.map((item) => item.itemId)
] as const;

export const FLEXI_PASS_ENTRIES_PER_CARD = 11;
