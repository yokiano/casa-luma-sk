export const SHIFTS_PROP_VALUES = {
"type": [
  "Opening (08:00 - 16:00)",
  "Closing (11:00 - 19:00)",
  "Mid-Day",
  "Custom"
] as const,
"status": [
  "Planned",
  "Confirmed",
  "Completed",
  "Cancelled"
] as const,
}

export const SHIFTS_PROPS_TO_IDS = {
  "employee": "%40QLu",
  "type": "L%60OW",
  "status": "VPhk",
  "shiftTime": "YKt%5C",
  "role": "mbpd",
  "shiftNote": "title"
} as const
export const SHIFTS_IDS_TO_PROPS = {
  "%40QLu": "employee",
  "L%60OW": "type",
  "VPhk": "status",
  "YKt%5C": "shiftTime",
  "mbpd": "role",
  "title": "shiftNote"
} as const
export const SHIFTS_PROPS_TO_TYPES = {
  "employee": "relation",
  "type": "select",
  "status": "status",
  "shiftTime": "date",
  "role": "relation",
  "shiftNote": "title"
} as const

  export type ShiftsDTOProperties = keyof typeof SHIFTS_PROPS_TO_IDS
  