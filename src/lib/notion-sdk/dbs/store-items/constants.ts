export const STORE_ITEMS_PROP_VALUES = {
"category": [
  "(store) All"
] as const,
}

export const STORE_ITEMS_PROPS_TO_IDS = {
  "procurementItem": "CLP%7D",
  "category": "MS%5D%40",
  "supplier": "YmWi",
  "price": "ZSf%3A",
  "loyverseId": "%5CBvy",
  "stock": "aG%5CY",
  "expiryDate": "cZg%5C",
  "cogs": "e%3C%3F%60",
  "image": "eGda",
  "description": "ia%7B%3D",
  "name": "title",
  "createdTime": "%3CHjX",
  "lastEditedBy": "rkXV",
  "createdBy": "s%3DfK",
  "lastEditedTime": "tT%60E"
} as const
export const STORE_ITEMS_IDS_TO_PROPS = {
  "CLP%7D": "procurementItem",
  "MS%5D%40": "category",
  "YmWi": "supplier",
  "ZSf%3A": "price",
  "%5CBvy": "loyverseId",
  "aG%5CY": "stock",
  "cZg%5C": "expiryDate",
  "e%3C%3F%60": "cogs",
  "eGda": "image",
  "ia%7B%3D": "description",
  "title": "name",
  "%3CHjX": "createdTime",
  "rkXV": "lastEditedBy",
  "s%3DfK": "createdBy",
  "tT%60E": "lastEditedTime"
} as const
export const STORE_ITEMS_PROPS_TO_TYPES = {
  "procurementItem": "relation",
  "category": "select",
  "supplier": "relation",
  "price": "number",
  "loyverseId": "rich_text",
  "stock": "number",
  "expiryDate": "date",
  "cogs": "number",
  "image": "files",
  "description": "rich_text",
  "name": "title",
  "createdTime": "created_time",
  "lastEditedBy": "last_edited_by",
  "createdBy": "created_by",
  "lastEditedTime": "last_edited_time"
} as const

  export type StoreItemsDTOProperties = keyof typeof STORE_ITEMS_PROPS_TO_IDS
  