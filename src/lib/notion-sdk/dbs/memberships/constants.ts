export const MEMBERSHIPS_PROP_VALUES = {
"type": [
  "Weekly",
  "Monthly"
] as const,
}

export const MEMBERSHIPS_PROPS_TO_IDS = {
  "type": "GY%3E%3F",
  "hasSiblingDiscount": "NbGe",
  "status": "%5CdlW",
  "family": "c%60rq",
  "startDate": "ev%5Et",
  "endDate": "iSVs",
  "numberOfKids": "kYoY",
  "notes": "%7Caqz",
  "name": "title"
} as const
export const MEMBERSHIPS_IDS_TO_PROPS = {
  "GY%3E%3F": "type",
  "NbGe": "hasSiblingDiscount",
  "%5CdlW": "status",
  "c%60rq": "family",
  "ev%5Et": "startDate",
  "iSVs": "endDate",
  "kYoY": "numberOfKids",
  "%7Caqz": "notes",
  "title": "name"
} as const
export const MEMBERSHIPS_PROPS_TO_TYPES = {
  "type": "select",
  "hasSiblingDiscount": "formula",
  "status": "formula",
  "family": "relation",
  "startDate": "date",
  "endDate": "date",
  "numberOfKids": "number",
  "notes": "rich_text",
  "name": "title"
} as const

  export type MembershipsDTOProperties = keyof typeof MEMBERSHIPS_PROPS_TO_IDS
  