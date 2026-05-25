import { WithOptional, Join, PathsToStringProps } from '../../core/types/helper.types'
import {
DatabaseObjectResponse,
StringRequest,
CreatedByPropertyItemObjectResponse,
CreatedTimePropertyItemObjectResponse,
FilesPropertyItemObjectResponse,
FormulaPropertyItemObjectResponse,
LastEditedByPropertyItemObjectResponse,
LastEditedTimePropertyItemObjectResponse,
MultiSelectPropertyItemObjectResponse,
NumberPropertyItemObjectResponse,
RelationPropertyItemObjectResponse,
RichTextPropertyItemObjectResponse,
SelectPropertyItemObjectResponse,
StatusPropertyItemObjectResponse,
TitlePropertyItemObjectResponse,
ExistencePropertyFilter,
QueryDatabaseBodyParameters,
TimestampCreatedTimeFilter,
TimestampLastEditedTimeFilter,
DatePropertyFilter,
FormulaPropertyFilter,
NumberPropertyFilter,
PeoplePropertyFilter,
RelationPropertyFilter,
TextPropertyFilter
} from '../../core/types/notion-api.types'
import { PROCUREMENT_PROPS_TO_IDS } from './constants'

export interface ProcurementResponse extends WithOptional<Omit<DatabaseObjectResponse, 'properties'>, 'title'| 'description'| 'is_inline'| 'url'| 'public_url'> {
  properties: {
    "Supplier": RelationPropertyItemObjectResponse,
    "Parent item": RelationPropertyItemObjectResponse,
    "Link": RichTextPropertyItemObjectResponse,
    "Tracking Number": RichTextPropertyItemObjectResponse,
    "Department": Omit<MultiSelectPropertyItemObjectResponse, 'multi_select'> & { multi_select: [{ id: StringRequest, name: 'Main Hall', color: 'blue' } | { id: StringRequest, name: 'Cowork', color: 'purple' } | { id: StringRequest, name: 'Art Room', color: 'pink' } | { id: StringRequest, name: 'Fun Room', color: 'orange' } | { id: StringRequest, name: 'Patio', color: 'green' } | { id: StringRequest, name: 'Workshops', color: 'brown' } | { id: StringRequest, name: 'Pool', color: 'blue' } | { id: StringRequest, name: 'Garden', color: 'green' } | { id: StringRequest, name: 'General', color: 'gray' } | { id: StringRequest, name: 'Kitchen', color: 'red' } | { id: StringRequest, name: 'Office', color: 'yellow' } | { id: StringRequest, name: 'Cashier', color: 'default' } | { id: StringRequest, name: 'Birthdays', color: 'default' }]},
    "Notes": RichTextPropertyItemObjectResponse,
    "Invoice": FilesPropertyItemObjectResponse,
    "Tags": Omit<MultiSelectPropertyItemObjectResponse, 'multi_select'> & { multi_select: [{ id: StringRequest, name: 'Pay To Play', color: 'orange' } | { id: StringRequest, name: 'Sample', color: 'red' }]},
    "Total Price": FormulaPropertyItemObjectResponse,
    "Price (THB)": NumberPropertyItemObjectResponse,
    "Sub-item": RelationPropertyItemObjectResponse,
    "Paid From": Omit<SelectPropertyItemObjectResponse, 'select'> & { select: { id: StringRequest, name: 'Yarden (cash)', color: 'default' } | { id: StringRequest, name: 'Ohad (Cash)', color: 'green' } | { id: StringRequest, name: 'Yarden (Poalim)', color: 'red' } | { id: StringRequest, name: 'Ohad (Thai Bank)', color: 'yellow' }},
    "Image": FilesPropertyItemObjectResponse,
    "Price 10/10": NumberPropertyItemObjectResponse,
    "Quantity": NumberPropertyItemObjectResponse,
    "Object Category": Omit<MultiSelectPropertyItemObjectResponse, 'multi_select'> & { multi_select: [{ id: StringRequest, name: 'Kids Safety', color: 'pink' } | { id: StringRequest, name: 'Kitchen Equipment', color: 'default' } | { id: StringRequest, name: 'Furniture', color: 'purple' } | { id: StringRequest, name: 'Outdoor Playground', color: 'red' } | { id: StringRequest, name: 'Pretend Play', color: 'green' } | { id: StringRequest, name: 'Gross Motor', color: 'orange' } | { id: StringRequest, name: 'Soft Play', color: 'brown' } | { id: StringRequest, name: 'Storage', color: 'yellow' } | { id: StringRequest, name: 'STEM', color: 'gray' } | { id: StringRequest, name: 'Lego', color: 'blue' } | { id: StringRequest, name: 'Educational', color: 'green' } | { id: StringRequest, name: 'Building Blocks', color: 'orange' } | { id: StringRequest, name: 'Garden maintenance', color: 'blue' } | { id: StringRequest, name: 'Once', color: 'purple' } | { id: StringRequest, name: 'Board Game', color: 'red' } | { id: StringRequest, name: 'Thinking / Puzzle', color: 'orange' } | { id: StringRequest, name: 'Montessori Toy', color: 'blue' } | { id: StringRequest, name: 'Toddler Book', color: 'brown' } | { id: StringRequest, name: 'Stuffed Toys', color: 'pink' } | { id: StringRequest, name: '1 on 1 Game', color: 'gray' } | { id: StringRequest, name: 'Toddler Toys', color: 'yellow' } | { id: StringRequest, name: 'Cooling & Ventilation', color: 'pink' } | { id: StringRequest, name: 'Play Together', color: 'blue' } | { id: StringRequest, name: 'Decoration', color: 'default' } | { id: StringRequest, name: 'Arts & Crafts', color: 'green' } | { id: StringRequest, name: 'caffee', color: 'pink' } | { id: StringRequest, name: 'Curtains', color: 'gray' } | { id: StringRequest, name: 'Display', color: 'brown' } | { id: StringRequest, name: 'Logistics', color: 'purple' }]},
    "Status": Omit<StatusPropertyItemObjectResponse, 'status'> & { status: { id: StringRequest, name: 'Out Of Stock', color: 'red' } | { id: StringRequest, name: 'Idea', color: 'gray' } | { id: StringRequest, name: 'Research', color: 'yellow' } | { id: StringRequest, name: 'Negotiating', color: 'brown' } | { id: StringRequest, name: 'Quoted', color: 'pink' } | { id: StringRequest, name: 'Approved', color: 'orange' } | { id: StringRequest, name: 'Ordered', color: 'blue' } | { id: StringRequest, name: 'Shipped', color: 'purple' } | { id: StringRequest, name: 'Arrived', color: 'pink' } | { id: StringRequest, name: 'Installed', color: 'green' } | { id: StringRequest, name: 'Archived', color: 'default' }},
    "Item": TitlePropertyItemObjectResponse,
    "Pay-for-Play Items": RelationPropertyItemObjectResponse,
    "Store Items": RelationPropertyItemObjectResponse,
    "Created by": CreatedByPropertyItemObjectResponse,
    "Last edited by": LastEditedByPropertyItemObjectResponse,
    "Created time": CreatedTimePropertyItemObjectResponse,
    "Last edited time": LastEditedTimePropertyItemObjectResponse
  }
}

