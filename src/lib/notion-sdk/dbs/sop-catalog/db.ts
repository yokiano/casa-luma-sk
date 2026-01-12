import { SopCatalogResponse, SopCatalogQuery, SopCatalogQueryResponse } from './types'
import { SopCatalogPatchDTO } from './patch.dto'
import { GenericDatabaseClass, DatabaseOptions } from '../../core/src/generic-db'
import { SOP_CATALOG_PROPS_TO_TYPES, SOP_CATALOG_PROPS_TO_IDS, SopCatalogDTOProperties } from './constants'

export class SopCatalogDatabase extends GenericDatabaseClass<
  SopCatalogResponse,
  SopCatalogPatchDTO,
  SopCatalogQuery,
  SopCatalogQueryResponse,
  SopCatalogDTOProperties
> {
  protected notionDatabaseId: string
  
  constructor(options: DatabaseOptions) {
    super(options)

    this.notionDatabaseId = 'ebb7a436a2bd402d88cb59d095a57609'
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
          throw new Error(`SopCatalog: Invalid filter value for ${key}: ${value}`)
        }
      } else {
        if (!(key in SOP_CATALOG_PROPS_TO_TYPES)) {
          throw new Error(`SopCatalog: Invalid filter key: ${key}`)
        }

        const propType = SOP_CATALOG_PROPS_TO_TYPES[key as keyof typeof SOP_CATALOG_PROPS_TO_TYPES];
        const propId = SOP_CATALOG_PROPS_TO_IDS[key as keyof typeof SOP_CATALOG_PROPS_TO_IDS];

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
          property: SOP_CATALOG_PROPS_TO_IDS[sort.property as keyof typeof SOP_CATALOG_PROPS_TO_IDS],
          direction: sort.direction,
        }
      }

      return sort
    })
  }

  protected queryRemapFilterProperties(filterProps?: string[]) {
    return filterProps?.map((p) => SOP_CATALOG_PROPS_TO_IDS[p as keyof typeof SOP_CATALOG_PROPS_TO_IDS])
  }
}
