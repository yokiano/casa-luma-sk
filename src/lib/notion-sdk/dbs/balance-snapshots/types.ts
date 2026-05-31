import { WithOptional, Join, PathsToStringProps } from '../../core/types/helper.types'
import {
DatabaseObjectResponse,
StringRequest,
DatePropertyItemObjectResponse,
FilesPropertyItemObjectResponse,
NumberPropertyItemObjectResponse,
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
TextPropertyFilter
} from '../../core/types/notion-api.types'
import { BALANCE_SNAPSHOTS_PROPS_TO_IDS } from './constants'

export interface BalanceSnapshotsResponse extends WithOptional<Omit<DatabaseObjectResponse, 'properties'>, 'title'| 'description'| 'is_inline'| 'url'| 'public_url'> {
  properties: {
    "Status": Omit<StatusPropertyItemObjectResponse, 'status'> & { status: { id: StringRequest, name: 'Draft', color: 'gray' } | { id: StringRequest, name: 'Needs Review', color: 'yellow' } | { id: StringRequest, name: 'Accepted', color: 'green' } | { id: StringRequest, name: 'Superseded', color: 'red' }},
    "Notes": RichTextPropertyItemObjectResponse,
    "Balance THB": NumberPropertyItemObjectResponse,
    "Observed At": DatePropertyItemObjectResponse,
    "Account": Omit<SelectPropertyItemObjectResponse, 'select'> & { select: { id: StringRequest, name: 'KBank', color: 'green' } | { id: StringRequest, name: 'SCB', color: 'blue' } | { id: StringRequest, name: 'Safe / Cash on hand', color: 'yellow' } | { id: StringRequest, name: 'Scan/QR Clearing', color: 'purple' } | { id: StringRequest, name: 'Credit Card Clearing', color: 'pink' }},
    "Proof": FilesPropertyItemObjectResponse,
    "Snapshot Role": Omit<SelectPropertyItemObjectResponse, 'select'> & { select: { id: StringRequest, name: 'Observed', color: 'blue' } | { id: StringRequest, name: 'Accepted Baseline', color: 'green' }},
    "Source": Omit<SelectPropertyItemObjectResponse, 'select'> & { select: { id: StringRequest, name: 'KBiz Manual', color: 'green' } | { id: StringRequest, name: 'Bank Statement', color: 'blue' } | { id: StringRequest, name: 'Cash Count', color: 'yellow' } | { id: StringRequest, name: 'Settlement Report', color: 'purple' } | { id: StringRequest, name: 'Manual', color: 'gray' }},
    "Name": TitlePropertyItemObjectResponse
  }
}

export type BalanceSnapshotsResponseProperties = keyof BalanceSnapshotsResponse['properties']
export type BalanceSnapshotsPath = Join<PathsToStringProps<BalanceSnapshotsResponse>>


export type BalanceSnapshotsStatusPropertyType = BalanceSnapshotsResponse['properties']['Status']['status']['name']

type BalanceSnapshotsStatusPropertyFilter =
  | {
      equals: BalanceSnapshotsStatusPropertyType
    }
  | {
      does_not_equal: BalanceSnapshotsStatusPropertyType
    }
  | ExistencePropertyFilter      

type BalanceSnapshotsNotesPropertyFilter = TextPropertyFilter
type BalanceSnapshotsBalanceThbPropertyFilter = NumberPropertyFilter
type BalanceSnapshotsObservedAtPropertyFilter = DatePropertyFilter

export type BalanceSnapshotsAccountPropertyType = BalanceSnapshotsResponse['properties']['Account']['select']['name']

type BalanceSnapshotsAccountPropertyFilter =
  | {
      equals: BalanceSnapshotsAccountPropertyType
    }
  | {
      does_not_equal: BalanceSnapshotsAccountPropertyType
    }
  | ExistencePropertyFilter      

type BalanceSnapshotsProofPropertyFilter = ExistencePropertyFilter

export type BalanceSnapshotsSnapshotRolePropertyType = BalanceSnapshotsResponse['properties']['Snapshot Role']['select']['name']

type BalanceSnapshotsSnapshotRolePropertyFilter =
  | {
      equals: BalanceSnapshotsSnapshotRolePropertyType
    }
  | {
      does_not_equal: BalanceSnapshotsSnapshotRolePropertyType
    }
  | ExistencePropertyFilter      


export type BalanceSnapshotsSourcePropertyType = BalanceSnapshotsResponse['properties']['Source']['select']['name']

type BalanceSnapshotsSourcePropertyFilter =
  | {
      equals: BalanceSnapshotsSourcePropertyType
    }
  | {
      does_not_equal: BalanceSnapshotsSourcePropertyType
    }
  | ExistencePropertyFilter      

type BalanceSnapshotsNamePropertyFilter = TextPropertyFilter

export type BalanceSnapshotsPropertyFilter = { status: BalanceSnapshotsStatusPropertyFilter } | { notes: BalanceSnapshotsNotesPropertyFilter } | { balanceThb: BalanceSnapshotsBalanceThbPropertyFilter } | { observedAt: BalanceSnapshotsObservedAtPropertyFilter } | { account: BalanceSnapshotsAccountPropertyFilter } | { proof: BalanceSnapshotsProofPropertyFilter } | { snapshotRole: BalanceSnapshotsSnapshotRolePropertyFilter } | { source: BalanceSnapshotsSourcePropertyFilter } | { name: BalanceSnapshotsNamePropertyFilter }

export type BalanceSnapshotsQuery = Omit<QueryDatabaseBodyParameters, 'filter' | 'sorts'> & {
  sorts?: Array<
  | {
      property: keyof typeof BALANCE_SNAPSHOTS_PROPS_TO_IDS
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
          | BalanceSnapshotsPropertyFilter
          | TimestampCreatedTimeFilter
          | TimestampLastEditedTimeFilter
          | {
              // or: BalanceSnapshotsQuery['filter']
              or: Array<BalanceSnapshotsPropertyFilter>
            }
          | {
              // and: BalanceSnapshotsQuery['filter']
              and: Array<BalanceSnapshotsPropertyFilter>
            }
        >
      }
    | {
        and: Array<
          | BalanceSnapshotsPropertyFilter
          | TimestampCreatedTimeFilter
          | TimestampLastEditedTimeFilter
          | {
              // or: BalanceSnapshotsQuery['filter']
              or: Array<BalanceSnapshotsPropertyFilter>
            }
          | {
              // and: BalanceSnapshotsQuery['filter']
              and: Array<BalanceSnapshotsPropertyFilter>
            }
        >
      }
    | BalanceSnapshotsPropertyFilter
    | TimestampCreatedTimeFilter
    | TimestampLastEditedTimeFilter
}

export type BalanceSnapshotsQueryFilter = BalanceSnapshotsQuery['filter']

export type BalanceSnapshotsQueryResponse = {
  results: BalanceSnapshotsResponse[]
  next_cursor: string | null
  has_more: boolean
}

