import { MenuItemsResponse, MenuItemsQuery, MenuItemsQueryResponse } from './types'
import { MenuItemsPatchDTO } from './patch.dto'
import { GenericDatabaseClass, DatabaseOptions } from '../../core/src/generic-db'
import { MENU_ITEMS_PROPS_TO_TYPES, MENU_ITEMS_PROPS_TO_IDS, MenuItemsDTOProperties } from './constants'

export class MenuItemsDatabase extends GenericDatabaseClass<
  MenuItemsResponse,
  MenuItemsPatchDTO,
  MenuItemsQuery,
  MenuItemsQueryResponse,
  MenuItemsDTOProperties
> {
  protected notionDatabaseId: string
  
  constructor(options: DatabaseOptions) {
    super(options)

    this.notionDatabaseId = '284fc77db4f38079ac1dfc3ac4e76992'
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
          throw new Error(`MenuItems: Invalid filter value for ${key}: ${value}`)
        }
      } else {
        if (!(key in MENU_ITEMS_PROPS_TO_TYPES)) {
          throw new Error(`MenuItems: Invalid filter key: ${key}`)
        }

        const propType = MENU_ITEMS_PROPS_TO_TYPES[key as keyof typeof MENU_ITEMS_PROPS_TO_TYPES];
        const propId = MENU_ITEMS_PROPS_TO_IDS[key as keyof typeof MENU_ITEMS_PROPS_TO_IDS];

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
          property: MENU_ITEMS_PROPS_TO_IDS[sort.property as keyof typeof MENU_ITEMS_PROPS_TO_IDS],
          direction: sort.direction,
        }
      }

      return sort
    })
  }

  protected queryRemapFilterProperties(filterProps?: string[]) {
    return filterProps?.map((p) => MENU_ITEMS_PROPS_TO_IDS[p as keyof typeof MENU_ITEMS_PROPS_TO_IDS])
  }
}
