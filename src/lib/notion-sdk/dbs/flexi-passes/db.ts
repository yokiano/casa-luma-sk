import { FlexiPassesResponse, FlexiPassesQuery, FlexiPassesQueryResponse } from './types'
import { FlexiPassesPatchDTO } from './patch.dto'
import { GenericDatabaseClass, DatabaseOptions } from '../../core/src/generic-db'
import { FLEXI_PASSES_PROPS_TO_TYPES, FLEXI_PASSES_PROPS_TO_IDS, FlexiPassesDTOProperties } from './constants'

export class FlexiPassesDatabase extends GenericDatabaseClass<
  FlexiPassesResponse,
  FlexiPassesPatchDTO,
  FlexiPassesQuery,
  FlexiPassesQueryResponse,
  FlexiPassesDTOProperties
> {
  protected notionDatabaseId: string
  
  constructor(options: DatabaseOptions) {
    super(options)

    this.notionDatabaseId = 'b1e1d005eaf04dc39d258d7df3404b36'
  }

  protected queryRemapFilter(filter?: Record<string, unknown>) {
    if (!filter) {
      return undefined
    }

    if ('timestamp' in filter) {
      return filter
    }

    const notionFilter = {} as Record<string, unknown>

    Object.entries(filter).forEach(([key, value]) => {
      if (key === 'and' || key === 'or') {
        if (Array.isArray(value)) {
          notionFilter[key] = value.map((v) => this.queryRemapFilter(v))
        } else {
          throw new Error(`FlexiPasses: Invalid filter value for ${key}: ${value}`)
        }
      } else {
        if (!(key in FLEXI_PASSES_PROPS_TO_TYPES)) {
          throw new Error(`FlexiPasses: Invalid filter key: ${key}`)
        }

        const propType = FLEXI_PASSES_PROPS_TO_TYPES[key as keyof typeof FLEXI_PASSES_PROPS_TO_TYPES];
        const propId = FLEXI_PASSES_PROPS_TO_IDS[key as keyof typeof FLEXI_PASSES_PROPS_TO_IDS];

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
          property: FLEXI_PASSES_PROPS_TO_IDS[sort.property as keyof typeof FLEXI_PASSES_PROPS_TO_IDS],
          direction: sort.direction,
        }
      }

      return sort
    })
  }

  protected queryRemapFilterProperties(filterProps?: string[]) {
    return filterProps?.map((p) => FLEXI_PASSES_PROPS_TO_IDS[p as keyof typeof FLEXI_PASSES_PROPS_TO_IDS])
  }
}
