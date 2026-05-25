import { FamilyMembersResponse, FamilyMembersQuery, FamilyMembersQueryResponse } from './types'
import { FamilyMembersPatchDTO } from './patch.dto'
import { GenericDatabaseClass, DatabaseOptions } from '../../core/src/generic-db'
import { FAMILY_MEMBERS_PROPS_TO_TYPES, FAMILY_MEMBERS_PROPS_TO_IDS, FamilyMembersDTOProperties } from './constants'

export class FamilyMembersDatabase extends GenericDatabaseClass<
  FamilyMembersResponse,
  FamilyMembersPatchDTO,
  FamilyMembersQuery,
  FamilyMembersQueryResponse,
  FamilyMembersDTOProperties
> {
  protected notionDatabaseId: string
  
  constructor(options: DatabaseOptions) {
    super(options)

    this.notionDatabaseId = '31ab63b732784d59a20ae0427f1c9431'
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
          throw new Error(`FamilyMembers: Invalid filter value for ${key}: ${value}`)
        }
      } else {
        if (!(key in FAMILY_MEMBERS_PROPS_TO_TYPES)) {
          throw new Error(`FamilyMembers: Invalid filter key: ${key}`)
        }

        const propType = FAMILY_MEMBERS_PROPS_TO_TYPES[key as keyof typeof FAMILY_MEMBERS_PROPS_TO_TYPES];
        const propId = FAMILY_MEMBERS_PROPS_TO_IDS[key as keyof typeof FAMILY_MEMBERS_PROPS_TO_IDS];

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
          property: FAMILY_MEMBERS_PROPS_TO_IDS[sort.property as keyof typeof FAMILY_MEMBERS_PROPS_TO_IDS],
          direction: sort.direction,
        }
      }

      return sort
    })
  }

  protected queryRemapFilterProperties(filterProps?: string[]) {
    return filterProps?.map((p) => FAMILY_MEMBERS_PROPS_TO_IDS[p as keyof typeof FAMILY_MEMBERS_PROPS_TO_IDS])
  }
}
