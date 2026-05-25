import { WithOptional, Join, PathsToStringProps } from '../../core/types/helper.types'
import {
DatabaseObjectResponse,
StringRequest,
RelationPropertyItemObjectResponse,
RichTextPropertyItemObjectResponse,
TitlePropertyItemObjectResponse,
ExistencePropertyFilter,
QueryDatabaseBodyParameters,
TimestampCreatedTimeFilter,
TimestampLastEditedTimeFilter,
RelationPropertyFilter,
TextPropertyFilter
} from '../../core/types/notion-api.types'
import { EXPENSE_SCAN_RULES_PROPS_TO_IDS } from './constants'

export interface ExpenseScanRulesResponse extends WithOptional<Omit<DatabaseObjectResponse, 'properties'>, 'title'| 'description'| 'is_inline'| 'url'| 'public_url'> {
  properties: {
    "Category Name": RichTextPropertyItemObjectResponse,
    "Auto-Supplier": RelationPropertyItemObjectResponse,
    "Department Name": RichTextPropertyItemObjectResponse,
    "Recipient Match": TitlePropertyItemObjectResponse
  }
}

export type ExpenseScanRulesResponseProperties = keyof ExpenseScanRulesResponse['properties']
export type ExpenseScanRulesPath = Join<PathsToStringProps<ExpenseScanRulesResponse>>

type ExpenseScanRulesCategoryNamePropertyFilter = TextPropertyFilter
type ExpenseScanRulesAutoSupplierPropertyFilter = RelationPropertyFilter
type ExpenseScanRulesDepartmentNamePropertyFilter = TextPropertyFilter
type ExpenseScanRulesRecipientMatchPropertyFilter = TextPropertyFilter

export type ExpenseScanRulesPropertyFilter = { categoryName: ExpenseScanRulesCategoryNamePropertyFilter } | { autoSupplier: ExpenseScanRulesAutoSupplierPropertyFilter } | { departmentName: ExpenseScanRulesDepartmentNamePropertyFilter } | { recipientMatch: ExpenseScanRulesRecipientMatchPropertyFilter }

export type ExpenseScanRulesQuery = Omit<QueryDatabaseBodyParameters, 'filter' | 'sorts'> & {
  sorts?: Array<
  | {
      property: keyof typeof EXPENSE_SCAN_RULES_PROPS_TO_IDS
      direction: 'ascending' | 'descending'
    }
  | {
      timestamp: 'created_time' | 'last_edited_time'
      direction: 'ascending' | 'descending'
    }
  >
  filter?:
    | {
        or: Array<
          | ExpenseScanRulesPropertyFilter
          | TimestampCreatedTimeFilter
          | TimestampLastEditedTimeFilter
          | {
              // or: ExpenseScanRulesQuery['filter']
              or: Array<ExpenseScanRulesPropertyFilter>
            }
          | {
              // and: ExpenseScanRulesQuery['filter']
              and: Array<ExpenseScanRulesPropertyFilter>
            }
        >
      }
    | {
        and: Array<
          | ExpenseScanRulesPropertyFilter
          | TimestampCreatedTimeFilter
          | TimestampLastEditedTimeFilter
          | {
              // or: ExpenseScanRulesQuery['filter']
              or: Array<ExpenseScanRulesPropertyFilter>
            }
          | {
              // and: ExpenseScanRulesQuery['filter']
              and: Array<ExpenseScanRulesPropertyFilter>
            }
        >
      }
    | ExpenseScanRulesPropertyFilter
    | TimestampCreatedTimeFilter
    | TimestampLastEditedTimeFilter
}

export type ExpenseScanRulesQueryFilter = ExpenseScanRulesQuery['filter']

export type ExpenseScanRulesQueryResponse = {
  results: ExpenseScanRulesResponse[]
  next_cursor: string | null
  has_more: boolean
}

