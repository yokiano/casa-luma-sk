export const CASA_LUMA_WAITLIST_PROP_VALUES = {
}

export const CASA_LUMA_WAITLIST_PROPS_TO_IDS = {
  "convertedToRsvp": "%3BQKj",
  "phone": "IObD",
  "event": "h%3D%5Df",
  "notified": "i%5C%3EY",
  "guestName": "tJ%7BV",
  "email": "y%3BE%3A",
  "waitlistId": "title",
  "addedAt": "MPcT"
} as const
export const CASA_LUMA_WAITLIST_IDS_TO_PROPS = {
  "%3BQKj": "convertedToRsvp",
  "IObD": "phone",
  "h%3D%5Df": "event",
  "i%5C%3EY": "notified",
  "tJ%7BV": "guestName",
  "y%3BE%3A": "email",
  "title": "waitlistId",
  "MPcT": "addedAt"
} as const
export const CASA_LUMA_WAITLIST_PROPS_TO_TYPES = {
  "convertedToRsvp": "relation",
  "phone": "phone_number",
  "event": "relation",
  "notified": "checkbox",
  "guestName": "rich_text",
  "email": "email",
  "waitlistId": "title",
  "addedAt": "created_time"
} as const

  export type CasaLumaWaitlistDTOProperties = keyof typeof CASA_LUMA_WAITLIST_PROPS_TO_IDS
  