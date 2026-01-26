export const SUPPLIERS_PROP_VALUES = {
"category": [
  "Food",
  "Furniture",
  "Equipment",
  "Service",
  "Legal",
  "Maintenance"
] as const,
}

export const SUPPLIERS_PROPS_TO_IDS = {
  "website": "D%3CzK",
  "location": "L%5D%3An",
  "phone": "W%3Fxz",
  "bankDetails": "%5EK%7DY",
  "category": "caqu",
  "contactPerson": "u%3FeQ",
  "scanPicture": "zTr_",
  "email": "zjGR",
  "name": "title"
} as const
export const SUPPLIERS_IDS_TO_PROPS = {
  "D%3CzK": "website",
  "L%5D%3An": "location",
  "W%3Fxz": "phone",
  "%5EK%7DY": "bankDetails",
  "caqu": "category",
  "u%3FeQ": "contactPerson",
  "zTr_": "scanPicture",
  "zjGR": "email",
  "title": "name"
} as const
export const SUPPLIERS_PROPS_TO_TYPES = {
  "website": "url",
  "location": "rich_text",
  "phone": "phone_number",
  "bankDetails": "rich_text",
  "category": "multi_select",
  "contactPerson": "rich_text",
  "scanPicture": "files",
  "email": "email",
  "name": "title"
} as const

  export type SuppliersDTOProperties = keyof typeof SUPPLIERS_PROPS_TO_IDS
  