import { ShiftsResponse, ShiftsQuery, ShiftsQueryResponse } from './types'
import { ShiftsPatchDTO } from './patch.dto'
import { GenericDatabaseClass, DatabaseOptions } from '../../core/src/generic-db'
import { SHIFTS_PROPS_TO_TYPES, SHIFTS_PROPS_TO_IDS, ShiftsDTOProperties } from './constants'

export class ShiftsDatabase extends GenericDatabaseClass<
  ShiftsResponse,
  ShiftsPatchDTO,
  ShiftsQuery,
  ShiftsQueryResponse,
  ShiftsDTOProperties
> {
  protected notionDatabaseId: string
  
  constructor(options: DatabaseOptions) {
    super(options)

    this.notionDatabaseId = '02dd1568131948aa85d1309d512ed988'
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
          throw new Error(`Shifts: Invalid filter value for ${key}: ${value}`)
        }
      } else {
        if (!(key in SHIFTS_PROPS_TO_TYPES)) {
          throw new Error(`Shifts: Invalid filter key: ${key}`)
        }

        const propType = SHIFTS_PROPS_TO_TYPES[key as keyof typeof SHIFTS_PROPS_TO_TYPES];
        const propId = SHIFTS_PROPS_TO_IDS[key as keyof typeof SHIFTS_PROPS_TO_IDS];

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
          property: SHIFTS_PROPS_TO_IDS[sort.property as keyof typeof SHIFTS_PROPS_TO_IDS],
          direction: sort.direction,
        }
      }

      return sort
    })
  }

  protected queryRemapFilterProperties(filterProps?: string[]) {
    return filterProps?.map((p) => SHIFTS_PROPS_TO_IDS[p as keyof typeof SHIFTS_PROPS_TO_IDS])
  }
}
