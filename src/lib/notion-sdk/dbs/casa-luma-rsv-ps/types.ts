import { WithOptional, Join, PathsToStringProps } from '../../core/types/helper.types'
import {
DatabaseObjectResponse,
StringRequest,
CheckboxPropertyItemObjectResponse,
CreatedTimePropertyItemObjectResponse,
DatePropertyItemObjectResponse,
EmailPropertyItemObjectResponse,
MultiSelectPropertyItemObjectResponse,
NumberPropertyItemObjectResponse,
PhoneNumberPropertyItemObjectResponse,
RelationPropertyItemObjectResponse,
RichTextPropertyItemObjectResponse,
SelectPropertyItemObjectResponse,
TitlePropertyItemObjectResponse,
ExistencePropertyFilter,
QueryDatabaseBodyParameters,
TimestampCreatedTimeFilter,
TimestampLastEditedTimeFilter,
CheckboxPropertyFilter,
DatePropertyFilter,
NumberPropertyFilter,
RelationPropertyFilter,
TextPropertyFilter
} from '../../core/types/notion-api.types'
import { CASA_LUMA_RSV_PS_PROPS_TO_IDS } from './constants'

export interface CasaLumaRsvPsResponse extends WithOptional<Omit<DatabaseObjectResponse, 'properties'>, 'title'| 'description'| 'is_inline'| 'url'| 'public_url'> {
  properties: {
    "Notes": RichTextPropertyItemObjectResponse,
    "Dietary Restrictions": MultiSelectPropertyItemObjectResponse,
    "Source": Omit<SelectPropertyItemObjectResponse, 'select'> & { select: { id: StringRequest, name: 'Website', color: 'blue' } | { id: StringRequest, name: 'Instagram', color: 'purple' } | { id: StringRequest, name: 'Friend', color: 'green' } | { id: StringRequest, name: 'Other', color: 'gray' }},
    "Confirmed At": DatePropertyItemObjectResponse,
    "Number of Guests": NumberPropertyItemObjectResponse,
    "Status": Omit<SelectPropertyItemObjectResponse, 'select'> & { select: { id: StringRequest, name: 'Confirmed', color: 'green' } | { id: StringRequest, name: 'Waitlist', color: 'yellow' } | { id: StringRequest, name: 'Cancelled', color: 'red' } | { id: StringRequest, name: 'No-show', color: 'gray' }},
    "Phone": PhoneNumberPropertyItemObjectResponse,
    "Event": RelationPropertyItemObjectResponse,
    "Email": EmailPropertyItemObjectResponse,
    "Check-in Status": CheckboxPropertyItemObjectResponse,
    "Guest Name": RichTextPropertyItemObjectResponse,
    "Internal Notes": RichTextPropertyItemObjectResponse,
    "Payment Status": Omit<SelectPropertyItemObjectResponse, 'select'> & { select: { id: StringRequest, name: 'Pending', color: 'orange' } | { id: StringRequest, name: 'Paid', color: 'green' } | { id: StringRequest, name: 'Refunded', color: 'blue' } | { id: StringRequest, name: 'N/A', color: 'gray' }},
    "RSVP ID": TitlePropertyItemObjectResponse,
    "Created At": CreatedTimePropertyItemObjectResponse
  }
}

export type CasaLumaRsvPsResponseProperties = keyof CasaLumaRsvPsResponse['properties']
export type CasaLumaRsvPsPath = Join<PathsToStringProps<CasaLumaRsvPsResponse>>

type CasaLumaRsvPsNotesPropertyFilter = TextPropertyFilter

export type CasaLumaRsvPsDietaryRestrictionsPropertyType = CasaLumaRsvPsResponse['properties']['Dietary Restrictions']['multi_select'][number]['name']

type CasaLumaRsvPsDietaryRestrictionsPropertyFilter =
  | {
      contains: CasaLumaRsvPsDietaryRestrictionsPropertyType
    }
  | {
      does_not_contain: CasaLumaRsvPsDietaryRestrictionsPropertyType
    }          
  | ExistencePropertyFilter


export type CasaLumaRsvPsSourcePropertyType = CasaLumaRsvPsResponse['properties']['Source']['select']['name']

type CasaLumaRsvPsSourcePropertyFilter =
  | {
      equals: CasaLumaRsvPsSourcePropertyType
    }
  | {
      does_not_equal: CasaLumaRsvPsSourcePropertyType
    }
  | ExistencePropertyFilter      

