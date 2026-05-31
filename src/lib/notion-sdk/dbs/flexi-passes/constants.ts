export const FLEXI_PASSES_PROP_VALUES = {
"automationStatus": [
  "Active",
  "Refunded",
  "Manual Review"
] as const,
}

export const FLEXI_PASSES_PROPS_TO_IDS = {
  "sourceReceiptKey": "%3A%3CsL",
  "entriesGranted": "%3BTRk",
  "sourceItemIds": "Adwh",
  "loyverseCustomerId": "C_jo",
  "sourceLineIndexes": "EKnt",
  "notes": "PTUE",
  "family": "RPwP",
  "entriesLeft": "RXPv",
  "validFrom": "S%7CrF",
  "sourceReceiptUrl": "ZNOW",
  "sourceReceiptNumber": "ZR%60%7B",
  "cardCount": "aSvg",
  "refundReceiptNumber": "peHm",
  "entriesUsed": "zT%3By",
  "validUntil": "zXVG",
  "automationStatus": "z%7Cw%5B",
  "name": "title"
} as const
export const FLEXI_PASSES_IDS_TO_PROPS = {
  "%3A%3CsL": "sourceReceiptKey",
  "%3BTRk": "entriesGranted",
  "Adwh": "sourceItemIds",
  "C_jo": "loyverseCustomerId",
  "EKnt": "sourceLineIndexes",
  "PTUE": "notes",
  "RPwP": "family",
  "RXPv": "entriesLeft",
  "S%7CrF": "validFrom",
  "ZNOW": "sourceReceiptUrl",
  "ZR%60%7B": "sourceReceiptNumber",
  "aSvg": "cardCount",
  "peHm": "refundReceiptNumber",
  "zT%3By": "entriesUsed",
  "zXVG": "validUntil",
  "z%7Cw%5B": "automationStatus",
  "title": "name"
} as const
export const FLEXI_PASSES_PROPS_TO_TYPES = {
  "sourceReceiptKey": "rich_text",
  "entriesGranted": "number",
  "sourceItemIds": "rich_text",
  "loyverseCustomerId": "rich_text",
  "sourceLineIndexes": "rich_text",
  "notes": "rich_text",
  "family": "relation",
  "entriesLeft": "number",
  "validFrom": "date",
  "sourceReceiptUrl": "url",
  "sourceReceiptNumber": "rich_text",
  "cardCount": "number",
  "refundReceiptNumber": "rich_text",
  "entriesUsed": "number",
  "validUntil": "date",
  "automationStatus": "select",
  "name": "title"
} as const

  export type FlexiPassesDTOProperties = keyof typeof FLEXI_PASSES_PROPS_TO_IDS
  