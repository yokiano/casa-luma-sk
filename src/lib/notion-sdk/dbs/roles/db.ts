import { RolesResponse, RolesQuery, RolesQueryResponse } from './types'
import { RolesPatchDTO } from './patch.dto'
import { GenericDatabaseClass, DatabaseOptions } from '../../core/src/generic-db'
import { ROLES_PROPS_TO_TYPES, ROLES_PROPS_TO_IDS, RolesDTOProperties } from './constants'

export class RolesDatabase extends GenericDatabaseClass<
  RolesResponse,
  RolesPatchDTO,
  RolesQuery,
  RolesQueryResponse,
  RolesDTOProperties
> {
  protected notionDatabaseId: string
  
  constructor(options: DatabaseOptions) {
    super(options)

    this.notionDatabaseId = '8a6cc48c180b452eae4f80fe64b749f7'
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
          throw new Error(`Roles: Invalid filter value for ${key}: ${value}`)
        }
      } else {
        if (!(key in ROLES_PROPS_TO_TYPES)) {
          throw new Error(`Roles: Invalid filter key: ${key}`)
        }

        const propType = ROLES_PROPS_TO_TYPES[key as keyof typeof ROLES_PROPS_TO_TYPES];
        const propId = ROLES_PROPS_TO_IDS[key as keyof typeof ROLES_PROPS_TO_IDS];

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
          property: ROLES_PROPS_TO_IDS[sort.property as keyof typeof ROLES_PROPS_TO_IDS],
          direction: sort.direction,
        }
      }

      return sort
    })
  }

  protected queryRemapFilterProperties(filterProps?: string[]) {
    return filterProps?.map((p) => ROLES_PROPS_TO_IDS[p as keyof typeof ROLES_PROPS_TO_IDS])
  }
}
