import { WithOptional, Join, PathsToStringProps } from '../../core/types/helper.types'
import {
DatabaseObjectResponse,
StringRequest,
DatePropertyItemObjectResponse,
NumberPropertyItemObjectResponse,
RelationPropertyItemObjectResponse,
RichTextPropertyItemObjectResponse,
SelectPropertyItemObjectResponse,
TitlePropertyItemObjectResponse,
UrlPropertyItemObjectResponse,
ExistencePropertyFilter,
QueryDatabaseBodyParameters,
TimestampCreatedTimeFilter,
TimestampLastEditedTimeFilter,
DatePropertyFilter,
NumberPropertyFilter,
RelationPropertyFilter,
TextPropertyFilter
} from '../../core/types/notion-api.types'
import { FLEXI_PASSES_PROPS_TO_IDS } from './constants'

export interface FlexiPassesResponse extends WithOptional<Omit<DatabaseObjectResponse, 'properties'>, 'title'| 'description'| 'is_inline'| 'url'| 'public_url'> {
  properties: {
    "Source Receipt Key": RichTextPropertyItemObjectResponse,
    "Entries Granted": NumberPropertyItemObjectResponse,
    "Source Item IDs": RichTextPropertyItemObjectResponse,
    "Loyverse Customer ID": RichTextPropertyItemObjectResponse,
    "Source Line Indexes": RichTextPropertyItemObjectResponse,
    "Notes": RichTextPropertyItemObjectResponse,
    "Family": RelationPropertyItemObjectResponse,
    "Entries Left": NumberPropertyItemObjectResponse,
    "Valid From": DatePropertyItemObjectResponse,
    "Source Receipt URL": UrlPropertyItemObjectResponse,
    "Source Receipt Number": RichTextPropertyItemObjectResponse,
    "Card Count": NumberPropertyItemObjectResponse,
    "Refund Receipt Number": RichTextPropertyItemObjectResponse,
    "Entries Used": NumberPropertyItemObjectResponse,
    "Valid Until": DatePropertyItemObjectResponse,
    "Automation Status": Omit<SelectPropertyItemObjectResponse, 'select'> & { select: { id: StringRequest, name: 'Active', color: 'green' } | { id: StringRequest, name: 'Refunded', color: 'red' } | { id: StringRequest, name: 'Manual Review', color: 'yellow' }},
    "Name": TitlePropertyItemObjectResponse
  }
}

export type FlexiPassesResponseProperties = keyof FlexiPassesResponse['properties']
export type FlexiPassesPath = Join<PathsToStringProps<FlexiPassesResponse>>

type FlexiPassesSourceReceiptKeyPropertyFilter = TextPropertyFilter
type FlexiPassesEntriesGrantedPropertyFilter = NumberPropertyFilter
type FlexiPassesSourceItemIdsPropertyFilter = TextPropertyFilter
type FlexiPassesLoyverseCustomerIdPropertyFilter = TextPropertyFilter
type FlexiPassesSourceLineIndexesPropertyFilter = TextPropertyFilter
type FlexiPassesNotesPropertyFilter = TextPropertyFilter
type FlexiPassesFamilyPropertyFilter = RelationPropertyFilter
type FlexiPassesEntriesLeftPropertyFilter = NumberPropertyFilter
type FlexiPassesValidFromPropertyFilter = DatePropertyFilter
type FlexiPassesSourceReceiptUrlPropertyFilter = TextPropertyFilter
type FlexiPassesSourceReceiptNumberPropertyFilter = TextPropertyFilter
type FlexiPassesCardCountPropertyFilter = NumberPropertyFilter
type FlexiPassesRefundReceiptNumberPropertyFilter = TextPropertyFilter
type FlexiPassesEntriesUsedPropertyFilter = NumberPropertyFilter
type FlexiPassesValidUntilPropertyFilter = DatePropertyFilter

export type FlexiPassesAutomationStatusPropertyType = FlexiPassesResponse['properties']['Automation Status']['select']['name']

type FlexiPassesAutomationStatusPropertyFilter =
  | {
      equals: FlexiPassesAutomationStatusPropertyType
    }
  | {
      does_not_equal: FlexiPassesAutomationStatusPropertyType
    }
  | ExistencePropertyFilter      

type FlexiPassesNamePropertyFilter = TextPropertyFilter

export type FlexiPassesPropertyFilter = { sourceReceiptKey: FlexiPassesSourceReceiptKeyPropertyFilter } | { entriesGranted: FlexiPassesEntriesGrantedPropertyFilter } | { sourceItemIds: FlexiPassesSourceItemIdsPropertyFilter } | { loyverseCustomerId: FlexiPassesLoyverseCustomerIdPropertyFilter } | { sourceLineIndexes: FlexiPassesSourceLineIndexesPropertyFilter } | { notes: FlexiPassesNotesPropertyFilter } | { family: FlexiPassesFamilyPropertyFilter } | { entriesLeft: FlexiPassesEntriesLeftPropertyFilter } | { validFrom: FlexiPassesValidFromPropertyFilter } | { sourceReceiptUrl: FlexiPassesSourceReceiptUrlPropertyFilter } | { sourceReceiptNumber: FlexiPassesSourceReceiptNumberPropertyFilter } | { cardCount: FlexiPassesCardCountPropertyFilter } | { refundReceiptNumber: FlexiPassesRefundReceiptNumberPropertyFilter } | { entriesUsed: FlexiPassesEntriesUsedPropertyFilter } | { validUntil: FlexiPassesValidUntilPropertyFilter } | { automationStatus: FlexiPassesAutomationStatusPropertyFilter } | { name: FlexiPassesNamePropertyFilter }

export type FlexiPassesQuery = Omit<QueryDatabaseBodyParameters, 'filter' | 'sorts'> & {
  sorts?: Array<
  | {
      property: keyof typeof FLEXI_PASSES_PROPS_TO_IDS
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
          | FlexiPassesPropertyFilter
          | TimestampCreatedTimeFilter
          | TimestampLastEditedTimeFilter
          | {
              // or: FlexiPassesQuery['filter']
              or: Array<FlexiPassesPropertyFilter>
            }
          | {
              // and: FlexiPassesQuery['filter']
              and: Array<FlexiPassesPropertyFilter>
            }
        >
      }
    | {
        and: Array<
          | FlexiPassesPropertyFilter
          | TimestampCreatedTimeFilter
          | TimestampLastEditedTimeFilter
          | {
              // or: FlexiPassesQuery['filter']
              or: Array<FlexiPassesPropertyFilter>
            }
          | {
              // and: FlexiPassesQuery['filter']
              and: Array<FlexiPassesPropertyFilter>
            }
        >
      }
    | FlexiPassesPropertyFilter
    | TimestampCreatedTimeFilter
    | TimestampLastEditedTimeFilter
}

export type FlexiPassesQueryFilter = FlexiPassesQuery['filter']

export type FlexiPassesQueryResponse = {
  results: FlexiPassesResponse[]
  next_cursor: string | null
  has_more: boolean
}

