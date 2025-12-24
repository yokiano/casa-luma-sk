import { WithOptional, Join, PathsToStringProps } from '../../core/types/helper.types'
import {
DatabaseObjectResponse,
StringRequest,
DatePropertyItemObjectResponse,
RichTextPropertyItemObjectResponse,
TitlePropertyItemObjectResponse,
ExistencePropertyFilter,
QueryDatabaseBodyParameters,
TimestampCreatedTimeFilter,
TimestampLastEditedTimeFilter,
DatePropertyFilter,
TextPropertyFilter
} from '../../core/types/notion-api.types'
import { TEAM_CALENDAR_PROPS_TO_IDS } from './constants'

export interface TeamCalendarResponse extends WithOptional<Omit<DatabaseObjectResponse, 'properties'>, 'title'| 'description'| 'is_inline'| 'url'| 'public_url'> {
  properties: {
    "Date": DatePropertyItemObjectResponse,
    "Description": RichTextPropertyItemObjectResponse,
    "Event Name": TitlePropertyItemObjectResponse
  }
}

export type TeamCalendarResponseProperties = keyof TeamCalendarResponse['properties']
export type TeamCalendarPath = Join<PathsToStringProps<TeamCalendarResponse>>

type TeamCalendarDatePropertyFilter = DatePropertyFilter
type TeamCalendarDescriptionPropertyFilter = TextPropertyFilter
type TeamCalendarEventNamePropertyFilter = TextPropertyFilter

export type TeamCalendarPropertyFilter = { date: TeamCalendarDatePropertyFilter } | { description: TeamCalendarDescriptionPropertyFilter } | { eventName: TeamCalendarEventNamePropertyFilter }

export type TeamCalendarQuery = Omit<QueryDatabaseBodyParameters, 'filter' | 'sorts'> & {
  sorts?: Array<
  | {
      property: keyof typeof TEAM_CALENDAR_PROPS_TO_IDS
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
          | TeamCalendarPropertyFilter
          | TimestampCreatedTimeFilter
          | TimestampLastEditedTimeFilter
          | {
              // or: TeamCalendarQuery['filter']
              or: Array<TeamCalendarPropertyFilter>
            }
          | {
              // and: TeamCalendarQuery['filter']
              and: Array<TeamCalendarPropertyFilter>
            }
        >
      }
    | {
        and: Array<
          | TeamCalendarPropertyFilter
          | TimestampCreatedTimeFilter
          | TimestampLastEditedTimeFilter
          | {
              // or: TeamCalendarQuery['filter']
              or: Array<TeamCalendarPropertyFilter>
            }
          | {
              // and: TeamCalendarQuery['filter']
              and: Array<TeamCalendarPropertyFilter>
            }
        >
      }
    | TeamCalendarPropertyFilter
    | TimestampCreatedTimeFilter
    | TimestampLastEditedTimeFilter
}

export type TeamCalendarQueryFilter = TeamCalendarQuery['filter']

export type TeamCalendarQueryResponse = {
  results: TeamCalendarResponse[]
  next_cursor: string | null
  has_more: boolean
}

