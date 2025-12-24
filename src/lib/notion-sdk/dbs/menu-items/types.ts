import { WithOptional, Join, PathsToStringProps } from '../../core/types/helper.types'
import {
DatabaseObjectResponse,
StringRequest,
FilesPropertyItemObjectResponse,
MultiSelectPropertyItemObjectResponse,
NumberPropertyItemObjectResponse,
RichTextPropertyItemObjectResponse,
SelectPropertyItemObjectResponse,
StatusPropertyItemObjectResponse,
TitlePropertyItemObjectResponse,
ExistencePropertyFilter,
QueryDatabaseBodyParameters,
TimestampCreatedTimeFilter,
TimestampLastEditedTimeFilter,
NumberPropertyFilter,
TextPropertyFilter
} from '../../core/types/notion-api.types'
import { MENU_ITEMS_PROPS_TO_IDS } from './constants'

export interface MenuItemsResponse extends WithOptional<Omit<DatabaseObjectResponse, 'properties'>, 'title'| 'description'| 'is_inline'| 'url'| 'public_url'> {
  properties: {
    "Description": RichTextPropertyItemObjectResponse,
    "Dietary Options": Omit<MultiSelectPropertyItemObjectResponse, 'multi_select'> & { multi_select: [{ id: StringRequest, name: 'Vegetarian', color: 'green' } | { id: StringRequest, name: 'Vegan', color: 'purple' } | { id: StringRequest, name: 'Gluten-Free', color: 'yellow' } | { id: StringRequest, name: 'Dairy-Free', color: 'blue' } | { id: StringRequest, name: 'Keto', color: 'orange' } | { id: StringRequest, name: 'Paleo', color: 'brown' } | { id: StringRequest, name: 'Nut-Free', color: 'pink' } | { id: StringRequest, name: 'Low-Carb', color: 'red' }]},
    "COGS": NumberPropertyItemObjectResponse,
    "Price": NumberPropertyItemObjectResponse,
    "Ingridients": Omit<MultiSelectPropertyItemObjectResponse, 'multi_select'> & { multi_select: [{ id: StringRequest, name: 'Cucumber', color: 'green' } | { id: StringRequest, name: 'Pineapple', color: 'yellow' } | { id: StringRequest, name: 'Celery', color: 'green' } | { id: StringRequest, name: 'Lime', color: 'green' } | { id: StringRequest, name: 'Beetroot', color: 'pink' } | { id: StringRequest, name: 'Apple', color: 'red' } | { id: StringRequest, name: 'Ginger', color: 'brown' }]},
    "Allergens": Omit<MultiSelectPropertyItemObjectResponse, 'multi_select'> & { multi_select: [{ id: StringRequest, name: 'Dairy', color: 'blue' } | { id: StringRequest, name: 'Eggs', color: 'yellow' } | { id: StringRequest, name: 'Gluten', color: 'brown' } | { id: StringRequest, name: 'Wheat', color: 'orange' } | { id: StringRequest, name: 'Nuts', color: 'brown' } | { id: StringRequest, name: 'Peanuts', color: 'red' } | { id: StringRequest, name: 'Soy', color: 'green' } | { id: StringRequest, name: 'Fish', color: 'blue' } | { id: StringRequest, name: 'Shellfish', color: 'pink' } | { id: StringRequest, name: 'Sesame', color: 'yellow' }]},
    "Image": FilesPropertyItemObjectResponse,
    "Category": Omit<SelectPropertyItemObjectResponse, 'select'> & { select: { id: StringRequest, name: 'Coffee & More', color: 'brown' } | { id: StringRequest, name: 'Fresh Cold-Pressed Juices', color: 'green' } | { id: StringRequest, name: 'House Smoothies', color: 'pink' } | { id: StringRequest, name: 'Soft Drinks', color: 'blue' } | { id: StringRequest, name: 'Sandwiches & Toasties', color: 'orange' } | { id: StringRequest, name: 'Croissant Sandwich', color: 'yellow' } | { id: StringRequest, name: 'Open Toasts', color: 'yellow' } | { id: StringRequest, name: 'Personal Pizzas', color: 'red' } | { id: StringRequest, name: 'Salads', color: 'green' } | { id: StringRequest, name: 'Goodies Sets', color: 'purple' } | { id: StringRequest, name: 'Sweet Morning', color: 'orange' } | { id: StringRequest, name: 'Comfort Food', color: 'gray' } | { id: StringRequest, name: 'Desserts', color: 'pink' } | { id: StringRequest, name: 'Kids Pizza', color: 'red' } | { id: StringRequest, name: 'Kids Favorites', color: 'yellow' } | { id: StringRequest, name: 'Kids Small Plates', color: 'blue' } | { id: StringRequest, name: 'Kids Beverage', color: 'blue' }},
    "Name": TitlePropertyItemObjectResponse,
    "LoyverseID": RichTextPropertyItemObjectResponse,
    "Grand Category": Omit<SelectPropertyItemObjectResponse, 'select'> & { select: { id: StringRequest, name: 'Food', color: 'yellow' } | { id: StringRequest, name: 'Drinks', color: 'green' } | { id: StringRequest, name: 'Kids', color: 'pink' } | { id: StringRequest, name: 'Desserts', color: 'default' }},
    "Status": Omit<StatusPropertyItemObjectResponse, 'status'> & { status: { id: StringRequest, name: 'Active', color: 'green' } | { id: StringRequest, name: 'Archived', color: 'gray' }}
  }
}

