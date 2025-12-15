import { WithOptional, Join, PathsToStringProps } from '../../core/types/helper.types'
import {
DatabaseObjectResponse,
StringRequest,
RichTextPropertyItemObjectResponse,
SelectPropertyItemObjectResponse,
StatusPropertyItemObjectResponse,
TitlePropertyItemObjectResponse,
ExistencePropertyFilter,
QueryDatabaseBodyParameters,
TimestampCreatedTimeFilter,
TimestampLastEditedTimeFilter,
TextPropertyFilter
} from '../../core/types/notion-api.types'
import { SIGNAGE_PROPS_TO_IDS } from './constants'

export interface SignageResponse extends WithOptional<Omit<DatabaseObjectResponse, 'properties'>, 'title'| 'description'| 'is_inline'| 'url'| 'public_url'> {
  properties: {
    "Location": Omit<SelectPropertyItemObjectResponse, 'select'> & { select: { id: StringRequest, name: 'Toilet', color: 'yellow' } | { id: StringRequest, name: 'Entrance', color: 'blue' } | { id: StringRequest, name: 'Parking', color: 'gray' } | { id: StringRequest, name: 'Cafe', color: 'brown' } | { id: StringRequest, name: 'Play Area', color: 'orange' }},
    "Type": Omit<SelectPropertyItemObjectResponse, 'select'> & { select: { id: StringRequest, name: 'Instruction', color: 'green' } | { id: StringRequest, name: 'Warning', color: 'purple' } | { id: StringRequest, name: 'Information', color: 'yellow' } | { id: StringRequest, name: 'Schedule', color: 'pink' }},
    "Copy": RichTextPropertyItemObjectResponse,
    "Sign ID": RichTextPropertyItemObjectResponse,
    "Status": Omit<StatusPropertyItemObjectResponse, 'status'> & { status: { id: StringRequest, name: 'Idea', color: 'gray' } | { id: StringRequest, name: 'Printed', color: 'green' } | { id: StringRequest, name: 'Installed', color: 'blue' } | { id: StringRequest, name: 'Draft', color: 'blue' } | { id: StringRequest, name: 'Ready to Print', color: 'yellow' }},
    "Name": TitlePropertyItemObjectResponse
  }
}

export type SignageResponseProperties = keyof SignageResponse['properties']
export type SignagePath = Join<PathsToStringProps<SignageResponse>>


export type SignageLocationPropertyType = SignageResponse['properties']['Location']['select']['name']

type SignageLocationPropertyFilter =
  | {
      equals: SignageLocationPropertyType
    }
  | {
      does_not_equal: SignageLocationPropertyType
    }
  | ExistencePropertyFilter      


export type SignageTypePropertyType = SignageResponse['properties']['Type']['select']['name']

type SignageTypePropertyFilter =
  | {
      equals: SignageTypePropertyType
    }
  | {
      does_not_equal: SignageTypePropertyType
    }
  | ExistencePropertyFilter      

type SignageCopyPropertyFilter = TextPropertyFilter
type SignageSignIdPropertyFilter = TextPropertyFilter

export type SignageStatusPropertyType = SignageResponse['properties']['Status']['status']['name']

type SignageStatusPropertyFilter =
  | {
      equals: SignageStatusPropertyType
    }
  | {
      does_not_equal: SignageStatusPropertyType
    }
  | ExistencePropertyFilter      

type SignageNamePropertyFilter = TextPropertyFilter

export type SignagePropertyFilter = { location: SignageLocationPropertyFilter } | { type: SignageTypePropertyFilter } | { copy: SignageCopyPropertyFilter } | { signId: SignageSignIdPropertyFilter } | { status: SignageStatusPropertyFilter } | { name: SignageNamePropertyFilter }

export type SignageQuery = Omit<QueryDatabaseBodyParameters, 'filter' | 'sorts'> & {
  sorts?: Array<
  | {
      property: keyof typeof SIGNAGE_PROPS_TO_IDS
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
          | SignagePropertyFilter
          | TimestampCreatedTimeFilter
          | TimestampLastEditedTimeFilter
          | {
              // or: SignageQuery['filter']
              or: Array<SignagePropertyFilter>
            }
          | {
              // and: SignageQuery['filter']
              and: Array<SignagePropertyFilter>
            }
        >
      }
    | {
        and: Array<
          | SignagePropertyFilter
          | TimestampCreatedTimeFilter
          | TimestampLastEditedTimeFilter
          | {
              // or: SignageQuery['filter']
              or: Array<SignagePropertyFilter>
            }
          | {
              // and: SignageQuery['filter']
              and: Array<SignagePropertyFilter>
            }
        >
      }
    | SignagePropertyFilter
    | TimestampCreatedTimeFilter
    | TimestampLastEditedTimeFilter
}

export type SignageQueryFilter = SignageQuery['filter']

export type SignageQueryResponse = {
  results: SignageResponse[]
  next_cursor: string | null
  has_more: boolean
}

