export const POS_MODIFIERS_PROP_VALUES = {
}

export const POS_MODIFIERS_PROPS_TO_IDS = {
  "notes": "%3BZd%5E",
  "optionsJson": "%40bAp",
  "loyverseId": "C%7BUZ",
  "position": "Ph%3EC",
  "active": "teX~",
  "name": "title"
} as const
export const POS_MODIFIERS_IDS_TO_PROPS = {
  "%3BZd%5E": "notes",
  "%40bAp": "optionsJson",
  "C%7BUZ": "loyverseId",
  "Ph%3EC": "position",
  "teX~": "active",
  "title": "name"
} as const
export const POS_MODIFIERS_PROPS_TO_TYPES = {
  "notes": "rich_text",
  "optionsJson": "rich_text",
  "loyverseId": "rich_text",
  "position": "number",
  "active": "checkbox",
  "name": "title"
} as const

  export type PosModifiersDTOProperties = keyof typeof POS_MODIFIERS_PROPS_TO_IDS
  