export const WEBSITE_IMAGES_PROP_VALUES = {
"section": [
  "Home",
  "Workshops",
  "About",
  "Cafe",
  "Birthday",
  "Other"
] as const,
}

export const WEBSITE_IMAGES_PROPS_TO_IDS = {
  "section": "%3Bfir",
  "active": "Rjej",
  "altText": "VKLn",
  "image": "%5Bd%5C%5B",
  "name": "title",
  "slug": "C%7BuL"
} as const
export const WEBSITE_IMAGES_IDS_TO_PROPS = {
  "%3Bfir": "section",
  "Rjej": "active",
  "VKLn": "altText",
  "%5Bd%5C%5B": "image",
  "title": "name",
  "C%7BuL": "slug"
} as const
export const WEBSITE_IMAGES_PROPS_TO_TYPES = {
  "section": "select",
  "active": "checkbox",
  "altText": "rich_text",
  "image": "files",
  "name": "title",
  "slug": "rich_text"
} as const

  export type WebsiteImagesDTOProperties = keyof typeof WEBSITE_IMAGES_PROPS_TO_IDS
  