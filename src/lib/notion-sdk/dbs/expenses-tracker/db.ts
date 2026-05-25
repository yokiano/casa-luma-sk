import { ExpensesTrackerResponse, ExpensesTrackerQuery, ExpensesTrackerQueryResponse } from './types'
import { ExpensesTrackerPatchDTO } from './patch.dto'
import { GenericDatabaseClass, DatabaseOptions } from '../../core/src/generic-db'
import { EXPENSES_TRACKER_PROPS_TO_TYPES, EXPENSES_TRACKER_PROPS_TO_IDS, ExpensesTrackerDTOProperties } from './constants'

export class ExpensesTrackerDatabase extends GenericDatabaseClass<
  ExpensesTrackerResponse,
  ExpensesTrackerPatchDTO,
  ExpensesTrackerQuery,
  ExpensesTrackerQueryResponse,
  ExpensesTrackerDTOProperties
> {
  protected notionDatabaseId: string
  
  constructor(options: DatabaseOptions) {
    super(options)

    this.notionDatabaseId = '2b5fc77db4f380658975e282f1aab7d2'
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
          throw new Error(`ExpensesTracker: Invalid filter value for ${key}: ${value}`)
        }
      } else {
        if (!(key in EXPENSES_TRACKER_PROPS_TO_TYPES)) {
          throw new Error(`ExpensesTracker: Invalid filter key: ${key}`)
        }

        const propType = EXPENSES_TRACKER_PROPS_TO_TYPES[key as keyof typeof EXPENSES_TRACKER_PROPS_TO_TYPES];
        const propId = EXPENSES_TRACKER_PROPS_TO_IDS[key as keyof typeof EXPENSES_TRACKER_PROPS_TO_IDS];

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
          property: EXPENSES_TRACKER_PROPS_TO_IDS[sort.property as keyof typeof EXPENSES_TRACKER_PROPS_TO_IDS],
          direction: sort.direction,
        }
      }

      return sort
    })
  }

  protected queryRemapFilterProperties(filterProps?: string[]) {
    return filterProps?.map((p) => EXPENSES_TRACKER_PROPS_TO_IDS[p as keyof typeof EXPENSES_TRACKER_PROPS_TO_IDS])
  }
}
