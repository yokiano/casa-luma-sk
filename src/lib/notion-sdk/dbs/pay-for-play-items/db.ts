import { PayForPlayItemsResponse, PayForPlayItemsQuery, PayForPlayItemsQueryResponse } from './types'
import { PayForPlayItemsPatchDTO } from './patch.dto'
import { GenericDatabaseClass, DatabaseOptions } from '../../core/src/generic-db'
import { PAY_FOR_PLAY_ITEMS_PROPS_TO_TYPES, PAY_FOR_PLAY_ITEMS_PROPS_TO_IDS, PayForPlayItemsDTOProperties } from './constants'

export class PayForPlayItemsDatabase extends GenericDatabaseClass<
  PayForPlayItemsResponse,
  PayForPlayItemsPatchDTO,
  PayForPlayItemsQuery,
  PayForPlayItemsQueryResponse,
  PayForPlayItemsDTOProperties
> {
  protected notionDatabaseId: string
  
  constructor(options: DatabaseOptions) {
    super(options)

    this.notionDatabaseId = '7eedde78abd946a5815f0320a2442521'
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
          throw new Error(`PayForPlayItems: Invalid filter value for ${key}: ${value}`)
        }
      } else {
        if (!(key in PAY_FOR_PLAY_ITEMS_PROPS_TO_TYPES)) {
          throw new Error(`PayForPlayItems: Invalid filter key: ${key}`)
        }

        const propType = PAY_FOR_PLAY_ITEMS_PROPS_TO_TYPES[key as keyof typeof PAY_FOR_PLAY_ITEMS_PROPS_TO_TYPES];
        const propId = PAY_FOR_PLAY_ITEMS_PROPS_TO_IDS[key as keyof typeof PAY_FOR_PLAY_ITEMS_PROPS_TO_IDS];

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
          property: PAY_FOR_PLAY_ITEMS_PROPS_TO_IDS[sort.property as keyof typeof PAY_FOR_PLAY_ITEMS_PROPS_TO_IDS],
          direction: sort.direction,
        }
      }

      return sort
    })
  }

  protected queryRemapFilterProperties(filterProps?: string[]) {
    return filterProps?.map((p) => PAY_FOR_PLAY_ITEMS_PROPS_TO_IDS[p as keyof typeof PAY_FOR_PLAY_ITEMS_PROPS_TO_IDS])
  }
}
