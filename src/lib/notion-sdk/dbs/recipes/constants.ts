export const RECIPES_PROP_VALUES = {
}

export const RECIPES_PROPS_TO_IDS = {
  "recipeLines": "%3EAo%5D",
  "cogs": "In%3D%3A",
  "thaiName": "K%3E%3AU",
  "instructions": "Uqli",
  "menuItem": "_nNq",
  "image": "ruvh",
  "name": "title"
} as const
export const RECIPES_IDS_TO_PROPS = {
  "%3EAo%5D": "recipeLines",
  "In%3D%3A": "cogs",
  "K%3E%3AU": "thaiName",
  "Uqli": "instructions",
  "_nNq": "menuItem",
  "ruvh": "image",
  "title": "name"
} as const
export const RECIPES_PROPS_TO_TYPES = {
  "recipeLines": "relation",
  "cogs": "rollup",
  "thaiName": "rich_text",
  "instructions": "rich_text",
  "menuItem": "relation",
  "image": "files",
  "name": "title"
} as const

  export type RecipesDTOProperties = keyof typeof RECIPES_PROPS_TO_IDS
  