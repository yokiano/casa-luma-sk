import { SignageResponse, SignageQuery, SignageQueryResponse } from './types'
import { SignagePatchDTO } from './patch.dto'
import { GenericDatabaseClass, DatabaseOptions } from '../../core/src/generic-db'
import { SIGNAGE_PROPS_TO_TYPES, SIGNAGE_PROPS_TO_IDS, SignageDTOProperties } from './constants'

export class SignageDatabase extends GenericDatabaseClass<
  SignageResponse,
  SignagePatchDTO,
  SignageQuery,
  SignageQueryResponse,
  SignageDTOProperties
> {
  protected notionDatabaseId: string
  
  constructor(options: DatabaseOptions) {
    super(options)

    this.notionDatabaseId = '2139dd558a0646d39346472f77c0e89a'
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
          throw new Error(`Signage: Invalid filter value for ${key}: ${value}`)
        }
      } else {
        if (!(key in SIGNAGE_PROPS_TO_TYPES)) {
          throw new Error(`Signage: Invalid filter key: ${key}`)
        }

        const propType = SIGNAGE_PROPS_TO_TYPES[key as keyof typeof SIGNAGE_PROPS_TO_TYPES];
        const propId = SIGNAGE_PROPS_TO_IDS[key as keyof typeof SIGNAGE_PROPS_TO_IDS];

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
          property: SIGNAGE_PROPS_TO_IDS[sort.property as keyof typeof SIGNAGE_PROPS_TO_IDS],
          direction: sort.direction,
        }
      }

      return sort
    })
  }

  protected queryRemapFilterProperties(filterProps?: string[]) {
    return filterProps?.map((p) => SIGNAGE_PROPS_TO_IDS[p as keyof typeof SIGNAGE_PROPS_TO_IDS])
  }
}
