export const JOB_OPENINGS_PROP_VALUES = {
"location": [
  "Remote",
  "Hybrid",
  "On-site",
  "Multiple Locations",
  "International",
  "Regional",
  "Headquarters"
] as const,
"department": [
  "Café",
  "Open Play",
  "Marketing",
  "Maintenance"
] as const,
"employmentType": [
  "Full-time",
  "Part-time",
  "Contract",
  "Internship",
  "Temporary",
  "Freelance",
  "Seasonal"
] as const,
"experienceLevel": [
  "Entry-level",
  "Junior",
  "Mid-level",
  "Senior",
  "Lead",
  "Manager",
  "Director",
  "Executive"
] as const,
"jobBoards": [
  "Facebook Groups",
  "Thai Job Board",
  "WhatsApp Groups",
  "JobsDB",
  "LINE Groups",
  "Local Classifieds",
  "Community Board",
  "Word of Mouth",
  "University Network"
] as const,
"requiredSkills": [
  "Project Management",
  "Leadership",
  "Problem Solving",
  "English",
  "Handyman"
] as const,
"status": [
  "Draft",
  "Open",
  "In Progress",
  "On Hold",
  "Filled",
  "Closed"
] as const,
}

export const JOB_OPENINGS_PROPS_TO_IDS = {
  "location": "%40DSX",
  "requirements": "DUmM",
  "department": "EnG%3F",
  "employmentType": "JfQ%3B",
  "experienceLevel": "SF%3FZ",
  "jobBoards": "Sbsi",
  "requiredSkills": "Vds%3A",
  "openPositions": "Y%3Cej",
  "expectedSalary": "%5Cjb%7D",
  "responsibilities": "anDd",
  "openingDate": "muO_",
  "status": "pUJ_",
  "jobTitle": "title",
  "jobPost": "Snli"
} as const
export const JOB_OPENINGS_IDS_TO_PROPS = {
  "%40DSX": "location",
  "DUmM": "requirements",
  "EnG%3F": "department",
  "JfQ%3B": "employmentType",
  "SF%3FZ": "experienceLevel",
  "Sbsi": "jobBoards",
  "Vds%3A": "requiredSkills",
  "Y%3Cej": "openPositions",
  "%5Cjb%7D": "expectedSalary",
  "anDd": "responsibilities",
  "muO_": "openingDate",
  "pUJ_": "status",
  "title": "jobTitle",
  "Snli": "jobPost"
} as const
export const JOB_OPENINGS_PROPS_TO_TYPES = {
  "location": "select",
  "requirements": "rich_text",
  "department": "select",
  "employmentType": "select",
  "experienceLevel": "select",
  "jobBoards": "multi_select",
  "requiredSkills": "multi_select",
  "openPositions": "number",
  "expectedSalary": "number",
  "responsibilities": "rich_text",
  "openingDate": "date",
  "status": "status",
  "jobTitle": "title",
  "jobPost": "rich_text"
} as const

  export type JobOpeningsDTOProperties = keyof typeof JOB_OPENINGS_PROPS_TO_IDS
  