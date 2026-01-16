import { WithOptional, Join, PathsToStringProps } from '../../core/types/helper.types'
import {
DatabaseObjectResponse,
StringRequest,
DatePropertyItemObjectResponse,
EmailPropertyItemObjectResponse,
FilesPropertyItemObjectResponse,
FormulaPropertyItemObjectResponse,
MultiSelectPropertyItemObjectResponse,
NumberPropertyItemObjectResponse,
PeoplePropertyItemObjectResponse,
PhoneNumberPropertyItemObjectResponse,
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
import { EMPLOYEES_PROPS_TO_IDS } from './constants'

export interface EmployeesResponse extends WithOptional<Omit<DatabaseObjectResponse, 'properties'>, 'title'| 'description'| 'is_inline'| 'url'| 'public_url'> {
  properties: {
    "Visa Expiry": DatePropertyItemObjectResponse,
    "Work Permit Expiry": DatePropertyItemObjectResponse,
    "Photo": FilesPropertyItemObjectResponse,
    "Salary (THB)": NumberPropertyItemObjectResponse,
    "Languages": Omit<MultiSelectPropertyItemObjectResponse, 'multi_select'> & { multi_select: [{ id: StringRequest, name: 'English', color: 'brown' } | { id: StringRequest, name: 'Myanmar', color: 'orange' } | { id: StringRequest, name: 'Thai', color: 'yellow' } | { id: StringRequest, name: 'English Little Bit', color: 'gray' }]},
    "Employment Type": Omit<SelectPropertyItemObjectResponse, 'select'> & { select: { id: StringRequest, name: 'Full-time', color: 'red' } | { id: StringRequest, name: 'Part-time', color: 'green' } | { id: StringRequest, name: 'Contract', color: 'default' } | { id: StringRequest, name: 'Temporary', color: 'brown' } | { id: StringRequest, name: 'Seasonal', color: 'pink' } | { id: StringRequest, name: 'Freelance', color: 'orange' }},
    "Department": Omit<SelectPropertyItemObjectResponse, 'select'> & { select: { id: StringRequest, name: 'Maintenance', color: 'pink' } | { id: StringRequest, name: 'Café', color: 'purple' } | { id: StringRequest, name: 'Open Play', color: 'brown' } | { id: StringRequest, name: 'Marketing', color: 'green' } | { id: StringRequest, name: 'Management', color: 'gray' }},
    "End Date": DatePropertyItemObjectResponse,
    "Nationality": Omit<SelectPropertyItemObjectResponse, 'select'> & { select: { id: StringRequest, name: 'Burmese', color: 'brown' } | { id: StringRequest, name: 'Thai', color: 'green' }},
    "LINE": RichTextPropertyItemObjectResponse,
    "Work Permit Number": RichTextPropertyItemObjectResponse,
    "Email": EmailPropertyItemObjectResponse,
    "Payment Frequency": Omit<SelectPropertyItemObjectResponse, 'select'> & { select: { id: StringRequest, name: 'Monthly', color: 'gray' } | { id: StringRequest, name: 'Bi-weekly', color: 'default' } | { id: StringRequest, name: 'Weekly', color: 'pink' } | { id: StringRequest, name: 'Daily', color: 'brown' } | { id: StringRequest, name: 'Hourly', color: 'orange' }},
    "Full Name": RichTextPropertyItemObjectResponse,
    "Documents": FilesPropertyItemObjectResponse,
    "Address": RichTextPropertyItemObjectResponse,
    "Notes": RichTextPropertyItemObjectResponse,
    "Bank Account Details": RichTextPropertyItemObjectResponse,
    "Phone": PhoneNumberPropertyItemObjectResponse,
    "Role": RelationPropertyItemObjectResponse,
    "Hometown": RichTextPropertyItemObjectResponse,
    "Employment Status": Omit<StatusPropertyItemObjectResponse, 'status'> & { status: { id: StringRequest, name: 'Onboarding', color: 'default' } | { id: StringRequest, name: 'Working', color: 'default' } | { id: StringRequest, name: 'Active', color: 'default' } | { id: StringRequest, name: 'Resigned', color: 'default' } | { id: StringRequest, name: 'Terminated', color: 'default' } | { id: StringRequest, name: 'Contract Ended', color: 'default' }},
    "Reports To": PeoplePropertyItemObjectResponse,
    "Start Date": DatePropertyItemObjectResponse,
    "Nickname": TitlePropertyItemObjectResponse,
    "Tax ID": RichTextPropertyItemObjectResponse,
    "ID/Passport No.": RichTextPropertyItemObjectResponse,
    "Date of Birth": DatePropertyItemObjectResponse,
    "Work Permit Scan": FilesPropertyItemObjectResponse,
    "Scan QR": FilesPropertyItemObjectResponse,
    "Salary Calculation": Omit<SelectPropertyItemObjectResponse, 'select'> & { select: { id: StringRequest, name: 'Monthly', color: 'orange' } | { id: StringRequest, name: 'Daily', color: 'blue' }},
    "OT Rate (THB/hr)": FormulaPropertyItemObjectResponse
  }
}

export type EmployeesResponseProperties = keyof EmployeesResponse['properties']
export type EmployeesPath = Join<PathsToStringProps<EmployeesResponse>>

type EmployeesVisaExpiryPropertyFilter = DatePropertyFilter
type EmployeesWorkPermitExpiryPropertyFilter = DatePropertyFilter
type EmployeesPhotoPropertyFilter = ExistencePropertyFilter
type EmployeesSalaryThbPropertyFilter = NumberPropertyFilter

export type EmployeesLanguagesPropertyType = EmployeesResponse['properties']['Languages']['multi_select'][number]['name']

type EmployeesLanguagesPropertyFilter =
  | {
      contains: EmployeesLanguagesPropertyType
    }
  | {
      does_not_contain: EmployeesLanguagesPropertyType
    }          
  | ExistencePropertyFilter


export type EmployeesEmploymentTypePropertyType = EmployeesResponse['properties']['Employment Type']['select']['name']

type EmployeesEmploymentTypePropertyFilter =
  | {
      equals: EmployeesEmploymentTypePropertyType
    }
  | {
      does_not_equal: EmployeesEmploymentTypePropertyType
    }
  | ExistencePropertyFilter      


export type EmployeesDepartmentPropertyType = EmployeesResponse['properties']['Department']['select']['name']

type EmployeesDepartmentPropertyFilter =
  | {
      equals: EmployeesDepartmentPropertyType
    }
  | {
      does_not_equal: EmployeesDepartmentPropertyType
    }
  | ExistencePropertyFilter      

type EmployeesEndDatePropertyFilter = DatePropertyFilter

export type EmployeesNationalityPropertyType = EmployeesResponse['properties']['Nationality']['select']['name']

type EmployeesNationalityPropertyFilter =
  | {
      equals: EmployeesNationalityPropertyType
    }
  | {
      does_not_equal: EmployeesNationalityPropertyType
    }
  | ExistencePropertyFilter      

type EmployeesWhatsAppLinePropertyFilter = TextPropertyFilter
type EmployeesWorkPermitNumberPropertyFilter = TextPropertyFilter
type EmployeesEmailPropertyFilter = TextPropertyFilter

export type EmployeesPaymentFrequencyPropertyType = EmployeesResponse['properties']['Payment Frequency']['select']['name']

type EmployeesPaymentFrequencyPropertyFilter =
  | {
      equals: EmployeesPaymentFrequencyPropertyType
    }
  | {
      does_not_equal: EmployeesPaymentFrequencyPropertyType
    }
  | ExistencePropertyFilter      

type EmployeesFullNamePropertyFilter = TextPropertyFilter
type EmployeesDocumentsPropertyFilter = ExistencePropertyFilter
type EmployeesAddressPropertyFilter = TextPropertyFilter
type EmployeesNotesPropertyFilter = TextPropertyFilter
type EmployeesBankAccountDetailsPropertyFilter = TextPropertyFilter
type EmployeesPhonePropertyFilter = TextPropertyFilter
type EmployeesPositionPropertyFilter = RelationPropertyFilter
type EmployeesHometownPropertyFilter = TextPropertyFilter

export type EmployeesEmploymentStatusPropertyType = EmployeesResponse['properties']['Employment Status']['status']['name']

type EmployeesEmploymentStatusPropertyFilter =
  | {
      equals: EmployeesEmploymentStatusPropertyType
    }
  | {
      does_not_equal: EmployeesEmploymentStatusPropertyType
    }
  | ExistencePropertyFilter      

type EmployeesReportsToPropertyFilter = PeoplePropertyFilter
type EmployeesStartDatePropertyFilter = DatePropertyFilter
type EmployeesNicknamePropertyFilter = TextPropertyFilter
type EmployeesTaxIdPropertyFilter = TextPropertyFilter
type EmployeesIdPassportNoPropertyFilter = TextPropertyFilter
type EmployeesDateOfBirthPropertyFilter = DatePropertyFilter
type EmployeesWorkPermitScanPropertyFilter = ExistencePropertyFilter
type EmployeesScanQrPropertyFilter = ExistencePropertyFilter

export type EmployeesSalaryCalculationPropertyType = EmployeesResponse['properties']['Salary Calculation']['select']['name']

type EmployeesSalaryCalculationPropertyFilter =
  | {
      equals: EmployeesSalaryCalculationPropertyType
    }
  | {
      does_not_equal: EmployeesSalaryCalculationPropertyType
    }
  | ExistencePropertyFilter      

type EmployeesOtRateThBhrPropertyFilter = FormulaPropertyFilter

export type EmployeesPropertyFilter = { visaExpiry: EmployeesVisaExpiryPropertyFilter } | { workPermitExpiry: EmployeesWorkPermitExpiryPropertyFilter } | { photo: EmployeesPhotoPropertyFilter } | { salaryThb: EmployeesSalaryThbPropertyFilter } | { languages: EmployeesLanguagesPropertyFilter } | { employmentType: EmployeesEmploymentTypePropertyFilter } | { department: EmployeesDepartmentPropertyFilter } | { endDate: EmployeesEndDatePropertyFilter } | { nationality: EmployeesNationalityPropertyFilter } | { whatsAppLine: EmployeesWhatsAppLinePropertyFilter } | { workPermitNumber: EmployeesWorkPermitNumberPropertyFilter } | { email: EmployeesEmailPropertyFilter } | { paymentFrequency: EmployeesPaymentFrequencyPropertyFilter } | { fullName: EmployeesFullNamePropertyFilter } | { documents: EmployeesDocumentsPropertyFilter } | { address: EmployeesAddressPropertyFilter } | { notes: EmployeesNotesPropertyFilter } | { bankAccountDetails: EmployeesBankAccountDetailsPropertyFilter } | { phone: EmployeesPhonePropertyFilter } | { position: EmployeesPositionPropertyFilter } | { hometown: EmployeesHometownPropertyFilter } | { employmentStatus: EmployeesEmploymentStatusPropertyFilter } | { reportsTo: EmployeesReportsToPropertyFilter } | { startDate: EmployeesStartDatePropertyFilter } | { nickname: EmployeesNicknamePropertyFilter } | { taxId: EmployeesTaxIdPropertyFilter } | { idPassportNo: EmployeesIdPassportNoPropertyFilter } | { dateOfBirth: EmployeesDateOfBirthPropertyFilter } | { workPermitScan: EmployeesWorkPermitScanPropertyFilter } | { scanQr: EmployeesScanQrPropertyFilter } | { salaryCalculation: EmployeesSalaryCalculationPropertyFilter } | { otRateThBhr: EmployeesOtRateThBhrPropertyFilter }

export type EmployeesQuery = Omit<QueryDatabaseBodyParameters, 'filter' | 'sorts'> & {
  sorts?: Array<
  | {
      property: keyof typeof EMPLOYEES_PROPS_TO_IDS
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
          | EmployeesPropertyFilter
          | TimestampCreatedTimeFilter
          | TimestampLastEditedTimeFilter
          | {
              // or: EmployeesQuery['filter']
              or: Array<EmployeesPropertyFilter>
            }
          | {
              // and: EmployeesQuery['filter']
              and: Array<EmployeesPropertyFilter>
            }
        >
      }
    | {
        and: Array<
          | EmployeesPropertyFilter
          | TimestampCreatedTimeFilter
          | TimestampLastEditedTimeFilter
          | {
              // or: EmployeesQuery['filter']
              or: Array<EmployeesPropertyFilter>
            }
          | {
              // and: EmployeesQuery['filter']
              and: Array<EmployeesPropertyFilter>
            }
        >
      }
    | EmployeesPropertyFilter
    | TimestampCreatedTimeFilter
    | TimestampLastEditedTimeFilter
}

export type EmployeesQueryFilter = EmployeesQuery['filter']

export type EmployeesQueryResponse = {
  results: EmployeesResponse[]
  next_cursor: string | null
  has_more: boolean
}

