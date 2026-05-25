import { WithOptional, Join, PathsToStringProps } from '../../core/types/helper.types'
import {
DatabaseObjectResponse,
StringRequest,
CheckboxPropertyItemObjectResponse,
MultiSelectPropertyItemObjectResponse,
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
import { OPEN_PLAY_POS_ITEMS_PROPS_TO_IDS } from './constants'

export interface OpenPlayPosItemsResponse extends WithOptional<Omit<DatabaseObjectResponse, 'properties'>, 'title'| 'description'| 'is_inline'| 'url'| 'public_url'> {
  properties: {
    "Highlight": CheckboxPropertyItemObjectResponse,
    "Food Discount": RichTextPropertyItemObjectResponse,
    "ID": RichTextPropertyItemObjectResponse,
    "Workshops Included": RichTextPropertyItemObjectResponse,
    "Duration": RichTextPropertyItemObjectResponse,
    "Perks": Omit<MultiSelectPropertyItemObjectResponse, 'multi_select'> & { multi_select: [{ id: StringRequest, name: '10 separate full days of play', color: 'green' } | { id: StringRequest, name: 'Come & go on same day', color: 'blue' } | { id: StringRequest, name: '2 included kids workshops', color: 'pink' } | { id: StringRequest, name: '10% off food & drinks', color: 'red' } | { id: StringRequest, name: 'Free adult/nanny entry', color: 'purple' } | { id: StringRequest, name: 'Unlimited play for one child', color: 'yellow' } | { id: StringRequest, name: 'Up to 8 included workshops/month', color: 'gray' } | { id: StringRequest, name: '15% off food & drinks', color: 'orange' } | { id: StringRequest, name: '50% off one birthday party/year', color: 'default' } | { id: StringRequest, name: '1 free guest pass/month', color: 'brown' } | { id: StringRequest, name: 'Unlimited play for 12 months', color: 'red' } | { id: StringRequest, name: 'All included kids workshops', color: 'default' } | { id: StringRequest, name: '2 free guest passes/month', color: 'purple' } | { id: StringRequest, name: 'Priority event RSVP', color: 'red' }]},
    "Access": RichTextPropertyItemObjectResponse,
    "Price (Baht)": NumberPropertyItemObjectResponse,
    "Name": TitlePropertyItemObjectResponse,
    "Category": Omit<SelectPropertyItemObjectResponse, 'select'> & { select: { id: StringRequest, name: 'Membership', color: 'orange' } | { id: StringRequest, name: 'Entry', color: 'purple' }},
    "LoyverseID": RichTextPropertyItemObjectResponse
  }
}

export type OpenPlayPosItemsResponseProperties = keyof OpenPlayPosItemsResponse['properties']
export type OpenPlayPosItemsPath = Join<PathsToStringProps<OpenPlayPosItemsResponse>>

type OpenPlayPosItemsHighlightPropertyFilter = CheckboxPropertyFilter
type OpenPlayPosItemsFoodDiscountPropertyFilter = TextPropertyFilter
type OpenPlayPosItemsIdPropertyFilter = TextPropertyFilter
type OpenPlayPosItemsWorkshopsIncludedPropertyFilter = TextPropertyFilter
type OpenPlayPosItemsDurationPropertyFilter = TextPropertyFilter

export type OpenPlayPosItemsPerksPropertyType = OpenPlayPosItemsResponse['properties']['Perks']['multi_select'][number]['name']

type OpenPlayPosItemsPerksPropertyFilter =
  | {
      contains: OpenPlayPosItemsPerksPropertyType
    }
  | {
      does_not_contain: OpenPlayPosItemsPerksPropertyType
    }          
  | ExistencePropertyFilter

type OpenPlayPosItemsAccessPropertyFilter = TextPropertyFilter
type OpenPlayPosItemsPriceBahtPropertyFilter = NumberPropertyFilter
type OpenPlayPosItemsNamePropertyFilter = TextPropertyFilter

export type OpenPlayPosItemsCategoryPropertyType = OpenPlayPosItemsResponse['properties']['Category']['select']['name']

type OpenPlayPosItemsCategoryPropertyFilter =
  | {
      equals: OpenPlayPosItemsCategoryPropertyType
    }
  | {
      does_not_equal: OpenPlayPosItemsCategoryPropertyType
    }
  | ExistencePropertyFilter      

type OpenPlayPosItemsLoyverseIdPropertyFilter = TextPropertyFilter

export type OpenPlayPosItemsPropertyFilter = { highlight: OpenPlayPosItemsHighlightPropertyFilter } | { foodDiscount: OpenPlayPosItemsFoodDiscountPropertyFilter } | { id: OpenPlayPosItemsIdPropertyFilter } | { workshopsIncluded: OpenPlayPosItemsWorkshopsIncludedPropertyFilter } | { duration: OpenPlayPosItemsDurationPropertyFilter } | { perks: OpenPlayPosItemsPerksPropertyFilter } | { access: OpenPlayPosItemsAccessPropertyFilter } | { priceBaht: OpenPlayPosItemsPriceBahtPropertyFilter } | { name: OpenPlayPosItemsNamePropertyFilter } | { category: OpenPlayPosItemsCategoryPropertyFilter } | { loyverseId: OpenPlayPosItemsLoyverseIdPropertyFilter }

export type OpenPlayPosItemsQuery = Omit<QueryDatabaseBodyParameters, 'filter' | 'sorts'> & {
  sorts?: Array<
  | {
      property: keyof typeof OPEN_PLAY_POS_ITEMS_PROPS_TO_IDS
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
          | OpenPlayPosItemsPropertyFilter
          | TimestampCreatedTimeFilter
          | TimestampLastEditedTimeFilter
          | {
              // or: OpenPlayPosItemsQuery['filter']
              or: Array<OpenPlayPosItemsPropertyFilter>
            }
          | {
              // and: OpenPlayPosItemsQuery['filter']
              and: Array<OpenPlayPosItemsPropertyFilter>
            }
        >
      }
    | {
        and: Array<
          | OpenPlayPosItemsPropertyFilter
          | TimestampCreatedTimeFilter
          | TimestampLastEditedTimeFilter
          | {
              // or: OpenPlayPosItemsQuery['filter']
              or: Array<OpenPlayPosItemsPropertyFilter>
            }
          | {
              // and: OpenPlayPosItemsQuery['filter']
              and: Array<OpenPlayPosItemsPropertyFilter>
            }
        >
      }
    | OpenPlayPosItemsPropertyFilter
    | TimestampCreatedTimeFilter
    | TimestampLastEditedTimeFilter
}

export type OpenPlayPosItemsQueryFilter = OpenPlayPosItemsQuery['filter']

export type OpenPlayPosItemsQueryResponse = {
  results: OpenPlayPosItemsResponse[]
  next_cursor: string | null
  has_more: boolean
}

