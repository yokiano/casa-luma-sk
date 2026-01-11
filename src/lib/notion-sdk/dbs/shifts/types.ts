import { WithOptional, Join, PathsToStringProps } from '../../core/types/helper.types'
import {
DatabaseObjectResponse,
StringRequest,
DatePropertyItemObjectResponse,
MultiSelectPropertyItemObjectResponse,
NumberPropertyItemObjectResponse,
RelationPropertyItemObjectResponse,
SelectPropertyItemObjectResponse,
StatusPropertyItemObjectResponse,
TitlePropertyItemObjectResponse,
ExistencePropertyFilter,
QueryDatabaseBodyParameters,
TimestampCreatedTimeFilter,
TimestampLastEditedTimeFilter,
DatePropertyFilter,
NumberPropertyFilter,
RelationPropertyFilter,
TextPropertyFilter
} from '../../core/types/notion-api.types'
import { SHIFTS_PROPS_TO_IDS } from './constants'

export interface ShiftsResponse extends WithOptional<Omit<DatabaseObjectResponse, 'properties'>, 'title'| 'description'| 'is_inline'| 'url'| 'public_url'> {
  properties: {
    "Employee": RelationPropertyItemObjectResponse,
    "Type": Omit<SelectPropertyItemObjectResponse, 'select'> & { select: { id: StringRequest, name: 'Opening (08:30 - 17:00)', color: 'yellow' } | { id: StringRequest, name: 'Closing (10:30 - 19:00)', color: 'blue' } | { id: StringRequest, name: 'Custom', color: 'gray' }},
    "Status": Omit<StatusPropertyItemObjectResponse, 'status'> & { status: { id: StringRequest, name: 'Planned', color: 'gray' } | { id: StringRequest, name: 'Confirmed', color: 'blue' } | { id: StringRequest, name: 'Completed', color: 'green' } | { id: StringRequest, name: 'Cancelled', color: 'red' }},
    "Shift Time": DatePropertyItemObjectResponse,
    "Role": RelationPropertyItemObjectResponse,
    "Shift Note": TitlePropertyItemObjectResponse,
    "OT Approver": Omit<MultiSelectPropertyItemObjectResponse, 'multi_select'> & { multi_select: [{ id: StringRequest, name: 'Roza', color: 'orange' } | { id: StringRequest, name: 'Karni', color: 'gray' } | { id: StringRequest, name: 'Ohad', color: 'red' } | { id: StringRequest, name: 'Yarden', color: 'yellow' }]},
    "OT": NumberPropertyItemObjectResponse
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

export type ShiftsOtApproverPropertyType = ShiftsResponse['properties']['OT Approver']['multi_select'][number]['name']

type ShiftsOtApproverPropertyFilter =
  | {
      contains: ShiftsOtApproverPropertyType
    }
  | {
      does_not_contain: ShiftsOtApproverPropertyType
    }          
  | ExistencePropertyFilter

type ShiftsOtPropertyFilter = NumberPropertyFilter

export type ShiftsPropertyFilter = { employee: ShiftsEmployeePropertyFilter } | { type: ShiftsTypePropertyFilter } | { status: ShiftsStatusPropertyFilter } | { shiftTime: ShiftsShiftTimePropertyFilter } | { role: ShiftsRolePropertyFilter } | { shiftNote: ShiftsShiftNotePropertyFilter } | { otApprover: ShiftsOtApproverPropertyFilter } | { ot: ShiftsOtPropertyFilter }

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

