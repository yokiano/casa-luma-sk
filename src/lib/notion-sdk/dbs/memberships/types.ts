import { WithOptional, Join, PathsToStringProps } from '../../core/types/helper.types'
import {
DatabaseObjectResponse,
StringRequest,
DatePropertyItemObjectResponse,
FormulaPropertyItemObjectResponse,
NumberPropertyItemObjectResponse,
RelationPropertyItemObjectResponse,
RichTextPropertyItemObjectResponse,
SelectPropertyItemObjectResponse,
TitlePropertyItemObjectResponse,
ExistencePropertyFilter,
QueryDatabaseBodyParameters,
TimestampCreatedTimeFilter,
TimestampLastEditedTimeFilter,
DatePropertyFilter,
FormulaPropertyFilter,
NumberPropertyFilter,
RelationPropertyFilter,
TextPropertyFilter
} from '../../core/types/notion-api.types'
import { MEMBERSHIPS_PROPS_TO_IDS } from './constants'

export interface MembershipsResponse extends WithOptional<Omit<DatabaseObjectResponse, 'properties'>, 'title'| 'description'| 'is_inline'| 'url'| 'public_url'> {
  properties: {
    "Type": Omit<SelectPropertyItemObjectResponse, 'select'> & { select: { id: StringRequest, name: 'Weekly', color: 'blue' } | { id: StringRequest, name: 'Monthly', color: 'purple' }},
    "Has Sibling Discount": FormulaPropertyItemObjectResponse,
    "Status": FormulaPropertyItemObjectResponse,
    "Family": RelationPropertyItemObjectResponse,
    "Start Date": DatePropertyItemObjectResponse,
    "End Date": DatePropertyItemObjectResponse,
    "Number of Kids": NumberPropertyItemObjectResponse,
    "Notes": RichTextPropertyItemObjectResponse,
    "Name": TitlePropertyItemObjectResponse
  }
}

export type MembershipsResponseProperties = keyof MembershipsResponse['properties']
export type MembershipsPath = Join<PathsToStringProps<MembershipsResponse>>


export type MembershipsTypePropertyType = MembershipsResponse['properties']['Type']['select']['name']

type MembershipsTypePropertyFilter =
  | {
      equals: MembershipsTypePropertyType
    }
  | {
      does_not_equal: MembershipsTypePropertyType
    }
  | ExistencePropertyFilter      

type MembershipsHasSiblingDiscountPropertyFilter = FormulaPropertyFilter
type MembershipsStatusPropertyFilter = FormulaPropertyFilter
type MembershipsFamilyPropertyFilter = RelationPropertyFilter
type MembershipsStartDatePropertyFilter = DatePropertyFilter
type MembershipsEndDatePropertyFilter = DatePropertyFilter
type MembershipsNumberOfKidsPropertyFilter = NumberPropertyFilter
type MembershipsNotesPropertyFilter = TextPropertyFilter
type MembershipsNamePropertyFilter = TextPropertyFilter

export type MembershipsPropertyFilter = { type: MembershipsTypePropertyFilter } | { hasSiblingDiscount: MembershipsHasSiblingDiscountPropertyFilter } | { status: MembershipsStatusPropertyFilter } | { family: MembershipsFamilyPropertyFilter } | { startDate: MembershipsStartDatePropertyFilter } | { endDate: MembershipsEndDatePropertyFilter } | { numberOfKids: MembershipsNumberOfKidsPropertyFilter } | { notes: MembershipsNotesPropertyFilter } | { name: MembershipsNamePropertyFilter }

export type MembershipsQuery = Omit<QueryDatabaseBodyParameters, 'filter' | 'sorts'> & {
  sorts?: Array<
  | {
      property: keyof typeof MEMBERSHIPS_PROPS_TO_IDS
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
          | MembershipsPropertyFilter
          | TimestampCreatedTimeFilter
          | TimestampLastEditedTimeFilter
          | {
              // or: MembershipsQuery['filter']
              or: Array<MembershipsPropertyFilter>
            }
          | {
              // and: MembershipsQuery['filter']
              and: Array<MembershipsPropertyFilter>
            }
        >
      }
    | {
        and: Array<
          | MembershipsPropertyFilter
          | TimestampCreatedTimeFilter
          | TimestampLastEditedTimeFilter
          | {
              // or: MembershipsQuery['filter']
              or: Array<MembershipsPropertyFilter>
            }
          | {
              // and: MembershipsQuery['filter']
              and: Array<MembershipsPropertyFilter>
            }
        >
      }
    | MembershipsPropertyFilter
    | TimestampCreatedTimeFilter
    | TimestampLastEditedTimeFilter
}

export type MembershipsQueryFilter = MembershipsQuery['filter']

export type MembershipsQueryResponse = {
  results: MembershipsResponse[]
  next_cursor: string | null
  has_more: boolean
}

