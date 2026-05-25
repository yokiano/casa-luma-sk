import { WithOptional, Join, PathsToStringProps } from '../../core/types/helper.types'
import {
DatabaseObjectResponse,
StringRequest,
FormulaPropertyItemObjectResponse,
NumberPropertyItemObjectResponse,
RelationPropertyItemObjectResponse,
TitlePropertyItemObjectResponse,
ExistencePropertyFilter,
QueryDatabaseBodyParameters,
TimestampCreatedTimeFilter,
TimestampLastEditedTimeFilter,
FormulaPropertyFilter,
NumberPropertyFilter,
RelationPropertyFilter,
TextPropertyFilter
} from '../../core/types/notion-api.types'
import { RECIPE_LINES_PROPS_TO_IDS } from './constants'

export interface RecipeLinesResponse extends WithOptional<Omit<DatabaseObjectResponse, 'properties'>, 'title'| 'description'| 'is_inline'| 'url'| 'public_url'> {
  properties: {
    "Amount": NumberPropertyItemObjectResponse,
    "Line Cost": FormulaPropertyItemObjectResponse,
    "Unit": FormulaPropertyItemObjectResponse,
    "Ingredient": RelationPropertyItemObjectResponse,
    "Name": TitlePropertyItemObjectResponse
  }
}

export type RecipeLinesResponseProperties = keyof RecipeLinesResponse['properties']
export type RecipeLinesPath = Join<PathsToStringProps<RecipeLinesResponse>>

type RecipeLinesAmountPropertyFilter = NumberPropertyFilter
type RecipeLinesLineCostPropertyFilter = FormulaPropertyFilter
type RecipeLinesUnitPropertyFilter = FormulaPropertyFilter
type RecipeLinesIngredientPropertyFilter = RelationPropertyFilter
type RecipeLinesNamePropertyFilter = TextPropertyFilter

export type RecipeLinesPropertyFilter = { amount: RecipeLinesAmountPropertyFilter } | { lineCost: RecipeLinesLineCostPropertyFilter } | { unit: RecipeLinesUnitPropertyFilter } | { ingredient: RecipeLinesIngredientPropertyFilter } | { name: RecipeLinesNamePropertyFilter }

export type RecipeLinesQuery = Omit<QueryDatabaseBodyParameters, 'filter' | 'sorts'> & {
  sorts?: Array<
  | {
      property: keyof typeof RECIPE_LINES_PROPS_TO_IDS
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
          | RecipeLinesPropertyFilter
          | TimestampCreatedTimeFilter
          | TimestampLastEditedTimeFilter
          | {
              // or: RecipeLinesQuery['filter']
              or: Array<RecipeLinesPropertyFilter>
            }
          | {
              // and: RecipeLinesQuery['filter']
              and: Array<RecipeLinesPropertyFilter>
            }
        >
      }
    | {
        and: Array<
          | RecipeLinesPropertyFilter
          | TimestampCreatedTimeFilter
          | TimestampLastEditedTimeFilter
          | {
              // or: RecipeLinesQuery['filter']
              or: Array<RecipeLinesPropertyFilter>
            }
          | {
              // and: RecipeLinesQuery['filter']
              and: Array<RecipeLinesPropertyFilter>
            }
        >
      }
    | RecipeLinesPropertyFilter
    | TimestampCreatedTimeFilter
    | TimestampLastEditedTimeFilter
}

export type RecipeLinesQueryFilter = RecipeLinesQuery['filter']

export type RecipeLinesQueryResponse = {
  results: RecipeLinesResponse[]
  next_cursor: string | null
  has_more: boolean
}

