import { MEMBERSHIP_PURCHASE_ITEMS } from './automations/membership-items';

// Open Play Loyverse item IDs used by receipt validation.
// Source of truth: Notion "Open Play POS Items" database. The relevant pages currently expose
// these UUIDs via the Notion item ID/userDefined ID field, while the LoyverseID field is blank.
export const MEMBER_VALID_VISIT_ITEM_ID = 'dd4303a3-0bfb-49ed-95bc-fd65b853d22b';
export const LEGACY_FLEXI_CHECKOUT_ITEM_ID = 'a94027fa-dd55-43d2-a031-b358877f4752';
/** Active variant-based Checkout item. Keep the legacy ID above forever for history lookup. */
export const FLEXI_CHECKOUT_ITEM_ID = 'cf3ea669-d995-4d46-8d31-d2d6e3f91410';
export const FLEXI_CHECKOUT_ITEM_IDS: readonly string[] = Array.from(new Set([
  FLEXI_CHECKOUT_ITEM_ID,
  LEGACY_FLEXI_CHECKOUT_ITEM_ID
]));
export const FLEXI_ENTRANCE_ITEM_ID: string | undefined = '04f17ebd-9bf1-4bb2-85d1-535872de5622';
export const LEGACY_FLEXI_SINGLE_HOUR_VARIANT_ID = '1ac06b7d-7b94-4f7b-98d3-be0b93a5f930';
export const LEGACY_FLEXI_SINGLE_HOUR_SKU = '10143';
export const FLEXI_ENTRANCE_SKU_PREFIX = 'FLEXI-ENTRANCE-KIDS-';
export const FLEXI_CHECKOUT_SKU_PREFIX = 'FLEXI-CHECKOUT-HOURS-';
export const FLEXI_ENTRANCE_VARIANT_KIDS_BY_ID: Readonly<Record<string, number>> = {
  '858c90fe-9fe1-4169-b3af-c3bbc954654f': 1,
  '37ebf38c-9da5-4ad4-b84b-a7e3a3711fb9': 2,
  'bf22be0e-19ef-40fa-825f-ad2cd7720873': 3,
  '8ac2c629-c00a-4696-b1af-cf8dac5b9534': 4,
  'd89752ee-15f9-4f81-aab7-68604b501936': 5
};
export const FLEXI_CHECKOUT_VARIANT_HOURS_BY_ID: Readonly<Record<string, number>> = {
  [LEGACY_FLEXI_SINGLE_HOUR_VARIANT_ID]: 1,
  '6febcd90-5c06-4351-b542-a40862daab1b': 1,
  'b0b10716-0713-4310-a6a9-258a8ea6a8a3': 2,
  '0e66f590-adab-4278-a789-9027ec63ada4': 3,
  '7b39776a-7819-4ea1-9be9-07bd000c0def': 4,
  '82177af3-61e8-4d44-bc0a-e72ceaa82b94': 5,
  '26e35731-9a0c-48db-ab09-e00a122bb070': 6,
  '9da91388-9fc0-43a6-ae77-f09e5a045a6b': 7,
  '9cdcbe55-46d1-4346-b6fd-e82c1cf0b666': 8
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
