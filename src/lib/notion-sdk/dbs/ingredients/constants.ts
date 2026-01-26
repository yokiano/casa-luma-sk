export const INGREDIENTS_PROP_VALUES = {
"department": [
  "Bar",
  "Kitchen"
] as const,
"unit": [
  "kg",
  "g",
  "L",
  "ml",
  "unit",
  "pack",
  "100g"
] as const,
}

export const INGREDIENTS_PROPS_TO_IDS = {
  "cost": "%3Cr%5Dr",
  "department": "%3DLVj",
  "supplier": "%3DaXL",
  "unit": "B%60hP",
  "sku": "L~Gj",
  "thaiName": "MifD",
  "weightG": "%5COA%60",
  "orderLink": "%5DUmz",
  "image": "yw%5D%3E",
  "name": "title"
} as const
export const INGREDIENTS_IDS_TO_PROPS = {
  "%3Cr%5Dr": "cost",
  "%3DLVj": "department",
  "%3DaXL": "supplier",
  "B%60hP": "unit",
  "L~Gj": "sku",
  "MifD": "thaiName",
  "%5COA%60": "weightG",
  "%5DUmz": "orderLink",
  "yw%5D%3E": "image",
  "title": "name"
} as const
export const INGREDIENTS_PROPS_TO_TYPES = {
  "cost": "number",
  "department": "multi_select",
  "supplier": "relation",
  "unit": "select",
  "sku": "rich_text",
  "thaiName": "rich_text",
  "weightG": "number",
  "orderLink": "url",
  "image": "files",
  "name": "title"
} as const

  export type IngredientsDTOProperties = keyof typeof INGREDIENTS_PROPS_TO_IDS
  