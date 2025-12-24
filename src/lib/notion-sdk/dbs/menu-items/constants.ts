export const MENU_ITEMS_PROP_VALUES = {
"dietaryOptions": [
  "Vegetarian",
  "Vegan",
  "Gluten-Free",
  "Dairy-Free",
  "Keto",
  "Paleo",
  "Nut-Free",
  "Low-Carb"
] as const,
"ingridients": [
  "Cucumber",
  "Pineapple",
  "Celery",
  "Lime",
  "Beetroot",
  "Apple",
  "Ginger"
] as const,
"allergens": [
  "Dairy",
  "Eggs",
  "Gluten",
  "Wheat",
  "Nuts",
  "Peanuts",
  "Soy",
  "Fish",
  "Shellfish",
  "Sesame"
] as const,
"category": [
  "Coffee & More",
  "Fresh Cold-Pressed Juices",
  "House Smoothies",
  "Soft Drinks",
  "Sandwiches & Toasties",
  "Croissant Sandwich",
  "Open Toasts",
  "Personal Pizzas",
  "Salads",
  "Sweet Morning",
  "Comfort Food",
  "Desserts",
  "Kids Pizza",
  "Kids Favorites",
  "Kids Small Plates",
  "Kids Beverage"
] as const,
"grandCategory": [
  "Food",
  "Drinks",
  "Kids",
  "Desserts"
] as const,
"status": [
  "Active",
  "Archived"
] as const,
}

export const MENU_ITEMS_PROPS_TO_IDS = {
  "description": "%40w%3Bd",
  "dietaryOptions": "B%5CRW",
  "cogs": "QFbw",
  "price": "QGW%3B",
  "ingridients": "SLSP",
  "allergens": "a%5DkJ",
  "image": "t%3DM%40",
  "category": "z%40vA",
  "name": "title",
  "loyverseId": "%5B%3DN%3E",
  "grandCategory": "Bfwb",
  "status": "%5B%5Bjz",
  "variantOption_1Name": "Fak%7B",
  "variantsJson": "GBdq",
  "loyverseHandle": "PdEI",
  "hasVariants": "Y%5DwL",
  "variantOption_3Name": "a%3CZ%40",
  "variantOption_2Name": "wt%7Dr",
  "modifiers": "eqWu"
} as const
export const MENU_ITEMS_IDS_TO_PROPS = {
  "%40w%3Bd": "description",
  "B%5CRW": "dietaryOptions",
  "QFbw": "cogs",
  "QGW%3B": "price",
  "SLSP": "ingridients",
  "a%5DkJ": "allergens",
  "t%3DM%40": "image",
  "z%40vA": "category",
  "title": "name",
  "%5B%3DN%3E": "loyverseId",
  "Bfwb": "grandCategory",
  "%5B%5Bjz": "status",
  "Fak%7B": "variantOption_1Name",
  "GBdq": "variantsJson",
  "PdEI": "loyverseHandle",
  "Y%5DwL": "hasVariants",
  "a%3CZ%40": "variantOption_3Name",
  "wt%7Dr": "variantOption_2Name",
  "eqWu": "modifiers"
} as const
export const MENU_ITEMS_PROPS_TO_TYPES = {
  "description": "rich_text",
  "dietaryOptions": "multi_select",
  "cogs": "number",
  "price": "number",
  "ingridients": "multi_select",
  "allergens": "multi_select",
  "image": "files",
  "category": "select",
  "name": "title",
  "loyverseId": "rich_text",
  "grandCategory": "select",
  "status": "status",
  "variantOption_1Name": "rich_text",
  "variantsJson": "rich_text",
  "loyverseHandle": "rich_text",
  "hasVariants": "checkbox",
  "variantOption_3Name": "rich_text",
  "variantOption_2Name": "rich_text",
  "modifiers": "relation"
} as const

  export type MenuItemsDTOProperties = keyof typeof MENU_ITEMS_PROPS_TO_IDS
  