import { TeamCalendarResponse, TeamCalendarQuery, TeamCalendarQueryResponse } from './types'
import { TeamCalendarPatchDTO } from './patch.dto'
import { GenericDatabaseClass, DatabaseOptions } from '../../core/src/generic-db'
import { TEAM_CALENDAR_PROPS_TO_TYPES, TEAM_CALENDAR_PROPS_TO_IDS, TeamCalendarDTOProperties } from './constants'

export class TeamCalendarDatabase extends GenericDatabaseClass<
  TeamCalendarResponse,
  TeamCalendarPatchDTO,
  TeamCalendarQuery,
  TeamCalendarQueryResponse,
  TeamCalendarDTOProperties
> {
  protected notionDatabaseId: string
  
  constructor(options: DatabaseOptions) {
    super(options)

    this.notionDatabaseId = 'bfcd6bd8b292405e8fde6e099d0fd7af'
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
          throw new Error(`TeamCalendar: Invalid filter value for ${key}: ${value}`)
        }
      } else {
        if (!(key in TEAM_CALENDAR_PROPS_TO_TYPES)) {
          throw new Error(`TeamCalendar: Invalid filter key: ${key}`)
        }

        const propType = TEAM_CALENDAR_PROPS_TO_TYPES[key as keyof typeof TEAM_CALENDAR_PROPS_TO_TYPES];
        const propId = TEAM_CALENDAR_PROPS_TO_IDS[key as keyof typeof TEAM_CALENDAR_PROPS_TO_IDS];

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
          property: TEAM_CALENDAR_PROPS_TO_IDS[sort.property as keyof typeof TEAM_CALENDAR_PROPS_TO_IDS],
          direction: sort.direction,
        }
      }

      return sort
    })
  }

  protected queryRemapFilterProperties(filterProps?: string[]) {
    return filterProps?.map((p) => TEAM_CALENDAR_PROPS_TO_IDS[p as keyof typeof TEAM_CALENDAR_PROPS_TO_IDS])
  }
}
