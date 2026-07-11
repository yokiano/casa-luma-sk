import { WithOptional, Join, PathsToStringProps } from '../../core/types/helper.types'
import {
DatabaseObjectResponse,
StringRequest,
CreatedByPropertyItemObjectResponse,
CreatedTimePropertyItemObjectResponse,
DatePropertyItemObjectResponse,
FilesPropertyItemObjectResponse,
LastEditedByPropertyItemObjectResponse,
LastEditedTimePropertyItemObjectResponse,
NumberPropertyItemObjectResponse,
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
NumberPropertyFilter,
PeoplePropertyFilter,
RelationPropertyFilter,
TextPropertyFilter
} from '../../core/types/notion-api.types'
import { FINANCIAL_LEDGER_PROPS_TO_IDS } from './constants'

export interface FinancialLedgerResponse extends WithOptional<Omit<DatabaseObjectResponse, 'properties'>, 'title'| 'description'| 'is_inline'| 'url'| 'public_url'> {
  properties: {
    "Type": Omit<SelectPropertyItemObjectResponse, 'select'> & { select: { id: StringRequest, name: 'Credit Card Income', color: 'green' } | { id: StringRequest, name: 'Scan Income', color: 'green' } | { id: StringRequest, name: 'Bank Deposit Income', color: 'green' } | { id: StringRequest, name: 'Scan Expense', color: 'red' } | { id: StringRequest, name: 'Register Expense', color: 'orange' } | { id: StringRequest, name: 'Expense from Backup', color: 'pink' } | { id: StringRequest, name: 'Bank Transfer Expense', color: 'pink' } | { id: StringRequest, name: 'Refund', color: 'yellow' } | { id: StringRequest, name: 'Owner Draw', color: 'blue' } | { id: StringRequest, name: 'Owner Contribution', color: 'purple' } | { id: StringRequest, name: 'Dividend', color: 'orange' } | { id: StringRequest, name: 'Expense', color: 'brown' }},
    "Amount (THB)": NumberPropertyItemObjectResponse,
    "Notes": RichTextPropertyItemObjectResponse,
    "Date": DatePropertyItemObjectResponse,
    "Supplier": RelationPropertyItemObjectResponse,
    "Status": Omit<StatusPropertyItemObjectResponse, 'status'> & { status: { id: StringRequest, name: 'Pending', color: 'gray' } | { id: StringRequest, name: 'Paid', color: 'green' } | { id: StringRequest, name: 'Received', color: 'blue' } | { id: StringRequest, name: 'Reconciled', color: 'purple' }},
    "Reference Number": RichTextPropertyItemObjectResponse,
    "Department": Omit<SelectPropertyItemObjectResponse, 'select'> & { select: { id: StringRequest, name: 'General', color: 'gray' } | { id: StringRequest, name: 'Open Play', color: 'blue' } | { id: StringRequest, name: 'Cafe', color: 'brown' } | { id: StringRequest, name: 'Garden', color: 'green' } | { id: StringRequest, name: 'Store', color: 'purple' } | { id: StringRequest, name: 'Management', color: 'orange' } | { id: StringRequest, name: 'Breakfast Service', color: 'pink' }},
    "Invoice / Receipt": FilesPropertyItemObjectResponse,
    "Approved By": Omit<SelectPropertyItemObjectResponse, 'select'> & { select: { id: StringRequest, name: 'Roza', color: 'default' } | { id: StringRequest, name: 'Yarden', color: 'blue' } | { id: StringRequest, name: 'Ohad', color: 'green' } | { id: StringRequest, name: 'Kwan', color: 'purple' } | { id: StringRequest, name: 'Karni', color: 'gray' }},
    "Payment Method": Omit<SelectPropertyItemObjectResponse, 'select'> & { select: { id: StringRequest, name: 'Cash', color: 'green' } | { id: StringRequest, name: 'Wire Transfer', color: 'blue' } | { id: StringRequest, name: 'Scan', color: 'purple' } | { id: StringRequest, name: 'Credit Card', color: 'orange' }},
    "Category": Omit<SelectPropertyItemObjectResponse, 'select'> & { select: { id: StringRequest, name: 'Revenue', color: 'green' } | { id: StringRequest, name: 'Salary', color: 'red' } | { id: StringRequest, name: 'Owner Capital', color: 'purple' } | { id: StringRequest, name: 'Legal', color: 'red' } | { id: StringRequest, name: 'Bills', color: 'yellow' } | { id: StringRequest, name: 'Rent', color: 'gray' } | { id: StringRequest, name: 'Food & Groceries', color: 'orange' } | { id: StringRequest, name: 'Staff Food', color: 'blue' } | { id: StringRequest, name: 'Consumable Product', color: 'purple' } | { id: StringRequest, name: 'Physical Product', color: 'blue' } | { id: StringRequest, name: 'Maintenance', color: 'brown' } | { id: StringRequest, name: 'Entertainment', color: 'pink' } | { id: StringRequest, name: 'Miscellaneous', color: 'default' } | { id: StringRequest, name: 'Marketing', color: 'blue' }},
    "Bank Account": Omit<SelectPropertyItemObjectResponse, 'select'> & { select: { id: StringRequest, name: 'KBank', color: 'green' } | { id: StringRequest, name: 'Cash Register', color: 'orange' }},
    "Description": TitlePropertyItemObjectResponse,
    "Created by": CreatedByPropertyItemObjectResponse,
    "Last edited time": LastEditedTimePropertyItemObjectResponse,
    "Created time": CreatedTimePropertyItemObjectResponse,
    "Last edited by": LastEditedByPropertyItemObjectResponse
  }
}

