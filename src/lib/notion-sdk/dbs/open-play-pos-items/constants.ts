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
  "Other",
  "Membership",
  "Entry"
] as const,
}

export const OPEN_PLAY_POS_ITEMS_PROPS_TO_IDS = {
  "highlight": "%3BTO~",
  "foodDiscount": "RWeU",
  "id": "Y%3E%7Cv",
  "workshopsIncluded": "sQCI",
  "duration": "tgPF",
  "perks": "vzoC",
  "description": "xUkM",
  "priceBaht": "%7B%5BoE",
  "name": "title",
  "category": "O%3D%5Dz",
  "loyverseId": "CN~l",
  "variantOption_2Name": "DRoF",
  "thaiDescription": "MkKz",
  "hasVariants": "X%40%5CJ",
  "variantOption_1Name": "Y%3B%5Dj",
  "variantsJson": "%5D_WB",
  "variantOption_3Name": "dD_L"
} as const
export const OPEN_PLAY_POS_ITEMS_IDS_TO_PROPS = {
  "%3BTO~": "highlight",
  "RWeU": "foodDiscount",
  "Y%3E%7Cv": "id",
  "sQCI": "workshopsIncluded",
  "tgPF": "duration",
  "vzoC": "perks",
  "xUkM": "description",
  "%7B%5BoE": "priceBaht",
  "title": "name",
  "O%3D%5Dz": "category",
  "CN~l": "loyverseId",
  "DRoF": "variantOption_2Name",
  "MkKz": "thaiDescription",
  "X%40%5CJ": "hasVariants",
  "Y%3B%5Dj": "variantOption_1Name",
  "%5D_WB": "variantsJson",
  "dD_L": "variantOption_3Name"
} as const
export const OPEN_PLAY_POS_ITEMS_PROPS_TO_TYPES = {
  "highlight": "checkbox",
  "foodDiscount": "rich_text",
  "id": "rich_text",
  "workshopsIncluded": "rich_text",
  "duration": "rich_text",
  "perks": "multi_select",
  "description": "rich_text",
  "priceBaht": "number",
  "name": "title",
  "category": "select",
  "loyverseId": "rich_text",
  "variantOption_2Name": "rich_text",
  "thaiDescription": "rich_text",
  "hasVariants": "checkbox",
  "variantOption_1Name": "rich_text",
  "variantsJson": "rich_text",
  "variantOption_3Name": "rich_text"
} as const

  export type OpenPlayPosItemsDTOProperties = keyof typeof OPEN_PLAY_POS_ITEMS_PROPS_TO_IDS
  