export type ProcurementResponseProperties = keyof ProcurementResponse['properties']
export type ProcurementPath = Join<PathsToStringProps<ProcurementResponse>>

type ProcurementSupplierPropertyFilter = RelationPropertyFilter
type ProcurementParentItemPropertyFilter = RelationPropertyFilter
type ProcurementLinkPropertyFilter = TextPropertyFilter
type ProcurementTrackingNumberPropertyFilter = TextPropertyFilter

export type ProcurementDepartmentPropertyType = ProcurementResponse['properties']['Department']['multi_select'][number]['name']

type ProcurementDepartmentPropertyFilter =
  | {
      contains: ProcurementDepartmentPropertyType
    }
  | {
      does_not_contain: ProcurementDepartmentPropertyType
    }          
  | ExistencePropertyFilter

type ProcurementNotesPropertyFilter = TextPropertyFilter
type ProcurementInvoicePropertyFilter = ExistencePropertyFilter

export type ProcurementTagsPropertyType = ProcurementResponse['properties']['Tags']['multi_select'][number]['name']

type ProcurementTagsPropertyFilter =
  | {
      contains: ProcurementTagsPropertyType
    }
  | {
      does_not_contain: ProcurementTagsPropertyType
    }          
  | ExistencePropertyFilter

type ProcurementTotalPricePropertyFilter = FormulaPropertyFilter
type ProcurementPriceThbPropertyFilter = NumberPropertyFilter
type ProcurementSubItemPropertyFilter = RelationPropertyFilter

export type ProcurementPaidFromPropertyType = ProcurementResponse['properties']['Paid From']['select']['name']

