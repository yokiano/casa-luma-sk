import { SalaryPaymentsResponse, SalaryPaymentsQuery, SalaryPaymentsQueryResponse } from './types'
import { SalaryPaymentsPatchDTO } from './patch.dto'
import { GenericDatabaseClass, DatabaseOptions } from '../../core/src/generic-db'
import { SALARY_PAYMENTS_PROPS_TO_TYPES, SALARY_PAYMENTS_PROPS_TO_IDS, SalaryPaymentsDTOProperties } from './constants'

export class SalaryPaymentsDatabase extends GenericDatabaseClass<
  SalaryPaymentsResponse,
  SalaryPaymentsPatchDTO,
  SalaryPaymentsQuery,
  SalaryPaymentsQueryResponse,
  SalaryPaymentsDTOProperties
> {
  protected notionDatabaseId: string
  
  constructor(options: DatabaseOptions) {
    super(options)

    this.notionDatabaseId = '49bdd87af3a54ce796a5ac64229af3e1'
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
          throw new Error(`SalaryPayments: Invalid filter value for ${key}: ${value}`)
        }
      } else {
        if (!(key in SALARY_PAYMENTS_PROPS_TO_TYPES)) {
          throw new Error(`SalaryPayments: Invalid filter key: ${key}`)
        }

        const propType = SALARY_PAYMENTS_PROPS_TO_TYPES[key as keyof typeof SALARY_PAYMENTS_PROPS_TO_TYPES];
        const propId = SALARY_PAYMENTS_PROPS_TO_IDS[key as keyof typeof SALARY_PAYMENTS_PROPS_TO_IDS];

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
          property: SALARY_PAYMENTS_PROPS_TO_IDS[sort.property as keyof typeof SALARY_PAYMENTS_PROPS_TO_IDS],
          direction: sort.direction,
        }
      }

      return sort
    })
  }

  protected queryRemapFilterProperties(filterProps?: string[]) {
    return filterProps?.map((p) => SALARY_PAYMENTS_PROPS_TO_IDS[p as keyof typeof SALARY_PAYMENTS_PROPS_TO_IDS])
  }
}
