import { FinancialLedgerResponse, FinancialLedgerQuery, FinancialLedgerQueryResponse } from './types'
import { FinancialLedgerPatchDTO } from './patch.dto'
import { GenericDatabaseClass, DatabaseOptions } from '../../core/src/generic-db'
import { FINANCIAL_LEDGER_PROPS_TO_TYPES, FINANCIAL_LEDGER_PROPS_TO_IDS, FinancialLedgerDTOProperties } from './constants'

export class FinancialLedgerDatabase extends GenericDatabaseClass<
  FinancialLedgerResponse,
  FinancialLedgerPatchDTO,
  FinancialLedgerQuery,
  FinancialLedgerQueryResponse,
  FinancialLedgerDTOProperties
> {
  protected notionDatabaseId: string
  
  constructor(options: DatabaseOptions) {
    super(options)

    this.notionDatabaseId = '39afc77db4f380c09fdfef3e7936c9c3'
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
          throw new Error(`FinancialLedger: Invalid filter value for ${key}: ${value}`)
        }
      } else {
        if (!(key in FINANCIAL_LEDGER_PROPS_TO_TYPES)) {
          throw new Error(`FinancialLedger: Invalid filter key: ${key}`)
        }

        const propType = FINANCIAL_LEDGER_PROPS_TO_TYPES[key as keyof typeof FINANCIAL_LEDGER_PROPS_TO_TYPES];
        const propId = FINANCIAL_LEDGER_PROPS_TO_IDS[key as keyof typeof FINANCIAL_LEDGER_PROPS_TO_IDS];

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
          property: FINANCIAL_LEDGER_PROPS_TO_IDS[sort.property as keyof typeof FINANCIAL_LEDGER_PROPS_TO_IDS],
          direction: sort.direction,
        }
      }

      return sort
    })
  }

  protected queryRemapFilterProperties(filterProps?: string[]) {
    return filterProps?.map((p) => FINANCIAL_LEDGER_PROPS_TO_IDS[p as keyof typeof FINANCIAL_LEDGER_PROPS_TO_IDS])
  }
}
