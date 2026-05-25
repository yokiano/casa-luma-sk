import { CompanyLedgerResponse, CompanyLedgerQuery, CompanyLedgerQueryResponse } from './types'
import { CompanyLedgerPatchDTO } from './patch.dto'
import { GenericDatabaseClass, DatabaseOptions } from '../../core/src/generic-db'
import { COMPANY_LEDGER_PROPS_TO_TYPES, COMPANY_LEDGER_PROPS_TO_IDS, CompanyLedgerDTOProperties } from './constants'

export class CompanyLedgerDatabase extends GenericDatabaseClass<
  CompanyLedgerResponse,
  CompanyLedgerPatchDTO,
  CompanyLedgerQuery,
  CompanyLedgerQueryResponse,
  CompanyLedgerDTOProperties
> {
  protected notionDatabaseId: string
  
  constructor(options: DatabaseOptions) {
    super(options)

    this.notionDatabaseId = '8c565c29798a4ac39e3b23c35db93c5b'
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
          throw new Error(`CompanyLedger: Invalid filter value for ${key}: ${value}`)
        }
      } else {
        if (!(key in COMPANY_LEDGER_PROPS_TO_TYPES)) {
          throw new Error(`CompanyLedger: Invalid filter key: ${key}`)
        }

        const propType = COMPANY_LEDGER_PROPS_TO_TYPES[key as keyof typeof COMPANY_LEDGER_PROPS_TO_TYPES];
        const propId = COMPANY_LEDGER_PROPS_TO_IDS[key as keyof typeof COMPANY_LEDGER_PROPS_TO_IDS];

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
          property: COMPANY_LEDGER_PROPS_TO_IDS[sort.property as keyof typeof COMPANY_LEDGER_PROPS_TO_IDS],
          direction: sort.direction,
        }
      }

      return sort
    })
  }

  protected queryRemapFilterProperties(filterProps?: string[]) {
    return filterProps?.map((p) => COMPANY_LEDGER_PROPS_TO_IDS[p as keyof typeof COMPANY_LEDGER_PROPS_TO_IDS])
  }
}
