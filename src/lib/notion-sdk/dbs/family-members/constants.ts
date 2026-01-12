export const FAMILY_MEMBERS_PROP_VALUES = {
"memberType": [
  "Kid",
  "Caregiver"
] as const,
"contactMethod": [
  "Thai Phone",
  "WhatsApp"
] as const,
"caregiverRole": [
  "Parent",
  "Caregiver"
] as const,
"gender": [
  "Boy",
  "Girl"
] as const,
}

export const FAMILY_MEMBERS_PROPS_TO_IDS = {
  "memberType": "%3BsKT",
  "contactMethod": "Lptv",
  "caregiverRole": "N%7CR%3C",
  "notes": "T%3AgX",
  "email": "TSd~",
  "dob": "YFwB",
  "gender": "g%60j%7D",
  "family": "qI%7Cv",
  "phone": "%7Djl%5C",
  "name": "title"
} as const
export const FAMILY_MEMBERS_IDS_TO_PROPS = {
  "%3BsKT": "memberType",
  "Lptv": "contactMethod",
  "N%7CR%3C": "caregiverRole",
  "T%3AgX": "notes",
  "TSd~": "email",
  "YFwB": "dob",
  "g%60j%7D": "gender",
  "qI%7Cv": "family",
  "%7Djl%5C": "phone",
  "title": "name"
} as const
export const FAMILY_MEMBERS_PROPS_TO_TYPES = {
  "memberType": "select",
  "contactMethod": "select",
  "caregiverRole": "select",
  "notes": "rich_text",
  "email": "email",
  "dob": "date",
  "gender": "select",
  "family": "relation",
  "phone": "phone_number",
  "name": "title"
} as const

  export type FamilyMembersDTOProperties = keyof typeof FAMILY_MEMBERS_PROPS_TO_IDS
  