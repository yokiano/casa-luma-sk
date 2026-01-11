import { ShiftsResponse } from "./types"
import { UpdatePageBodyParameters,
RichTextItemRequest
} from '../../core/types/notion-api.types'

type TypeFromRecord<Obj, Type> = Obj extends Record<string, infer T> ? Extract<T, Type> : never

export type ShiftsPropertiesPatch = {
  employee?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'relation' }>['relation']
  type?: ShiftsResponse['properties']['Type']['select']['name']
  status?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'status' }>['status']
  shiftTime?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'date' }>['date']
  role?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'relation' }>['relation']
  shiftNote?: string | { text: string; url?: string; annotations?: RichTextItemRequest['annotations'] } | RichTextItemRequest[]
  otApprover?: ShiftsResponse['properties']['OT Approver']['multi_select'][number]['name'][]
  ot?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'number' }>['number']
}

  
export class ShiftsPatchDTO {
  __data: UpdatePageBodyParameters

  constructor(opts: {
    properties?: ShiftsPropertiesPatch
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
    
    if (props?.employee !== undefined) {
      this.__data.properties['%40QLu'] = {
        type: 'relation',
        relation: props.employee,
      }
    }

    if (props?.type !== undefined) {
      this.__data.properties['L%60OW'] = {
        type: 'select',
        select: { name: props.type },
      }
    }

    if (props?.status !== undefined) {
      this.__data.properties['VPhk'] = {
        type: 'status',
        status: props.status,
      }
    }

    if (props?.shiftTime !== undefined) {
      this.__data.properties['YKt%5C'] = {
        type: 'date',
        date: props.shiftTime,
      }
    }

    if (props?.role !== undefined) {
      this.__data.properties['mbpd'] = {
        type: 'relation',
        relation: props.role,
      }
    }

    if (props?.shiftNote !== undefined) {
      this.__data.properties['title'] = {
        type: 'title',
        title: typeof props.shiftNote === 'string' 
          ? [{ type: 'text', text: { content: props.shiftNote } }]
          : Array.isArray(props.shiftNote)
            ? props.shiftNote
            : props.shiftNote === null
              ? []
              : [
                  {
                    type: 'text',
                    text: {
                      content: props.shiftNote.text,
                      link: props.shiftNote?.url ? { url: props.shiftNote.url } : undefined
                    },
                    annotations: props.shiftNote.annotations
                  },
                ]
      }
    }

    if (props?.otApprover !== undefined) {
      this.__data.properties['X%3FPo'] = {
        type: 'multi_select',
        multi_select: props.otApprover?.map((item) => ({ name: item })),
      }
    }

    if (props?.ot !== undefined) {
      this.__data.properties['aT%5Bq'] = {
        type: 'number',
        number: props.ot,
      }
    }
  }
}
