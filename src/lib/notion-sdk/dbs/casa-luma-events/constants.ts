export const CASA_LUMA_EVENTS_PROP_VALUES = {
"status": [
  "Draft",
  "Published",
  "Full",
  "Cancelled",
  "Completed"
] as const,
"language": [
  "Spanish",
  "English",
  "Both"
] as const,
"registrationStatus": [
  "Open",
  "Closed",
  "Waitlist"
] as const,
"recurrenceType": [
  "One-time",
  "Daily",
  "Weekly",
  "Bi-weekly",
  "Monthly"
] as const,
"location": [
  "Main Hall",
  "Garden",
  "Studio A",
  "Studio B",
  "Online"
] as const,
"eventType": [
  "Workshop",
  "Retreat",
  "Yoga Class",
  "Art Session",
  "Other"
] as const,
"tags": [
  "Meditation",
  "Yoga",
  "Art",
  "Music"
] as const,
}

export const CASA_LUMA_EVENTS_PROPS_TO_IDS = {
  "status": "%3AJCP",
  "price": "%3B%3ERu",
  "waitlistEntries": "%3CRm%3B",
  "shortDescription": "%3E%5CgQ",
  "language": "A%5CK%3C",
  "availableSpots": "KZUb",
  "gallery": "PU_Q",
  "description": "RgFs",
  "featuredImage": "SH%60R",
  "slug": "TNDu",
  "requirements": "%5EYVv",
  "registrationStatus": "cHDA",
  "recurrenceType": "eae%7C",
  "capacity": "gmnU",
  "date": "kLjM",
  "endDate": "qC%3B%60",
  "rsvPs": "wMP%40",
  "location": "x%5Dcl",
  "instructor": "yevg",
  "eventType": "z%3AD_",
  "tags": "%7D%7Ch%3F",
  "eventName": "title",
  "created": "XyyG",
  "updated": "YlCE"
} as const
export const CASA_LUMA_EVENTS_IDS_TO_PROPS = {
  "%3AJCP": "status",
  "%3B%3ERu": "price",
  "%3CRm%3B": "waitlistEntries",
  "%3E%5CgQ": "shortDescription",
  "A%5CK%3C": "language",
  "KZUb": "availableSpots",
  "PU_Q": "gallery",
  "RgFs": "description",
  "SH%60R": "featuredImage",
  "TNDu": "slug",
  "%5EYVv": "requirements",
  "cHDA": "registrationStatus",
  "eae%7C": "recurrenceType",
  "gmnU": "capacity",
  "kLjM": "date",
  "qC%3B%60": "endDate",
  "wMP%40": "rsvPs",
  "x%5Dcl": "location",
  "yevg": "instructor",
  "z%3AD_": "eventType",
  "%7D%7Ch%3F": "tags",
  "title": "eventName",
  "XyyG": "created",
  "YlCE": "updated"
} as const
export const CASA_LUMA_EVENTS_PROPS_TO_TYPES = {
  "status": "select",
  "price": "number",
  "waitlistEntries": "relation",
  "shortDescription": "rich_text",
  "language": "select",
  "availableSpots": "formula",
  "gallery": "files",
  "description": "rich_text",
  "featuredImage": "files",
  "slug": "formula",
  "requirements": "rich_text",
  "registrationStatus": "select",
  "recurrenceType": "select",
  "capacity": "number",
  "date": "date",
  "endDate": "date",
  "rsvPs": "relation",
  "location": "select",
  "instructor": "people",
  "eventType": "select",
  "tags": "multi_select",
  "eventName": "title",
  "created": "created_time",
  "updated": "last_edited_time"
} as const

  export type CasaLumaEventsDTOProperties = keyof typeof CASA_LUMA_EVENTS_PROPS_TO_IDS
  