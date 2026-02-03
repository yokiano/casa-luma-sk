export const EXPENSE_SCAN_RULES_PROP_VALUES = {
}

export const EXPENSE_SCAN_RULES_PROPS_TO_IDS = {
  "categoryName": "%3C%3AwL",
  "autoSupplier": "edis",
  "departmentName": "~NEX",
  "recipientMatch": "title"
} as const
export const EXPENSE_SCAN_RULES_IDS_TO_PROPS = {
  "%3C%3AwL": "categoryName",
  "edis": "autoSupplier",
  "~NEX": "departmentName",
  "title": "recipientMatch"
} as const
export const EXPENSE_SCAN_RULES_PROPS_TO_TYPES = {
  "categoryName": "rich_text",
  "autoSupplier": "relation",
  "departmentName": "rich_text",
  "recipientMatch": "title"
} as const

  export type ExpenseScanRulesDTOProperties = keyof typeof EXPENSE_SCAN_RULES_PROPS_TO_IDS
  