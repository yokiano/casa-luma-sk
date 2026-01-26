import { IngredientsResponse, IngredientsQuery, IngredientsQueryResponse } from './types'
import { IngredientsPatchDTO } from './patch.dto'
import { GenericDatabaseClass, DatabaseOptions } from '../../core/src/generic-db'
import { INGREDIENTS_PROPS_TO_TYPES, INGREDIENTS_PROPS_TO_IDS, IngredientsDTOProperties } from './constants'

export class IngredientsDatabase extends GenericDatabaseClass<
  IngredientsResponse,
  IngredientsPatchDTO,
  IngredientsQuery,
  IngredientsQueryResponse,
  IngredientsDTOProperties
> {
  protected notionDatabaseId: string
  
  constructor(options: DatabaseOptions) {
    super(options)

    this.notionDatabaseId = 'ba611e70d6c2469b917f01e7af21b180'
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
          throw new Error(`Ingredients: Invalid filter value for ${key}: ${value}`)
        }
      } else {
        if (!(key in INGREDIENTS_PROPS_TO_TYPES)) {
          throw new Error(`Ingredients: Invalid filter key: ${key}`)
        }

        const propType = INGREDIENTS_PROPS_TO_TYPES[key as keyof typeof INGREDIENTS_PROPS_TO_TYPES];
        const propId = INGREDIENTS_PROPS_TO_IDS[key as keyof typeof INGREDIENTS_PROPS_TO_IDS];

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
          property: INGREDIENTS_PROPS_TO_IDS[sort.property as keyof typeof INGREDIENTS_PROPS_TO_IDS],
          direction: sort.direction,
        }
      }

      return sort
    })
  }

  protected queryRemapFilterProperties(filterProps?: string[]) {
    return filterProps?.map((p) => INGREDIENTS_PROPS_TO_IDS[p as keyof typeof INGREDIENTS_PROPS_TO_IDS])
  }
}
