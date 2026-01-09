import { EndOfShiftReportsResponse } from "./types"
import { UpdatePageBodyParameters,
RichTextItemRequest
} from '../../core/types/notion-api.types'

type TypeFromRecord<Obj, Type> = Obj extends Record<string, infer T> ? Extract<T, Type> : never

export type EndOfShiftReportsPropertiesPatch = {
  cardPayments?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'number' }>['number']
  notes?: string | { text: string; url?: string; annotations?: RichTextItemRequest['annotations'] } | RichTextItemRequest[]
  expectedCash?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'number' }>['number']
  closedBy?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'people' }>['people']
  posSummary?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'files' }>['files']
  scanPayments?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'number' }>['number']
  date?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'date' }>['date']
  shiftDate?: string | { text: string; url?: string; annotations?: RichTextItemRequest['annotations'] } | RichTextItemRequest[]
  actualCash_1?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'formula' }>['formula']
  cashDifference_1?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'formula' }>['formula']
  bill_1000Baht_1?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'number' }>['number']
  coin_1Baht_1?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'number' }>['number']
  bill_500Baht_1?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'number' }>['number']
  bill_20Baht_1?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'number' }>['number']
  bill_50Baht_1?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'number' }>['number']
  coin_10Baht_1?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'number' }>['number']
  coin_5Baht_1?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'number' }>['number']
  bill_100Baht_1?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'number' }>['number']
  coin_2Baht_1?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'number' }>['number']
}

  
export class EndOfShiftReportsPatchDTO {
  __data: UpdatePageBodyParameters

  constructor(opts: {
    properties?: EndOfShiftReportsPropertiesPatch
    coverUrl?: string
    icon?: UpdatePageBodyParameters['icon']
    archived?: UpdatePageBodyParameters['archived']
  }) {
    const { properties: props, coverUrl, icon, archived } = opts

    this.__data = {}
    this.__data.properties = {}
    this.__data.cover = coverUrl ? { type: 'external', external: { url: coverUrl } } : undefined
    this.__data.icon = icon
    this.__data.archived = archived
    
    if (props?.cardPayments !== undefined) {
      this.__data.properties['%3ESv%3C'] = {
        type: 'number',
        number: props.cardPayments,
      }
    }

    if (props?.notes !== undefined) {
      this.__data.properties['%3Fe%7BI'] = {
        type: 'rich_text',
        rich_text: typeof props.notes === 'string' 
          ? [{ type: 'text', text: { content: props.notes } }]
          : Array.isArray(props.notes)
            ? props.notes
            : props.notes === null
              ? []
              : [
                  {
                    type: 'text',
                    text: {
                      content: props.notes.text,
                      link: props.notes?.url ? { url: props.notes.url } : undefined
                    },
                    annotations: props.notes.annotations
                  },
                ]
      }
    }

    if (props?.expectedCash !== undefined) {
      this.__data.properties['R%5C%40S'] = {
        type: 'number',
        number: props.expectedCash,
      }
    }

    if (props?.closedBy !== undefined) {
      this.__data.properties['a_n%5C'] = {
        type: 'people',
        people: props.closedBy,
      }
    }

    if (props?.posSummary !== undefined) {
      this.__data.properties['cI%5BI'] = {
        type: 'files',
        files: props.posSummary,
      }
    }

    if (props?.scanPayments !== undefined) {
      this.__data.properties['p%5D%3FJ'] = {
        type: 'number',
        number: props.scanPayments,
      }
    }

    if (props?.date !== undefined) {
      this.__data.properties['yO%5Dn'] = {
        type: 'date',
        date: props.date,
      }
    }

    if (props?.shiftDate !== undefined) {
      this.__data.properties['title'] = {
        type: 'title',
        title: typeof props.shiftDate === 'string' 
          ? [{ type: 'text', text: { content: props.shiftDate } }]
          : Array.isArray(props.shiftDate)
            ? props.shiftDate
            : props.shiftDate === null
              ? []
              : [
                  {
                    type: 'text',
                    text: {
                      content: props.shiftDate.text,
                      link: props.shiftDate?.url ? { url: props.shiftDate.url } : undefined
                    },
                    annotations: props.shiftDate.annotations
                  },
                ]
      }
    }

    if (props?.actualCash_1 !== undefined) {
      this.__data.properties['%3FaIt'] = {
        type: 'formula',
        formula: props.actualCash_1,
      }
    }

    if (props?.cashDifference_1 !== undefined) {
      this.__data.properties['BQkU'] = {
        type: 'formula',
        formula: props.cashDifference_1,
      }
    }

    if (props?.bill_1000Baht_1 !== undefined) {
      this.__data.properties['BVMr'] = {
        type: 'number',
        number: props.bill_1000Baht_1,
      }
    }

    if (props?.coin_1Baht_1 !== undefined) {
      this.__data.properties['Ot%3B%60'] = {
        type: 'number',
        number: props.coin_1Baht_1,
      }
    }

    if (props?.bill_500Baht_1 !== undefined) {
      this.__data.properties['SplK'] = {
        type: 'number',
        number: props.bill_500Baht_1,
      }
    }

    if (props?.bill_20Baht_1 !== undefined) {
      this.__data.properties['UTe%5C'] = {
        type: 'number',
        number: props.bill_20Baht_1,
      }
    }

    if (props?.bill_50Baht_1 !== undefined) {
      this.__data.properties['X%7Dqu'] = {
        type: 'number',
        number: props.bill_50Baht_1,
      }
    }

    if (props?.coin_10Baht_1 !== undefined) {
      this.__data.properties['_DQQ'] = {
        type: 'number',
        number: props.coin_10Baht_1,
      }
    }

    if (props?.coin_5Baht_1 !== undefined) {
      this.__data.properties['bsSd'] = {
        type: 'number',
        number: props.coin_5Baht_1,
      }
    }

    if (props?.bill_100Baht_1 !== undefined) {
      this.__data.properties['fUnb'] = {
        type: 'number',
        number: props.bill_100Baht_1,
      }
    }

    if (props?.coin_2Baht_1 !== undefined) {
      this.__data.properties['smDb'] = {
        type: 'number',
        number: props.coin_2Baht_1,
      }
    }
  }
}
