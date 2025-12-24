export const TEAM_CALENDAR_PROP_VALUES = {
}

export const TEAM_CALENDAR_PROPS_TO_IDS = {
  "date": "%3Bxs%5D",
  "description": "MzYJ",
  "eventName": "title"
} as const
export const TEAM_CALENDAR_IDS_TO_PROPS = {
  "%3Bxs%5D": "date",
  "MzYJ": "description",
  "title": "eventName"
} as const
export const TEAM_CALENDAR_PROPS_TO_TYPES = {
  "date": "date",
  "description": "rich_text",
  "eventName": "title"
} as const

  export type TeamCalendarDTOProperties = keyof typeof TEAM_CALENDAR_PROPS_TO_IDS
  