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
  "Appetizer",
  "Main Course",
  "Dessert",
  "Beverage",
  "Breakfast",
  "Lunch",
  "Dinner",
  "Sides"
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
  "loyverseId": "%5B%3DN%3E"
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
  "%5B%3DN%3E": "loyverseId"
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
  "loyverseId": "rich_text"
} as const

  export type MenuItemsDTOProperties = keyof typeof MENU_ITEMS_PROPS_TO_IDS
  