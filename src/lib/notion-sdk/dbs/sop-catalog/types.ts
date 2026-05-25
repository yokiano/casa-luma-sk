import { WithOptional, Join, PathsToStringProps } from '../../core/types/helper.types'
import {
DatabaseObjectResponse,
StringRequest,
RelationPropertyItemObjectResponse,
SelectPropertyItemObjectResponse,
StatusPropertyItemObjectResponse,
TitlePropertyItemObjectResponse,
ExistencePropertyFilter,
QueryDatabaseBodyParameters,
TimestampCreatedTimeFilter,
TimestampLastEditedTimeFilter,
RelationPropertyFilter,
TextPropertyFilter
} from '../../core/types/notion-api.types'
import { SOP_CATALOG_PROPS_TO_IDS } from './constants'

export interface SopCatalogResponse extends WithOptional<Omit<DatabaseObjectResponse, 'properties'>, 'title'| 'description'| 'is_inline'| 'url'| 'public_url'> {
  properties: {
    "When": Omit<SelectPropertyItemObjectResponse, 'select'> & { select: { id: StringRequest, name: 'Opening', color: 'orange' } | { id: StringRequest, name: 'Closing', color: 'brown' } | { id: StringRequest, name: 'During shift', color: 'blue' } | { id: StringRequest, name: 'Daily', color: 'green' } | { id: StringRequest, name: 'Weekly', color: 'purple' } | { id: StringRequest, name: 'Monthly', color: 'pink' } | { id: StringRequest, name: 'As needed', color: 'gray' } | { id: StringRequest, name: 'Employee Onboarding', color: 'yellow' }},
    "Status": Omit<StatusPropertyItemObjectResponse, 'status'> & { status: { id: StringRequest, name: 'Not started', color: 'gray' } | { id: StringRequest, name: 'In progress', color: 'blue' } | { id: StringRequest, name: 'Done', color: 'green' }},
    "SOP Type": Omit<SelectPropertyItemObjectResponse, 'select'> & { select: { id: StringRequest, name: 'Checklist', color: 'gray' } | { id: StringRequest, name: 'How-to', color: 'blue' } | { id: StringRequest, name: 'Policy / management procedure', color: 'purple' } | { id: StringRequest, name: 'Training / onboarding', color: 'green' } | { id: StringRequest, name: 'Meeting Agenda', color: 'pink' }},
    "Department": Omit<SelectPropertyItemObjectResponse, 'select'> & { select: { id: StringRequest, name: 'Open Play', color: 'brown' } | { id: StringRequest, name: 'Restaurant', color: 'purple' } | { id: StringRequest, name: 'Management', color: 'red' } | { id: StringRequest, name: 'General', color: 'gray' }},
    "Name": TitlePropertyItemObjectResponse,
    "Role": RelationPropertyItemObjectResponse
  }
}

export type SopCatalogResponseProperties = keyof SopCatalogResponse['properties']
export type SopCatalogPath = Join<PathsToStringProps<SopCatalogResponse>>


export type SopCatalogWhenPropertyType = SopCatalogResponse['properties']['When']['select']['name']

type SopCatalogWhenPropertyFilter =
  | {
      equals: SopCatalogWhenPropertyType
    }
  | {
      does_not_equal: SopCatalogWhenPropertyType
    }
  | ExistencePropertyFilter      


export type SopCatalogStatusPropertyType = SopCatalogResponse['properties']['Status']['status']['name']

type SopCatalogStatusPropertyFilter =
  | {
      equals: SopCatalogStatusPropertyType
    }
  | {
      does_not_equal: SopCatalogStatusPropertyType
    }
  | ExistencePropertyFilter      


export type SopCatalogSopTypePropertyType = SopCatalogResponse['properties']['SOP Type']['select']['name']

type SopCatalogSopTypePropertyFilter =
  | {
      equals: SopCatalogSopTypePropertyType
    }
  | {
      does_not_equal: SopCatalogSopTypePropertyType
    }
  | ExistencePropertyFilter      


export type SopCatalogDepartmentPropertyType = SopCatalogResponse['properties']['Department']['select']['name']

type SopCatalogDepartmentPropertyFilter =
  | {
      equals: SopCatalogDepartmentPropertyType
    }
  | {
      does_not_equal: SopCatalogDepartmentPropertyType
    }
  | ExistencePropertyFilter      

type SopCatalogNamePropertyFilter = TextPropertyFilter
type SopCatalogRolePropertyFilter = RelationPropertyFilter

export type SopCatalogPropertyFilter = { when: SopCatalogWhenPropertyFilter } | { status: SopCatalogStatusPropertyFilter } | { sopType: SopCatalogSopTypePropertyFilter } | { department: SopCatalogDepartmentPropertyFilter } | { name: SopCatalogNamePropertyFilter } | { role: SopCatalogRolePropertyFilter }

export type SopCatalogQuery = Omit<QueryDatabaseBodyParameters, 'filter' | 'sorts'> & {
  sorts?: Array<
  | {
      property: keyof typeof SOP_CATALOG_PROPS_TO_IDS
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
          | SopCatalogPropertyFilter
          | TimestampCreatedTimeFilter
          | TimestampLastEditedTimeFilter
          | {
              // or: SopCatalogQuery['filter']
              or: Array<SopCatalogPropertyFilter>
            }
          | {
              // and: SopCatalogQuery['filter']
              and: Array<SopCatalogPropertyFilter>
            }
        >
      }
    | {
        and: Array<
          | SopCatalogPropertyFilter
          | TimestampCreatedTimeFilter
          | TimestampLastEditedTimeFilter
          | {
              // or: SopCatalogQuery['filter']
              or: Array<SopCatalogPropertyFilter>
            }
          | {
              // and: SopCatalogQuery['filter']
              and: Array<SopCatalogPropertyFilter>
            }
        >
      }
    | SopCatalogPropertyFilter
    | TimestampCreatedTimeFilter
    | TimestampLastEditedTimeFilter
}

export type SopCatalogQueryFilter = SopCatalogQuery['filter']

export type SopCatalogQueryResponse = {
  results: SopCatalogResponse[]
  next_cursor: string | null
  has_more: boolean
}

