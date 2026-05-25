import { RecipesResponse, RecipesQuery, RecipesQueryResponse } from './types'
import { RecipesPatchDTO } from './patch.dto'
import { GenericDatabaseClass, DatabaseOptions } from '../../core/src/generic-db'
import { RECIPES_PROPS_TO_TYPES, RECIPES_PROPS_TO_IDS, RecipesDTOProperties } from './constants'

export class RecipesDatabase extends GenericDatabaseClass<
  RecipesResponse,
  RecipesPatchDTO,
  RecipesQuery,
  RecipesQueryResponse,
  RecipesDTOProperties
> {
  protected notionDatabaseId: string
  
  constructor(options: DatabaseOptions) {
    super(options)

    this.notionDatabaseId = 'b7fc72df194c4be89f6499e86f97f5ac'
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
          throw new Error(`Recipes: Invalid filter value for ${key}: ${value}`)
        }
      } else {
        if (!(key in RECIPES_PROPS_TO_TYPES)) {
          throw new Error(`Recipes: Invalid filter key: ${key}`)
        }

        const propType = RECIPES_PROPS_TO_TYPES[key as keyof typeof RECIPES_PROPS_TO_TYPES];
        const propId = RECIPES_PROPS_TO_IDS[key as keyof typeof RECIPES_PROPS_TO_IDS];

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
          property: RECIPES_PROPS_TO_IDS[sort.property as keyof typeof RECIPES_PROPS_TO_IDS],
          direction: sort.direction,
        }
      }

      return sort
    })
  }

  protected queryRemapFilterProperties(filterProps?: string[]) {
    return filterProps?.map((p) => RECIPES_PROPS_TO_IDS[p as keyof typeof RECIPES_PROPS_TO_IDS])
  }
}
