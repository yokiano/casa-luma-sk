import { HourlyReportsResponse, HourlyReportsQuery, HourlyReportsQueryResponse } from './types'
import { HourlyReportsPatchDTO } from './patch.dto'
import { GenericDatabaseClass, DatabaseOptions } from '../../core/src/generic-db'
import { HOURLY_REPORTS_PROPS_TO_TYPES, HOURLY_REPORTS_PROPS_TO_IDS, HourlyReportsDTOProperties } from './constants'

export class HourlyReportsDatabase extends GenericDatabaseClass<
  HourlyReportsResponse,
  HourlyReportsPatchDTO,
  HourlyReportsQuery,
  HourlyReportsQueryResponse,
  HourlyReportsDTOProperties
> {
  protected notionDatabaseId: string
  
  constructor(options: DatabaseOptions) {
    super(options)

    this.notionDatabaseId = '288ce8634e804e7aaa2383fbf2224cda'
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
          throw new Error(`HourlyReports: Invalid filter value for ${key}: ${value}`)
        }
      } else {
        if (!(key in HOURLY_REPORTS_PROPS_TO_TYPES)) {
          throw new Error(`HourlyReports: Invalid filter key: ${key}`)
        }

        const propType = HOURLY_REPORTS_PROPS_TO_TYPES[key as keyof typeof HOURLY_REPORTS_PROPS_TO_TYPES];
        const propId = HOURLY_REPORTS_PROPS_TO_IDS[key as keyof typeof HOURLY_REPORTS_PROPS_TO_IDS];

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
          property: HOURLY_REPORTS_PROPS_TO_IDS[sort.property as keyof typeof HOURLY_REPORTS_PROPS_TO_IDS],
          direction: sort.direction,
        }
      }

      return sort
    })
  }

  protected queryRemapFilterProperties(filterProps?: string[]) {
    return filterProps?.map((p) => HOURLY_REPORTS_PROPS_TO_IDS[p as keyof typeof HOURLY_REPORTS_PROPS_TO_IDS])
  }
}
