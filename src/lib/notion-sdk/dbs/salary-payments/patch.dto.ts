import { SalaryPaymentsResponse } from "./types"
import { UpdatePageBodyParameters,
RichTextItemRequest
} from '../../core/types/notion-api.types'

type TypeFromRecord<Obj, Type> = Obj extends Record<string, infer T> ? Extract<T, Type> : never

export type SalaryPaymentsPropertiesPatch = {
  notes?: string | { text: string; url?: string; annotations?: RichTextItemRequest['annotations'] } | RichTextItemRequest[]
  baseSalaryThb?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'number' }>['number']
  paySlip?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'files' }>['files']
  paymentDate?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'date' }>['date']
  employee?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'relation' }>['relation']
  advancesThb?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'number' }>['number']
  otAmountThb?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'number' }>['number']
  totalPaidThb?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'number' }>['number']
  deductionsThb?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'number' }>['number']
  paymentTitle?: string | { text: string; url?: string; annotations?: RichTextItemRequest['annotations'] } | RichTextItemRequest[]
}

  
export class SalaryPaymentsPatchDTO {
  __data: UpdatePageBodyParameters

  constructor(opts: {
    properties?: SalaryPaymentsPropertiesPatch
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
    
    if (props?.notes !== undefined) {
      this.__data.properties['%40%7CnG'] = {
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

    if (props?.baseSalaryThb !== undefined) {
      this.__data.properties['Ch%3CJ'] = {
        type: 'number',
        number: props.baseSalaryThb,
      }
    }

    if (props?.paySlip !== undefined) {
      this.__data.properties['RL%3C%5D'] = {
        type: 'files',
        files: props.paySlip,
      }
    }

    if (props?.paymentDate !== undefined) {
      this.__data.properties['RRKi'] = {
        type: 'date',
        date: props.paymentDate,
      }
    }

    if (props?.employee !== undefined) {
      this.__data.properties['TS%3C%40'] = {
        type: 'relation',
        relation: props.employee,
      }
    }

    if (props?.advancesThb !== undefined) {
      this.__data.properties['fA%3AV'] = {
        type: 'number',
        number: props.advancesThb,
      }
    }

    if (props?.otAmountThb !== undefined) {
      this.__data.properties['kmxK'] = {
        type: 'number',
        number: props.otAmountThb,
      }
    }

    if (props?.totalPaidThb !== undefined) {
      this.__data.properties['ouAH'] = {
        type: 'number',
        number: props.totalPaidThb,
      }
    }

    if (props?.deductionsThb !== undefined) {
      this.__data.properties['vMss'] = {
        type: 'number',
        number: props.deductionsThb,
      }
    }

    if (props?.paymentTitle !== undefined) {
      this.__data.properties['title'] = {
        type: 'title',
        title: typeof props.paymentTitle === 'string' 
          ? [{ type: 'text', text: { content: props.paymentTitle } }]
          : Array.isArray(props.paymentTitle)
            ? props.paymentTitle
            : props.paymentTitle === null
              ? []
              : [
                  {
                    type: 'text',
                    text: {
                      content: props.paymentTitle.text,
                      link: props.paymentTitle?.url ? { url: props.paymentTitle.url } : undefined
                    },
                    annotations: props.paymentTitle.annotations
                  },
                ]
      }
    }
  }
}
