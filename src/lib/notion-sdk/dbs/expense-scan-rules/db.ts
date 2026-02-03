import { ExpenseScanRulesResponse, ExpenseScanRulesQuery, ExpenseScanRulesQueryResponse } from './types'
import { ExpenseScanRulesPatchDTO } from './patch.dto'
import { GenericDatabaseClass, DatabaseOptions } from '../../core/src/generic-db'
import { EXPENSE_SCAN_RULES_PROPS_TO_TYPES, EXPENSE_SCAN_RULES_PROPS_TO_IDS, ExpenseScanRulesDTOProperties } from './constants'

export class ExpenseScanRulesDatabase extends GenericDatabaseClass<
  ExpenseScanRulesResponse,
  ExpenseScanRulesPatchDTO,
  ExpenseScanRulesQuery,
  ExpenseScanRulesQueryResponse,
  ExpenseScanRulesDTOProperties
> {
  protected notionDatabaseId: string
  
  constructor(options: DatabaseOptions) {
    super(options)

    this.notionDatabaseId = '1e113e8a876b47e6bf74fe138360f520'
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
          throw new Error(`ExpenseScanRules: Invalid filter value for ${key}: ${value}`)
        }
      } else {
        if (!(key in EXPENSE_SCAN_RULES_PROPS_TO_TYPES)) {
          throw new Error(`ExpenseScanRules: Invalid filter key: ${key}`)
        }

        const propType = EXPENSE_SCAN_RULES_PROPS_TO_TYPES[key as keyof typeof EXPENSE_SCAN_RULES_PROPS_TO_TYPES];
        const propId = EXPENSE_SCAN_RULES_PROPS_TO_IDS[key as keyof typeof EXPENSE_SCAN_RULES_PROPS_TO_IDS];

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
          property: EXPENSE_SCAN_RULES_PROPS_TO_IDS[sort.property as keyof typeof EXPENSE_SCAN_RULES_PROPS_TO_IDS],
          direction: sort.direction,
        }
      }

      return sort
    })
  }

  protected queryRemapFilterProperties(filterProps?: string[]) {
    return filterProps?.map((p) => EXPENSE_SCAN_RULES_PROPS_TO_IDS[p as keyof typeof EXPENSE_SCAN_RULES_PROPS_TO_IDS])
  }
}
