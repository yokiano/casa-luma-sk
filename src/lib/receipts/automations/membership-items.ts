export type MembershipType = 'Weekly' | 'Monthly';

export type MembershipPurchaseItemConfig = {
  itemId: string;
  type: MembershipType;
  durationDays: number;
  label: string;
};

// Hardcoded from Notion 🎟️ Open Play POS Items, using the current `ID` field because
// `LoyverseID` is blank in the database rows.
export const MEMBERSHIP_PURCHASE_ITEMS: MembershipPurchaseItemConfig[] = [
  {
    itemId: 'fc7b05a3-8898-4bcb-bf7e-3769ee67ba3c',
    type: 'Weekly',
    durationDays: 7,
    label: '1 Week'
  },
  {
    itemId: '4dec5920-72ee-498e-bc41-482724bedcbc',
    type: 'Monthly',
    durationDays: 30,
    label: '1 Month'
  }
];
