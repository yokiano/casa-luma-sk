import { WithOptional, Join, PathsToStringProps } from '../../core/types/helper.types'
import {
DatabaseObjectResponse,
StringRequest,
DatePropertyItemObjectResponse,
NumberPropertyItemObjectResponse,
RelationPropertyItemObjectResponse,
RichTextPropertyItemObjectResponse,
SelectPropertyItemObjectResponse,
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
import { SALARY_ADJUSTMENTS_PROPS_TO_IDS } from './constants'

export interface SalaryAdjustmentsResponse extends WithOptional<Omit<DatabaseObjectResponse, 'properties'>, 'title'| 'description'| 'is_inline'| 'url'| 'public_url'> {
  properties: {
    "Adjustment Type": Omit<SelectPropertyItemObjectResponse, 'select'> & { select: { id: StringRequest, name: 'Advance', color: 'default' } | { id: StringRequest, name: 'Deduction', color: 'default' } | { id: StringRequest, name: 'Bonus', color: 'default' } | { id: StringRequest, name: 'Reimbursement', color: 'default' } | { id: StringRequest, name: 'Loan Repayment', color: 'default' } | { id: StringRequest, name: 'Late Penalty', color: 'default' }},
    "Employee": RelationPropertyItemObjectResponse,
    "Applied to Payment": RelationPropertyItemObjectResponse,
    "Notes": RichTextPropertyItemObjectResponse,
    "Approved By": Omit<SelectPropertyItemObjectResponse, 'select'> & { select: { id: StringRequest, name: 'Yarden', color: 'default' } | { id: StringRequest, name: 'Ohad', color: 'default' } | { id: StringRequest, name: 'Karni', color: 'default' } | { id: StringRequest, name: 'Roza', color: 'default' }},
    "Date": DatePropertyItemObjectResponse,
    "Amount (THB)": NumberPropertyItemObjectResponse,
    "Adjustment Title": TitlePropertyItemObjectResponse
  }
}

export type SalaryAdjustmentsResponseProperties = keyof SalaryAdjustmentsResponse['properties']
export type SalaryAdjustmentsPath = Join<PathsToStringProps<SalaryAdjustmentsResponse>>


export type SalaryAdjustmentsAdjustmentTypePropertyType = SalaryAdjustmentsResponse['properties']['Adjustment Type']['select']['name']

type SalaryAdjustmentsAdjustmentTypePropertyFilter =
  | {
      equals: SalaryAdjustmentsAdjustmentTypePropertyType
    }
  | {
      does_not_equal: SalaryAdjustmentsAdjustmentTypePropertyType
    }
  | ExistencePropertyFilter      

type SalaryAdjustmentsEmployeePropertyFilter = RelationPropertyFilter
type SalaryAdjustmentsAppliedToPaymentPropertyFilter = RelationPropertyFilter
type SalaryAdjustmentsNotesPropertyFilter = TextPropertyFilter

export type SalaryAdjustmentsApprovedByPropertyType = SalaryAdjustmentsResponse['properties']['Approved By']['select']['name']

type SalaryAdjustmentsApprovedByPropertyFilter =
  | {
      equals: SalaryAdjustmentsApprovedByPropertyType
    }
  | {
      does_not_equal: SalaryAdjustmentsApprovedByPropertyType
    }
  | ExistencePropertyFilter      

type SalaryAdjustmentsDatePropertyFilter = DatePropertyFilter
type SalaryAdjustmentsAmountThbPropertyFilter = NumberPropertyFilter
type SalaryAdjustmentsAdjustmentTitlePropertyFilter = TextPropertyFilter

export type SalaryAdjustmentsPropertyFilter = { adjustmentType: SalaryAdjustmentsAdjustmentTypePropertyFilter } | { employee: SalaryAdjustmentsEmployeePropertyFilter } | { appliedToPayment: SalaryAdjustmentsAppliedToPaymentPropertyFilter } | { notes: SalaryAdjustmentsNotesPropertyFilter } | { approvedBy: SalaryAdjustmentsApprovedByPropertyFilter } | { date: SalaryAdjustmentsDatePropertyFilter } | { amountThb: SalaryAdjustmentsAmountThbPropertyFilter } | { adjustmentTitle: SalaryAdjustmentsAdjustmentTitlePropertyFilter }

export type SalaryAdjustmentsQuery = Omit<QueryDatabaseBodyParameters, 'filter' | 'sorts'> & {
  sorts?: Array<
  | {
      property: keyof typeof SALARY_ADJUSTMENTS_PROPS_TO_IDS
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
          | SalaryAdjustmentsPropertyFilter
          | TimestampCreatedTimeFilter
          | TimestampLastEditedTimeFilter
          | {
              // or: SalaryAdjustmentsQuery['filter']
              or: Array<SalaryAdjustmentsPropertyFilter>
            }
          | {
              // and: SalaryAdjustmentsQuery['filter']
              and: Array<SalaryAdjustmentsPropertyFilter>
            }
        >
      }
    | {
        and: Array<
          | SalaryAdjustmentsPropertyFilter
          | TimestampCreatedTimeFilter
          | TimestampLastEditedTimeFilter
          | {
              // or: SalaryAdjustmentsQuery['filter']
              or: Array<SalaryAdjustmentsPropertyFilter>
            }
          | {
              // and: SalaryAdjustmentsQuery['filter']
              and: Array<SalaryAdjustmentsPropertyFilter>
            }
        >
      }
    | SalaryAdjustmentsPropertyFilter
    | TimestampCreatedTimeFilter
    | TimestampLastEditedTimeFilter
}

export type SalaryAdjustmentsQueryFilter = SalaryAdjustmentsQuery['filter']

export type SalaryAdjustmentsQueryResponse = {
  results: SalaryAdjustmentsResponse[]
  next_cursor: string | null
  has_more: boolean
}

