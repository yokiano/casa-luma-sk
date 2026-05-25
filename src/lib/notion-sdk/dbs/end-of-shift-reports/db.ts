import { EndOfShiftReportsResponse, EndOfShiftReportsQuery, EndOfShiftReportsQueryResponse } from './types'
import { EndOfShiftReportsPatchDTO } from './patch.dto'
import { GenericDatabaseClass, DatabaseOptions } from '../../core/src/generic-db'
import { END_OF_SHIFT_REPORTS_PROPS_TO_TYPES, END_OF_SHIFT_REPORTS_PROPS_TO_IDS, EndOfShiftReportsDTOProperties } from './constants'

export class EndOfShiftReportsDatabase extends GenericDatabaseClass<
  EndOfShiftReportsResponse,
  EndOfShiftReportsPatchDTO,
  EndOfShiftReportsQuery,
  EndOfShiftReportsQueryResponse,
  EndOfShiftReportsDTOProperties
> {
  protected notionDatabaseId: string
  
  constructor(options: DatabaseOptions) {
    super(options)

    this.notionDatabaseId = '344408c31b294510a7260d09a25ba7c4'
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
          throw new Error(`EndOfShiftReports: Invalid filter value for ${key}: ${value}`)
        }
      } else {
        if (!(key in END_OF_SHIFT_REPORTS_PROPS_TO_TYPES)) {
          throw new Error(`EndOfShiftReports: Invalid filter key: ${key}`)
        }

        const propType = END_OF_SHIFT_REPORTS_PROPS_TO_TYPES[key as keyof typeof END_OF_SHIFT_REPORTS_PROPS_TO_TYPES];
        const propId = END_OF_SHIFT_REPORTS_PROPS_TO_IDS[key as keyof typeof END_OF_SHIFT_REPORTS_PROPS_TO_IDS];

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
          property: END_OF_SHIFT_REPORTS_PROPS_TO_IDS[sort.property as keyof typeof END_OF_SHIFT_REPORTS_PROPS_TO_IDS],
          direction: sort.direction,
        }
      }

      return sort
    })
  }

  protected queryRemapFilterProperties(filterProps?: string[]) {
    return filterProps?.map((p) => END_OF_SHIFT_REPORTS_PROPS_TO_IDS[p as keyof typeof END_OF_SHIFT_REPORTS_PROPS_TO_IDS])
  }
}
