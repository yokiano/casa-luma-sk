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
import { COMPANY_LEDGER_PROPS_TO_IDS } from './constants'

export interface CompanyLedgerResponse extends WithOptional<Omit<DatabaseObjectResponse, 'properties'>, 'title'| 'description'| 'is_inline'| 'url'| 'public_url'> {
  properties: {
    "Type": Omit<SelectPropertyItemObjectResponse, 'select'> & { select: { id: StringRequest, name: 'Income', color: 'green' } | { id: StringRequest, name: 'Expense', color: 'red' } | { id: StringRequest, name: 'Owner Draw', color: 'blue' } | { id: StringRequest, name: 'Owner Contribution', color: 'purple' } | { id: StringRequest, name: 'Dividend', color: 'orange' }},
    "Amount (THB)": NumberPropertyItemObjectResponse,
    "Notes": RichTextPropertyItemObjectResponse,
    "Date": DatePropertyItemObjectResponse,
    "Supplier": RelationPropertyItemObjectResponse,
    "Status": Omit<StatusPropertyItemObjectResponse, 'status'> & { status: { id: StringRequest, name: 'Pending', color: 'gray' } | { id: StringRequest, name: 'Paid', color: 'green' } | { id: StringRequest, name: 'Received', color: 'blue' } | { id: StringRequest, name: 'Reconciled', color: 'purple' }},
    "Reference Number": RichTextPropertyItemObjectResponse,
    "Department": Omit<SelectPropertyItemObjectResponse, 'select'> & { select: { id: StringRequest, name: 'General', color: 'gray' } | { id: StringRequest, name: 'Open Play', color: 'blue' } | { id: StringRequest, name: 'Cafe', color: 'brown' } | { id: StringRequest, name: 'Garden', color: 'green' } | { id: StringRequest, name: 'Store', color: 'purple' } | { id: StringRequest, name: 'Management', color: 'orange' }},
    "Invoice / Receipt": FilesPropertyItemObjectResponse,
    "Owner": Omit<SelectPropertyItemObjectResponse, 'select'> & { select: { id: StringRequest, name: 'Yarden', color: 'blue' } | { id: StringRequest, name: 'Ohad', color: 'green' } | { id: StringRequest, name: 'Kwan', color: 'purple' } | { id: StringRequest, name: 'N/A', color: 'gray' }},
    "Payment Method": Omit<SelectPropertyItemObjectResponse, 'select'> & { select: { id: StringRequest, name: 'Cash', color: 'green' } | { id: StringRequest, name: 'Wire Transfer', color: 'blue' } | { id: StringRequest, name: 'Scan', color: 'purple' } | { id: StringRequest, name: 'Credit Card', color: 'orange' }},
    "Category": Omit<SelectPropertyItemObjectResponse, 'select'> & { select: { id: StringRequest, name: 'Revenue', color: 'green' } | { id: StringRequest, name: 'Salary', color: 'red' } | { id: StringRequest, name: 'Owner Capital', color: 'purple' } | { id: StringRequest, name: 'Legal', color: 'red' } | { id: StringRequest, name: 'Bills', color: 'yellow' } | { id: StringRequest, name: 'Rent', color: 'gray' } | { id: StringRequest, name: 'Food & Groceries', color: 'orange' } | { id: StringRequest, name: 'Staff Food', color: 'blue' } | { id: StringRequest, name: 'Consumable Product', color: 'purple' } | { id: StringRequest, name: 'Physical Product', color: 'blue' } | { id: StringRequest, name: 'Maintenance', color: 'brown' } | { id: StringRequest, name: 'Entertainment', color: 'pink' } | { id: StringRequest, name: 'Miscellaneous', color: 'default' } | { id: StringRequest, name: 'Marketing', color: 'blue' }},
    "Bank Account": Omit<SelectPropertyItemObjectResponse, 'select'> & { select: { id: StringRequest, name: 'KBank', color: 'green' } | { id: StringRequest, name: 'SCB', color: 'purple' } | { id: StringRequest, name: 'Cash Register', color: 'orange' } | { id: StringRequest, name: 'Petty Cash', color: 'gray' }},
    "Description": TitlePropertyItemObjectResponse,
    "Created by": CreatedByPropertyItemObjectResponse,
    "Last edited time": LastEditedTimePropertyItemObjectResponse,
    "Created time": CreatedTimePropertyItemObjectResponse,
    "Last edited by": LastEditedByPropertyItemObjectResponse
  }
}

export type CompanyLedgerResponseProperties = keyof CompanyLedgerResponse['properties']
export type CompanyLedgerPath = Join<PathsToStringProps<CompanyLedgerResponse>>


export type CompanyLedgerTypePropertyType = CompanyLedgerResponse['properties']['Type']['select']['name']

type CompanyLedgerTypePropertyFilter =
  | {
      equals: CompanyLedgerTypePropertyType
    }
  | {
      does_not_equal: CompanyLedgerTypePropertyType
    }
  | ExistencePropertyFilter      

type CompanyLedgerAmountThbPropertyFilter = NumberPropertyFilter
type CompanyLedgerNotesPropertyFilter = TextPropertyFilter
type CompanyLedgerDatePropertyFilter = DatePropertyFilter
type CompanyLedgerSupplierPropertyFilter = RelationPropertyFilter

export type CompanyLedgerStatusPropertyType = CompanyLedgerResponse['properties']['Status']['status']['name']

