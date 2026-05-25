// Open Play Loyverse item IDs used by receipt validation.
// Source of truth: Notion "Open Play POS Items" database. The relevant pages currently expose
// these UUIDs via the Notion item ID/userDefined ID field, while the LoyverseID field is blank.
export const MEMBER_VALID_VISIT_ITEM_ID = 'dd4303a3-0bfb-49ed-95bc-fd65b853d22b';
export const FLEXI_SINGLE_ENTRANCE_ITEM_ID = 'a94027fa-dd55-43d2-a031-b358877f4752';
export const FLEXIBLE_RESIDENT_ITEM_ID = '483c66bc-ee06-411c-95b6-f39a7491d09a';
export const FLEXIBLE_REGULAR_ITEM_ID = '360020d1-3ecd-43c2-97c8-c6ff4da754d4';

export const FLEXI_CARD_ITEM_IDS = [FLEXIBLE_RESIDENT_ITEM_ID, FLEXIBLE_REGULAR_ITEM_ID] as const;
export const FLEXI_PASS_ENTRIES_PER_CARD = 11;
