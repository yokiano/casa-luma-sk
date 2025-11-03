import { WithOptional, Join, PathsToStringProps } from '../../core/types/helper.types'
import {
DatabaseObjectResponse,
StringRequest,
CreatedByPropertyItemObjectResponse,
CreatedTimePropertyItemObjectResponse,
DatePropertyItemObjectResponse,
PeoplePropertyItemObjectResponse,
RichTextPropertyItemObjectResponse,
StatusPropertyItemObjectResponse,
TitlePropertyItemObjectResponse,
ExistencePropertyFilter,
QueryDatabaseBodyParameters,
TimestampCreatedTimeFilter,
TimestampLastEditedTimeFilter,
DatePropertyFilter,
PeoplePropertyFilter,
TextPropertyFilter
} from '../../core/types/notion-api.types'
import { HOURLY_REPORTS_PROPS_TO_IDS } from './constants'

export interface HourlyReportsResponse extends WithOptional<Omit<DatabaseObjectResponse, 'properties'>, 'title'| 'description'| 'is_inline'| 'url'| 'public_url'> {
  properties: {
    "Employee": PeoplePropertyItemObjectResponse,
    "Tasks/Description": RichTextPropertyItemObjectResponse,
    "End Time": DatePropertyItemObjectResponse,
    "Work Date": DatePropertyItemObjectResponse,
    "Start Time": DatePropertyItemObjectResponse,
    "Status": Omit<StatusPropertyItemObjectResponse, 'status'> & { status: { id: StringRequest, name: 'Submitted', color: 'blue' } | { id: StringRequest, name: 'Under Review', color: 'yellow' } | { id: StringRequest, name: 'Approved', color: 'green' } | { id: StringRequest, name: 'Rejected', color: 'red' }},
    "Notes": RichTextPropertyItemObjectResponse,
    "Report Title": TitlePropertyItemObjectResponse,
    "Submitted On": CreatedTimePropertyItemObjectResponse,
    "Submitted By": CreatedByPropertyItemObjectResponse
  }
}

export type HourlyReportsResponseProperties = keyof HourlyReportsResponse['properties']
export type HourlyReportsPath = Join<PathsToStringProps<HourlyReportsResponse>>

type HourlyReportsEmployeePropertyFilter = PeoplePropertyFilter
type HourlyReportsTasksDescriptionPropertyFilter = TextPropertyFilter
type HourlyReportsEndTimePropertyFilter = DatePropertyFilter
type HourlyReportsWorkDatePropertyFilter = DatePropertyFilter
type HourlyReportsStartTimePropertyFilter = DatePropertyFilter

export type HourlyReportsStatusPropertyType = HourlyReportsResponse['properties']['Status']['status']['name']

type HourlyReportsStatusPropertyFilter =
  | {
      equals: HourlyReportsStatusPropertyType
    }
  | {
      does_not_equal: HourlyReportsStatusPropertyType
    }
  | ExistencePropertyFilter      

type HourlyReportsNotesPropertyFilter = TextPropertyFilter
type HourlyReportsReportTitlePropertyFilter = TextPropertyFilter
type HourlyReportsSubmittedOnPropertyFilter = DatePropertyFilter
type HourlyReportsSubmittedByPropertyFilter = PeoplePropertyFilter

export type HourlyReportsPropertyFilter = { employee: HourlyReportsEmployeePropertyFilter } | { tasksDescription: HourlyReportsTasksDescriptionPropertyFilter } | { endTime: HourlyReportsEndTimePropertyFilter } | { workDate: HourlyReportsWorkDatePropertyFilter } | { startTime: HourlyReportsStartTimePropertyFilter } | { status: HourlyReportsStatusPropertyFilter } | { notes: HourlyReportsNotesPropertyFilter } | { reportTitle: HourlyReportsReportTitlePropertyFilter } | { submittedOn: HourlyReportsSubmittedOnPropertyFilter } | { submittedBy: HourlyReportsSubmittedByPropertyFilter }

export type HourlyReportsQuery = Omit<QueryDatabaseBodyParameters, 'filter' | 'sorts'> & {
  sorts?: Array<
  | {
      property: keyof typeof HOURLY_REPORTS_PROPS_TO_IDS
      direction: 'ascending' | 'descending'
    }
  | {
      timestamp: 'created_time' | 'last_edited_time'
      direction: 'ascending' | 'descending'
    }
  >
  filter?:
    | {
        or: Array<
          | HourlyReportsPropertyFilter
          | TimestampCreatedTimeFilter
          | TimestampLastEditedTimeFilter
          | {
              // or: HourlyReportsQuery['filter']
              or: Array<HourlyReportsPropertyFilter>
            }
          | {
              // and: HourlyReportsQuery['filter']
              and: Array<HourlyReportsPropertyFilter>
            }
        >
      }
    | {
        and: Array<
          | HourlyReportsPropertyFilter
          | TimestampCreatedTimeFilter
          | TimestampLastEditedTimeFilter
          | {
              // or: HourlyReportsQuery['filter']
              or: Array<HourlyReportsPropertyFilter>
            }
          | {
              // and: HourlyReportsQuery['filter']
              and: Array<HourlyReportsPropertyFilter>
            }
        >
      }
    | HourlyReportsPropertyFilter
    | TimestampCreatedTimeFilter
    | TimestampLastEditedTimeFilter
}

export type HourlyReportsQueryFilter = HourlyReportsQuery['filter']

export type HourlyReportsQueryResponse = {
  results: HourlyReportsResponse[]
  next_cursor: string | null
  has_more: boolean
}

