import { HourlyReportsResponse } from "./types"
import { UpdatePageBodyParameters,
RichTextItemRequest
} from '../../core/types/notion-api.types'

type TypeFromRecord<Obj, Type> = Obj extends Record<string, infer T> ? Extract<T, Type> : never

export type HourlyReportsPropertiesPatch = {
  employee?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'people' }>['people']
  tasksDescription?: string | { text: string; url?: string; annotations?: RichTextItemRequest['annotations'] } | RichTextItemRequest[]
  endTime?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'date' }>['date']
  workDate?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'date' }>['date']
  startTime?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'date' }>['date']
  status?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'status' }>['status']
  notes?: string | { text: string; url?: string; annotations?: RichTextItemRequest['annotations'] } | RichTextItemRequest[]
  reportTitle?: string | { text: string; url?: string; annotations?: RichTextItemRequest['annotations'] } | RichTextItemRequest[]
}

  
export class HourlyReportsPatchDTO {
  __data: UpdatePageBodyParameters

  constructor(opts: {
    properties?: HourlyReportsPropertiesPatch
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
      this.__data.properties['QY%3FD'] = {
        type: 'people',
        people: props.employee,
      }
    }

    if (props?.tasksDescription !== undefined) {
      this.__data.properties['SXma'] = {
        type: 'rich_text',
        rich_text: typeof props.tasksDescription === 'string' 
          ? [{ type: 'text', text: { content: props.tasksDescription } }]
          : Array.isArray(props.tasksDescription)
            ? props.tasksDescription
            : props.tasksDescription === null
              ? []
              : [
                  {
                    type: 'text',
                    text: {
                      content: props.tasksDescription.text,
                      link: props.tasksDescription?.url ? { url: props.tasksDescription.url } : undefined
                    },
                    annotations: props.tasksDescription.annotations
                  },
                ]
      }
    }

    if (props?.endTime !== undefined) {
      this.__data.properties['Ttd%5C'] = {
        type: 'date',
        date: props.endTime,
      }
    }

    if (props?.workDate !== undefined) {
      this.__data.properties['%5CLjc'] = {
        type: 'date',
        date: props.workDate,
      }
    }

    if (props?.startTime !== undefined) {
      this.__data.properties['%5EdMJ'] = {
        type: 'date',
        date: props.startTime,
      }
    }

    if (props?.status !== undefined) {
      this.__data.properties['_%5B%5B%5C'] = {
        type: 'status',
        status: props.status,
      }
    }

    if (props?.notes !== undefined) {
      this.__data.properties['j%3A%60P'] = {
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

    if (props?.reportTitle !== undefined) {
      this.__data.properties['title'] = {
        type: 'title',
        title: typeof props.reportTitle === 'string' 
          ? [{ type: 'text', text: { content: props.reportTitle } }]
          : Array.isArray(props.reportTitle)
            ? props.reportTitle
            : props.reportTitle === null
              ? []
              : [
                  {
                    type: 'text',
                    text: {
                      content: props.reportTitle.text,
                      link: props.reportTitle?.url ? { url: props.reportTitle.url } : undefined
                    },
                    annotations: props.reportTitle.annotations
                  },
                ]
      }
    }
  }
}