export type MenuItemsResponseProperties = keyof MenuItemsResponse['properties']
export type MenuItemsPath = Join<PathsToStringProps<MenuItemsResponse>>

type MenuItemsDescriptionPropertyFilter = TextPropertyFilter

export type MenuItemsDietaryOptionsPropertyType = MenuItemsResponse['properties']['Dietary Options']['multi_select'][number]['name']

type MenuItemsDietaryOptionsPropertyFilter =
  | {
      contains: MenuItemsDietaryOptionsPropertyType
    }
  | {
      does_not_contain: MenuItemsDietaryOptionsPropertyType
    }          
  | ExistencePropertyFilter

type MenuItemsCogsPropertyFilter = NumberPropertyFilter
type MenuItemsPricePropertyFilter = NumberPropertyFilter

export type MenuItemsIngridientsPropertyType = MenuItemsResponse['properties']['Ingridients']['multi_select'][number]['name']

type MenuItemsIngridientsPropertyFilter =
  | {
      contains: MenuItemsIngridientsPropertyType
    }
  | {
      does_not_contain: MenuItemsIngridientsPropertyType
    }          
  | ExistencePropertyFilter


export type MenuItemsAllergensPropertyType = MenuItemsResponse['properties']['Allergens']['multi_select'][number]['name']

type MenuItemsAllergensPropertyFilter =
  | {
      contains: MenuItemsAllergensPropertyType
    }
  | {
      does_not_contain: MenuItemsAllergensPropertyType
    }          
  | ExistencePropertyFilter

type MenuItemsImagePropertyFilter = ExistencePropertyFilter

export type MenuItemsCategoryPropertyType = MenuItemsResponse['properties']['Category']['select']['name']

type MenuItemsCategoryPropertyFilter =
  | {
      equals: MenuItemsCategoryPropertyType
    }
  | {
      does_not_equal: MenuItemsCategoryPropertyType
    }
  | ExistencePropertyFilter      

type MenuItemsNamePropertyFilter = TextPropertyFilter
type MenuItemsLoyverseIdPropertyFilter = TextPropertyFilter

export type MenuItemsGrandCategoryPropertyType = MenuItemsResponse['properties']['Grand Category']['select']['name']

type MenuItemsGrandCategoryPropertyFilter =
  | {
      equals: MenuItemsGrandCategoryPropertyType
    }
  | {
      does_not_equal: MenuItemsGrandCategoryPropertyType
    }
  | ExistencePropertyFilter      


export type MenuItemsStatusPropertyType = MenuItemsResponse['properties']['Status']['status']['name']

type MenuItemsStatusPropertyFilter =
  | {
      equals: MenuItemsStatusPropertyType
    }
  | {
      does_not_equal: MenuItemsStatusPropertyType
    }
  | ExistencePropertyFilter      


export type MenuItemsPropertyFilter = { description: MenuItemsDescriptionPropertyFilter } | { dietaryOptions: MenuItemsDietaryOptionsPropertyFilter } | { cogs: MenuItemsCogsPropertyFilter } | { price: MenuItemsPricePropertyFilter } | { ingridients: MenuItemsIngridientsPropertyFilter } | { allergens: MenuItemsAllergensPropertyFilter } | { image: MenuItemsImagePropertyFilter } | { category: MenuItemsCategoryPropertyFilter } | { name: MenuItemsNamePropertyFilter } | { loyverseId: MenuItemsLoyverseIdPropertyFilter } | { grandCategory: MenuItemsGrandCategoryPropertyFilter } | { status: MenuItemsStatusPropertyFilter }

export type MenuItemsQuery = Omit<QueryDatabaseBodyParameters, 'filter' | 'sorts'> & {
  sorts?: Array<
  | {
      property: keyof typeof MENU_ITEMS_PROPS_TO_IDS
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
          | MenuItemsPropertyFilter
          | TimestampCreatedTimeFilter
          | TimestampLastEditedTimeFilter
          | {
              // or: MenuItemsQuery['filter']
              or: Array<MenuItemsPropertyFilter>
            }
          | {
              // and: MenuItemsQuery['filter']
              and: Array<MenuItemsPropertyFilter>
            }
        >
      }
    | {
        and: Array<
          | MenuItemsPropertyFilter
          | TimestampCreatedTimeFilter
          | TimestampLastEditedTimeFilter
          | {
              // or: MenuItemsQuery['filter']
              or: Array<MenuItemsPropertyFilter>
            }
          | {
              // and: MenuItemsQuery['filter']
              and: Array<MenuItemsPropertyFilter>
            }
        >
      }
    | MenuItemsPropertyFilter
    | TimestampCreatedTimeFilter
    | TimestampLastEditedTimeFilter
}

export type MenuItemsQueryFilter = MenuItemsQuery['filter']

export type MenuItemsQueryResponse = {
  results: MenuItemsResponse[]
  next_cursor: string | null
  has_more: boolean
}

