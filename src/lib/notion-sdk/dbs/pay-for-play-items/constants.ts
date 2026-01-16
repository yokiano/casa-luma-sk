export const PAY_FOR_PLAY_ITEMS_PROP_VALUES = {
"category": [
  "Toys",
  "Merchandise",
  "(p4p) Lego Figurine",
  "(p4p) Art Equipment"
] as const,
}

export const PAY_FOR_PLAY_ITEMS_PROPS_TO_IDS = {
  "stock": "%3Bh~%60",
  "price": "KX%5CR",
  "category": "%5EF%60d",
  "cogs": "bZUB",
  "description": "dN%3DU",
  "supplier": "m%3CbL",
  "image": "yBrb",
  "name": "title",
  "loyverseId": "%3ByPL",
  "procurementItem": "K%3DPZ",
  "purchaseLink": "DR%5CB",
  "createdTime": "LK%3EH",
  "lastEditedTime": "bH%3E~",
  "lastEditedBy": "gZPb",
  "createdBy": "zkV%7C"
} as const
export const PAY_FOR_PLAY_ITEMS_IDS_TO_PROPS = {
  "%3Bh~%60": "stock",
  "KX%5CR": "price",
  "%5EF%60d": "category",
  "bZUB": "cogs",
  "dN%3DU": "description",
  "m%3CbL": "supplier",
  "yBrb": "image",
  "title": "name",
  "%3ByPL": "loyverseId",
  "K%3DPZ": "procurementItem",
  "DR%5CB": "purchaseLink",
  "LK%3EH": "createdTime",
  "bH%3E~": "lastEditedTime",
  "gZPb": "lastEditedBy",
  "zkV%7C": "createdBy"
} as const
export const PAY_FOR_PLAY_ITEMS_PROPS_TO_TYPES = {
  "stock": "number",
  "price": "number",
  "category": "select",
  "cogs": "number",
  "description": "rich_text",
  "supplier": "relation",
  "image": "files",
  "name": "title",
  "loyverseId": "rich_text",
  "procurementItem": "relation",
  "purchaseLink": "url",
  "createdTime": "created_time",
  "lastEditedTime": "last_edited_time",
  "lastEditedBy": "last_edited_by",
  "createdBy": "created_by"
} as const

  export type PayForPlayItemsDTOProperties = keyof typeof PAY_FOR_PLAY_ITEMS_PROPS_TO_IDS
  