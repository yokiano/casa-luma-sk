export const SIGNAGE_PROP_VALUES = {
"location": [
  "Toilet",
  "Entrance",
  "Parking",
  "Cafe",
  "Play Area",
  "Notice Board"
] as const,
"type": [
  "Instruction",
  "Warning",
  "Information",
  "Schedule",
  "Marking",
  "Functional"
] as const,
"status": [
  "Idea",
  "Printed",
  "Installed",
  "Draft",
  "Ready to Print"
] as const,
}

export const SIGNAGE_PROPS_TO_IDS = {
  "location": "%40Gj%7C",
  "type": "%40WZI",
  "copy": "CsT%5C",
  "signId": "Q%3FI%5D",
  "status": "U%3A%3F%3A",
  "name": "title",
  "linkToFile": "vWoE"
} as const
export const SIGNAGE_IDS_TO_PROPS = {
  "%40Gj%7C": "location",
  "%40WZI": "type",
  "CsT%5C": "copy",
  "Q%3FI%5D": "signId",
  "U%3A%3F%3A": "status",
  "title": "name",
  "vWoE": "linkToFile"
} as const
export const SIGNAGE_PROPS_TO_TYPES = {
  "location": "select",
  "type": "select",
  "copy": "rich_text",
  "signId": "rich_text",
  "status": "status",
  "name": "title",
  "linkToFile": "rich_text"
} as const

  export type SignageDTOProperties = keyof typeof SIGNAGE_PROPS_TO_IDS
  