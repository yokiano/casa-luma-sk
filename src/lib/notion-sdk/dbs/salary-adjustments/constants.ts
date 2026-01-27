export const SALARY_ADJUSTMENTS_PROP_VALUES = {
"adjustmentType": [
  "Advance",
  "Deduction",
  "Bonus",
  "Reimbursement",
  "Loan Repayment",
  "Late Penalty"
] as const,
"approvedBy": [
  "Yarden",
  "Ohad",
  "Karni",
  "Roza"
] as const,
}

export const SALARY_ADJUSTMENTS_PROPS_TO_IDS = {
  "adjustmentType": "CVGT",
  "employee": "FmEN",
  "appliedToPayment": "T%5D%40%5E",
  "notes": "a%3A%3Ag",
  "approvedBy": "c%5DuU",
  "date": "vNz%40",
  "amountThb": "y~eP",
  "adjustmentTitle": "title"
} as const
export const SALARY_ADJUSTMENTS_IDS_TO_PROPS = {
  "CVGT": "adjustmentType",
  "FmEN": "employee",
  "T%5D%40%5E": "appliedToPayment",
  "a%3A%3Ag": "notes",
  "c%5DuU": "approvedBy",
  "vNz%40": "date",
  "y~eP": "amountThb",
  "title": "adjustmentTitle"
} as const
export const SALARY_ADJUSTMENTS_PROPS_TO_TYPES = {
  "adjustmentType": "select",
  "employee": "relation",
  "appliedToPayment": "relation",
  "notes": "rich_text",
  "approvedBy": "select",
  "date": "date",
  "amountThb": "number",
  "adjustmentTitle": "title"
} as const

  export type SalaryAdjustmentsDTOProperties = keyof typeof SALARY_ADJUSTMENTS_PROPS_TO_IDS
  