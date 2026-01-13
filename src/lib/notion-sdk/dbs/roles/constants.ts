export const ROLES_PROP_VALUES = {
"department": [
  "Open Play",
  "Café",
  "Maintenance",
  "Management",
  "General"
] as const,
}

export const ROLES_PROPS_TO_IDS = {
  "employees": "HIEV",
  "active": "YFml",
  "requiredPerDay": "_YcL",
  "department": "dgcQ",
  "role": "title"
} as const
export const ROLES_IDS_TO_PROPS = {
  "HIEV": "employees",
  "YFml": "active",
  "_YcL": "requiredPerDay",
  "dgcQ": "department",
  "title": "role"
} as const
export const ROLES_PROPS_TO_TYPES = {
  "employees": "relation",
  "active": "checkbox",
  "requiredPerDay": "number",
  "department": "select",
  "role": "title"
} as const

  export type RolesDTOProperties = keyof typeof ROLES_PROPS_TO_IDS
  