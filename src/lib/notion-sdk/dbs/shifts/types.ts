import { WithOptional, Join, PathsToStringProps } from '../../core/types/helper.types'
import {
DatabaseObjectResponse,
StringRequest,
DatePropertyItemObjectResponse,
RelationPropertyItemObjectResponse,
SelectPropertyItemObjectResponse,
StatusPropertyItemObjectResponse,
TitlePropertyItemObjectResponse,
ExistencePropertyFilter,
QueryDatabaseBodyParameters,
TimestampCreatedTimeFilter,
TimestampLastEditedTimeFilter,
DatePropertyFilter,
RelationPropertyFilter,
TextPropertyFilter
} from '../../core/types/notion-api.types'
import { SHIFTS_PROPS_TO_IDS } from './constants'

export interface ShiftsResponse extends WithOptional<Omit<DatabaseObjectResponse, 'properties'>, 'title'| 'description'| 'is_inline'| 'url'| 'public_url'> {
  properties: {
    "Employee": RelationPropertyItemObjectResponse,
    "Type": Omit<SelectPropertyItemObjectResponse, 'select'> & { select: { id: StringRequest, name: 'Opening (08:00 - 16:00)', color: 'yellow' } | { id: StringRequest, name: 'Closing (11:00 - 19:00)', color: 'blue' } | { id: StringRequest, name: 'Mid-Day', color: 'orange' } | { id: StringRequest, name: 'Custom', color: 'gray' }},
    "Status": Omit<StatusPropertyItemObjectResponse, 'status'> & { status: { id: StringRequest, name: 'Planned', color: 'gray' } | { id: StringRequest, name: 'Confirmed', color: 'blue' } | { id: StringRequest, name: 'Completed', color: 'green' } | { id: StringRequest, name: 'Cancelled', color: 'red' }},
    "Shift Time": DatePropertyItemObjectResponse,
    "Role": RelationPropertyItemObjectResponse,
    "Shift Note": TitlePropertyItemObjectResponse
  }
}

export type ShiftsResponseProperties = keyof ShiftsResponse['properties']
export type ShiftsPath = Join<PathsToStringProps<ShiftsResponse>>

type ShiftsEmployeePropertyFilter = RelationPropertyFilter

export type ShiftsTypePropertyType = ShiftsResponse['properties']['Type']['select']['name']

type ShiftsTypePropertyFilter =
  | {
      equals: ShiftsTypePropertyType
    }
  | {
      does_not_equal: ShiftsTypePropertyType
    }
  | ExistencePropertyFilter      


export type ShiftsStatusPropertyType = ShiftsResponse['properties']['Status']['status']['name']

type ShiftsStatusPropertyFilter =
  | {
      equals: ShiftsStatusPropertyType
    }
  | {
      does_not_equal: ShiftsStatusPropertyType
    }
  | ExistencePropertyFilter      

type ShiftsShiftTimePropertyFilter = DatePropertyFilter
type ShiftsRolePropertyFilter = RelationPropertyFilter
type ShiftsShiftNotePropertyFilter = TextPropertyFilter

export type ShiftsPropertyFilter = { employee: ShiftsEmployeePropertyFilter } | { type: ShiftsTypePropertyFilter } | { status: ShiftsStatusPropertyFilter } | { shiftTime: ShiftsShiftTimePropertyFilter } | { role: ShiftsRolePropertyFilter } | { shiftNote: ShiftsShiftNotePropertyFilter }

export type ShiftsQuery = Omit<QueryDatabaseBodyParameters, 'filter' | 'sorts'> & {
  sorts?: Array<
  | {
      property: keyof typeof SHIFTS_PROPS_TO_IDS
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
          | ShiftsPropertyFilter
          | TimestampCreatedTimeFilter
          | TimestampLastEditedTimeFilter
          | {
              // or: ShiftsQuery['filter']
              or: Array<ShiftsPropertyFilter>
            }
          | {
              // and: ShiftsQuery['filter']
              and: Array<ShiftsPropertyFilter>
            }
        >
      }
    | {
        and: Array<
          | ShiftsPropertyFilter
          | TimestampCreatedTimeFilter
          | TimestampLastEditedTimeFilter
          | {
              // or: ShiftsQuery['filter']
              or: Array<ShiftsPropertyFilter>
            }
          | {
              // and: ShiftsQuery['filter']
              and: Array<ShiftsPropertyFilter>
            }
        >
      }
    | ShiftsPropertyFilter
    | TimestampCreatedTimeFilter
    | TimestampLastEditedTimeFilter
}

export type ShiftsQueryFilter = ShiftsQuery['filter']

export type ShiftsQueryResponse = {
  results: ShiftsResponse[]
  next_cursor: string | null
  has_more: boolean
}

