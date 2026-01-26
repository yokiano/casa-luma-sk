import { WithOptional, Join, PathsToStringProps } from '../../core/types/helper.types'
import {
DatabaseObjectResponse,
StringRequest,
FilesPropertyItemObjectResponse,
MultiSelectPropertyItemObjectResponse,
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
NumberPropertyFilter,
RelationPropertyFilter,
TextPropertyFilter
} from '../../core/types/notion-api.types'
import { INGREDIENTS_PROPS_TO_IDS } from './constants'

export interface IngredientsResponse extends WithOptional<Omit<DatabaseObjectResponse, 'properties'>, 'title'| 'description'| 'is_inline'| 'url'| 'public_url'> {
  properties: {
    "Cost": NumberPropertyItemObjectResponse,
    "Department": Omit<MultiSelectPropertyItemObjectResponse, 'multi_select'> & { multi_select: [{ id: StringRequest, name: 'Bar', color: 'brown' } | { id: StringRequest, name: 'Kitchen', color: 'pink' }]},
    "Supplier": RelationPropertyItemObjectResponse,
    "Unit": Omit<SelectPropertyItemObjectResponse, 'select'> & { select: { id: StringRequest, name: 'kg', color: 'green' } | { id: StringRequest, name: 'g', color: 'blue' } | { id: StringRequest, name: 'L', color: 'gray' } | { id: StringRequest, name: 'ml', color: 'red' } | { id: StringRequest, name: 'unit', color: 'yellow' } | { id: StringRequest, name: 'pack', color: 'purple' } | { id: StringRequest, name: '100g', color: 'orange' }},
    "Sku": RichTextPropertyItemObjectResponse,
    "Thai Name": RichTextPropertyItemObjectResponse,
    "Weight (g)": NumberPropertyItemObjectResponse,
    "Order Link": UrlPropertyItemObjectResponse,
    "Image": FilesPropertyItemObjectResponse,
    "Name": TitlePropertyItemObjectResponse
  }
}

export type IngredientsResponseProperties = keyof IngredientsResponse['properties']
export type IngredientsPath = Join<PathsToStringProps<IngredientsResponse>>

type IngredientsCostPropertyFilter = NumberPropertyFilter

export type IngredientsDepartmentPropertyType = IngredientsResponse['properties']['Department']['multi_select'][number]['name']

type IngredientsDepartmentPropertyFilter =
  | {
      contains: IngredientsDepartmentPropertyType
    }
  | {
      does_not_contain: IngredientsDepartmentPropertyType
    }          
  | ExistencePropertyFilter

type IngredientsSupplierPropertyFilter = RelationPropertyFilter

export type IngredientsUnitPropertyType = IngredientsResponse['properties']['Unit']['select']['name']

type IngredientsUnitPropertyFilter =
  | {
      equals: IngredientsUnitPropertyType
    }
  | {
      does_not_equal: IngredientsUnitPropertyType
    }
  | ExistencePropertyFilter      

type IngredientsSkuPropertyFilter = TextPropertyFilter
type IngredientsThaiNamePropertyFilter = TextPropertyFilter
type IngredientsWeightGPropertyFilter = NumberPropertyFilter
type IngredientsOrderLinkPropertyFilter = TextPropertyFilter
type IngredientsImagePropertyFilter = ExistencePropertyFilter
type IngredientsNamePropertyFilter = TextPropertyFilter

export type IngredientsPropertyFilter = { cost: IngredientsCostPropertyFilter } | { department: IngredientsDepartmentPropertyFilter } | { supplier: IngredientsSupplierPropertyFilter } | { unit: IngredientsUnitPropertyFilter } | { sku: IngredientsSkuPropertyFilter } | { thaiName: IngredientsThaiNamePropertyFilter } | { weightG: IngredientsWeightGPropertyFilter } | { orderLink: IngredientsOrderLinkPropertyFilter } | { image: IngredientsImagePropertyFilter } | { name: IngredientsNamePropertyFilter }

export type IngredientsQuery = Omit<QueryDatabaseBodyParameters, 'filter' | 'sorts'> & {
  sorts?: Array<
  | {
      property: keyof typeof INGREDIENTS_PROPS_TO_IDS
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
          | IngredientsPropertyFilter
          | TimestampCreatedTimeFilter
          | TimestampLastEditedTimeFilter
          | {
              // or: IngredientsQuery['filter']
              or: Array<IngredientsPropertyFilter>
            }
          | {
              // and: IngredientsQuery['filter']
              and: Array<IngredientsPropertyFilter>
            }
        >
      }
    | {
        and: Array<
          | IngredientsPropertyFilter
          | TimestampCreatedTimeFilter
          | TimestampLastEditedTimeFilter
          | {
              // or: IngredientsQuery['filter']
              or: Array<IngredientsPropertyFilter>
            }
          | {
              // and: IngredientsQuery['filter']
              and: Array<IngredientsPropertyFilter>
            }
        >
      }
    | IngredientsPropertyFilter
    | TimestampCreatedTimeFilter
    | TimestampLastEditedTimeFilter
}

export type IngredientsQueryFilter = IngredientsQuery['filter']

export type IngredientsQueryResponse = {
  results: IngredientsResponse[]
  next_cursor: string | null
  has_more: boolean
}