type ProcurementPaidFromPropertyFilter =
  | {
      equals: ProcurementPaidFromPropertyType
    }
  | {
      does_not_equal: ProcurementPaidFromPropertyType
    }
  | ExistencePropertyFilter      

type ProcurementImagePropertyFilter = ExistencePropertyFilter
type ProcurementPrice_1010PropertyFilter = NumberPropertyFilter
type ProcurementQuantityPropertyFilter = NumberPropertyFilter

export type ProcurementObjectCategoryPropertyType = ProcurementResponse['properties']['Object Category']['multi_select'][number]['name']

type ProcurementObjectCategoryPropertyFilter =
  | {
      contains: ProcurementObjectCategoryPropertyType
    }
  | {
      does_not_contain: ProcurementObjectCategoryPropertyType
    }          
  | ExistencePropertyFilter


export type ProcurementStatusPropertyType = ProcurementResponse['properties']['Status']['status']['name']

type ProcurementStatusPropertyFilter =
  | {
      equals: ProcurementStatusPropertyType
    }
  | {
      does_not_equal: ProcurementStatusPropertyType
    }
  | ExistencePropertyFilter      

type ProcurementItemPropertyFilter = TextPropertyFilter
type ProcurementPayForPlayItemsPropertyFilter = RelationPropertyFilter
type ProcurementStoreItemsPropertyFilter = RelationPropertyFilter
type ProcurementCreatedByPropertyFilter = PeoplePropertyFilter
type ProcurementLastEditedByPropertyFilter = PeoplePropertyFilter
type ProcurementCreatedTimePropertyFilter = DatePropertyFilter
type ProcurementLastEditedTimePropertyFilter = DatePropertyFilter

export type ProcurementPropertyFilter = { supplier: ProcurementSupplierPropertyFilter } | { parentItem: ProcurementParentItemPropertyFilter } | { link: ProcurementLinkPropertyFilter } | { trackingNumber: ProcurementTrackingNumberPropertyFilter } | { department: ProcurementDepartmentPropertyFilter } | { notes: ProcurementNotesPropertyFilter } | { invoice: ProcurementInvoicePropertyFilter } | { tags: ProcurementTagsPropertyFilter } | { totalPrice: ProcurementTotalPricePropertyFilter } | { priceThb: ProcurementPriceThbPropertyFilter } | { subItem: ProcurementSubItemPropertyFilter } | { paidFrom: ProcurementPaidFromPropertyFilter } | { image: ProcurementImagePropertyFilter } | { price_1010: ProcurementPrice_1010PropertyFilter } | { quantity: ProcurementQuantityPropertyFilter } | { objectCategory: ProcurementObjectCategoryPropertyFilter } | { status: ProcurementStatusPropertyFilter } | { item: ProcurementItemPropertyFilter } | { payForPlayItems: ProcurementPayForPlayItemsPropertyFilter } | { storeItems: ProcurementStoreItemsPropertyFilter } | { createdBy: ProcurementCreatedByPropertyFilter } | { lastEditedBy: ProcurementLastEditedByPropertyFilter } | { createdTime: ProcurementCreatedTimePropertyFilter } | { lastEditedTime: ProcurementLastEditedTimePropertyFilter }

export type ProcurementQuery = Omit<QueryDatabaseBodyParameters, 'filter' | 'sorts'> & {
  sorts?: Array<
  | {
      property: keyof typeof PROCUREMENT_PROPS_TO_IDS
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
          | ProcurementPropertyFilter
          | TimestampCreatedTimeFilter
          | TimestampLastEditedTimeFilter
          | {
              // or: ProcurementQuery['filter']
              or: Array<ProcurementPropertyFilter>
            }
          | {
              // and: ProcurementQuery['filter']
              and: Array<ProcurementPropertyFilter>
            }
        >
      }
    | {
        and: Array<
          | ProcurementPropertyFilter
          | TimestampCreatedTimeFilter
          | TimestampLastEditedTimeFilter
          | {
              // or: ProcurementQuery['filter']
              or: Array<ProcurementPropertyFilter>
            }
          | {
              // and: ProcurementQuery['filter']
              and: Array<ProcurementPropertyFilter>
            }
        >
      }
    | ProcurementPropertyFilter
    | TimestampCreatedTimeFilter
    | TimestampLastEditedTimeFilter
}

export type ProcurementQueryFilter = ProcurementQuery['filter']

export type ProcurementQueryResponse = {
  results: ProcurementResponse[]
  next_cursor: string | null
  has_more: boolean
}

