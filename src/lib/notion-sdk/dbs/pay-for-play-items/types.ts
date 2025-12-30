import { WithOptional, Join, PathsToStringProps } from '../../core/types/helper.types'
import {
DatabaseObjectResponse,
StringRequest,
CreatedByPropertyItemObjectResponse,
CreatedTimePropertyItemObjectResponse,
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
import { PAY_FOR_PLAY_ITEMS_PROPS_TO_IDS } from './constants'

export interface PayForPlayItemsResponse extends WithOptional<Omit<DatabaseObjectResponse, 'properties'>, 'title'| 'description'| 'is_inline'| 'url'| 'public_url'> {
  properties: {
    "Stock": NumberPropertyItemObjectResponse,
    "Price": NumberPropertyItemObjectResponse,
    "Category": Omit<SelectPropertyItemObjectResponse, 'select'> & { select: { id: StringRequest, name: 'Toys', color: 'blue' } | { id: StringRequest, name: 'Merchandise', color: 'purple' } | { id: StringRequest, name: '(p4p) Lego Figurine', color: 'pink' }},
    "COGS": NumberPropertyItemObjectResponse,
    "Description": RichTextPropertyItemObjectResponse,
    "Supplier": RelationPropertyItemObjectResponse,
    "Image": FilesPropertyItemObjectResponse,
    "Name": TitlePropertyItemObjectResponse,
    "LoyverseID": RichTextPropertyItemObjectResponse,
    "Procurement Item": RelationPropertyItemObjectResponse,
    "Created time": CreatedTimePropertyItemObjectResponse,
    "Last edited time": LastEditedTimePropertyItemObjectResponse,
    "Last edited by": LastEditedByPropertyItemObjectResponse,
    "Created by": CreatedByPropertyItemObjectResponse
  }
}

export type PayForPlayItemsResponseProperties = keyof PayForPlayItemsResponse['properties']
export type PayForPlayItemsPath = Join<PathsToStringProps<PayForPlayItemsResponse>>

type PayForPlayItemsStockPropertyFilter = NumberPropertyFilter
type PayForPlayItemsPricePropertyFilter = NumberPropertyFilter

export type PayForPlayItemsCategoryPropertyType = PayForPlayItemsResponse['properties']['Category']['select']['name']

type PayForPlayItemsCategoryPropertyFilter =
  | {
      equals: PayForPlayItemsCategoryPropertyType
    }
  | {
      does_not_equal: PayForPlayItemsCategoryPropertyType
    }
  | ExistencePropertyFilter      

type PayForPlayItemsCogsPropertyFilter = NumberPropertyFilter
type PayForPlayItemsDescriptionPropertyFilter = TextPropertyFilter
type PayForPlayItemsSupplierPropertyFilter = RelationPropertyFilter
type PayForPlayItemsImagePropertyFilter = ExistencePropertyFilter
type PayForPlayItemsNamePropertyFilter = TextPropertyFilter
type PayForPlayItemsLoyverseIdPropertyFilter = TextPropertyFilter
type PayForPlayItemsProcurementItemPropertyFilter = RelationPropertyFilter
type PayForPlayItemsCreatedTimePropertyFilter = DatePropertyFilter
type PayForPlayItemsLastEditedTimePropertyFilter = DatePropertyFilter
type PayForPlayItemsLastEditedByPropertyFilter = PeoplePropertyFilter
type PayForPlayItemsCreatedByPropertyFilter = PeoplePropertyFilter

export type PayForPlayItemsPropertyFilter = { stock: PayForPlayItemsStockPropertyFilter } | { price: PayForPlayItemsPricePropertyFilter } | { category: PayForPlayItemsCategoryPropertyFilter } | { cogs: PayForPlayItemsCogsPropertyFilter } | { description: PayForPlayItemsDescriptionPropertyFilter } | { supplier: PayForPlayItemsSupplierPropertyFilter } | { image: PayForPlayItemsImagePropertyFilter } | { name: PayForPlayItemsNamePropertyFilter } | { loyverseId: PayForPlayItemsLoyverseIdPropertyFilter } | { procurementItem: PayForPlayItemsProcurementItemPropertyFilter } | { createdTime: PayForPlayItemsCreatedTimePropertyFilter } | { lastEditedTime: PayForPlayItemsLastEditedTimePropertyFilter } | { lastEditedBy: PayForPlayItemsLastEditedByPropertyFilter } | { createdBy: PayForPlayItemsCreatedByPropertyFilter }

export type PayForPlayItemsQuery = Omit<QueryDatabaseBodyParameters, 'filter' | 'sorts'> & {
  sorts?: Array<
  | {
      property: keyof typeof PAY_FOR_PLAY_ITEMS_PROPS_TO_IDS
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
          | PayForPlayItemsPropertyFilter
          | TimestampCreatedTimeFilter
          | TimestampLastEditedTimeFilter
          | {
              // or: PayForPlayItemsQuery['filter']
              or: Array<PayForPlayItemsPropertyFilter>
            }
          | {
              // and: PayForPlayItemsQuery['filter']
              and: Array<PayForPlayItemsPropertyFilter>
            }
        >
      }
    | {
        and: Array<
          | PayForPlayItemsPropertyFilter
          | TimestampCreatedTimeFilter
          | TimestampLastEditedTimeFilter
          | {
              // or: PayForPlayItemsQuery['filter']
              or: Array<PayForPlayItemsPropertyFilter>
            }
          | {
              // and: PayForPlayItemsQuery['filter']
              and: Array<PayForPlayItemsPropertyFilter>
            }
        >
      }
    | PayForPlayItemsPropertyFilter
    | TimestampCreatedTimeFilter
    | TimestampLastEditedTimeFilter
}

export type PayForPlayItemsQueryFilter = PayForPlayItemsQuery['filter']

export type PayForPlayItemsQueryResponse = {
  results: PayForPlayItemsResponse[]
  next_cursor: string | null
  has_more: boolean
}

