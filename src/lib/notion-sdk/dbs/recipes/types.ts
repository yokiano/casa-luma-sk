import { WithOptional, Join, PathsToStringProps } from '../../core/types/helper.types'
import {
DatabaseObjectResponse,
StringRequest,
FilesPropertyItemObjectResponse,
RelationPropertyItemObjectResponse,
RichTextPropertyItemObjectResponse,
RollupPropertyItemObjectResponse,
TitlePropertyItemObjectResponse,
ExistencePropertyFilter,
QueryDatabaseBodyParameters,
TimestampCreatedTimeFilter,
TimestampLastEditedTimeFilter,
RelationPropertyFilter,
RollupPropertyFilter,
TextPropertyFilter
} from '../../core/types/notion-api.types'
import { RECIPES_PROPS_TO_IDS } from './constants'

export interface RecipesResponse extends WithOptional<Omit<DatabaseObjectResponse, 'properties'>, 'title'| 'description'| 'is_inline'| 'url'| 'public_url'> {
  properties: {
    "Recipe Lines": RelationPropertyItemObjectResponse,
    "COGS": RollupPropertyItemObjectResponse,
    "Thai Name": RichTextPropertyItemObjectResponse,
    "Instructions": RichTextPropertyItemObjectResponse,
    "Menu Item": RelationPropertyItemObjectResponse,
    "Image": FilesPropertyItemObjectResponse,
    "Name": TitlePropertyItemObjectResponse
  }
}

export type RecipesResponseProperties = keyof RecipesResponse['properties']
export type RecipesPath = Join<PathsToStringProps<RecipesResponse>>

type RecipesRecipeLinesPropertyFilter = RelationPropertyFilter
type RecipesCogsPropertyFilter = RollupPropertyFilter
type RecipesThaiNamePropertyFilter = TextPropertyFilter
type RecipesInstructionsPropertyFilter = TextPropertyFilter
type RecipesMenuItemPropertyFilter = RelationPropertyFilter
type RecipesImagePropertyFilter = ExistencePropertyFilter
type RecipesNamePropertyFilter = TextPropertyFilter

export type RecipesPropertyFilter = { recipeLines: RecipesRecipeLinesPropertyFilter } | { cogs: RecipesCogsPropertyFilter } | { thaiName: RecipesThaiNamePropertyFilter } | { instructions: RecipesInstructionsPropertyFilter } | { menuItem: RecipesMenuItemPropertyFilter } | { image: RecipesImagePropertyFilter } | { name: RecipesNamePropertyFilter }

export type RecipesQuery = Omit<QueryDatabaseBodyParameters, 'filter' | 'sorts'> & {
  sorts?: Array<
  | {
      property: keyof typeof RECIPES_PROPS_TO_IDS
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
          | RecipesPropertyFilter
          | TimestampCreatedTimeFilter
          | TimestampLastEditedTimeFilter
          | {
              // or: RecipesQuery['filter']
              or: Array<RecipesPropertyFilter>
            }
          | {
              // and: RecipesQuery['filter']
              and: Array<RecipesPropertyFilter>
            }
        >
      }
    | {
        and: Array<
          | RecipesPropertyFilter
          | TimestampCreatedTimeFilter
          | TimestampLastEditedTimeFilter
          | {
              // or: RecipesQuery['filter']
              or: Array<RecipesPropertyFilter>
            }
          | {
              // and: RecipesQuery['filter']
              and: Array<RecipesPropertyFilter>
            }
        >
      }
    | RecipesPropertyFilter
    | TimestampCreatedTimeFilter
    | TimestampLastEditedTimeFilter
}

export type RecipesQueryFilter = RecipesQuery['filter']

export type RecipesQueryResponse = {
  results: RecipesResponse[]
  next_cursor: string | null
  has_more: boolean
}

