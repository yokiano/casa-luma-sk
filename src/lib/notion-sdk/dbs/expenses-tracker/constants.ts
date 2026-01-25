export const EXPENSES_TRACKER_PROP_VALUES = {
"category": [
  "Food & Groceries",
  "Maintenance",
  "Rent",
  "Entertainment",
  "Physical Product",
  "Consumable Product",
  "Salary",
  "Miscellaneous",
  "bills",
  "Legal",
  "Owners Related",
  "Marketing"
] as const,
"paymentMethod": [
  "Cash",
  "Wire Transfer",
  "Scan",
  "Credit Card"
] as const,
"department": [
  "General",
  "Open Play",
  "Cafe",
  "garden",
  "Shop",
  "Owners"
] as const,
"status": [
  "To Pay",
  "Refunded",
  "Paid",
  "Reconciled"
] as const,
"paidBy": [
  "Yarden",
  "Roza",
  "Karni",
  "Ohad",
  "Company"
] as const,
}

export const EXPENSES_TRACKER_PROPS_TO_IDS = {
  "category": "%3F%40%3FW",
  "paymentMethod": "EZCK",
  "team": "QHWE",
  "date": "UKHL",
  "department": "%5Efar",
  "procurementItem": "hfQc",
  "inFavorOf": "jfMg",
  "status": "sSzY",
  "paidBy": "v%5EhZ",
  "amountThb": "xthe",
  "supplier": "%7C%5DZy",
  "invoiceReceipt": "~Rsq",
  "expense": "title",
  "referenceNumber": "Wx_e",
  "createdBy": "DSA_",
  "lastEditedBy": "LP%7C%5B",
  "lastEditedTime": "QLfy",
  "createdTime": "%7Bguj"
} as const
export const EXPENSES_TRACKER_IDS_TO_PROPS = {
  "%3F%40%3FW": "category",
  "EZCK": "paymentMethod",
  "QHWE": "team",
  "UKHL": "date",
  "%5Efar": "department",
  "hfQc": "procurementItem",
  "jfMg": "inFavorOf",
  "sSzY": "status",
  "v%5EhZ": "paidBy",
  "xthe": "amountThb",
  "%7C%5DZy": "supplier",
  "~Rsq": "invoiceReceipt",
  "title": "expense",
  "Wx_e": "referenceNumber",
  "DSA_": "createdBy",
  "LP%7C%5B": "lastEditedBy",
  "QLfy": "lastEditedTime",
  "%7Bguj": "createdTime"
} as const
export const EXPENSES_TRACKER_PROPS_TO_TYPES = {
  "category": "select",
  "paymentMethod": "select",
  "team": "formula",
  "date": "date",
  "department": "select",
  "procurementItem": "relation",
  "inFavorOf": "people",
  "status": "status",
  "paidBy": "select",
  "amountThb": "number",
  "supplier": "relation",
  "invoiceReceipt": "files",
  "expense": "title",
  "referenceNumber": "rich_text",
  "createdBy": "created_by",
  "lastEditedBy": "last_edited_by",
  "lastEditedTime": "last_edited_time",
  "createdTime": "created_time"
} as const

  export type ExpensesTrackerDTOProperties = keyof typeof EXPENSES_TRACKER_PROPS_TO_IDS
  