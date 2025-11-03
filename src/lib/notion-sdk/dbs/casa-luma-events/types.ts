import { WithOptional, Join, PathsToStringProps } from '../../core/types/helper.types'
import {
DatabaseObjectResponse,
StringRequest,
CreatedTimePropertyItemObjectResponse,
DatePropertyItemObjectResponse,
FilesPropertyItemObjectResponse,
FormulaPropertyItemObjectResponse,
LastEditedTimePropertyItemObjectResponse,
MultiSelectPropertyItemObjectResponse,
NumberPropertyItemObjectResponse,
PeoplePropertyItemObjectResponse,
RelationPropertyItemObjectResponse,
RichTextPropertyItemObjectResponse,
SelectPropertyItemObjectResponse,
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
import { CASA_LUMA_EVENTS_PROPS_TO_IDS } from './constants'

export interface CasaLumaEventsResponse extends WithOptional<Omit<DatabaseObjectResponse, 'properties'>, 'title'| 'description'| 'is_inline'| 'url'| 'public_url'> {
  properties: {
    "Status": Omit<SelectPropertyItemObjectResponse, 'select'> & { select: { id: StringRequest, name: 'Draft', color: 'brown' } | { id: StringRequest, name: 'Published', color: 'pink' } | { id: StringRequest, name: 'Full', color: 'purple' } | { id: StringRequest, name: 'Cancelled', color: 'default' } | { id: StringRequest, name: 'Completed', color: 'blue' }},
    "Price": NumberPropertyItemObjectResponse,
    "Waitlist Entries": RelationPropertyItemObjectResponse,
    "Short Description": RichTextPropertyItemObjectResponse,
    "Language": Omit<SelectPropertyItemObjectResponse, 'select'> & { select: { id: StringRequest, name: 'Spanish', color: 'purple' } | { id: StringRequest, name: 'English', color: 'brown' } | { id: StringRequest, name: 'Both', color: 'orange' }},
    "Available Spots": FormulaPropertyItemObjectResponse,
    "Gallery": FilesPropertyItemObjectResponse,
    "Description": RichTextPropertyItemObjectResponse,
    "Featured Image": FilesPropertyItemObjectResponse,
    "Slug": FormulaPropertyItemObjectResponse,
    "Requirements": RichTextPropertyItemObjectResponse,
    "Registration Status": Omit<SelectPropertyItemObjectResponse, 'select'> & { select: { id: StringRequest, name: 'Open', color: 'green' } | { id: StringRequest, name: 'Closed', color: 'brown' } | { id: StringRequest, name: 'Waitlist', color: 'gray' }},
    "Recurrence Type": Omit<SelectPropertyItemObjectResponse, 'select'> & { select: { id: StringRequest, name: 'One-time', color: 'gray' } | { id: StringRequest, name: 'Daily', color: 'blue' } | { id: StringRequest, name: 'Weekly', color: 'green' } | { id: StringRequest, name: 'Bi-weekly', color: 'orange' } | { id: StringRequest, name: 'Monthly', color: 'purple' }},
    "Capacity": NumberPropertyItemObjectResponse,
    "Date": DatePropertyItemObjectResponse,
    "End Date": DatePropertyItemObjectResponse,
    "RSVPs": RelationPropertyItemObjectResponse,
    "Location": Omit<SelectPropertyItemObjectResponse, 'select'> & { select: { id: StringRequest, name: 'Main Hall', color: 'gray' } | { id: StringRequest, name: 'Garden', color: 'orange' } | { id: StringRequest, name: 'Studio A', color: 'brown' } | { id: StringRequest, name: 'Studio B', color: 'pink' } | { id: StringRequest, name: 'Online', color: 'blue' }},
    "Instructor": PeoplePropertyItemObjectResponse,
    "Event Type": Omit<SelectPropertyItemObjectResponse, 'select'> & { select: { id: StringRequest, name: 'Workshop', color: 'brown' } | { id: StringRequest, name: 'Retreat', color: 'gray' } | { id: StringRequest, name: 'Yoga Class', color: 'default' } | { id: StringRequest, name: 'Art Session', color: 'orange' } | { id: StringRequest, name: 'Other', color: 'red' }},
    "Tags": Omit<MultiSelectPropertyItemObjectResponse, 'multi_select'> & { multi_select: [{ id: StringRequest, name: 'Meditation', color: 'gray' } | { id: StringRequest, name: 'Yoga', color: 'blue' } | { id: StringRequest, name: 'Art', color: 'green' } | { id: StringRequest, name: 'Music', color: 'brown' }]},
    "Event Name": TitlePropertyItemObjectResponse,
    "Created": CreatedTimePropertyItemObjectResponse,
    "Updated": LastEditedTimePropertyItemObjectResponse
  }
}

export type CasaLumaEventsResponseProperties = keyof CasaLumaEventsResponse['properties']
export type CasaLumaEventsPath = Join<PathsToStringProps<CasaLumaEventsResponse>>


export type CasaLumaEventsStatusPropertyType = CasaLumaEventsResponse['properties']['Status']['select']['name']

type CasaLumaEventsStatusPropertyFilter =
  | {
      equals: CasaLumaEventsStatusPropertyType
    }
  | {
      does_not_equal: CasaLumaEventsStatusPropertyType
    }
  | ExistencePropertyFilter      

type CasaLumaEventsPricePropertyFilter = NumberPropertyFilter
type CasaLumaEventsWaitlistEntriesPropertyFilter = RelationPropertyFilter
type CasaLumaEventsShortDescriptionPropertyFilter = TextPropertyFilter

export type CasaLumaEventsLanguagePropertyType = CasaLumaEventsResponse['properties']['Language']['select']['name']

type CasaLumaEventsLanguagePropertyFilter =
  | {
      equals: CasaLumaEventsLanguagePropertyType
    }
  | {
      does_not_equal: CasaLumaEventsLanguagePropertyType
    }
  | ExistencePropertyFilter      

type CasaLumaEventsAvailableSpotsPropertyFilter = FormulaPropertyFilter
type CasaLumaEventsGalleryPropertyFilter = ExistencePropertyFilter
type CasaLumaEventsDescriptionPropertyFilter = TextPropertyFilter
type CasaLumaEventsFeaturedImagePropertyFilter = ExistencePropertyFilter
type CasaLumaEventsSlugPropertyFilter = FormulaPropertyFilter
type CasaLumaEventsRequirementsPropertyFilter = TextPropertyFilter

export type CasaLumaEventsRegistrationStatusPropertyType = CasaLumaEventsResponse['properties']['Registration Status']['select']['name']

type CasaLumaEventsRegistrationStatusPropertyFilter =
  | {
      equals: CasaLumaEventsRegistrationStatusPropertyType
    }
  | {
      does_not_equal: CasaLumaEventsRegistrationStatusPropertyType
    }
  | ExistencePropertyFilter      


export type CasaLumaEventsRecurrenceTypePropertyType = CasaLumaEventsResponse['properties']['Recurrence Type']['select']['name']

type CasaLumaEventsRecurrenceTypePropertyFilter =
  | {
      equals: CasaLumaEventsRecurrenceTypePropertyType
    }
  | {
      does_not_equal: CasaLumaEventsRecurrenceTypePropertyType
    }
  | ExistencePropertyFilter      

type CasaLumaEventsCapacityPropertyFilter = NumberPropertyFilter
type CasaLumaEventsDatePropertyFilter = DatePropertyFilter
type CasaLumaEventsEndDatePropertyFilter = DatePropertyFilter
type CasaLumaEventsRsvPsPropertyFilter = RelationPropertyFilter

export type CasaLumaEventsLocationPropertyType = CasaLumaEventsResponse['properties']['Location']['select']['name']

type CasaLumaEventsLocationPropertyFilter =
  | {
      equals: CasaLumaEventsLocationPropertyType
    }
  | {
      does_not_equal: CasaLumaEventsLocationPropertyType
    }
  | ExistencePropertyFilter      

type CasaLumaEventsInstructorPropertyFilter = PeoplePropertyFilter

export type CasaLumaEventsEventTypePropertyType = CasaLumaEventsResponse['properties']['Event Type']['select']['name']

type CasaLumaEventsEventTypePropertyFilter =
  | {
      equals: CasaLumaEventsEventTypePropertyType
    }
  | {
      does_not_equal: CasaLumaEventsEventTypePropertyType
    }
  | ExistencePropertyFilter      


export type CasaLumaEventsTagsPropertyType = CasaLumaEventsResponse['properties']['Tags']['multi_select'][number]['name']

type CasaLumaEventsTagsPropertyFilter =
  | {
      contains: CasaLumaEventsTagsPropertyType
    }
  | {
      does_not_contain: CasaLumaEventsTagsPropertyType
    }          
  | ExistencePropertyFilter

type CasaLumaEventsEventNamePropertyFilter = TextPropertyFilter
type CasaLumaEventsCreatedPropertyFilter = DatePropertyFilter
type CasaLumaEventsUpdatedPropertyFilter = DatePropertyFilter

export type CasaLumaEventsPropertyFilter = { status: CasaLumaEventsStatusPropertyFilter } | { price: CasaLumaEventsPricePropertyFilter } | { waitlistEntries: CasaLumaEventsWaitlistEntriesPropertyFilter } | { shortDescription: CasaLumaEventsShortDescriptionPropertyFilter } | { language: CasaLumaEventsLanguagePropertyFilter } | { availableSpots: CasaLumaEventsAvailableSpotsPropertyFilter } | { gallery: CasaLumaEventsGalleryPropertyFilter } | { description: CasaLumaEventsDescriptionPropertyFilter } | { featuredImage: CasaLumaEventsFeaturedImagePropertyFilter } | { slug: CasaLumaEventsSlugPropertyFilter } | { requirements: CasaLumaEventsRequirementsPropertyFilter } | { registrationStatus: CasaLumaEventsRegistrationStatusPropertyFilter } | { recurrenceType: CasaLumaEventsRecurrenceTypePropertyFilter } | { capacity: CasaLumaEventsCapacityPropertyFilter } | { date: CasaLumaEventsDatePropertyFilter } | { endDate: CasaLumaEventsEndDatePropertyFilter } | { rsvPs: CasaLumaEventsRsvPsPropertyFilter } | { location: CasaLumaEventsLocationPropertyFilter } | { instructor: CasaLumaEventsInstructorPropertyFilter } | { eventType: CasaLumaEventsEventTypePropertyFilter } | { tags: CasaLumaEventsTagsPropertyFilter } | { eventName: CasaLumaEventsEventNamePropertyFilter } | { created: CasaLumaEventsCreatedPropertyFilter } | { updated: CasaLumaEventsUpdatedPropertyFilter }

export type CasaLumaEventsQuery = Omit<QueryDatabaseBodyParameters, 'filter' | 'sorts'> & {
  sorts?: Array<
  | {
      property: keyof typeof CASA_LUMA_EVENTS_PROPS_TO_IDS
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
          | CasaLumaEventsPropertyFilter
          | TimestampCreatedTimeFilter
          | TimestampLastEditedTimeFilter
          | {
              // or: CasaLumaEventsQuery['filter']
              or: Array<CasaLumaEventsPropertyFilter>
            }
          | {
              // and: CasaLumaEventsQuery['filter']
              and: Array<CasaLumaEventsPropertyFilter>
            }
        >
      }
    | {
        and: Array<
          | CasaLumaEventsPropertyFilter
          | TimestampCreatedTimeFilter
          | TimestampLastEditedTimeFilter
          | {
              // or: CasaLumaEventsQuery['filter']
              or: Array<CasaLumaEventsPropertyFilter>
            }
          | {
              // and: CasaLumaEventsQuery['filter']
              and: Array<CasaLumaEventsPropertyFilter>
            }
        >
      }
    | CasaLumaEventsPropertyFilter
    | TimestampCreatedTimeFilter
    | TimestampLastEditedTimeFilter
}

export type CasaLumaEventsQueryFilter = CasaLumaEventsQuery['filter']

export type CasaLumaEventsQueryResponse = {
  results: CasaLumaEventsResponse[]
  next_cursor: string | null
  has_more: boolean
}

