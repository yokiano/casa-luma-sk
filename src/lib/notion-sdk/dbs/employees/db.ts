import { EmployeesResponse, EmployeesQuery, EmployeesQueryResponse } from './types'
import { EmployeesPatchDTO } from './patch.dto'
import { GenericDatabaseClass, DatabaseOptions } from '../../core/src/generic-db'
import { EMPLOYEES_PROPS_TO_TYPES, EMPLOYEES_PROPS_TO_IDS, EmployeesDTOProperties } from './constants'

export class EmployeesDatabase extends GenericDatabaseClass<
  EmployeesResponse,
  EmployeesPatchDTO,
  EmployeesQuery,
  EmployeesQueryResponse,
  EmployeesDTOProperties
> {
  protected notionDatabaseId: string
  
  constructor(options: DatabaseOptions) {
    super(options)

    this.notionDatabaseId = 'cf220f8b4efc4caeb7e46723c4f5e3e9'
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
          throw new Error(`Employees: Invalid filter value for ${key}: ${value}`)
        }
      } else {
        if (!(key in EMPLOYEES_PROPS_TO_TYPES)) {
          throw new Error(`Employees: Invalid filter key: ${key}`)
        }

        const propType = EMPLOYEES_PROPS_TO_TYPES[key as keyof typeof EMPLOYEES_PROPS_TO_TYPES];
        const propId = EMPLOYEES_PROPS_TO_IDS[key as keyof typeof EMPLOYEES_PROPS_TO_IDS];

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
          property: EMPLOYEES_PROPS_TO_IDS[sort.property as keyof typeof EMPLOYEES_PROPS_TO_IDS],
          direction: sort.direction,
        }
      }

      return sort
    })
  }

  protected queryRemapFilterProperties(filterProps?: string[]) {
    return filterProps?.map((p) => EMPLOYEES_PROPS_TO_IDS[p as keyof typeof EMPLOYEES_PROPS_TO_IDS])
  }
}
