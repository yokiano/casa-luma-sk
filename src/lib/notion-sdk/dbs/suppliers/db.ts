import { SuppliersResponse, SuppliersQuery, SuppliersQueryResponse } from './types'
import { SuppliersPatchDTO } from './patch.dto'
import { GenericDatabaseClass, DatabaseOptions } from '../../core/src/generic-db'
import { SUPPLIERS_PROPS_TO_TYPES, SUPPLIERS_PROPS_TO_IDS, SuppliersDTOProperties } from './constants'

export class SuppliersDatabase extends GenericDatabaseClass<
  SuppliersResponse,
  SuppliersPatchDTO,
  SuppliersQuery,
  SuppliersQueryResponse,
  SuppliersDTOProperties
> {
  protected notionDatabaseId: string
  
  constructor(options: DatabaseOptions) {
    super(options)

    this.notionDatabaseId = '839a60839aaa4cf7add0a8397534726a'
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
          throw new Error(`Suppliers: Invalid filter value for ${key}: ${value}`)
        }
      } else {
        if (!(key in SUPPLIERS_PROPS_TO_TYPES)) {
          throw new Error(`Suppliers: Invalid filter key: ${key}`)
        }

        const propType = SUPPLIERS_PROPS_TO_TYPES[key as keyof typeof SUPPLIERS_PROPS_TO_TYPES];
        const propId = SUPPLIERS_PROPS_TO_IDS[key as keyof typeof SUPPLIERS_PROPS_TO_IDS];

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
          property: SUPPLIERS_PROPS_TO_IDS[sort.property as keyof typeof SUPPLIERS_PROPS_TO_IDS],
          direction: sort.direction,
        }
      }

      return sort
    })
  }

  protected queryRemapFilterProperties(filterProps?: string[]) {
    return filterProps?.map((p) => SUPPLIERS_PROPS_TO_IDS[p as keyof typeof SUPPLIERS_PROPS_TO_IDS])
  }
}
