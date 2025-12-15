import { OpenPlayPosItemsResponse, OpenPlayPosItemsQuery, OpenPlayPosItemsQueryResponse } from './types'
import { OpenPlayPosItemsPatchDTO } from './patch.dto'
import { GenericDatabaseClass, DatabaseOptions } from '../../core/src/generic-db'
import { OPEN_PLAY_POS_ITEMS_PROPS_TO_TYPES, OPEN_PLAY_POS_ITEMS_PROPS_TO_IDS, OpenPlayPosItemsDTOProperties } from './constants'

export class OpenPlayPosItemsDatabase extends GenericDatabaseClass<
  OpenPlayPosItemsResponse,
  OpenPlayPosItemsPatchDTO,
  OpenPlayPosItemsQuery,
  OpenPlayPosItemsQueryResponse,
  OpenPlayPosItemsDTOProperties
> {
  protected notionDatabaseId: string
  
  constructor(options: DatabaseOptions) {
    super(options)

    this.notionDatabaseId = '6324a9fa968d4e719608c7c1c6a64c93'
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
          throw new Error(`OpenPlayPosItems: Invalid filter value for ${key}: ${value}`)
        }
      } else {
        if (!(key in OPEN_PLAY_POS_ITEMS_PROPS_TO_TYPES)) {
          throw new Error(`OpenPlayPosItems: Invalid filter key: ${key}`)
        }

        const propType = OPEN_PLAY_POS_ITEMS_PROPS_TO_TYPES[key as keyof typeof OPEN_PLAY_POS_ITEMS_PROPS_TO_TYPES];
        const propId = OPEN_PLAY_POS_ITEMS_PROPS_TO_IDS[key as keyof typeof OPEN_PLAY_POS_ITEMS_PROPS_TO_IDS];

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
          property: OPEN_PLAY_POS_ITEMS_PROPS_TO_IDS[sort.property as keyof typeof OPEN_PLAY_POS_ITEMS_PROPS_TO_IDS],
          direction: sort.direction,
        }
      }

      return sort
    })
  }

  protected queryRemapFilterProperties(filterProps?: string[]) {
    return filterProps?.map((p) => OPEN_PLAY_POS_ITEMS_PROPS_TO_IDS[p as keyof typeof OPEN_PLAY_POS_ITEMS_PROPS_TO_IDS])
  }
}
