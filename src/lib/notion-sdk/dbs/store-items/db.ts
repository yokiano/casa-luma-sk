import { StoreItemsResponse, StoreItemsQuery, StoreItemsQueryResponse } from './types'
import { StoreItemsPatchDTO } from './patch.dto'
import { GenericDatabaseClass, DatabaseOptions } from '../../core/src/generic-db'
import { STORE_ITEMS_PROPS_TO_TYPES, STORE_ITEMS_PROPS_TO_IDS, StoreItemsDTOProperties } from './constants'

export class StoreItemsDatabase extends GenericDatabaseClass<
  StoreItemsResponse,
  StoreItemsPatchDTO,
  StoreItemsQuery,
  StoreItemsQueryResponse,
  StoreItemsDTOProperties
> {
  protected notionDatabaseId: string
  
  constructor(options: DatabaseOptions) {
    super(options)

    this.notionDatabaseId = '6f65807626454e139b7647db5ca4412d'
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
          throw new Error(`StoreItems: Invalid filter value for ${key}: ${value}`)
        }
      } else {
        if (!(key in STORE_ITEMS_PROPS_TO_TYPES)) {
          throw new Error(`StoreItems: Invalid filter key: ${key}`)
        }

        const propType = STORE_ITEMS_PROPS_TO_TYPES[key as keyof typeof STORE_ITEMS_PROPS_TO_TYPES];
        const propId = STORE_ITEMS_PROPS_TO_IDS[key as keyof typeof STORE_ITEMS_PROPS_TO_IDS];

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
          property: STORE_ITEMS_PROPS_TO_IDS[sort.property as keyof typeof STORE_ITEMS_PROPS_TO_IDS],
          direction: sort.direction,
        }
      }

      return sort
    })
  }

  protected queryRemapFilterProperties(filterProps?: string[]) {
    return filterProps?.map((p) => STORE_ITEMS_PROPS_TO_IDS[p as keyof typeof STORE_ITEMS_PROPS_TO_IDS])
  }
}
