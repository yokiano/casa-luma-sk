import { ExpensesTrackerResponse } from "./types"
import { UpdatePageBodyParameters,
RichTextItemRequest
} from '../../core/types/notion-api.types'

type TypeFromRecord<Obj, Type> = Obj extends Record<string, infer T> ? Extract<T, Type> : never

export type ExpensesTrackerPropertiesPatch = {
  category?: ExpensesTrackerResponse['properties']['Category']['select']['name']
  paymentMethod?: ExpensesTrackerResponse['properties']['Payment Method']['select']['name']
  team?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'formula' }>['formula']
  date?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'date' }>['date']
  department?: ExpensesTrackerResponse['properties']['Department']['select']['name']
  procurementItem?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'relation' }>['relation']
  inFavorOf?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'people' }>['people']
  status?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'status' }>['status']
  paidBy?: ExpensesTrackerResponse['properties']['Paid By']['select']['name']
  amountThb?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'number' }>['number']
  supplier?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'relation' }>['relation']
  invoiceReceipt?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'files' }>['files']
  expense?: string | { text: string; url?: string; annotations?: RichTextItemRequest['annotations'] } | RichTextItemRequest[]
  referenceNumber?: string | { text: string; url?: string; annotations?: RichTextItemRequest['annotations'] } | RichTextItemRequest[]
}

  
export class ExpensesTrackerPatchDTO {
  __data: UpdatePageBodyParameters

  constructor(opts: {
    properties?: ExpensesTrackerPropertiesPatch
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
    
    if (props?.category !== undefined) {
      this.__data.properties['%3F%40%3FW'] = {
        type: 'select',
        select: { name: props.category },
      }
    }

    if (props?.paymentMethod !== undefined) {
      this.__data.properties['EZCK'] = {
        type: 'select',
        select: { name: props.paymentMethod },
      }
    }

    if (props?.team !== undefined) {
      this.__data.properties['QHWE'] = {
        type: 'formula',
        formula: props.team,
      }
    }

    if (props?.date !== undefined) {
      this.__data.properties['UKHL'] = {
        type: 'date',
        date: props.date,
      }
    }

    if (props?.department !== undefined) {
      this.__data.properties['%5Efar'] = {
        type: 'select',
        select: { name: props.department },
      }
    }

    if (props?.procurementItem !== undefined) {
      this.__data.properties['hfQc'] = {
        type: 'relation',
        relation: props.procurementItem,
      }
    }

    if (props?.inFavorOf !== undefined) {
      this.__data.properties['jfMg'] = {
        type: 'people',
        people: props.inFavorOf,
      }
    }

    if (props?.status !== undefined) {
      this.__data.properties['sSzY'] = {
        type: 'status',
        status: props.status,
      }
    }

    if (props?.paidBy !== undefined) {
      this.__data.properties['v%5EhZ'] = {
        type: 'select',
        select: { name: props.paidBy },
      }
    }

    if (props?.amountThb !== undefined) {
      this.__data.properties['xthe'] = {
        type: 'number',
        number: props.amountThb,
      }
    }

    if (props?.supplier !== undefined) {
      this.__data.properties['%7C%5DZy'] = {
        type: 'relation',
        relation: props.supplier,
      }
    }

    if (props?.invoiceReceipt !== undefined) {
      this.__data.properties['~Rsq'] = {
        type: 'files',
        files: props.invoiceReceipt,
      }
    }

    if (props?.expense !== undefined) {
      this.__data.properties['title'] = {
        type: 'title',
        title: typeof props.expense === 'string' 
          ? [{ type: 'text', text: { content: props.expense } }]
          : Array.isArray(props.expense)
            ? props.expense
            : props.expense === null
              ? []
              : [
                  {
                    type: 'text',
                    text: {
                      content: props.expense.text,
                      link: props.expense?.url ? { url: props.expense.url } : undefined
                    },
                    annotations: props.expense.annotations
                  },
                ]
      }
    }

    if (props?.referenceNumber !== undefined) {
      this.__data.properties['Wx_e'] = {
        type: 'rich_text',
        rich_text: typeof props.referenceNumber === 'string' 
          ? [{ type: 'text', text: { content: props.referenceNumber } }]
          : Array.isArray(props.referenceNumber)
            ? props.referenceNumber
            : props.referenceNumber === null
              ? []
              : [
                  {
                    type: 'text',
                    text: {
                      content: props.referenceNumber.text,
                      link: props.referenceNumber?.url ? { url: props.referenceNumber.url } : undefined
                    },
                    annotations: props.referenceNumber.annotations
                  },
                ]
      }
    }
  }
}
