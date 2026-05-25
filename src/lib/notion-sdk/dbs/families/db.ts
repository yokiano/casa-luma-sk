import { FamiliesResponse, FamiliesQuery, FamiliesQueryResponse } from './types'
import { FamiliesPatchDTO } from './patch.dto'
import { GenericDatabaseClass, DatabaseOptions } from '../../core/src/generic-db'
import { FAMILIES_PROPS_TO_TYPES, FAMILIES_PROPS_TO_IDS, FamiliesDTOProperties } from './constants'

export class FamiliesDatabase extends GenericDatabaseClass<
  FamiliesResponse,
  FamiliesPatchDTO,
  FamiliesQuery,
  FamiliesQueryResponse,
  FamiliesDTOProperties
> {
  protected notionDatabaseId: string
  
  constructor(options: DatabaseOptions) {
    super(options)

    this.notionDatabaseId = '4dd6c32d9b0244fbbed6e6b41033e598'
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
          throw new Error(`Families: Invalid filter value for ${key}: ${value}`)
        }
      } else {
        if (!(key in FAMILIES_PROPS_TO_TYPES)) {
          throw new Error(`Families: Invalid filter key: ${key}`)
        }

        const propType = FAMILIES_PROPS_TO_TYPES[key as keyof typeof FAMILIES_PROPS_TO_TYPES];
        const propId = FAMILIES_PROPS_TO_IDS[key as keyof typeof FAMILIES_PROPS_TO_IDS];

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
          property: FAMILIES_PROPS_TO_IDS[sort.property as keyof typeof FAMILIES_PROPS_TO_IDS],
          direction: sort.direction,
        }
      }

      return sort
    })
  }

  protected queryRemapFilterProperties(filterProps?: string[]) {
    return filterProps?.map((p) => FAMILIES_PROPS_TO_IDS[p as keyof typeof FAMILIES_PROPS_TO_IDS])
  }
}
