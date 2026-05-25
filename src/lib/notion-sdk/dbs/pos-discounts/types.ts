import { WithOptional, Join, PathsToStringProps } from '../../core/types/helper.types'
import {
DatabaseObjectResponse,
StringRequest,
CheckboxPropertyItemObjectResponse,
NumberPropertyItemObjectResponse,
RichTextPropertyItemObjectResponse,
SelectPropertyItemObjectResponse,
TitlePropertyItemObjectResponse,
ExistencePropertyFilter,
QueryDatabaseBodyParameters,
TimestampCreatedTimeFilter,
TimestampLastEditedTimeFilter,
CheckboxPropertyFilter,
NumberPropertyFilter,
TextPropertyFilter
} from '../../core/types/notion-api.types'
import { POS_DISCOUNTS_PROPS_TO_IDS } from './constants'

export interface PosDiscountsResponse extends WithOptional<Omit<DatabaseObjectResponse, 'properties'>, 'title'| 'description'| 'is_inline'| 'url'| 'public_url'> {
  properties: {
    "Value": NumberPropertyItemObjectResponse,
    "Active": CheckboxPropertyItemObjectResponse,
    "Restricted access": CheckboxPropertyItemObjectResponse,
    "Type": Omit<SelectPropertyItemObjectResponse, 'select'> & { select: { id: StringRequest, name: 'Percentage', color: 'orange' } | { id: StringRequest, name: 'Amount', color: 'green' }},
    "LoyverseID": RichTextPropertyItemObjectResponse,
    "Applies to": Omit<SelectPropertyItemObjectResponse, 'select'> & { select: { id: StringRequest, name: 'Ticket', color: 'orange' }},
    "Name": TitlePropertyItemObjectResponse
  }
}

export type PosDiscountsResponseProperties = keyof PosDiscountsResponse['properties']
export type PosDiscountsPath = Join<PathsToStringProps<PosDiscountsResponse>>

type PosDiscountsValuePropertyFilter = NumberPropertyFilter
type PosDiscountsActivePropertyFilter = CheckboxPropertyFilter
type PosDiscountsRestrictedAccessPropertyFilter = CheckboxPropertyFilter

export type PosDiscountsTypePropertyType = PosDiscountsResponse['properties']['Type']['select']['name']

type PosDiscountsTypePropertyFilter =
  | {
      equals: PosDiscountsTypePropertyType
    }
  | {
      does_not_equal: PosDiscountsTypePropertyType
    }
  | ExistencePropertyFilter      

type PosDiscountsLoyverseIdPropertyFilter = TextPropertyFilter

export type PosDiscountsAppliesToPropertyType = PosDiscountsResponse['properties']['Applies to']['select']['name']

type PosDiscountsAppliesToPropertyFilter =
  | {
      equals: PosDiscountsAppliesToPropertyType
    }
  | {
      does_not_equal: PosDiscountsAppliesToPropertyType
    }
  | ExistencePropertyFilter      

type PosDiscountsNamePropertyFilter = TextPropertyFilter

export type PosDiscountsPropertyFilter = { value: PosDiscountsValuePropertyFilter } | { active: PosDiscountsActivePropertyFilter } | { restrictedAccess: PosDiscountsRestrictedAccessPropertyFilter } | { type: PosDiscountsTypePropertyFilter } | { loyverseId: PosDiscountsLoyverseIdPropertyFilter } | { appliesTo: PosDiscountsAppliesToPropertyFilter } | { name: PosDiscountsNamePropertyFilter }

export type PosDiscountsQuery = Omit<QueryDatabaseBodyParameters, 'filter' | 'sorts'> & {
  sorts?: Array<
  | {
      property: keyof typeof POS_DISCOUNTS_PROPS_TO_IDS
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
          | PosDiscountsPropertyFilter
          | TimestampCreatedTimeFilter
          | TimestampLastEditedTimeFilter
          | {
              // or: PosDiscountsQuery['filter']
              or: Array<PosDiscountsPropertyFilter>
            }
          | {
              // and: PosDiscountsQuery['filter']
              and: Array<PosDiscountsPropertyFilter>
            }
        >
      }
    | {
        and: Array<
          | PosDiscountsPropertyFilter
          | TimestampCreatedTimeFilter
          | TimestampLastEditedTimeFilter
          | {
              // or: PosDiscountsQuery['filter']
              or: Array<PosDiscountsPropertyFilter>
            }
          | {
              // and: PosDiscountsQuery['filter']
              and: Array<PosDiscountsPropertyFilter>
            }
        >
      }
    | PosDiscountsPropertyFilter
    | TimestampCreatedTimeFilter
    | TimestampLastEditedTimeFilter
}

export type PosDiscountsQueryFilter = PosDiscountsQuery['filter']

export type PosDiscountsQueryResponse = {
  results: PosDiscountsResponse[]
  next_cursor: string | null
  has_more: boolean
}

