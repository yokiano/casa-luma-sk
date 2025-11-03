import { CasaLumaEventsResponse, CasaLumaEventsQuery, CasaLumaEventsQueryResponse } from './types'
import { CasaLumaEventsPatchDTO } from './patch.dto'
import { GenericDatabaseClass, DatabaseOptions } from '../../core/src/generic-db'
import { CASA_LUMA_EVENTS_PROPS_TO_TYPES, CASA_LUMA_EVENTS_PROPS_TO_IDS, CasaLumaEventsDTOProperties } from './constants'

export class CasaLumaEventsDatabase extends GenericDatabaseClass<
  CasaLumaEventsResponse,
  CasaLumaEventsPatchDTO,
  CasaLumaEventsQuery,
  CasaLumaEventsQueryResponse,
  CasaLumaEventsDTOProperties
> {
  protected notionDatabaseId: string
  
  constructor(options: DatabaseOptions) {
    super(options)

    this.notionDatabaseId = 'e58b0c4fcfba4ec28573c128e7d4e441'
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
          throw new Error(`CasaLumaEvents: Invalid filter value for ${key}: ${value}`)
        }
      } else {
        if (!(key in CASA_LUMA_EVENTS_PROPS_TO_TYPES)) {
          throw new Error(`CasaLumaEvents: Invalid filter key: ${key}`)
        }

        const propType = CASA_LUMA_EVENTS_PROPS_TO_TYPES[key as keyof typeof CASA_LUMA_EVENTS_PROPS_TO_TYPES];
        const propId = CASA_LUMA_EVENTS_PROPS_TO_IDS[key as keyof typeof CASA_LUMA_EVENTS_PROPS_TO_IDS];

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
          property: CASA_LUMA_EVENTS_PROPS_TO_IDS[sort.property as keyof typeof CASA_LUMA_EVENTS_PROPS_TO_IDS],
          direction: sort.direction,
        }
      }

      return sort
    })
  }

  protected queryRemapFilterProperties(filterProps?: string[]) {
    return filterProps?.map((p) => CASA_LUMA_EVENTS_PROPS_TO_IDS[p as keyof typeof CASA_LUMA_EVENTS_PROPS_TO_IDS])
  }
}
