import { RecipeLinesResponse, RecipeLinesQuery, RecipeLinesQueryResponse } from './types'
import { RecipeLinesPatchDTO } from './patch.dto'
import { GenericDatabaseClass, DatabaseOptions } from '../../core/src/generic-db'
import { RECIPE_LINES_PROPS_TO_TYPES, RECIPE_LINES_PROPS_TO_IDS, RecipeLinesDTOProperties } from './constants'

export class RecipeLinesDatabase extends GenericDatabaseClass<
  RecipeLinesResponse,
  RecipeLinesPatchDTO,
  RecipeLinesQuery,
  RecipeLinesQueryResponse,
  RecipeLinesDTOProperties
> {
  protected notionDatabaseId: string
  
  constructor(options: DatabaseOptions) {
    super(options)

    this.notionDatabaseId = '9c809c61fee04b7cb167d04863218e2a'
  }

  protected queryRemapFilter(filter?: Record<string, unknown>) {
    if (!filter) {
      return undefined
    }

    const notionFilter = {} as Record<string, unknown>

    Object.entries(filter).forEach(([key, value]) => {
      if (key === 'and' || key === 'or') {
        if (Array.isArray(value)) {
          notionFilter[key] = value.map((v) => this.queryRemapFilter(v))
        } else {
          throw new Error(`RecipeLines: Invalid filter value for ${key}: ${value}`)
        }
      } else {
        if (!(key in RECIPE_LINES_PROPS_TO_TYPES)) {
          throw new Error(`RecipeLines: Invalid filter key: ${key}`)
        }

        const propType = RECIPE_LINES_PROPS_TO_TYPES[key as keyof typeof RECIPE_LINES_PROPS_TO_TYPES];
        const propId = RECIPE_LINES_PROPS_TO_IDS[key as keyof typeof RECIPE_LINES_PROPS_TO_IDS];

        notionFilter['property'] = propId
        notionFilter[propType] = value
      }
    })
    
    return notionFilter
  }

  protected queryRemapSorts(sorts?: Record<string, string>[]) {
    return sorts?.map((sort) => {
      if ('property' in sort) {
        return {
          property: RECIPE_LINES_PROPS_TO_IDS[sort.property as keyof typeof RECIPE_LINES_PROPS_TO_IDS],
          direction: sort.direction,
        }
      }

      return sort
    })
  }

  protected queryRemapFilterProperties(filterProps?: string[]) {
    return filterProps?.map((p) => RECIPE_LINES_PROPS_TO_IDS[p as keyof typeof RECIPE_LINES_PROPS_TO_IDS])
  }
}
