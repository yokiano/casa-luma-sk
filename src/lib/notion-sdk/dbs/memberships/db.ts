import { MembershipsResponse, MembershipsQuery, MembershipsQueryResponse } from './types'
import { MembershipsPatchDTO } from './patch.dto'
import { GenericDatabaseClass, DatabaseOptions } from '../../core/src/generic-db'
import { MEMBERSHIPS_PROPS_TO_TYPES, MEMBERSHIPS_PROPS_TO_IDS, MembershipsDTOProperties } from './constants'

export class MembershipsDatabase extends GenericDatabaseClass<
  MembershipsResponse,
  MembershipsPatchDTO,
  MembershipsQuery,
  MembershipsQueryResponse,
  MembershipsDTOProperties
> {
  protected notionDatabaseId: string
  
  constructor(options: DatabaseOptions) {
    super(options)

    this.notionDatabaseId = '4267d8b54c9343b39b0b6941ccf79145'
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
          throw new Error(`Memberships: Invalid filter value for ${key}: ${value}`)
        }
      } else {
        if (!(key in MEMBERSHIPS_PROPS_TO_TYPES)) {
          throw new Error(`Memberships: Invalid filter key: ${key}`)
        }

        const propType = MEMBERSHIPS_PROPS_TO_TYPES[key as keyof typeof MEMBERSHIPS_PROPS_TO_TYPES];
        const propId = MEMBERSHIPS_PROPS_TO_IDS[key as keyof typeof MEMBERSHIPS_PROPS_TO_IDS];

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
          property: MEMBERSHIPS_PROPS_TO_IDS[sort.property as keyof typeof MEMBERSHIPS_PROPS_TO_IDS],
          direction: sort.direction,
        }
      }

      return sort
    })
  }

  protected queryRemapFilterProperties(filterProps?: string[]) {
    return filterProps?.map((p) => MEMBERSHIPS_PROPS_TO_IDS[p as keyof typeof MEMBERSHIPS_PROPS_TO_IDS])
  }
}
