export const FAMILIES_PROP_VALUES = {
"status": [
  "Active",
  "Inactive"
] as const,
"dietaryPreferenceFamily": [
  "None",
  "Vegetarian",
  "Vegan",
  "Gluten Free",
  "Other"
] as const,
"howDidYouHearAboutUs": [
  "Instagram",
  "Facebook",
  "Google",
  "Friend",
  "Walk-in",
  "Other"
] as const,
}

export const FAMILIES_PROPS_TO_IDS = {
  "mainEmail": "AA%5B%5B",
  "livesInKohPhangan": "Ai%5Cc",
  "loyverseCustomerId": "LgsR",
  "status": "LiO%5D",
  "nationality": "R%5BPE",
  "members": "SC%3FD",
  "mainPhone": "e%3Faj",
  "specialNotes": "e~QZ",
  "dietaryPreferenceFamily": "klPk",
  "howDidYouHearAboutUs": "mKsK",
  "familyName": "title"
} as const
export const FAMILIES_IDS_TO_PROPS = {
  "AA%5B%5B": "mainEmail",
  "Ai%5Cc": "livesInKohPhangan",
  "LgsR": "loyverseCustomerId",
  "LiO%5D": "status",
  "R%5BPE": "nationality",
  "SC%3FD": "members",
  "e%3Faj": "mainPhone",
  "e~QZ": "specialNotes",
  "klPk": "dietaryPreferenceFamily",
  "mKsK": "howDidYouHearAboutUs",
  "title": "familyName"
} as const
export const FAMILIES_PROPS_TO_TYPES = {
  "mainEmail": "email",
  "livesInKohPhangan": "checkbox",
  "loyverseCustomerId": "rich_text",
  "status": "select",
  "nationality": "rich_text",
  "members": "relation",
  "mainPhone": "phone_number",
  "specialNotes": "rich_text",
  "dietaryPreferenceFamily": "select",
  "howDidYouHearAboutUs": "select",
  "familyName": "title"
} as const

  export type FamiliesDTOProperties = keyof typeof FAMILIES_PROPS_TO_IDS
  