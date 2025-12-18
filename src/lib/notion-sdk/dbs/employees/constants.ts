export const EMPLOYEES_PROP_VALUES = {
"languages": [
  "English",
  "Myanmar",
  "Thai",
  "English Little Bit"
] as const,
"employmentType": [
  "Full-time",
  "Part-time",
  "Contract",
  "Temporary",
  "Seasonal",
  "Freelance"
] as const,
"department": [
  "Maintenance",
  "Café",
  "Open Play",
  "Marketing",
  "Management"
] as const,
"nationality": [
  "Burmese",
  "Thai"
] as const,
"paymentFrequency": [
  "Monthly",
  "Bi-weekly",
  "Weekly",
  "Daily",
  "Hourly"
] as const,
"position": [
  "Manager",
  "Cook",
  "Waiter",
  "PS",
  "Maintenance",
  "Barista"
] as const,
"employmentStatus": [
  "Onboarding",
  "Probation",
  "Active",
  "Resigned",
  "Terminated",
  "Contract Ended"
] as const,
}

export const EMPLOYEES_PROPS_TO_IDS = {
  "visaExpiry": "%3CK%5BF",
  "workPermitExpiry": "%3D%3EfR",
  "photo": "%3FOvv",
  "salaryThb": "%3FdnC",
  "languages": "B%5C%7BK",
  "employmentType": "Bop%3E",
  "emergencyContact": "EIXp",
  "department": "HpjN",
  "endDate": "KpQj",
  "nationality": "MUL%3E",
  "whatsAppLine": "PPRm",
  "workPermitNumber": "QVjs",
  "email": "Xtg%3C",
  "paymentFrequency": "Z%60%60%5E",
  "skills": "crRF",
  "fullName": "dNc~",
  "documents": "deEH",
  "address": "dw%7Bq",
  "notes": "gdZF",
  "bankAccountDetails": "jNcC",
  "phone": "lJ%7CL",
  "position": "o%5DfK",
  "bio": "owDI",
  "hometown": "pi%5Dw",
  "emergencyPhone": "r%7BrR",
  "employmentStatus": "vCD%5E",
  "reportsTo": "wUr%5B",
  "startDate": "zLrJ",
  "nickname": "title"
} as const
export const EMPLOYEES_IDS_TO_PROPS = {
  "%3CK%5BF": "visaExpiry",
  "%3D%3EfR": "workPermitExpiry",
  "%3FOvv": "photo",
  "%3FdnC": "salaryThb",
  "B%5C%7BK": "languages",
  "Bop%3E": "employmentType",
  "EIXp": "emergencyContact",
  "HpjN": "department",
  "KpQj": "endDate",
  "MUL%3E": "nationality",
  "PPRm": "whatsAppLine",
  "QVjs": "workPermitNumber",
  "Xtg%3C": "email",
  "Z%60%60%5E": "paymentFrequency",
  "crRF": "skills",
  "dNc~": "fullName",
  "deEH": "documents",
  "dw%7Bq": "address",
  "gdZF": "notes",
  "jNcC": "bankAccountDetails",
  "lJ%7CL": "phone",
  "o%5DfK": "position",
  "owDI": "bio",
  "pi%5Dw": "hometown",
  "r%7BrR": "emergencyPhone",
  "vCD%5E": "employmentStatus",
  "wUr%5B": "reportsTo",
  "zLrJ": "startDate",
  "title": "nickname"
} as const
export const EMPLOYEES_PROPS_TO_TYPES = {
  "visaExpiry": "date",
  "workPermitExpiry": "date",
  "photo": "files",
  "salaryThb": "number",
  "languages": "multi_select",
  "employmentType": "select",
  "emergencyContact": "rich_text",
  "department": "select",
  "endDate": "date",
  "nationality": "select",
  "whatsAppLine": "rich_text",
  "workPermitNumber": "rich_text",
  "email": "email",
  "paymentFrequency": "select",
  "skills": "rich_text",
  "fullName": "rich_text",
  "documents": "files",
  "address": "rich_text",
  "notes": "rich_text",
  "bankAccountDetails": "rich_text",
  "phone": "phone_number",
  "position": "multi_select",
  "bio": "rich_text",
  "hometown": "rich_text",
  "emergencyPhone": "rich_text",
  "employmentStatus": "status",
  "reportsTo": "people",
  "startDate": "date",
  "nickname": "title"
} as const

  export type EmployeesDTOProperties = keyof typeof EMPLOYEES_PROPS_TO_IDS
  