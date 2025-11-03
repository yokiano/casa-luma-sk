export const CASA_LUMA_RSV_PS_PROP_VALUES = {
"dietaryRestrictions": [] as const,
"source": [
  "Website",
  "Instagram",
  "Friend",
  "Other"
] as const,
"status": [
  "Confirmed",
  "Waitlist",
  "Cancelled",
  "No-show"
] as const,
"paymentStatus": [
  "Pending",
  "Paid",
  "Refunded",
  "N/A"
] as const,
}

export const CASA_LUMA_RSV_PS_PROPS_TO_IDS = {
  "notes": "%3DQSs",
  "dietaryRestrictions": "%3DsE%5B",
  "source": "D_%5D%3E",
  "confirmedAt": "F%5EiO",
  "numberOfGuests": "LNBq",
  "status": "MZRS",
  "phone": "PnW%40",
  "event": "_LMp",
  "email": "%60%5BuY",
  "checkInStatus": "cFDH",
  "guestName": "fI%40f",
  "internalNotes": "wKeg",
  "paymentStatus": "wxji",
  "rsvpId": "title",
  "createdAt": "kjlj"
} as const
export const CASA_LUMA_RSV_PS_IDS_TO_PROPS = {
  "%3DQSs": "notes",
  "%3DsE%5B": "dietaryRestrictions",
  "D_%5D%3E": "source",
  "F%5EiO": "confirmedAt",
  "LNBq": "numberOfGuests",
  "MZRS": "status",
  "PnW%40": "phone",
  "_LMp": "event",
  "%60%5BuY": "email",
  "cFDH": "checkInStatus",
  "fI%40f": "guestName",
  "wKeg": "internalNotes",
  "wxji": "paymentStatus",
  "title": "rsvpId",
  "kjlj": "createdAt"
} as const
export const CASA_LUMA_RSV_PS_PROPS_TO_TYPES = {
  "notes": "rich_text",
  "dietaryRestrictions": "multi_select",
  "source": "select",
  "confirmedAt": "date",
  "numberOfGuests": "number",
  "status": "select",
  "phone": "phone_number",
  "event": "relation",
  "email": "email",
  "checkInStatus": "checkbox",
  "guestName": "rich_text",
  "internalNotes": "rich_text",
  "paymentStatus": "select",
  "rsvpId": "title",
  "createdAt": "created_time"
} as const

  export type CasaLumaRsvPsDTOProperties = keyof typeof CASA_LUMA_RSV_PS_PROPS_TO_IDS
  