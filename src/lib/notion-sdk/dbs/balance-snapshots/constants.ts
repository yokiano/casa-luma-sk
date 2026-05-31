export const BALANCE_SNAPSHOTS_PROP_VALUES = {
"status": [
  "Draft",
  "Needs Review",
  "Accepted",
  "Superseded"
] as const,
"account": [
  "KBank",
  "SCB",
  "Safe / Cash on hand",
  "Scan/QR Clearing",
  "Credit Card Clearing"
] as const,
"snapshotRole": [
  "Observed",
  "Accepted Baseline"
] as const,
"source": [
  "KBiz Manual",
  "Bank Statement",
  "Cash Count",
  "Settlement Report",
  "Manual"
] as const,
}

export const BALANCE_SNAPSHOTS_PROPS_TO_IDS = {
  "status": "D%7Dok",
  "notes": "%5CR~f",
  "balanceThb": "hXKN",
  "observedAt": "iS%3D%7B",
  "account": "leRN",
  "proof": "w%3Ejf",
  "snapshotRole": "xmeg",
  "source": "%7BYc%7B",
  "name": "title"
} as const
export const BALANCE_SNAPSHOTS_IDS_TO_PROPS = {
  "D%7Dok": "status",
  "%5CR~f": "notes",
  "hXKN": "balanceThb",
  "iS%3D%7B": "observedAt",
  "leRN": "account",
  "w%3Ejf": "proof",
  "xmeg": "snapshotRole",
  "%7BYc%7B": "source",
  "title": "name"
} as const
export const BALANCE_SNAPSHOTS_PROPS_TO_TYPES = {
  "status": "status",
  "notes": "rich_text",
  "balanceThb": "number",
  "observedAt": "date",
  "account": "select",
  "proof": "files",
  "snapshotRole": "select",
  "source": "select",
  "name": "title"
} as const

  export type BalanceSnapshotsDTOProperties = keyof typeof BALANCE_SNAPSHOTS_PROPS_TO_IDS
  