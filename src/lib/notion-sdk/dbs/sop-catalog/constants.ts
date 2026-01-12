export const SOP_CATALOG_PROP_VALUES = {
"when": [
  "Opening",
  "Closing",
  "During shift",
  "Daily",
  "Weekly",
  "Monthly",
  "As needed",
  "Employee Onboarding"
] as const,
"status": [
  "Not started",
  "In progress",
  "Done"
] as const,
"sopType": [
  "Checklist",
  "How-to",
  "Policy / management procedure",
  "Training / onboarding"
] as const,
"department": [
  "Open Play",
  "Restaurant",
  "Management",
  "General"
] as const,
}

export const SOP_CATALOG_PROPS_TO_IDS = {
  "role": "%40pJj",
  "when": "JsMl",
  "status": "%5D%40Pq",
  "sopType": "pf%60b",
  "department": "ybjG",
  "name": "title"
} as const
export const SOP_CATALOG_IDS_TO_PROPS = {
  "%40pJj": "role",
  "JsMl": "when",
  "%5D%40Pq": "status",
  "pf%60b": "sopType",
  "ybjG": "department",
  "title": "name"
} as const
export const SOP_CATALOG_PROPS_TO_TYPES = {
  "role": "relation",
  "when": "select",
  "status": "status",
  "sopType": "select",
  "department": "select",
  "name": "title"
} as const

  export type SopCatalogDTOProperties = keyof typeof SOP_CATALOG_PROPS_TO_IDS
  