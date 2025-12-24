export const POS_DISCOUNTS_PROP_VALUES = {
"type": [
  "Percentage",
  "Amount"
] as const,
"appliesTo": [
  "Ticket"
] as const,
}

export const POS_DISCOUNTS_PROPS_TO_IDS = {
  "value": "%3Aqj_",
  "active": "B%5D%3A%3C",
  "restrictedAccess": "GeG%3C",
  "type": "npz%7D",
  "loyverseId": "wqUi",
  "appliesTo": "%7B_%60%5C",
  "name": "title"
} as const
export const POS_DISCOUNTS_IDS_TO_PROPS = {
  "%3Aqj_": "value",
  "B%5D%3A%3C": "active",
  "GeG%3C": "restrictedAccess",
  "npz%7D": "type",
  "wqUi": "loyverseId",
  "%7B_%60%5C": "appliesTo",
  "title": "name"
} as const
export const POS_DISCOUNTS_PROPS_TO_TYPES = {
  "value": "number",
  "active": "checkbox",
  "restrictedAccess": "checkbox",
  "type": "select",
  "loyverseId": "rich_text",
  "appliesTo": "select",
  "name": "title"
} as const

  export type PosDiscountsDTOProperties = keyof typeof POS_DISCOUNTS_PROPS_TO_IDS
  