export type FinancialLedgerResponseProperties = keyof FinancialLedgerResponse['properties']
export type FinancialLedgerPath = Join<PathsToStringProps<FinancialLedgerResponse>>


export type FinancialLedgerTypePropertyType = FinancialLedgerResponse['properties']['Type']['select']['name']

type FinancialLedgerTypePropertyFilter =
  | {
      equals: FinancialLedgerTypePropertyType
    }
  | {
      does_not_equal: FinancialLedgerTypePropertyType
    }
  | ExistencePropertyFilter      

type FinancialLedgerAmountThbPropertyFilter = NumberPropertyFilter
type FinancialLedgerNotesPropertyFilter = TextPropertyFilter
type FinancialLedgerDatePropertyFilter = DatePropertyFilter
type FinancialLedgerSupplierPropertyFilter = RelationPropertyFilter

export type FinancialLedgerStatusPropertyType = FinancialLedgerResponse['properties']['Status']['status']['name']

type FinancialLedgerStatusPropertyFilter =
  | {
      equals: FinancialLedgerStatusPropertyType
    }
  | {
      does_not_equal: FinancialLedgerStatusPropertyType
    }
  | ExistencePropertyFilter      

type FinancialLedgerReferenceNumberPropertyFilter = TextPropertyFilter

export type FinancialLedgerDepartmentPropertyType = FinancialLedgerResponse['properties']['Department']['select']['name']

type FinancialLedgerDepartmentPropertyFilter =
  | {
      equals: FinancialLedgerDepartmentPropertyType
    }
  | {
      does_not_equal: FinancialLedgerDepartmentPropertyType
    }
  | ExistencePropertyFilter      

type FinancialLedgerInvoiceReceiptPropertyFilter = ExistencePropertyFilter

export type FinancialLedgerApprovedByPropertyType = FinancialLedgerResponse['properties']['Approved By']['select']['name']

type FinancialLedgerApprovedByPropertyFilter =
  | {
      equals: FinancialLedgerApprovedByPropertyType
    }
  | {
      does_not_equal: FinancialLedgerApprovedByPropertyType
    }
  | ExistencePropertyFilter      


export type FinancialLedgerPaymentMethodPropertyType = FinancialLedgerResponse['properties']['Payment Method']['select']['name']

type FinancialLedgerPaymentMethodPropertyFilter =
  | {
      equals: FinancialLedgerPaymentMethodPropertyType
    }
  | {
      does_not_equal: FinancialLedgerPaymentMethodPropertyType
    }
  | ExistencePropertyFilter      


