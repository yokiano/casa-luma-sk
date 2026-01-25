export const END_OF_SHIFT_REPORTS_PROP_VALUES = {
}

export const END_OF_SHIFT_REPORTS_PROPS_TO_IDS = {
  "cardPayments": "%3ESv%3C",
  "notes": "%3Fe%7BI",
  "expectedCash": "R%5C%40S",
  "closedBy": "a_n%5C",
  "posSummary": "cI%5BI",
  "scanPayments": "p%5D%3FJ",
  "date": "yO%5Dn",
  "shiftDate": "title",
  "actualCash_1": "%3FaIt",
  "cashDifference_1": "BQkU",
  "bill_1000Baht_1": "BVMr",
  "coin_1Baht_1": "Ot%3B%60",
  "bill_500Baht_1": "SplK",
  "bill_20Baht_1": "UTe%5C",
  "bill_50Baht_1": "X%7Dqu",
  "coin_10Baht_1": "_DQQ",
  "coin_5Baht_1": "bsSd",
  "bill_100Baht_1": "fUnb",
  "coin_2Baht_1": "smDb",
  "allIncome": "%3DHVV"
} as const
export const END_OF_SHIFT_REPORTS_IDS_TO_PROPS = {
  "%3ESv%3C": "cardPayments",
  "%3Fe%7BI": "notes",
  "R%5C%40S": "expectedCash",
  "a_n%5C": "closedBy",
  "cI%5BI": "posSummary",
  "p%5D%3FJ": "scanPayments",
  "yO%5Dn": "date",
  "title": "shiftDate",
  "%3FaIt": "actualCash_1",
  "BQkU": "cashDifference_1",
  "BVMr": "bill_1000Baht_1",
  "Ot%3B%60": "coin_1Baht_1",
  "SplK": "bill_500Baht_1",
  "UTe%5C": "bill_20Baht_1",
  "X%7Dqu": "bill_50Baht_1",
  "_DQQ": "coin_10Baht_1",
  "bsSd": "coin_5Baht_1",
  "fUnb": "bill_100Baht_1",
  "smDb": "coin_2Baht_1",
  "%3DHVV": "allIncome"
} as const
export const END_OF_SHIFT_REPORTS_PROPS_TO_TYPES = {
  "cardPayments": "number",
  "notes": "rich_text",
  "expectedCash": "number",
  "closedBy": "people",
  "posSummary": "files",
  "scanPayments": "number",
  "date": "date",
  "shiftDate": "title",
  "actualCash_1": "formula",
  "cashDifference_1": "formula",
  "bill_1000Baht_1": "number",
  "coin_1Baht_1": "number",
  "bill_500Baht_1": "number",
  "bill_20Baht_1": "number",
  "bill_50Baht_1": "number",
  "coin_10Baht_1": "number",
  "coin_5Baht_1": "number",
  "bill_100Baht_1": "number",
  "coin_2Baht_1": "number",
  "allIncome": "formula"
} as const

  export type EndOfShiftReportsDTOProperties = keyof typeof END_OF_SHIFT_REPORTS_PROPS_TO_IDS
  