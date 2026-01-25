import { WithOptional, Join, PathsToStringProps } from '../../core/types/helper.types'
import {
DatabaseObjectResponse,
StringRequest,
CreatedByPropertyItemObjectResponse,
CreatedTimePropertyItemObjectResponse,
DatePropertyItemObjectResponse,
FilesPropertyItemObjectResponse,
FormulaPropertyItemObjectResponse,
LastEditedByPropertyItemObjectResponse,
LastEditedTimePropertyItemObjectResponse,
NumberPropertyItemObjectResponse,
PeoplePropertyItemObjectResponse,
RelationPropertyItemObjectResponse,
RichTextPropertyItemObjectResponse,
SelectPropertyItemObjectResponse,
StatusPropertyItemObjectResponse,
TitlePropertyItemObjectResponse,
ExistencePropertyFilter,
QueryDatabaseBodyParameters,
TimestampCreatedTimeFilter,
TimestampLastEditedTimeFilter,
DatePropertyFilter,
FormulaPropertyFilter,
NumberPropertyFilter,
PeoplePropertyFilter,
RelationPropertyFilter,
TextPropertyFilter
} from '../../core/types/notion-api.types'
import { EXPENSES_TRACKER_PROPS_TO_IDS } from './constants'

export interface ExpensesTrackerResponse extends WithOptional<Omit<DatabaseObjectResponse, 'properties'>, 'title'| 'description'| 'is_inline'| 'url'| 'public_url'> {
  properties: {
    "Category": Omit<SelectPropertyItemObjectResponse, 'select'> & { select: { id: StringRequest, name: 'Food & Groceries', color: 'green' } | { id: StringRequest, name: 'Maintenance', color: 'blue' } | { id: StringRequest, name: 'Rent', color: 'brown' } | { id: StringRequest, name: 'Entertainment', color: 'purple' } | { id: StringRequest, name: 'Physical Product', color: 'pink' } | { id: StringRequest, name: 'Consumable Product', color: 'yellow' } | { id: StringRequest, name: 'Salary', color: 'green' } | { id: StringRequest, name: 'Miscellaneous', color: 'gray' } | { id: StringRequest, name: 'bills', color: 'orange' } | { id: StringRequest, name: 'Legal', color: 'default' } | { id: StringRequest, name: 'Owners Related', color: 'red' } | { id: StringRequest, name: 'Marketing', color: 'yellow' }},
    "Payment Method": Omit<SelectPropertyItemObjectResponse, 'select'> & { select: { id: StringRequest, name: 'Cash', color: 'default' } | { id: StringRequest, name: 'Wire Transfer', color: 'green' } | { id: StringRequest, name: 'Scan', color: 'blue' } | { id: StringRequest, name: 'Credit Card', color: 'pink' }},
    "Team": FormulaPropertyItemObjectResponse,
    "Date": DatePropertyItemObjectResponse,
    "Department": Omit<SelectPropertyItemObjectResponse, 'select'> & { select: { id: StringRequest, name: 'General', color: 'default' } | { id: StringRequest, name: 'Open Play', color: 'yellow' } | { id: StringRequest, name: 'Cafe', color: 'gray' } | { id: StringRequest, name: 'garden', color: 'red' } | { id: StringRequest, name: 'Shop', color: 'blue' } | { id: StringRequest, name: 'Owners', color: 'brown' }},
    "Procurement Item": RelationPropertyItemObjectResponse,
    "In favor of": PeoplePropertyItemObjectResponse,
    "Status": Omit<StatusPropertyItemObjectResponse, 'status'> & { status: { id: StringRequest, name: 'To Pay', color: 'red' } | { id: StringRequest, name: 'Refunded', color: 'orange' } | { id: StringRequest, name: 'Paid', color: 'blue' } | { id: StringRequest, name: 'Reconciled', color: 'green' }},
    "Paid By": Omit<SelectPropertyItemObjectResponse, 'select'> & { select: { id: StringRequest, name: 'Yarden', color: 'orange' } | { id: StringRequest, name: 'Roza', color: 'yellow' } | { id: StringRequest, name: 'Karni', color: 'green' } | { id: StringRequest, name: 'Ohad', color: 'blue' } | { id: StringRequest, name: 'Company', color: 'default' }},
    "Amount (THB)": NumberPropertyItemObjectResponse,
    "Supplier": RelationPropertyItemObjectResponse,
    "Invoice / Receipt": FilesPropertyItemObjectResponse,
    "Expense": TitlePropertyItemObjectResponse,
    "Reference Number": RichTextPropertyItemObjectResponse,
    "Created by": CreatedByPropertyItemObjectResponse,
    "Last edited by": LastEditedByPropertyItemObjectResponse,
    "Last edited time": LastEditedTimePropertyItemObjectResponse,
    "Created time": CreatedTimePropertyItemObjectResponse
  }
}

export type ExpensesTrackerResponseProperties = keyof ExpensesTrackerResponse['properties']
export type ExpensesTrackerPath = Join<PathsToStringProps<ExpensesTrackerResponse>>


export type ExpensesTrackerCategoryPropertyType = ExpensesTrackerResponse['properties']['Category']['select']['name']

type ExpensesTrackerCategoryPropertyFilter =
  | {
      equals: ExpensesTrackerCategoryPropertyType
    }
  | {
      does_not_equal: ExpensesTrackerCategoryPropertyType
    }
  | ExistencePropertyFilter      


