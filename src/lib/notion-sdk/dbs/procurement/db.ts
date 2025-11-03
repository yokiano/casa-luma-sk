import { ProcurementResponse, ProcurementQuery, ProcurementQueryResponse } from './types'
import { ProcurementPatchDTO } from './patch.dto'
import { GenericDatabaseClass, DatabaseOptions } from '../../core/src/generic-db'
import { PROCUREMENT_PROPS_TO_TYPES, PROCUREMENT_PROPS_TO_IDS, ProcurementDTOProperties } from './constants'

export class ProcurementDatabase extends GenericDatabaseClass<
  ProcurementResponse,
  ProcurementPatchDTO,
  ProcurementQuery,
  ProcurementQueryResponse,
  ProcurementDTOProperties
> {
  protected notionDatabaseId: string
  
  constructor(options: DatabaseOptions) {
    super(options)

    this.notionDatabaseId = '283fc77db4f380c1813fef4b9bb08f8f'
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
          throw new Error(`Procurement: Invalid filter value for ${key}: ${value}`)
        }
      } else {
        if (!(key in PROCUREMENT_PROPS_TO_TYPES)) {
          throw new Error(`Procurement: Invalid filter key: ${key}`)
        }

        const propType = PROCUREMENT_PROPS_TO_TYPES[key as keyof typeof PROCUREMENT_PROPS_TO_TYPES];
        const propId = PROCUREMENT_PROPS_TO_IDS[key as keyof typeof PROCUREMENT_PROPS_TO_IDS];

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
          property: PROCUREMENT_PROPS_TO_IDS[sort.property as keyof typeof PROCUREMENT_PROPS_TO_IDS],
          direction: sort.direction,
        }
      }

      return sort
    })
  }

  protected queryRemapFilterProperties(filterProps?: string[]) {
    return filterProps?.map((p) => PROCUREMENT_PROPS_TO_IDS[p as keyof typeof PROCUREMENT_PROPS_TO_IDS])
  }
}
