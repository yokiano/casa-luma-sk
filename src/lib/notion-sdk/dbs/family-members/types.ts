import { WithOptional, Join, PathsToStringProps } from '../../core/types/helper.types'
import {
DatabaseObjectResponse,
StringRequest,
DatePropertyItemObjectResponse,
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
DatePropertyFilter,
RelationPropertyFilter,
TextPropertyFilter
} from '../../core/types/notion-api.types'
import { FAMILY_MEMBERS_PROPS_TO_IDS } from './constants'

export interface FamilyMembersResponse extends WithOptional<Omit<DatabaseObjectResponse, 'properties'>, 'title'| 'description'| 'is_inline'| 'url'| 'public_url'> {
  properties: {
    "Member Type": Omit<SelectPropertyItemObjectResponse, 'select'> & { select: { id: StringRequest, name: 'Kid', color: 'blue' } | { id: StringRequest, name: 'Caregiver', color: 'green' }},
    "Contact Method": Omit<SelectPropertyItemObjectResponse, 'select'> & { select: { id: StringRequest, name: 'Thai Phone', color: 'green' } | { id: StringRequest, name: 'WhatsApp', color: 'blue' }},
    "Caregiver Role": Omit<SelectPropertyItemObjectResponse, 'select'> & { select: { id: StringRequest, name: 'Parent', color: 'blue' } | { id: StringRequest, name: 'Caregiver', color: 'green' }},
    "Notes": RichTextPropertyItemObjectResponse,
    "Email": EmailPropertyItemObjectResponse,
    "DOB": DatePropertyItemObjectResponse,
    "Gender": Omit<SelectPropertyItemObjectResponse, 'select'> & { select: { id: StringRequest, name: 'Boy', color: 'blue' } | { id: StringRequest, name: 'Girl', color: 'pink' }},
    "Family": RelationPropertyItemObjectResponse,
    "Phone": PhoneNumberPropertyItemObjectResponse,
    "Name": TitlePropertyItemObjectResponse
  }
}

export type FamilyMembersResponseProperties = keyof FamilyMembersResponse['properties']
export type FamilyMembersPath = Join<PathsToStringProps<FamilyMembersResponse>>


export type FamilyMembersMemberTypePropertyType = FamilyMembersResponse['properties']['Member Type']['select']['name']

type FamilyMembersMemberTypePropertyFilter =
  | {
      equals: FamilyMembersMemberTypePropertyType
    }
  | {
      does_not_equal: FamilyMembersMemberTypePropertyType
    }
  | ExistencePropertyFilter      


export type FamilyMembersContactMethodPropertyType = FamilyMembersResponse['properties']['Contact Method']['select']['name']

type FamilyMembersContactMethodPropertyFilter =
  | {
      equals: FamilyMembersContactMethodPropertyType
    }
  | {
      does_not_equal: FamilyMembersContactMethodPropertyType
    }
  | ExistencePropertyFilter      


export type FamilyMembersCaregiverRolePropertyType = FamilyMembersResponse['properties']['Caregiver Role']['select']['name']

type FamilyMembersCaregiverRolePropertyFilter =
  | {
      equals: FamilyMembersCaregiverRolePropertyType
    }
  | {
      does_not_equal: FamilyMembersCaregiverRolePropertyType
    }
  | ExistencePropertyFilter      

type FamilyMembersNotesPropertyFilter = TextPropertyFilter
type FamilyMembersEmailPropertyFilter = TextPropertyFilter
type FamilyMembersDobPropertyFilter = DatePropertyFilter

export type FamilyMembersGenderPropertyType = FamilyMembersResponse['properties']['Gender']['select']['name']

type FamilyMembersGenderPropertyFilter =
  | {
      equals: FamilyMembersGenderPropertyType
    }
  | {
      does_not_equal: FamilyMembersGenderPropertyType
    }
  | ExistencePropertyFilter      

type FamilyMembersFamilyPropertyFilter = RelationPropertyFilter
type FamilyMembersPhonePropertyFilter = TextPropertyFilter
type FamilyMembersNamePropertyFilter = TextPropertyFilter

export type FamilyMembersPropertyFilter = { memberType: FamilyMembersMemberTypePropertyFilter } | { contactMethod: FamilyMembersContactMethodPropertyFilter } | { caregiverRole: FamilyMembersCaregiverRolePropertyFilter } | { notes: FamilyMembersNotesPropertyFilter } | { email: FamilyMembersEmailPropertyFilter } | { dob: FamilyMembersDobPropertyFilter } | { gender: FamilyMembersGenderPropertyFilter } | { family: FamilyMembersFamilyPropertyFilter } | { phone: FamilyMembersPhonePropertyFilter } | { name: FamilyMembersNamePropertyFilter }

export type FamilyMembersQuery = Omit<QueryDatabaseBodyParameters, 'filter' | 'sorts'> & {
  sorts?: Array<
  | {
      property: keyof typeof FAMILY_MEMBERS_PROPS_TO_IDS
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
          | FamilyMembersPropertyFilter
          | TimestampCreatedTimeFilter
          | TimestampLastEditedTimeFilter
          | {
              // or: FamilyMembersQuery['filter']
              or: Array<FamilyMembersPropertyFilter>
            }
          | {
              // and: FamilyMembersQuery['filter']
              and: Array<FamilyMembersPropertyFilter>
            }
        >
      }
    | {
        and: Array<
          | FamilyMembersPropertyFilter
          | TimestampCreatedTimeFilter
          | TimestampLastEditedTimeFilter
          | {
              // or: FamilyMembersQuery['filter']
              or: Array<FamilyMembersPropertyFilter>
            }
          | {
              // and: FamilyMembersQuery['filter']
              and: Array<FamilyMembersPropertyFilter>
            }
        >
      }
    | FamilyMembersPropertyFilter
    | TimestampCreatedTimeFilter
    | TimestampLastEditedTimeFilter
}

export type FamilyMembersQueryFilter = FamilyMembersQuery['filter']

export type FamilyMembersQueryResponse = {
  results: FamilyMembersResponse[]
  next_cursor: string | null
  has_more: boolean
}

