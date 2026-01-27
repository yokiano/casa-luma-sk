export const SALARY_PAYMENTS_PROP_VALUES = {
}

export const SALARY_PAYMENTS_PROPS_TO_IDS = {
  "notes": "%40%7CnG",
  "baseSalaryThb": "Ch%3CJ",
  "paySlip": "RL%3C%5D",
  "paymentDate": "RRKi",
  "employee": "TS%3C%40",
  "advancesThb": "fA%3AV",
  "otAmountThb": "kmxK",
  "totalPaidThb": "ouAH",
  "deductionsThb": "vMss",
  "paymentTitle": "title"
} as const
export const SALARY_PAYMENTS_IDS_TO_PROPS = {
  "%40%7CnG": "notes",
  "Ch%3CJ": "baseSalaryThb",
  "RL%3C%5D": "paySlip",
  "RRKi": "paymentDate",
  "TS%3C%40": "employee",
  "fA%3AV": "advancesThb",
  "kmxK": "otAmountThb",
  "ouAH": "totalPaidThb",
  "vMss": "deductionsThb",
  "title": "paymentTitle"
} as const
export const SALARY_PAYMENTS_PROPS_TO_TYPES = {
  "notes": "rich_text",
  "baseSalaryThb": "number",
  "paySlip": "files",
  "paymentDate": "date",
  "employee": "relation",
  "advancesThb": "number",
  "otAmountThb": "number",
  "totalPaidThb": "number",
  "deductionsThb": "number",
  "paymentTitle": "title"
} as const

  export type SalaryPaymentsDTOProperties = keyof typeof SALARY_PAYMENTS_PROPS_TO_IDS
  