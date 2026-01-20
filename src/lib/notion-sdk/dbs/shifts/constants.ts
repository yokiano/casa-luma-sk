export const SHIFTS_PROP_VALUES = {
"type": [
  "Opening (08:30 - 17:00)",
  "Closing (10:30 - 19:00)",
  "Custom"
] as const,
"status": [
  "Planned",
  "Confirmed",
  "Sick Day",
  "Completed",
  "Cancelled"
] as const,
"otApprover": [
  "Roza",
  "Karni",
  "Ohad",
  "Yarden"
] as const,
}

export const SHIFTS_PROPS_TO_IDS = {
  "employee": "%40QLu",
  "type": "L%60OW",
  "status": "VPhk",
  "shiftTime": "YKt%5C",
  "role": "mbpd",
  "shiftNote": "title",
  "otApprover": "X%3FPo",
  "ot": "aT%5Bq"
} as const
export const SHIFTS_IDS_TO_PROPS = {
  "%40QLu": "employee",
  "L%60OW": "type",
  "VPhk": "status",
  "YKt%5C": "shiftTime",
  "mbpd": "role",
  "title": "shiftNote",
  "X%3FPo": "otApprover",
  "aT%5Bq": "ot"
} as const
export const SHIFTS_PROPS_TO_TYPES = {
  "employee": "relation",
  "type": "select",
  "status": "status",
  "shiftTime": "date",
  "role": "relation",
  "shiftNote": "title",
  "otApprover": "multi_select",
  "ot": "number"
} as const

  export type ShiftsDTOProperties = keyof typeof SHIFTS_PROPS_TO_IDS
  