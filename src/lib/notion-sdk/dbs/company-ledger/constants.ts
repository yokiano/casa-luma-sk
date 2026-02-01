export const COMPANY_LEDGER_PROP_VALUES = {
"type": [
  "Income",
  "Expense",
  "Owner Draw",
  "Owner Contribution",
  "Dividend"
] as const,
"status": [
  "Pending",
  "Paid",
  "Received",
  "Reconciled"
] as const,
"department": [
  "General",
  "Open Play",
  "Cafe",
  "Garden",
  "Store",
  "Management"
] as const,
"owner": [
  "Yarden",
  "Ohad",
  "Kwan",
  "N/A"
] as const,
"paymentMethod": [
  "Cash",
  "Wire Transfer",
  "Scan",
  "Credit Card"
] as const,
"category": [
  "Revenue",
  "Salary",
  "Owner Capital",
  "Legal",
  "Bills",
  "Rent",
  "Food & Groceries",
  "Staff Food",
  "Consumable Product",
  "Physical Product",
  "Maintenance",
  "Entertainment",
  "Miscellaneous",
  "Marketing"
] as const,
"bankAccount": [
  "KBank",
  "SCB",
  "Cash Register",
  "Petty Cash"
] as const,
}

export const COMPANY_LEDGER_PROPS_TO_IDS = {
  "type": "%3EBPw",
  "amountThb": "Eq%3Ac",
  "notes": "EqO%3B",
  "date": "I%3C%3Fx",
  "supplier": "T%3CJ%3B",
  "status": "TPaD",
  "referenceNumber": "TY%3F%7C",
  "department": "g%40nv",
  "invoiceReceipt": "iRV%5B",
  "owner": "jw%3Am",
  "paymentMethod": "j%7BRr",
  "category": "k%5BLG",
  "bankAccount": "mH_w",
  "description": "title",
  "createdBy": "B%5B~A",
  "lastEditedTime": "%5E%3C%3El",
  "createdTime": "qdJT",
  "lastEditedBy": "%7CdIJ"
} as const
export const COMPANY_LEDGER_IDS_TO_PROPS = {
  "%3EBPw": "type",
  "Eq%3Ac": "amountThb",
  "EqO%3B": "notes",
  "I%3C%3Fx": "date",
  "T%3CJ%3B": "supplier",
  "TPaD": "status",
  "TY%3F%7C": "referenceNumber",
  "g%40nv": "department",
  "iRV%5B": "invoiceReceipt",
  "jw%3Am": "owner",
  "j%7BRr": "paymentMethod",
  "k%5BLG": "category",
  "mH_w": "bankAccount",
  "title": "description",
  "B%5B~A": "createdBy",
  "%5E%3C%3El": "lastEditedTime",
  "qdJT": "createdTime",
  "%7CdIJ": "lastEditedBy"
} as const
export const COMPANY_LEDGER_PROPS_TO_TYPES = {
  "type": "select",
  "amountThb": "number",
  "notes": "rich_text",
  "date": "date",
  "supplier": "relation",
  "status": "status",
  "referenceNumber": "rich_text",
  "department": "select",
  "invoiceReceipt": "files",
  "owner": "select",
  "paymentMethod": "select",
  "category": "select",
  "bankAccount": "select",
  "description": "title",
  "createdBy": "created_by",
  "lastEditedTime": "last_edited_time",
  "createdTime": "created_time",
  "lastEditedBy": "last_edited_by"
} as const

  export type CompanyLedgerDTOProperties = keyof typeof COMPANY_LEDGER_PROPS_TO_IDS
  