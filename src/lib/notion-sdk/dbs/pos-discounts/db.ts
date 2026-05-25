import { PosDiscountsResponse, PosDiscountsQuery, PosDiscountsQueryResponse } from './types'
import { PosDiscountsPatchDTO } from './patch.dto'
import { GenericDatabaseClass, DatabaseOptions } from '../../core/src/generic-db'
import { POS_DISCOUNTS_PROPS_TO_TYPES, POS_DISCOUNTS_PROPS_TO_IDS, PosDiscountsDTOProperties } from './constants'

export class PosDiscountsDatabase extends GenericDatabaseClass<
  PosDiscountsResponse,
  PosDiscountsPatchDTO,
  PosDiscountsQuery,
  PosDiscountsQueryResponse,
  PosDiscountsDTOProperties
> {
  protected notionDatabaseId: string
  
  constructor(options: DatabaseOptions) {
    super(options)

    this.notionDatabaseId = '90a654cd5b6349068ad898ae7b643607'
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
          throw new Error(`PosDiscounts: Invalid filter value for ${key}: ${value}`)
        }
      } else {
        if (!(key in POS_DISCOUNTS_PROPS_TO_TYPES)) {
          throw new Error(`PosDiscounts: Invalid filter key: ${key}`)
        }

        const propType = POS_DISCOUNTS_PROPS_TO_TYPES[key as keyof typeof POS_DISCOUNTS_PROPS_TO_TYPES];
        const propId = POS_DISCOUNTS_PROPS_TO_IDS[key as keyof typeof POS_DISCOUNTS_PROPS_TO_IDS];

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
          property: POS_DISCOUNTS_PROPS_TO_IDS[sort.property as keyof typeof POS_DISCOUNTS_PROPS_TO_IDS],
          direction: sort.direction,
        }
      }

      return sort
    })
  }

  protected queryRemapFilterProperties(filterProps?: string[]) {
    return filterProps?.map((p) => POS_DISCOUNTS_PROPS_TO_IDS[p as keyof typeof POS_DISCOUNTS_PROPS_TO_IDS])
  }
}
