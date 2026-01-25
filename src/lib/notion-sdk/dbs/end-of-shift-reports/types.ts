import { WithOptional, Join, PathsToStringProps } from '../../core/types/helper.types'
import {
DatabaseObjectResponse,
StringRequest,
DatePropertyItemObjectResponse,
FilesPropertyItemObjectResponse,
FormulaPropertyItemObjectResponse,
NumberPropertyItemObjectResponse,
PeoplePropertyItemObjectResponse,
RichTextPropertyItemObjectResponse,
TitlePropertyItemObjectResponse,
ExistencePropertyFilter,
QueryDatabaseBodyParameters,
TimestampCreatedTimeFilter,
TimestampLastEditedTimeFilter,
DatePropertyFilter,
FormulaPropertyFilter,
NumberPropertyFilter,
PeoplePropertyFilter,
TextPropertyFilter
} from '../../core/types/notion-api.types'
import { END_OF_SHIFT_REPORTS_PROPS_TO_IDS } from './constants'

export interface EndOfShiftReportsResponse extends WithOptional<Omit<DatabaseObjectResponse, 'properties'>, 'title'| 'description'| 'is_inline'| 'url'| 'public_url'> {
  properties: {
    "Card Payments": NumberPropertyItemObjectResponse,
    "Notes": RichTextPropertyItemObjectResponse,
    "Expected Cash": NumberPropertyItemObjectResponse,
    "Closed By": PeoplePropertyItemObjectResponse,
    "POS Summary": FilesPropertyItemObjectResponse,
    "Scan Payments": NumberPropertyItemObjectResponse,
    "Date": DatePropertyItemObjectResponse,
    "Shift Date": TitlePropertyItemObjectResponse,
    "Actual Cash 1": FormulaPropertyItemObjectResponse,
    "Cash Difference 1": FormulaPropertyItemObjectResponse,
    "Bill 1000 Baht 1": NumberPropertyItemObjectResponse,
    "Coin 1 Baht 1": NumberPropertyItemObjectResponse,
    "Bill 500 Baht 1": NumberPropertyItemObjectResponse,
    "Bill 20 Baht 1": NumberPropertyItemObjectResponse,
    "Bill 50 Baht 1": NumberPropertyItemObjectResponse,
    "Coin 10 Baht 1": NumberPropertyItemObjectResponse,
    "Coin 5 Baht 1": NumberPropertyItemObjectResponse,
    "Bill 100 Baht 1": NumberPropertyItemObjectResponse,
    "Coin 2 Baht 1": NumberPropertyItemObjectResponse,
    "All Income": FormulaPropertyItemObjectResponse
  }
}

export type EndOfShiftReportsResponseProperties = keyof EndOfShiftReportsResponse['properties']
export type EndOfShiftReportsPath = Join<PathsToStringProps<EndOfShiftReportsResponse>>

type EndOfShiftReportsCardPaymentsPropertyFilter = NumberPropertyFilter
type EndOfShiftReportsNotesPropertyFilter = TextPropertyFilter
type EndOfShiftReportsExpectedCashPropertyFilter = NumberPropertyFilter
type EndOfShiftReportsClosedByPropertyFilter = PeoplePropertyFilter
type EndOfShiftReportsPosSummaryPropertyFilter = ExistencePropertyFilter
type EndOfShiftReportsScanPaymentsPropertyFilter = NumberPropertyFilter
type EndOfShiftReportsDatePropertyFilter = DatePropertyFilter
type EndOfShiftReportsShiftDatePropertyFilter = TextPropertyFilter
type EndOfShiftReportsActualCash_1PropertyFilter = FormulaPropertyFilter
type EndOfShiftReportsCashDifference_1PropertyFilter = FormulaPropertyFilter
type EndOfShiftReportsBill_1000Baht_1PropertyFilter = NumberPropertyFilter
type EndOfShiftReportsCoin_1Baht_1PropertyFilter = NumberPropertyFilter
type EndOfShiftReportsBill_500Baht_1PropertyFilter = NumberPropertyFilter
type EndOfShiftReportsBill_20Baht_1PropertyFilter = NumberPropertyFilter
type EndOfShiftReportsBill_50Baht_1PropertyFilter = NumberPropertyFilter
type EndOfShiftReportsCoin_10Baht_1PropertyFilter = NumberPropertyFilter
type EndOfShiftReportsCoin_5Baht_1PropertyFilter = NumberPropertyFilter
type EndOfShiftReportsBill_100Baht_1PropertyFilter = NumberPropertyFilter
type EndOfShiftReportsCoin_2Baht_1PropertyFilter = NumberPropertyFilter
type EndOfShiftReportsAllIncomePropertyFilter = FormulaPropertyFilter