type CasaLumaRsvPsConfirmedAtPropertyFilter = DatePropertyFilter
type CasaLumaRsvPsNumberOfGuestsPropertyFilter = NumberPropertyFilter

export type CasaLumaRsvPsStatusPropertyType = CasaLumaRsvPsResponse['properties']['Status']['select']['name']

type CasaLumaRsvPsStatusPropertyFilter =
  | {
      equals: CasaLumaRsvPsStatusPropertyType
    }
  | {
      does_not_equal: CasaLumaRsvPsStatusPropertyType
    }
  | ExistencePropertyFilter      

type CasaLumaRsvPsPhonePropertyFilter = TextPropertyFilter
type CasaLumaRsvPsEventPropertyFilter = RelationPropertyFilter
type CasaLumaRsvPsEmailPropertyFilter = TextPropertyFilter
type CasaLumaRsvPsCheckInStatusPropertyFilter = CheckboxPropertyFilter
type CasaLumaRsvPsGuestNamePropertyFilter = TextPropertyFilter
type CasaLumaRsvPsInternalNotesPropertyFilter = TextPropertyFilter

export type CasaLumaRsvPsPaymentStatusPropertyType = CasaLumaRsvPsResponse['properties']['Payment Status']['select']['name']

type CasaLumaRsvPsPaymentStatusPropertyFilter =
  | {
      equals: CasaLumaRsvPsPaymentStatusPropertyType
    }
  | {
      does_not_equal: CasaLumaRsvPsPaymentStatusPropertyType
    }
  | ExistencePropertyFilter      

type CasaLumaRsvPsRsvpIdPropertyFilter = TextPropertyFilter
type CasaLumaRsvPsCreatedAtPropertyFilter = DatePropertyFilter

export type CasaLumaRsvPsPropertyFilter = { notes: CasaLumaRsvPsNotesPropertyFilter } | { dietaryRestrictions: CasaLumaRsvPsDietaryRestrictionsPropertyFilter } | { source: CasaLumaRsvPsSourcePropertyFilter } | { confirmedAt: CasaLumaRsvPsConfirmedAtPropertyFilter } | { numberOfGuests: CasaLumaRsvPsNumberOfGuestsPropertyFilter } | { status: CasaLumaRsvPsStatusPropertyFilter } | { phone: CasaLumaRsvPsPhonePropertyFilter } | { event: CasaLumaRsvPsEventPropertyFilter } | { email: CasaLumaRsvPsEmailPropertyFilter } | { checkInStatus: CasaLumaRsvPsCheckInStatusPropertyFilter } | { guestName: CasaLumaRsvPsGuestNamePropertyFilter } | { internalNotes: CasaLumaRsvPsInternalNotesPropertyFilter } | { paymentStatus: CasaLumaRsvPsPaymentStatusPropertyFilter } | { rsvpId: CasaLumaRsvPsRsvpIdPropertyFilter } | { createdAt: CasaLumaRsvPsCreatedAtPropertyFilter }

export type CasaLumaRsvPsQuery = Omit<QueryDatabaseBodyParameters, 'filter' | 'sorts'> & {
  sorts?: Array<
  | {
      property: keyof typeof CASA_LUMA_RSV_PS_PROPS_TO_IDS
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
          | CasaLumaRsvPsPropertyFilter
          | TimestampCreatedTimeFilter
          | TimestampLastEditedTimeFilter
          | {
              // or: CasaLumaRsvPsQuery['filter']
              or: Array<CasaLumaRsvPsPropertyFilter>
            }
          | {
              // and: CasaLumaRsvPsQuery['filter']
              and: Array<CasaLumaRsvPsPropertyFilter>
            }
        >
      }
    | {
        and: Array<
          | CasaLumaRsvPsPropertyFilter
          | TimestampCreatedTimeFilter
          | TimestampLastEditedTimeFilter
          | {
              // or: CasaLumaRsvPsQuery['filter']
              or: Array<CasaLumaRsvPsPropertyFilter>
            }
          | {
              // and: CasaLumaRsvPsQuery['filter']
              and: Array<CasaLumaRsvPsPropertyFilter>
            }
        >
      }
    | CasaLumaRsvPsPropertyFilter
    | TimestampCreatedTimeFilter
    | TimestampLastEditedTimeFilter
}

export type CasaLumaRsvPsQueryFilter = CasaLumaRsvPsQuery['filter']

export type CasaLumaRsvPsQueryResponse = {
  results: CasaLumaRsvPsResponse[]
  next_cursor: string | null
  has_more: boolean
}

