import { WithOptional, Join, PathsToStringProps } from '../../core/types/helper.types'
import {
DatabaseObjectResponse,
StringRequest,
CheckboxPropertyItemObjectResponse,
EmailPropertyItemObjectResponse,
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
RelationPropertyFilter,
TextPropertyFilter
} from '../../core/types/notion-api.types'
import { FAMILIES_PROPS_TO_IDS } from './constants'

export interface FamiliesResponse extends WithOptional<Omit<DatabaseObjectResponse, 'properties'>, 'title'| 'description'| 'is_inline'| 'url'| 'public_url'> {
  properties: {
    "Main Email": EmailPropertyItemObjectResponse,
    "Lives in Koh Phangan": CheckboxPropertyItemObjectResponse,
    "Loyverse Customer ID": RichTextPropertyItemObjectResponse,
    "Status": Omit<SelectPropertyItemObjectResponse, 'select'> & { select: { id: StringRequest, name: 'Active', color: 'green' } | { id: StringRequest, name: 'Inactive', color: 'gray' }},
    "Nationality": RichTextPropertyItemObjectResponse,
    "Members": RelationPropertyItemObjectResponse,
    "Main Phone": PhoneNumberPropertyItemObjectResponse,
    "Special Notes": RichTextPropertyItemObjectResponse,
    "Dietary Preference (Family)": Omit<SelectPropertyItemObjectResponse, 'select'> & { select: { id: StringRequest, name: 'None', color: 'gray' } | { id: StringRequest, name: 'Vegetarian', color: 'green' } | { id: StringRequest, name: 'Vegan', color: 'green' } | { id: StringRequest, name: 'Gluten Free', color: 'yellow' } | { id: StringRequest, name: 'Other', color: 'default' }},
    "How did you hear about us?": Omit<SelectPropertyItemObjectResponse, 'select'> & { select: { id: StringRequest, name: 'Instagram', color: 'pink' } | { id: StringRequest, name: 'Facebook', color: 'blue' } | { id: StringRequest, name: 'Google', color: 'yellow' } | { id: StringRequest, name: 'Friend', color: 'green' } | { id: StringRequest, name: 'Walk-in', color: 'orange' } | { id: StringRequest, name: 'Other', color: 'default' }},
    "Family Name": TitlePropertyItemObjectResponse,
    "Customer Code": RichTextPropertyItemObjectResponse
  }
}

export type FamiliesResponseProperties = keyof FamiliesResponse['properties']
export type FamiliesPath = Join<PathsToStringProps<FamiliesResponse>>

type FamiliesMainEmailPropertyFilter = TextPropertyFilter
type FamiliesLivesInKohPhanganPropertyFilter = CheckboxPropertyFilter
type FamiliesLoyverseCustomerIdPropertyFilter = TextPropertyFilter

export type FamiliesStatusPropertyType = FamiliesResponse['properties']['Status']['select']['name']

type FamiliesStatusPropertyFilter =
  | {
      equals: FamiliesStatusPropertyType
    }
  | {
      does_not_equal: FamiliesStatusPropertyType
    }
  | ExistencePropertyFilter      

type FamiliesNationalityPropertyFilter = TextPropertyFilter
type FamiliesMembersPropertyFilter = RelationPropertyFilter
type FamiliesMainPhonePropertyFilter = TextPropertyFilter
type FamiliesSpecialNotesPropertyFilter = TextPropertyFilter

export type FamiliesDietaryPreferenceFamilyPropertyType = FamiliesResponse['properties']['Dietary Preference (Family)']['select']['name']

type FamiliesDietaryPreferenceFamilyPropertyFilter =
  | {
      equals: FamiliesDietaryPreferenceFamilyPropertyType
    }
  | {
      does_not_equal: FamiliesDietaryPreferenceFamilyPropertyType
    }
  | ExistencePropertyFilter      


export type FamiliesHowDidYouHearAboutUsPropertyType = FamiliesResponse['properties']['How did you hear about us?']['select']['name']

type FamiliesHowDidYouHearAboutUsPropertyFilter =
  | {
      equals: FamiliesHowDidYouHearAboutUsPropertyType
    }
  | {
      does_not_equal: FamiliesHowDidYouHearAboutUsPropertyType
    }
  | ExistencePropertyFilter      

type FamiliesFamilyNamePropertyFilter = TextPropertyFilter
type FamiliesCustomerNumberPropertyFilter = TextPropertyFilter

export type FamiliesPropertyFilter = { mainEmail: FamiliesMainEmailPropertyFilter } | { livesInKohPhangan: FamiliesLivesInKohPhanganPropertyFilter } | { loyverseCustomerId: FamiliesLoyverseCustomerIdPropertyFilter } | { status: FamiliesStatusPropertyFilter } | { nationality: FamiliesNationalityPropertyFilter } | { members: FamiliesMembersPropertyFilter } | { mainPhone: FamiliesMainPhonePropertyFilter } | { specialNotes: FamiliesSpecialNotesPropertyFilter } | { dietaryPreferenceFamily: FamiliesDietaryPreferenceFamilyPropertyFilter } | { howDidYouHearAboutUs: FamiliesHowDidYouHearAboutUsPropertyFilter } | { familyName: FamiliesFamilyNamePropertyFilter } | { customerNumber: FamiliesCustomerNumberPropertyFilter }

export type FamiliesQuery = Omit<QueryDatabaseBodyParameters, 'filter' | 'sorts'> & {
  sorts?: Array<
  | {
      property: keyof typeof FAMILIES_PROPS_TO_IDS
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
          | FamiliesPropertyFilter
          | TimestampCreatedTimeFilter
          | TimestampLastEditedTimeFilter
          | {
              // or: FamiliesQuery['filter']
              or: Array<FamiliesPropertyFilter>
            }
          | {
              // and: FamiliesQuery['filter']
              and: Array<FamiliesPropertyFilter>
            }
        >
      }
    | {
        and: Array<
          | FamiliesPropertyFilter
          | TimestampCreatedTimeFilter
          | TimestampLastEditedTimeFilter
          | {
              // or: FamiliesQuery['filter']
              or: Array<FamiliesPropertyFilter>
            }
          | {
              // and: FamiliesQuery['filter']
              and: Array<FamiliesPropertyFilter>
            }
        >
      }
    | FamiliesPropertyFilter
    | TimestampCreatedTimeFilter
    | TimestampLastEditedTimeFilter
}

export type FamiliesQueryFilter = FamiliesQuery['filter']

export type FamiliesQueryResponse = {
  results: FamiliesResponse[]
  next_cursor: string | null
  has_more: boolean
}