export type ExpensesTrackerPaymentMethodPropertyType = ExpensesTrackerResponse['properties']['Payment Method']['select']['name']

type ExpensesTrackerPaymentMethodPropertyFilter =
  | {
      equals: ExpensesTrackerPaymentMethodPropertyType
    }
  | {
      does_not_equal: ExpensesTrackerPaymentMethodPropertyType
    }
  | ExistencePropertyFilter      

type ExpensesTrackerTeamPropertyFilter = FormulaPropertyFilter
type ExpensesTrackerDatePropertyFilter = DatePropertyFilter

export type ExpensesTrackerDepartmentPropertyType = ExpensesTrackerResponse['properties']['Department']['select']['name']

type ExpensesTrackerDepartmentPropertyFilter =
  | {
      equals: ExpensesTrackerDepartmentPropertyType
    }
  | {
      does_not_equal: ExpensesTrackerDepartmentPropertyType
    }
  | ExistencePropertyFilter      

type ExpensesTrackerProcurementItemPropertyFilter = RelationPropertyFilter
type ExpensesTrackerInFavorOfPropertyFilter = PeoplePropertyFilter

export type ExpensesTrackerStatusPropertyType = ExpensesTrackerResponse['properties']['Status']['status']['name']

type ExpensesTrackerStatusPropertyFilter =
  | {
      equals: ExpensesTrackerStatusPropertyType
    }
  | {
      does_not_equal: ExpensesTrackerStatusPropertyType
    }
  | ExistencePropertyFilter      


export type ExpensesTrackerPaidByPropertyType = ExpensesTrackerResponse['properties']['Paid By']['select']['name']

type ExpensesTrackerPaidByPropertyFilter =
  | {
      equals: ExpensesTrackerPaidByPropertyType
    }
  | {
      does_not_equal: ExpensesTrackerPaidByPropertyType
    }
  | ExistencePropertyFilter      

type ExpensesTrackerAmountThbPropertyFilter = NumberPropertyFilter
type ExpensesTrackerSupplierPropertyFilter = RelationPropertyFilter
type ExpensesTrackerInvoiceReceiptPropertyFilter = ExistencePropertyFilter
type ExpensesTrackerExpensePropertyFilter = TextPropertyFilter
type ExpensesTrackerReferenceNumberPropertyFilter = TextPropertyFilter
type ExpensesTrackerCreatedByPropertyFilter = PeoplePropertyFilter
type ExpensesTrackerLastEditedByPropertyFilter = PeoplePropertyFilter
type ExpensesTrackerLastEditedTimePropertyFilter = DatePropertyFilter
type ExpensesTrackerCreatedTimePropertyFilter = DatePropertyFilter

export type ExpensesTrackerPropertyFilter = { category: ExpensesTrackerCategoryPropertyFilter } | { paymentMethod: ExpensesTrackerPaymentMethodPropertyFilter } | { team: ExpensesTrackerTeamPropertyFilter } | { date: ExpensesTrackerDatePropertyFilter } | { department: ExpensesTrackerDepartmentPropertyFilter } | { procurementItem: ExpensesTrackerProcurementItemPropertyFilter } | { inFavorOf: ExpensesTrackerInFavorOfPropertyFilter } | { status: ExpensesTrackerStatusPropertyFilter } | { paidBy: ExpensesTrackerPaidByPropertyFilter } | { amountThb: ExpensesTrackerAmountThbPropertyFilter } | { supplier: ExpensesTrackerSupplierPropertyFilter } | { invoiceReceipt: ExpensesTrackerInvoiceReceiptPropertyFilter } | { expense: ExpensesTrackerExpensePropertyFilter } | { referenceNumber: ExpensesTrackerReferenceNumberPropertyFilter } | { createdBy: ExpensesTrackerCreatedByPropertyFilter } | { lastEditedBy: ExpensesTrackerLastEditedByPropertyFilter } | { lastEditedTime: ExpensesTrackerLastEditedTimePropertyFilter } | { createdTime: ExpensesTrackerCreatedTimePropertyFilter }

export type ExpensesTrackerQuery = Omit<QueryDatabaseBodyParameters, 'filter' | 'sorts'> & {
  sorts?: Array<
  | {
      property: keyof typeof EXPENSES_TRACKER_PROPS_TO_IDS
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
          | ExpensesTrackerPropertyFilter
          | TimestampCreatedTimeFilter
          | TimestampLastEditedTimeFilter
          | {
              // or: ExpensesTrackerQuery['filter']
              or: Array<ExpensesTrackerPropertyFilter>
            }
          | {
              // and: ExpensesTrackerQuery['filter']
              and: Array<ExpensesTrackerPropertyFilter>
            }
        >
      }
    | {
        and: Array<
          | ExpensesTrackerPropertyFilter
          | TimestampCreatedTimeFilter
          | TimestampLastEditedTimeFilter
          | {
              // or: ExpensesTrackerQuery['filter']
              or: Array<ExpensesTrackerPropertyFilter>
            }
          | {
              // and: ExpensesTrackerQuery['filter']
              and: Array<ExpensesTrackerPropertyFilter>
            }
        >
      }
    | ExpensesTrackerPropertyFilter
    | TimestampCreatedTimeFilter
    | TimestampLastEditedTimeFilter
}

export type ExpensesTrackerQueryFilter = ExpensesTrackerQuery['filter']

export type ExpensesTrackerQueryResponse = {
  results: ExpensesTrackerResponse[]
  next_cursor: string | null
  has_more: boolean
}

