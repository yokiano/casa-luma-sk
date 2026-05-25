import { WithOptional, Join, PathsToStringProps } from '../../core/types/helper.types'
import {
DatabaseObjectResponse,
StringRequest,
CheckboxPropertyItemObjectResponse,
CreatedTimePropertyItemObjectResponse,
EmailPropertyItemObjectResponse,
PhoneNumberPropertyItemObjectResponse,
RelationPropertyItemObjectResponse,
RichTextPropertyItemObjectResponse,
TitlePropertyItemObjectResponse,
ExistencePropertyFilter,
QueryDatabaseBodyParameters,
TimestampCreatedTimeFilter,
TimestampLastEditedTimeFilter,
CheckboxPropertyFilter,
DatePropertyFilter,
RelationPropertyFilter,
TextPropertyFilter
} from '../../core/types/notion-api.types'
import { CASA_LUMA_WAITLIST_PROPS_TO_IDS } from './constants'

export interface CasaLumaWaitlistResponse extends WithOptional<Omit<DatabaseObjectResponse, 'properties'>, 'title'| 'description'| 'is_inline'| 'url'| 'public_url'> {
  properties: {
    "Converted to RSVP": RelationPropertyItemObjectResponse,
    "Phone": PhoneNumberPropertyItemObjectResponse,
    "Event": RelationPropertyItemObjectResponse,
    "Notified": CheckboxPropertyItemObjectResponse,
    "Guest Name": RichTextPropertyItemObjectResponse,
    "Email": EmailPropertyItemObjectResponse,
    "Waitlist ID": TitlePropertyItemObjectResponse,
    "Added At": CreatedTimePropertyItemObjectResponse
  }
}

export type CasaLumaWaitlistResponseProperties = keyof CasaLumaWaitlistResponse['properties']
export type CasaLumaWaitlistPath = Join<PathsToStringProps<CasaLumaWaitlistResponse>>

type CasaLumaWaitlistConvertedToRsvpPropertyFilter = RelationPropertyFilter
type CasaLumaWaitlistPhonePropertyFilter = TextPropertyFilter
type CasaLumaWaitlistEventPropertyFilter = RelationPropertyFilter
type CasaLumaWaitlistNotifiedPropertyFilter = CheckboxPropertyFilter
type CasaLumaWaitlistGuestNamePropertyFilter = TextPropertyFilter
type CasaLumaWaitlistEmailPropertyFilter = TextPropertyFilter
type CasaLumaWaitlistWaitlistIdPropertyFilter = TextPropertyFilter
type CasaLumaWaitlistAddedAtPropertyFilter = DatePropertyFilter

export type CasaLumaWaitlistPropertyFilter = { convertedToRsvp: CasaLumaWaitlistConvertedToRsvpPropertyFilter } | { phone: CasaLumaWaitlistPhonePropertyFilter } | { event: CasaLumaWaitlistEventPropertyFilter } | { notified: CasaLumaWaitlistNotifiedPropertyFilter } | { guestName: CasaLumaWaitlistGuestNamePropertyFilter } | { email: CasaLumaWaitlistEmailPropertyFilter } | { waitlistId: CasaLumaWaitlistWaitlistIdPropertyFilter } | { addedAt: CasaLumaWaitlistAddedAtPropertyFilter }

export type CasaLumaWaitlistQuery = Omit<QueryDatabaseBodyParameters, 'filter' | 'sorts'> & {
  sorts?: Array<
  | {
      property: keyof typeof CASA_LUMA_WAITLIST_PROPS_TO_IDS
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
          | CasaLumaWaitlistPropertyFilter
          | TimestampCreatedTimeFilter
          | TimestampLastEditedTimeFilter
          | {
              // or: CasaLumaWaitlistQuery['filter']
              or: Array<CasaLumaWaitlistPropertyFilter>
            }
          | {
              // and: CasaLumaWaitlistQuery['filter']
              and: Array<CasaLumaWaitlistPropertyFilter>
            }
        >
      }
    | {
        and: Array<
          | CasaLumaWaitlistPropertyFilter
          | TimestampCreatedTimeFilter
          | TimestampLastEditedTimeFilter
          | {
              // or: CasaLumaWaitlistQuery['filter']
              or: Array<CasaLumaWaitlistPropertyFilter>
            }
          | {
              // and: CasaLumaWaitlistQuery['filter']
              and: Array<CasaLumaWaitlistPropertyFilter>
            }
        >
      }
    | CasaLumaWaitlistPropertyFilter
    | TimestampCreatedTimeFilter
    | TimestampLastEditedTimeFilter
}

export type CasaLumaWaitlistQueryFilter = CasaLumaWaitlistQuery['filter']

export type CasaLumaWaitlistQueryResponse = {
  results: CasaLumaWaitlistResponse[]
  next_cursor: string | null
  has_more: boolean
}