export type FinancialLedgerCategoryPropertyType = FinancialLedgerResponse['properties']['Category']['select']['name']

type FinancialLedgerCategoryPropertyFilter =
  | {
      equals: FinancialLedgerCategoryPropertyType
    }
  | {
      does_not_equal: FinancialLedgerCategoryPropertyType
    }
  | ExistencePropertyFilter      


export type FinancialLedgerBankAccountPropertyType = FinancialLedgerResponse['properties']['Bank Account']['select']['name']

type FinancialLedgerBankAccountPropertyFilter =
  | {
      equals: FinancialLedgerBankAccountPropertyType
    }
  | {
      does_not_equal: FinancialLedgerBankAccountPropertyType
    }
  | ExistencePropertyFilter      

type FinancialLedgerDescriptionPropertyFilter = TextPropertyFilter
type FinancialLedgerCreatedByPropertyFilter = PeoplePropertyFilter
type FinancialLedgerLastEditedTimePropertyFilter = DatePropertyFilter
type FinancialLedgerCreatedTimePropertyFilter = DatePropertyFilter
type FinancialLedgerLastEditedByPropertyFilter = PeoplePropertyFilter

export type FinancialLedgerPropertyFilter = { type: FinancialLedgerTypePropertyFilter } | { amountThb: FinancialLedgerAmountThbPropertyFilter } | { notes: FinancialLedgerNotesPropertyFilter } | { date: FinancialLedgerDatePropertyFilter } | { supplier: FinancialLedgerSupplierPropertyFilter } | { status: FinancialLedgerStatusPropertyFilter } | { referenceNumber: FinancialLedgerReferenceNumberPropertyFilter } | { department: FinancialLedgerDepartmentPropertyFilter } | { invoiceReceipt: FinancialLedgerInvoiceReceiptPropertyFilter } | { approvedBy: FinancialLedgerApprovedByPropertyFilter } | { paymentMethod: FinancialLedgerPaymentMethodPropertyFilter } | { category: FinancialLedgerCategoryPropertyFilter } | { bankAccount: FinancialLedgerBankAccountPropertyFilter } | { description: FinancialLedgerDescriptionPropertyFilter } | { createdBy: FinancialLedgerCreatedByPropertyFilter } | { lastEditedTime: FinancialLedgerLastEditedTimePropertyFilter } | { createdTime: FinancialLedgerCreatedTimePropertyFilter } | { lastEditedBy: FinancialLedgerLastEditedByPropertyFilter }

export type FinancialLedgerQuery = Omit<QueryDatabaseBodyParameters, 'filter' | 'sorts'> & {
  sorts?: Array<
  | {
      property: keyof typeof FINANCIAL_LEDGER_PROPS_TO_IDS
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
          | FinancialLedgerPropertyFilter
          | TimestampCreatedTimeFilter
          | TimestampLastEditedTimeFilter
          | {
              // or: FinancialLedgerQuery['filter']
              or: Array<FinancialLedgerPropertyFilter>
            }
          | {
              // and: FinancialLedgerQuery['filter']
              and: Array<FinancialLedgerPropertyFilter>
            }
        >
      }
    | {
        and: Array<
          | FinancialLedgerPropertyFilter
          | TimestampCreatedTimeFilter
          | TimestampLastEditedTimeFilter
          | {
              // or: FinancialLedgerQuery['filter']
              or: Array<FinancialLedgerPropertyFilter>
            }
          | {
              // and: FinancialLedgerQuery['filter']
              and: Array<FinancialLedgerPropertyFilter>
            }
        >
      }
    | FinancialLedgerPropertyFilter
    | TimestampCreatedTimeFilter
    | TimestampLastEditedTimeFilter
}

export type FinancialLedgerQueryFilter = FinancialLedgerQuery['filter']

export type FinancialLedgerQueryResponse = {
  results: FinancialLedgerResponse[]
  next_cursor: string | null
  has_more: boolean
}

