import { JobOpeningsResponse, JobOpeningsQuery, JobOpeningsQueryResponse } from './types'
import { JobOpeningsPatchDTO } from './patch.dto'
import { GenericDatabaseClass, DatabaseOptions } from '../../core/src/generic-db'
import { JOB_OPENINGS_PROPS_TO_TYPES, JOB_OPENINGS_PROPS_TO_IDS, JobOpeningsDTOProperties } from './constants'

export class JobOpeningsDatabase extends GenericDatabaseClass<
  JobOpeningsResponse,
  JobOpeningsPatchDTO,
  JobOpeningsQuery,
  JobOpeningsQueryResponse,
  JobOpeningsDTOProperties
> {
  protected notionDatabaseId: string
  
  constructor(options: DatabaseOptions) {
    super(options)

    this.notionDatabaseId = '283fc77db4f3808eb6f5fd96ff3722e7'
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
          throw new Error(`JobOpenings: Invalid filter value for ${key}: ${value}`)
        }
      } else {
        if (!(key in JOB_OPENINGS_PROPS_TO_TYPES)) {
          throw new Error(`JobOpenings: Invalid filter key: ${key}`)
        }

        const propType = JOB_OPENINGS_PROPS_TO_TYPES[key as keyof typeof JOB_OPENINGS_PROPS_TO_TYPES];
        const propId = JOB_OPENINGS_PROPS_TO_IDS[key as keyof typeof JOB_OPENINGS_PROPS_TO_IDS];

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
          property: JOB_OPENINGS_PROPS_TO_IDS[sort.property as keyof typeof JOB_OPENINGS_PROPS_TO_IDS],
          direction: sort.direction,
        }
      }

      return sort
    })
  }

  protected queryRemapFilterProperties(filterProps?: string[]) {
    return filterProps?.map((p) => JOB_OPENINGS_PROPS_TO_IDS[p as keyof typeof JOB_OPENINGS_PROPS_TO_IDS])
  }
}