export type EndOfShiftReportsPropertyFilter = { cardPayments: EndOfShiftReportsCardPaymentsPropertyFilter } | { notes: EndOfShiftReportsNotesPropertyFilter } | { expectedCash: EndOfShiftReportsExpectedCashPropertyFilter } | { closedBy: EndOfShiftReportsClosedByPropertyFilter } | { posSummary: EndOfShiftReportsPosSummaryPropertyFilter } | { scanPayments: EndOfShiftReportsScanPaymentsPropertyFilter } | { date: EndOfShiftReportsDatePropertyFilter } | { shiftDate: EndOfShiftReportsShiftDatePropertyFilter } | { actualCash_1: EndOfShiftReportsActualCash_1PropertyFilter } | { cashDifference_1: EndOfShiftReportsCashDifference_1PropertyFilter } | { bill_1000Baht_1: EndOfShiftReportsBill_1000Baht_1PropertyFilter } | { coin_1Baht_1: EndOfShiftReportsCoin_1Baht_1PropertyFilter } | { bill_500Baht_1: EndOfShiftReportsBill_500Baht_1PropertyFilter } | { bill_20Baht_1: EndOfShiftReportsBill_20Baht_1PropertyFilter } | { bill_50Baht_1: EndOfShiftReportsBill_50Baht_1PropertyFilter } | { coin_10Baht_1: EndOfShiftReportsCoin_10Baht_1PropertyFilter } | { coin_5Baht_1: EndOfShiftReportsCoin_5Baht_1PropertyFilter } | { bill_100Baht_1: EndOfShiftReportsBill_100Baht_1PropertyFilter } | { coin_2Baht_1: EndOfShiftReportsCoin_2Baht_1PropertyFilter } | { allIncome: EndOfShiftReportsAllIncomePropertyFilter }

export type EndOfShiftReportsQuery = Omit<QueryDatabaseBodyParameters, 'filter' | 'sorts'> & {
  sorts?: Array<
  | {
      property: keyof typeof END_OF_SHIFT_REPORTS_PROPS_TO_IDS
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
          | EndOfShiftReportsPropertyFilter
          | TimestampCreatedTimeFilter
          | TimestampLastEditedTimeFilter
          | {
              // or: EndOfShiftReportsQuery['filter']
              or: Array<EndOfShiftReportsPropertyFilter>
            }
          | {
              // and: EndOfShiftReportsQuery['filter']
              and: Array<EndOfShiftReportsPropertyFilter>
            }
        >
      }
    | {
        and: Array<
          | EndOfShiftReportsPropertyFilter
          | TimestampCreatedTimeFilter
          | TimestampLastEditedTimeFilter
          | {
              // or: EndOfShiftReportsQuery['filter']
              or: Array<EndOfShiftReportsPropertyFilter>
            }
          | {
              // and: EndOfShiftReportsQuery['filter']
              and: Array<EndOfShiftReportsPropertyFilter>
            }
        >
      }
    | EndOfShiftReportsPropertyFilter
    | TimestampCreatedTimeFilter
    | TimestampLastEditedTimeFilter
}

export type EndOfShiftReportsQueryFilter = EndOfShiftReportsQuery['filter']

export type EndOfShiftReportsQueryResponse = {
  results: EndOfShiftReportsResponse[]
  next_cursor: string | null
  has_more: boolean
}