type CompanyLedgerStatusPropertyFilter =
  | {
      equals: CompanyLedgerStatusPropertyType
    }
  | {
      does_not_equal: CompanyLedgerStatusPropertyType
    }
  | ExistencePropertyFilter      

type CompanyLedgerReferenceNumberPropertyFilter = TextPropertyFilter

export type CompanyLedgerDepartmentPropertyType = CompanyLedgerResponse['properties']['Department']['select']['name']

type CompanyLedgerDepartmentPropertyFilter =
  | {
      equals: CompanyLedgerDepartmentPropertyType
    }
  | {
      does_not_equal: CompanyLedgerDepartmentPropertyType
    }
  | ExistencePropertyFilter      

type CompanyLedgerInvoiceReceiptPropertyFilter = ExistencePropertyFilter

export type CompanyLedgerOwnerPropertyType = CompanyLedgerResponse['properties']['Owner']['select']['name']

type CompanyLedgerOwnerPropertyFilter =
  | {
      equals: CompanyLedgerOwnerPropertyType
    }
  | {
      does_not_equal: CompanyLedgerOwnerPropertyType
    }
  | ExistencePropertyFilter      


export type CompanyLedgerPaymentMethodPropertyType = CompanyLedgerResponse['properties']['Payment Method']['select']['name']

type CompanyLedgerPaymentMethodPropertyFilter =
  | {
      equals: CompanyLedgerPaymentMethodPropertyType
    }
  | {
      does_not_equal: CompanyLedgerPaymentMethodPropertyType
    }
  | ExistencePropertyFilter      


export type CompanyLedgerCategoryPropertyType = CompanyLedgerResponse['properties']['Category']['select']['name']

type CompanyLedgerCategoryPropertyFilter =
  | {
      equals: CompanyLedgerCategoryPropertyType
    }
  | {
      does_not_equal: CompanyLedgerCategoryPropertyType
    }
  | ExistencePropertyFilter      


export type CompanyLedgerBankAccountPropertyType = CompanyLedgerResponse['properties']['Bank Account']['select']['name']

type CompanyLedgerBankAccountPropertyFilter =
  | {
      equals: CompanyLedgerBankAccountPropertyType
    }
  | {
      does_not_equal: CompanyLedgerBankAccountPropertyType
    }
  | ExistencePropertyFilter      

type CompanyLedgerDescriptionPropertyFilter = TextPropertyFilter
type CompanyLedgerCreatedByPropertyFilter = PeoplePropertyFilter
type CompanyLedgerLastEditedTimePropertyFilter = DatePropertyFilter
type CompanyLedgerCreatedTimePropertyFilter = DatePropertyFilter
type CompanyLedgerLastEditedByPropertyFilter = PeoplePropertyFilter

export type CompanyLedgerPropertyFilter = { type: CompanyLedgerTypePropertyFilter } | { amountThb: CompanyLedgerAmountThbPropertyFilter } | { notes: CompanyLedgerNotesPropertyFilter } | { date: CompanyLedgerDatePropertyFilter } | { supplier: CompanyLedgerSupplierPropertyFilter } | { status: CompanyLedgerStatusPropertyFilter } | { referenceNumber: CompanyLedgerReferenceNumberPropertyFilter } | { department: CompanyLedgerDepartmentPropertyFilter } | { invoiceReceipt: CompanyLedgerInvoiceReceiptPropertyFilter } | { owner: CompanyLedgerOwnerPropertyFilter } | { paymentMethod: CompanyLedgerPaymentMethodPropertyFilter } | { category: CompanyLedgerCategoryPropertyFilter } | { bankAccount: CompanyLedgerBankAccountPropertyFilter } | { description: CompanyLedgerDescriptionPropertyFilter } | { createdBy: CompanyLedgerCreatedByPropertyFilter } | { lastEditedTime: CompanyLedgerLastEditedTimePropertyFilter } | { createdTime: CompanyLedgerCreatedTimePropertyFilter } | { lastEditedBy: CompanyLedgerLastEditedByPropertyFilter }

export type CompanyLedgerQuery = Omit<QueryDatabaseBodyParameters, 'filter' | 'sorts'> & {
  sorts?: Array<
  | {
      property: keyof typeof COMPANY_LEDGER_PROPS_TO_IDS
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
          | CompanyLedgerPropertyFilter
          | TimestampCreatedTimeFilter
          | TimestampLastEditedTimeFilter
          | {
              // or: CompanyLedgerQuery['filter']
              or: Array<CompanyLedgerPropertyFilter>
            }
          | {
              // and: CompanyLedgerQuery['filter']
              and: Array<CompanyLedgerPropertyFilter>
            }
        >
      }
    | {
        and: Array<
          | CompanyLedgerPropertyFilter
          | TimestampCreatedTimeFilter
          | TimestampLastEditedTimeFilter
          | {
              // or: CompanyLedgerQuery['filter']
              or: Array<CompanyLedgerPropertyFilter>
            }
          | {
              // and: CompanyLedgerQuery['filter']
              and: Array<CompanyLedgerPropertyFilter>
            }
        >
      }
    | CompanyLedgerPropertyFilter
    | TimestampCreatedTimeFilter
    | TimestampLastEditedTimeFilter
}

export type CompanyLedgerQueryFilter = CompanyLedgerQuery['filter']

export type CompanyLedgerQueryResponse = {
  results: CompanyLedgerResponse[]
  next_cursor: string | null
  has_more: boolean
}

