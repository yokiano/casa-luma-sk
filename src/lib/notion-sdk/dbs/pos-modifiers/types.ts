import { WithOptional, Join, PathsToStringProps } from '../../core/types/helper.types'
import {
DatabaseObjectResponse,
StringRequest,
CheckboxPropertyItemObjectResponse,
NumberPropertyItemObjectResponse,
RichTextPropertyItemObjectResponse,
TitlePropertyItemObjectResponse,
ExistencePropertyFilter,
QueryDatabaseBodyParameters,
TimestampCreatedTimeFilter,
TimestampLastEditedTimeFilter,
CheckboxPropertyFilter,
NumberPropertyFilter,
TextPropertyFilter
} from '../../core/types/notion-api.types'
import { POS_MODIFIERS_PROPS_TO_IDS } from './constants'

export interface PosModifiersResponse extends WithOptional<Omit<DatabaseObjectResponse, 'properties'>, 'title'| 'description'| 'is_inline'| 'url'| 'public_url'> {
  properties: {
    "Notes": RichTextPropertyItemObjectResponse,
    "Options JSON": RichTextPropertyItemObjectResponse,
    "LoyverseID": RichTextPropertyItemObjectResponse,
    "Position": NumberPropertyItemObjectResponse,
    "Active": CheckboxPropertyItemObjectResponse,
    "Name": TitlePropertyItemObjectResponse
  }
}

export type PosModifiersResponseProperties = keyof PosModifiersResponse['properties']
export type PosModifiersPath = Join<PathsToStringProps<PosModifiersResponse>>

type PosModifiersNotesPropertyFilter = TextPropertyFilter
type PosModifiersOptionsJsonPropertyFilter = TextPropertyFilter
type PosModifiersLoyverseIdPropertyFilter = TextPropertyFilter
type PosModifiersPositionPropertyFilter = NumberPropertyFilter
type PosModifiersActivePropertyFilter = CheckboxPropertyFilter
type PosModifiersNamePropertyFilter = TextPropertyFilter

export type PosModifiersPropertyFilter = { notes: PosModifiersNotesPropertyFilter } | { optionsJson: PosModifiersOptionsJsonPropertyFilter } | { loyverseId: PosModifiersLoyverseIdPropertyFilter } | { position: PosModifiersPositionPropertyFilter } | { active: PosModifiersActivePropertyFilter } | { name: PosModifiersNamePropertyFilter }

export type PosModifiersQuery = Omit<QueryDatabaseBodyParameters, 'filter' | 'sorts'> & {
  sorts?: Array<
  | {
      property: keyof typeof POS_MODIFIERS_PROPS_TO_IDS
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
          | PosModifiersPropertyFilter
          | TimestampCreatedTimeFilter
          | TimestampLastEditedTimeFilter
          | {
              // or: PosModifiersQuery['filter']
              or: Array<PosModifiersPropertyFilter>
            }
          | {
              // and: PosModifiersQuery['filter']
              and: Array<PosModifiersPropertyFilter>
            }
        >
      }
    | {
        and: Array<
          | PosModifiersPropertyFilter
          | TimestampCreatedTimeFilter
          | TimestampLastEditedTimeFilter
          | {
              // or: PosModifiersQuery['filter']
              or: Array<PosModifiersPropertyFilter>
            }
          | {
              // and: PosModifiersQuery['filter']
              and: Array<PosModifiersPropertyFilter>
            }
        >
      }
    | PosModifiersPropertyFilter
    | TimestampCreatedTimeFilter
    | TimestampLastEditedTimeFilter
}

export type PosModifiersQueryFilter = PosModifiersQuery['filter']

export type PosModifiersQueryResponse = {
  results: PosModifiersResponse[]
  next_cursor: string | null
  has_more: boolean
}

