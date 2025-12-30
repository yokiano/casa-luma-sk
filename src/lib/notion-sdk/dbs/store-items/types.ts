import { WithOptional, Join, PathsToStringProps } from '../../core/types/helper.types'
import {
DatabaseObjectResponse,
StringRequest,
CreatedByPropertyItemObjectResponse,
CreatedTimePropertyItemObjectResponse,
DatePropertyItemObjectResponse,
FilesPropertyItemObjectResponse,
LastEditedByPropertyItemObjectResponse,
LastEditedTimePropertyItemObjectResponse,
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
NumberPropertyFilter,
PeoplePropertyFilter,
RelationPropertyFilter,
TextPropertyFilter
} from '../../core/types/notion-api.types'
import { STORE_ITEMS_PROPS_TO_IDS } from './constants'

export interface StoreItemsResponse extends WithOptional<Omit<DatabaseObjectResponse, 'properties'>, 'title'| 'description'| 'is_inline'| 'url'| 'public_url'> {
  properties: {
    "Procurement Item": RelationPropertyItemObjectResponse,
    "Category": SelectPropertyItemObjectResponse,
    "Supplier": RelationPropertyItemObjectResponse,
    "Price": NumberPropertyItemObjectResponse,
    "LoyverseID": RichTextPropertyItemObjectResponse,
    "Stock": NumberPropertyItemObjectResponse,
    "Expiry Date": DatePropertyItemObjectResponse,
    "COGS": NumberPropertyItemObjectResponse,
    "Image": FilesPropertyItemObjectResponse,
    "Description": RichTextPropertyItemObjectResponse,
    "Name": TitlePropertyItemObjectResponse,
    "Created time": CreatedTimePropertyItemObjectResponse,
    "Last edited by": LastEditedByPropertyItemObjectResponse,
    "Created by": CreatedByPropertyItemObjectResponse,
    "Last edited time": LastEditedTimePropertyItemObjectResponse
  }
}

export type StoreItemsResponseProperties = keyof StoreItemsResponse['properties']
export type StoreItemsPath = Join<PathsToStringProps<StoreItemsResponse>>

type StoreItemsProcurementItemPropertyFilter = RelationPropertyFilter

export type StoreItemsCategoryPropertyType = StoreItemsResponse['properties']['Category']['select']['name']

type StoreItemsCategoryPropertyFilter =
  | {
      equals: StoreItemsCategoryPropertyType
    }
  | {
      does_not_equal: StoreItemsCategoryPropertyType
    }
  | ExistencePropertyFilter      

type StoreItemsSupplierPropertyFilter = RelationPropertyFilter
type StoreItemsPricePropertyFilter = NumberPropertyFilter
type StoreItemsLoyverseIdPropertyFilter = TextPropertyFilter
type StoreItemsStockPropertyFilter = NumberPropertyFilter
type StoreItemsExpiryDatePropertyFilter = DatePropertyFilter
type StoreItemsCogsPropertyFilter = NumberPropertyFilter
type StoreItemsImagePropertyFilter = ExistencePropertyFilter
type StoreItemsDescriptionPropertyFilter = TextPropertyFilter
type StoreItemsNamePropertyFilter = TextPropertyFilter
type StoreItemsCreatedTimePropertyFilter = DatePropertyFilter
type StoreItemsLastEditedByPropertyFilter = PeoplePropertyFilter
type StoreItemsCreatedByPropertyFilter = PeoplePropertyFilter
type StoreItemsLastEditedTimePropertyFilter = DatePropertyFilter

export type StoreItemsPropertyFilter = { procurementItem: StoreItemsProcurementItemPropertyFilter } | { category: StoreItemsCategoryPropertyFilter } | { supplier: StoreItemsSupplierPropertyFilter } | { price: StoreItemsPricePropertyFilter } | { loyverseId: StoreItemsLoyverseIdPropertyFilter } | { stock: StoreItemsStockPropertyFilter } | { expiryDate: StoreItemsExpiryDatePropertyFilter } | { cogs: StoreItemsCogsPropertyFilter } | { image: StoreItemsImagePropertyFilter } | { description: StoreItemsDescriptionPropertyFilter } | { name: StoreItemsNamePropertyFilter } | { createdTime: StoreItemsCreatedTimePropertyFilter } | { lastEditedBy: StoreItemsLastEditedByPropertyFilter } | { createdBy: StoreItemsCreatedByPropertyFilter } | { lastEditedTime: StoreItemsLastEditedTimePropertyFilter }

export type StoreItemsQuery = Omit<QueryDatabaseBodyParameters, 'filter' | 'sorts'> & {
  sorts?: Array<
  | {
      property: keyof typeof STORE_ITEMS_PROPS_TO_IDS
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
          | StoreItemsPropertyFilter
          | TimestampCreatedTimeFilter
          | TimestampLastEditedTimeFilter
          | {
              // or: StoreItemsQuery['filter']
              or: Array<StoreItemsPropertyFilter>
            }
          | {
              // and: StoreItemsQuery['filter']
              and: Array<StoreItemsPropertyFilter>
            }
        >
      }
    | {
        and: Array<
          | StoreItemsPropertyFilter
          | TimestampCreatedTimeFilter
          | TimestampLastEditedTimeFilter
          | {
              // or: StoreItemsQuery['filter']
              or: Array<StoreItemsPropertyFilter>
            }
          | {
              // and: StoreItemsQuery['filter']
              and: Array<StoreItemsPropertyFilter>
            }
        >
      }
    | StoreItemsPropertyFilter
    | TimestampCreatedTimeFilter
    | TimestampLastEditedTimeFilter
}

export type StoreItemsQueryFilter = StoreItemsQuery['filter']

export type StoreItemsQueryResponse = {
  results: StoreItemsResponse[]
  next_cursor: string | null
  has_more: boolean
}

