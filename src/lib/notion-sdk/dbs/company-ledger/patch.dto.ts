import { CompanyLedgerResponse } from "./types"
import { UpdatePageBodyParameters,
RichTextItemRequest
} from '../../core/types/notion-api.types'

type TypeFromRecord<Obj, Type> = Obj extends Record<string, infer T> ? Extract<T, Type> : never

export type CompanyLedgerPropertiesPatch = {
  type?: CompanyLedgerResponse['properties']['Type']['select']['name']
  amountThb?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'number' }>['number']
  notes?: string | { text: string; url?: string; annotations?: RichTextItemRequest['annotations'] } | RichTextItemRequest[]
  date?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'date' }>['date']
  supplier?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'relation' }>['relation']
  status?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'status' }>['status']
  referenceNumber?: string | { text: string; url?: string; annotations?: RichTextItemRequest['annotations'] } | RichTextItemRequest[]
  department?: CompanyLedgerResponse['properties']['Department']['select']['name']
  invoiceReceipt?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'files' }>['files']
  owner?: CompanyLedgerResponse['properties']['Approved By']['select']['name']
  paymentMethod?: CompanyLedgerResponse['properties']['Payment Method']['select']['name']
  category?: CompanyLedgerResponse['properties']['Category']['select']['name']
  bankAccount?: CompanyLedgerResponse['properties']['Bank Account']['select']['name']
  description?: string | { text: string; url?: string; annotations?: RichTextItemRequest['annotations'] } | RichTextItemRequest[]
}

  
export class CompanyLedgerPatchDTO {
  __data: UpdatePageBodyParameters

  constructor(opts: {
    properties?: CompanyLedgerPropertiesPatch
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
    
    if (props?.type !== undefined) {
      this.__data.properties['%3EBPw'] = {
        type: 'select',
        select: { name: props.type },
      }
    }

    if (props?.amountThb !== undefined) {
      this.__data.properties['Eq%3Ac'] = {
        type: 'number',
        number: props.amountThb,
      }
    }

    if (props?.notes !== undefined) {
      this.__data.properties['EqO%3B'] = {
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

    if (props?.date !== undefined) {
      this.__data.properties['I%3C%3Fx'] = {
        type: 'date',
        date: props.date,
      }
    }

    if (props?.supplier !== undefined) {
      this.__data.properties['T%3CJ%3B'] = {
        type: 'relation',
        relation: props.supplier,
      }
    }

    if (props?.status !== undefined) {
      this.__data.properties['TPaD'] = {
        type: 'status',
        status: props.status,
      }
    }

    if (props?.referenceNumber !== undefined) {
      this.__data.properties['TY%3F%7C'] = {
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

    if (props?.department !== undefined) {
      this.__data.properties['g%40nv'] = {
        type: 'select',
        select: { name: props.department },
      }
    }

    if (props?.invoiceReceipt !== undefined) {
      this.__data.properties['iRV%5B'] = {
        type: 'files',
        files: props.invoiceReceipt,
      }
    }

    if (props?.owner !== undefined) {
      this.__data.properties['jw%3Am'] = {
        type: 'select',
        select: { name: props.owner },
      }
    }

    if (props?.paymentMethod !== undefined) {
      this.__data.properties['j%7BRr'] = {
        type: 'select',
        select: { name: props.paymentMethod },
      }
    }

    if (props?.category !== undefined) {
      this.__data.properties['k%5BLG'] = {
        type: 'select',
        select: { name: props.category },
      }
    }

    if (props?.bankAccount !== undefined) {
      this.__data.properties['mH_w'] = {
        type: 'select',
        select: { name: props.bankAccount },
      }
    }

    if (props?.description !== undefined) {
      this.__data.properties['title'] = {
        type: 'title',
        title: typeof props.description === 'string' 
          ? [{ type: 'text', text: { content: props.description } }]
          : Array.isArray(props.description)
            ? props.description
            : props.description === null
              ? []
              : [
                  {
                    type: 'text',
                    text: {
                      content: props.description.text,
                      link: props.description?.url ? { url: props.description.url } : undefined
                    },
                    annotations: props.description.annotations
                  },
                ]
      }
    }
  }
}
