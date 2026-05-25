import { PosModifiersResponse, PosModifiersQuery, PosModifiersQueryResponse } from './types'
import { PosModifiersPatchDTO } from './patch.dto'
import { GenericDatabaseClass, DatabaseOptions } from '../../core/src/generic-db'
import { POS_MODIFIERS_PROPS_TO_TYPES, POS_MODIFIERS_PROPS_TO_IDS, PosModifiersDTOProperties } from './constants'

export class PosModifiersDatabase extends GenericDatabaseClass<
  PosModifiersResponse,
  PosModifiersPatchDTO,
  PosModifiersQuery,
  PosModifiersQueryResponse,
  PosModifiersDTOProperties
> {
  protected notionDatabaseId: string
  
  constructor(options: DatabaseOptions) {
    super(options)

    this.notionDatabaseId = 'ad6d2ea9e12c466587d9f3cd2e1d3479'
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
          throw new Error(`PosModifiers: Invalid filter value for ${key}: ${value}`)
        }
      } else {
        if (!(key in POS_MODIFIERS_PROPS_TO_TYPES)) {
          throw new Error(`PosModifiers: Invalid filter key: ${key}`)
        }

        const propType = POS_MODIFIERS_PROPS_TO_TYPES[key as keyof typeof POS_MODIFIERS_PROPS_TO_TYPES];
        const propId = POS_MODIFIERS_PROPS_TO_IDS[key as keyof typeof POS_MODIFIERS_PROPS_TO_IDS];

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
          property: POS_MODIFIERS_PROPS_TO_IDS[sort.property as keyof typeof POS_MODIFIERS_PROPS_TO_IDS],
          direction: sort.direction,
        }
      }

      return sort
    })
  }

  protected queryRemapFilterProperties(filterProps?: string[]) {
    return filterProps?.map((p) => POS_MODIFIERS_PROPS_TO_IDS[p as keyof typeof POS_MODIFIERS_PROPS_TO_IDS])
  }
}
