import { BalanceSnapshotsResponse, BalanceSnapshotsQuery, BalanceSnapshotsQueryResponse } from './types'
import { BalanceSnapshotsPatchDTO } from './patch.dto'
import { GenericDatabaseClass, DatabaseOptions } from '../../core/src/generic-db'
import { BALANCE_SNAPSHOTS_PROPS_TO_TYPES, BALANCE_SNAPSHOTS_PROPS_TO_IDS, BalanceSnapshotsDTOProperties } from './constants'

export class BalanceSnapshotsDatabase extends GenericDatabaseClass<
  BalanceSnapshotsResponse,
  BalanceSnapshotsPatchDTO,
  BalanceSnapshotsQuery,
  BalanceSnapshotsQueryResponse,
  BalanceSnapshotsDTOProperties
> {
  protected notionDatabaseId: string
  
  constructor(options: DatabaseOptions) {
    super(options)

    this.notionDatabaseId = 'bb838f913dee433c92a9b239ae86709c'
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
          throw new Error(`BalanceSnapshots: Invalid filter value for ${key}: ${value}`)
        }
      } else {
        if (!(key in BALANCE_SNAPSHOTS_PROPS_TO_TYPES)) {
          throw new Error(`BalanceSnapshots: Invalid filter key: ${key}`)
        }

        const propType = BALANCE_SNAPSHOTS_PROPS_TO_TYPES[key as keyof typeof BALANCE_SNAPSHOTS_PROPS_TO_TYPES];
        const propId = BALANCE_SNAPSHOTS_PROPS_TO_IDS[key as keyof typeof BALANCE_SNAPSHOTS_PROPS_TO_IDS];

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
          property: BALANCE_SNAPSHOTS_PROPS_TO_IDS[sort.property as keyof typeof BALANCE_SNAPSHOTS_PROPS_TO_IDS],
          direction: sort.direction,
        }
      }

      return sort
    })
  }

  protected queryRemapFilterProperties(filterProps?: string[]) {
    return filterProps?.map((p) => BALANCE_SNAPSHOTS_PROPS_TO_IDS[p as keyof typeof BALANCE_SNAPSHOTS_PROPS_TO_IDS])
  }
}
