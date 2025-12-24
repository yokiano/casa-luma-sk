import { TeamCalendarResponse } from "./types"
import { UpdatePageBodyParameters,
RichTextItemRequest
} from '../../core/types/notion-api.types'

type TypeFromRecord<Obj, Type> = Obj extends Record<string, infer T> ? Extract<T, Type> : never

export type TeamCalendarPropertiesPatch = {
  date?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'date' }>['date']
  description?: string | { text: string; url?: string; annotations?: RichTextItemRequest['annotations'] } | RichTextItemRequest[]
  eventName?: string | { text: string; url?: string; annotations?: RichTextItemRequest['annotations'] } | RichTextItemRequest[]
}

  
export class TeamCalendarPatchDTO {
  __data: UpdatePageBodyParameters

  constructor(opts: {
    properties?: TeamCalendarPropertiesPatch
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
    
    if (props?.date !== undefined) {
      this.__data.properties['%3Bxs%5D'] = {
        type: 'date',
        date: props.date,
      }
    }

    if (props?.description !== undefined) {
      this.__data.properties['MzYJ'] = {
        type: 'rich_text',
        rich_text: typeof props.description === 'string' 
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

    if (props?.eventName !== undefined) {
      this.__data.properties['title'] = {
        type: 'title',
        title: typeof props.eventName === 'string' 
          ? [{ type: 'text', text: { content: props.eventName } }]
          : Array.isArray(props.eventName)
            ? props.eventName
            : props.eventName === null
              ? []
              : [
                  {
                    type: 'text',
                    text: {
                      content: props.eventName.text,
                      link: props.eventName?.url ? { url: props.eventName.url } : undefined
                    },
                    annotations: props.eventName.annotations
                  },
                ]
      }
    }
  }
}
