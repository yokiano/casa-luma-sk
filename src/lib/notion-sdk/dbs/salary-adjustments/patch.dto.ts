import { SalaryAdjustmentsResponse } from "./types"
import { UpdatePageBodyParameters,
RichTextItemRequest
} from '../../core/types/notion-api.types'

type TypeFromRecord<Obj, Type> = Obj extends Record<string, infer T> ? Extract<T, Type> : never

export type SalaryAdjustmentsPropertiesPatch = {
  adjustmentType?: SalaryAdjustmentsResponse['properties']['Adjustment Type']['select']['name']
  employee?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'relation' }>['relation']
  appliedToPayment?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'relation' }>['relation']
  notes?: string | { text: string; url?: string; annotations?: RichTextItemRequest['annotations'] } | RichTextItemRequest[]
  approvedBy?: SalaryAdjustmentsResponse['properties']['Approved By']['select']['name']
  date?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'date' }>['date']
  amountThb?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'number' }>['number']
  adjustmentTitle?: string | { text: string; url?: string; annotations?: RichTextItemRequest['annotations'] } | RichTextItemRequest[]
}

  
export class SalaryAdjustmentsPatchDTO {
  __data: UpdatePageBodyParameters

  constructor(opts: {
    properties?: SalaryAdjustmentsPropertiesPatch
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
    
    if (props?.adjustmentType !== undefined) {
      this.__data.properties['CVGT'] = {
        type: 'select',
        select: { name: props.adjustmentType },
      }
    }

    if (props?.employee !== undefined) {
      this.__data.properties['FmEN'] = {
        type: 'relation',
        relation: props.employee,
      }
    }

    if (props?.appliedToPayment !== undefined) {
      this.__data.properties['T%5D%40%5E'] = {
        type: 'relation',
        relation: props.appliedToPayment,
      }
    }

    if (props?.notes !== undefined) {
      this.__data.properties['a%3A%3Ag'] = {
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

    if (props?.approvedBy !== undefined) {
      this.__data.properties['c%5DuU'] = {
        type: 'select',
        select: { name: props.approvedBy },
      }
    }

    if (props?.date !== undefined) {
      this.__data.properties['vNz%40'] = {
        type: 'date',
        date: props.date,
      }
    }

    if (props?.amountThb !== undefined) {
      this.__data.properties['y~eP'] = {
        type: 'number',
        number: props.amountThb,
      }
    }

    if (props?.adjustmentTitle !== undefined) {
      this.__data.properties['title'] = {
        type: 'title',
        title: typeof props.adjustmentTitle === 'string' 
          ? [{ type: 'text', text: { content: props.adjustmentTitle } }]
          : Array.isArray(props.adjustmentTitle)
            ? props.adjustmentTitle
            : props.adjustmentTitle === null
              ? []
              : [
                  {
                    type: 'text',
                    text: {
                      content: props.adjustmentTitle.text,
                      link: props.adjustmentTitle?.url ? { url: props.adjustmentTitle.url } : undefined
                    },
                    annotations: props.adjustmentTitle.annotations
                  },
                ]
      }
    }
  }
}
