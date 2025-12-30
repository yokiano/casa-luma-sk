export const OPEN_PLAY_POS_ITEMS_PROP_VALUES = {
"perks": [
  "10 separate full days of play",
  "Come & go on same day",
  "2 included kids workshops",
  "10% off food & drinks",
  "Free adult/nanny entry",
  "Unlimited play for one child",
  "Up to 8 included workshops/month",
  "15% off food & drinks",
  "50% off one birthday party/year",
  "1 free guest pass/month",
  "Unlimited play for 12 months",
  "All included kids workshops",
  "2 free guest passes/month",
  "Priority event RSVP"
] as const,
"category": [
  "Membership",
  "Entry"
] as const,
}

export const OPEN_PLAY_POS_ITEMS_PROPS_TO_IDS = {
  "highlight": "%3BTO~",
  "iconChar": "%3C%5DT%3A",
  "foodDiscount": "RWeU",
  "id": "Y%3E%7Cv",
  "workshopsIncluded": "sQCI",
  "duration": "tgPF",
  "perks": "vzoC",
  "access": "xUkM",
  "priceBaht": "%7B%5BoE",
  "name": "title",
  "category": "O%3D%5Dz",
  "loyverseId": "CN~l"
} as const
export const OPEN_PLAY_POS_ITEMS_IDS_TO_PROPS = {
  "%3BTO~": "highlight",
  "%3C%5DT%3A": "iconChar",
  "RWeU": "foodDiscount",
  "Y%3E%7Cv": "id",
  "sQCI": "workshopsIncluded",
  "tgPF": "duration",
  "vzoC": "perks",
  "xUkM": "access",
  "%7B%5BoE": "priceBaht",
  "title": "name",
  "O%3D%5Dz": "category",
  "CN~l": "loyverseId"
} as const
export const OPEN_PLAY_POS_ITEMS_PROPS_TO_TYPES = {
  "highlight": "checkbox",
  "iconChar": "rich_text",
  "foodDiscount": "rich_text",
  "id": "rich_text",
  "workshopsIncluded": "rich_text",
  "duration": "rich_text",
  "perks": "multi_select",
  "access": "rich_text",
  "priceBaht": "number",
  "name": "title",
  "category": "select",
  "loyverseId": "rich_text"
} as const

  export type OpenPlayPosItemsDTOProperties = keyof typeof OPEN_PLAY_POS_ITEMS_PROPS_TO_IDS
  