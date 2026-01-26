import { WithOptional, Join, PathsToStringProps } from '../../core/types/helper.types'
import {
DatabaseObjectResponse,
StringRequest,
EmailPropertyItemObjectResponse,
FilesPropertyItemObjectResponse,
MultiSelectPropertyItemObjectResponse,
PhoneNumberPropertyItemObjectResponse,
RichTextPropertyItemObjectResponse,
TitlePropertyItemObjectResponse,
UrlPropertyItemObjectResponse,
ExistencePropertyFilter,
QueryDatabaseBodyParameters,
TimestampCreatedTimeFilter,
TimestampLastEditedTimeFilter,
TextPropertyFilter
} from '../../core/types/notion-api.types'
import { SUPPLIERS_PROPS_TO_IDS } from './constants'

export interface SuppliersResponse extends WithOptional<Omit<DatabaseObjectResponse, 'properties'>, 'title'| 'description'| 'is_inline'| 'url'| 'public_url'> {
  properties: {
    "Website": UrlPropertyItemObjectResponse,
    "Location": RichTextPropertyItemObjectResponse,
    "Phone": PhoneNumberPropertyItemObjectResponse,
    "Bank Details": RichTextPropertyItemObjectResponse,
    "Category": Omit<MultiSelectPropertyItemObjectResponse, 'multi_select'> & { multi_select: [{ id: StringRequest, name: 'Food', color: 'orange' } | { id: StringRequest, name: 'Furniture', color: 'brown' } | { id: StringRequest, name: 'Equipment', color: 'gray' } | { id: StringRequest, name: 'Service', color: 'blue' } | { id: StringRequest, name: 'Legal', color: 'red' } | { id: StringRequest, name: 'Maintenance', color: 'green' }]},
    "Contact Person": RichTextPropertyItemObjectResponse,
    "Scan picture": FilesPropertyItemObjectResponse,
    "Email": EmailPropertyItemObjectResponse,
    "Name": TitlePropertyItemObjectResponse
  }
}

export type SuppliersResponseProperties = keyof SuppliersResponse['properties']
export type SuppliersPath = Join<PathsToStringProps<SuppliersResponse>>

type SuppliersWebsitePropertyFilter = TextPropertyFilter
type SuppliersLocationPropertyFilter = TextPropertyFilter
type SuppliersPhonePropertyFilter = TextPropertyFilter
type SuppliersBankDetailsPropertyFilter = TextPropertyFilter

export type SuppliersCategoryPropertyType = SuppliersResponse['properties']['Category']['multi_select'][number]['name']

type SuppliersCategoryPropertyFilter =
  | {
      contains: SuppliersCategoryPropertyType
    }
  | {
      does_not_contain: SuppliersCategoryPropertyType
    }          
  | ExistencePropertyFilter

type SuppliersContactPersonPropertyFilter = TextPropertyFilter
type SuppliersScanPicturePropertyFilter = ExistencePropertyFilter
type SuppliersEmailPropertyFilter = TextPropertyFilter
type SuppliersNamePropertyFilter = TextPropertyFilter

export type SuppliersPropertyFilter = { website: SuppliersWebsitePropertyFilter } | { location: SuppliersLocationPropertyFilter } | { phone: SuppliersPhonePropertyFilter } | { bankDetails: SuppliersBankDetailsPropertyFilter } | { category: SuppliersCategoryPropertyFilter } | { contactPerson: SuppliersContactPersonPropertyFilter } | { scanPicture: SuppliersScanPicturePropertyFilter } | { email: SuppliersEmailPropertyFilter } | { name: SuppliersNamePropertyFilter }

export type SuppliersQuery = Omit<QueryDatabaseBodyParameters, 'filter' | 'sorts'> & {
  sorts?: Array<
  | {
      property: keyof typeof SUPPLIERS_PROPS_TO_IDS
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
          | SuppliersPropertyFilter
          | TimestampCreatedTimeFilter
          | TimestampLastEditedTimeFilter
          | {
              // or: SuppliersQuery['filter']
              or: Array<SuppliersPropertyFilter>
            }
          | {
              // and: SuppliersQuery['filter']
              and: Array<SuppliersPropertyFilter>
            }
        >
      }
    | {
        and: Array<
          | SuppliersPropertyFilter
          | TimestampCreatedTimeFilter
          | TimestampLastEditedTimeFilter
          | {
              // or: SuppliersQuery['filter']
              or: Array<SuppliersPropertyFilter>
            }
          | {
              // and: SuppliersQuery['filter']
              and: Array<SuppliersPropertyFilter>
            }
        >
      }
    | SuppliersPropertyFilter
    | TimestampCreatedTimeFilter
    | TimestampLastEditedTimeFilter
}

export type SuppliersQueryFilter = SuppliersQuery['filter']

export type SuppliersQueryResponse = {
  results: SuppliersResponse[]
  next_cursor: string | null
  has_more: boolean
}

