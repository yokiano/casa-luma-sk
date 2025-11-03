export const HOURLY_REPORTS_PROP_VALUES = {
"status": [
  "Submitted",
  "Under Review",
  "Approved",
  "Rejected"
] as const,
}

export const HOURLY_REPORTS_PROPS_TO_IDS = {
  "employee": "QY%3FD",
  "tasksDescription": "SXma",
  "endTime": "Ttd%5C",
  "workDate": "%5CLjc",
  "startTime": "%5EdMJ",
  "status": "_%5B%5B%5C",
  "notes": "j%3A%60P",
  "reportTitle": "title",
  "submittedOn": "NG%3Eq",
  "submittedBy": "hhDf"
} as const
export const HOURLY_REPORTS_IDS_TO_PROPS = {
  "QY%3FD": "employee",
  "SXma": "tasksDescription",
  "Ttd%5C": "endTime",
  "%5CLjc": "workDate",
  "%5EdMJ": "startTime",
  "_%5B%5B%5C": "status",
  "j%3A%60P": "notes",
  "title": "reportTitle",
  "NG%3Eq": "submittedOn",
  "hhDf": "submittedBy"
} as const
export const HOURLY_REPORTS_PROPS_TO_TYPES = {
  "employee": "people",
  "tasksDescription": "rich_text",
  "endTime": "date",
  "workDate": "date",
  "startTime": "date",
  "status": "status",
  "notes": "rich_text",
  "reportTitle": "title",
  "submittedOn": "created_time",
  "submittedBy": "created_by"
} as const

  export type HourlyReportsDTOProperties = keyof typeof HOURLY_REPORTS_PROPS_TO_IDS
  