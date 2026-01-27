import { WithOptional, Join, PathsToStringProps } from '../../core/types/helper.types'
import {
DatabaseObjectResponse,
StringRequest,
DatePropertyItemObjectResponse,
FilesPropertyItemObjectResponse,
NumberPropertyItemObjectResponse,
RelationPropertyItemObjectResponse,
RichTextPropertyItemObjectResponse,
TitlePropertyItemObjectResponse,
ExistencePropertyFilter,
QueryDatabaseBodyParameters,
TimestampCreatedTimeFilter,
TimestampLastEditedTimeFilter,
DatePropertyFilter,
NumberPropertyFilter,
RelationPropertyFilter,
TextPropertyFilter
} from '../../core/types/notion-api.types'
import { SALARY_PAYMENTS_PROPS_TO_IDS } from './constants'

export interface SalaryPaymentsResponse extends WithOptional<Omit<DatabaseObjectResponse, 'properties'>, 'title'| 'description'| 'is_inline'| 'url'| 'public_url'> {
  properties: {
    "Notes": RichTextPropertyItemObjectResponse,
    "Base Salary (THB)": NumberPropertyItemObjectResponse,
    "Pay Slip": FilesPropertyItemObjectResponse,
    "Payment Date": DatePropertyItemObjectResponse,
    "Employee": RelationPropertyItemObjectResponse,
    "Advances (THB)": NumberPropertyItemObjectResponse,
    "OT Amount (THB)": NumberPropertyItemObjectResponse,
    "Total Paid (THB)": NumberPropertyItemObjectResponse,
    "Deductions (THB)": NumberPropertyItemObjectResponse,
    "Payment Title": TitlePropertyItemObjectResponse
  }
}

export type SalaryPaymentsResponseProperties = keyof SalaryPaymentsResponse['properties']
export type SalaryPaymentsPath = Join<PathsToStringProps<SalaryPaymentsResponse>>

type SalaryPaymentsNotesPropertyFilter = TextPropertyFilter
type SalaryPaymentsBaseSalaryThbPropertyFilter = NumberPropertyFilter
type SalaryPaymentsPaySlipPropertyFilter = ExistencePropertyFilter
type SalaryPaymentsPaymentDatePropertyFilter = DatePropertyFilter
type SalaryPaymentsEmployeePropertyFilter = RelationPropertyFilter
type SalaryPaymentsAdvancesThbPropertyFilter = NumberPropertyFilter
type SalaryPaymentsOtAmountThbPropertyFilter = NumberPropertyFilter
type SalaryPaymentsTotalPaidThbPropertyFilter = NumberPropertyFilter
type SalaryPaymentsDeductionsThbPropertyFilter = NumberPropertyFilter
type SalaryPaymentsPaymentTitlePropertyFilter = TextPropertyFilter

export type SalaryPaymentsPropertyFilter = { notes: SalaryPaymentsNotesPropertyFilter } | { baseSalaryThb: SalaryPaymentsBaseSalaryThbPropertyFilter } | { paySlip: SalaryPaymentsPaySlipPropertyFilter } | { paymentDate: SalaryPaymentsPaymentDatePropertyFilter } | { employee: SalaryPaymentsEmployeePropertyFilter } | { advancesThb: SalaryPaymentsAdvancesThbPropertyFilter } | { otAmountThb: SalaryPaymentsOtAmountThbPropertyFilter } | { totalPaidThb: SalaryPaymentsTotalPaidThbPropertyFilter } | { deductionsThb: SalaryPaymentsDeductionsThbPropertyFilter } | { paymentTitle: SalaryPaymentsPaymentTitlePropertyFilter }

export type SalaryPaymentsQuery = Omit<QueryDatabaseBodyParameters, 'filter' | 'sorts'> & {
  sorts?: Array<
  | {
      property: keyof typeof SALARY_PAYMENTS_PROPS_TO_IDS
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
          | SalaryPaymentsPropertyFilter
          | TimestampCreatedTimeFilter
          | TimestampLastEditedTimeFilter
          | {
              // or: SalaryPaymentsQuery['filter']
              or: Array<SalaryPaymentsPropertyFilter>
            }
          | {
              // and: SalaryPaymentsQuery['filter']
              and: Array<SalaryPaymentsPropertyFilter>
            }
        >
      }
    | {
        and: Array<
          | SalaryPaymentsPropertyFilter
          | TimestampCreatedTimeFilter
          | TimestampLastEditedTimeFilter
          | {
              // or: SalaryPaymentsQuery['filter']
              or: Array<SalaryPaymentsPropertyFilter>
            }
          | {
              // and: SalaryPaymentsQuery['filter']
              and: Array<SalaryPaymentsPropertyFilter>
            }
        >
      }
    | SalaryPaymentsPropertyFilter
    | TimestampCreatedTimeFilter
    | TimestampLastEditedTimeFilter
}

export type SalaryPaymentsQueryFilter = SalaryPaymentsQuery['filter']

export type SalaryPaymentsQueryResponse = {
  results: SalaryPaymentsResponse[]
  next_cursor: string | null
  has_more: boolean
}

