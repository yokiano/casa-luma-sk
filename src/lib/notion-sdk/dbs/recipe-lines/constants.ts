export const RECIPE_LINES_PROP_VALUES = {
}

export const RECIPE_LINES_PROPS_TO_IDS = {
  "amount": "c%5BnZ",
  "lineCost": "e%3Dw%5C",
  "unit": "kVXs",
  "ingredient": "nRYL",
  "name": "title"
} as const
export const RECIPE_LINES_IDS_TO_PROPS = {
  "c%5BnZ": "amount",
  "e%3Dw%5C": "lineCost",
  "kVXs": "unit",
  "nRYL": "ingredient",
  "title": "name"
} as const
export const RECIPE_LINES_PROPS_TO_TYPES = {
  "amount": "number",
  "lineCost": "formula",
  "unit": "formula",
  "ingredient": "relation",
  "name": "title"
} as const

  export type RecipeLinesDTOProperties = keyof typeof RECIPE_LINES_PROPS_TO_IDS
  