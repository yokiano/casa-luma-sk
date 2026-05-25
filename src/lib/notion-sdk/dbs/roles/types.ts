import { WithOptional, Join, PathsToStringProps } from '../../core/types/helper.types'
import {
DatabaseObjectResponse,
StringRequest,
CheckboxPropertyItemObjectResponse,
NumberPropertyItemObjectResponse,
RelationPropertyItemObjectResponse,
SelectPropertyItemObjectResponse,
TitlePropertyItemObjectResponse,
ExistencePropertyFilter,
QueryDatabaseBodyParameters,
TimestampCreatedTimeFilter,
TimestampLastEditedTimeFilter,
CheckboxPropertyFilter,
NumberPropertyFilter,
RelationPropertyFilter,
TextPropertyFilter
} from '../../core/types/notion-api.types'
import { ROLES_PROPS_TO_IDS } from './constants'

export interface RolesResponse extends WithOptional<Omit<DatabaseObjectResponse, 'properties'>, 'title'| 'description'| 'is_inline'| 'url'| 'public_url'> {
  properties: {
    "Employees": RelationPropertyItemObjectResponse,
    "Active": CheckboxPropertyItemObjectResponse,
    "Required per Day": NumberPropertyItemObjectResponse,
    "Department": Omit<SelectPropertyItemObjectResponse, 'select'> & { select: { id: StringRequest, name: 'Open Play', color: 'blue' } | { id: StringRequest, name: 'Café', color: 'orange' } | { id: StringRequest, name: 'Maintenance', color: 'gray' } | { id: StringRequest, name: 'Management', color: 'purple' } | { id: StringRequest, name: 'General', color: 'default' }},
    "Role": TitlePropertyItemObjectResponse
  }
}

export type RolesResponseProperties = keyof RolesResponse['properties']
export type RolesPath = Join<PathsToStringProps<RolesResponse>>

type RolesEmployeesPropertyFilter = RelationPropertyFilter
type RolesActivePropertyFilter = CheckboxPropertyFilter
type RolesRequiredPerDayPropertyFilter = NumberPropertyFilter

export type RolesDepartmentPropertyType = RolesResponse['properties']['Department']['select']['name']

type RolesDepartmentPropertyFilter =
  | {
      equals: RolesDepartmentPropertyType
    }
  | {
      does_not_equal: RolesDepartmentPropertyType
    }
  | ExistencePropertyFilter      

type RolesRolePropertyFilter = TextPropertyFilter

export type RolesPropertyFilter = { employees: RolesEmployeesPropertyFilter } | { active: RolesActivePropertyFilter } | { requiredPerDay: RolesRequiredPerDayPropertyFilter } | { department: RolesDepartmentPropertyFilter } | { role: RolesRolePropertyFilter }

export type RolesQuery = Omit<QueryDatabaseBodyParameters, 'filter' | 'sorts'> & {
  sorts?: Array<
  | {
      property: keyof typeof ROLES_PROPS_TO_IDS
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
          | RolesPropertyFilter
          | TimestampCreatedTimeFilter
          | TimestampLastEditedTimeFilter
          | {
              // or: RolesQuery['filter']
              or: Array<RolesPropertyFilter>
            }
          | {
              // and: RolesQuery['filter']
              and: Array<RolesPropertyFilter>
            }
        >
      }
    | {
        and: Array<
          | RolesPropertyFilter
          | TimestampCreatedTimeFilter
          | TimestampLastEditedTimeFilter
          | {
              // or: RolesQuery['filter']
              or: Array<RolesPropertyFilter>
            }
          | {
              // and: RolesQuery['filter']
              and: Array<RolesPropertyFilter>
            }
        >
      }
    | RolesPropertyFilter
    | TimestampCreatedTimeFilter
    | TimestampLastEditedTimeFilter
}

export type RolesQueryFilter = RolesQuery['filter']

export type RolesQueryResponse = {
  results: RolesResponse[]
  next_cursor: string | null
  has_more: boolean
}

