import { PosModifiersResponse } from "./types"
import { UpdatePageBodyParameters,
RichTextItemRequest
} from '../../core/types/notion-api.types'

type TypeFromRecord<Obj, Type> = Obj extends Record<string, infer T> ? Extract<T, Type> : never

export type PosModifiersPropertiesPatch = {
  notes?: string | { text: string; url?: string; annotations?: RichTextItemRequest['annotations'] } | RichTextItemRequest[]
  optionsJson?: string | { text: string; url?: string; annotations?: RichTextItemRequest['annotations'] } | RichTextItemRequest[]
  loyverseId?: string | { text: string; url?: string; annotations?: RichTextItemRequest['annotations'] } | RichTextItemRequest[]
  position?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'number' }>['number']
  active?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'checkbox' }>['checkbox']
  name?: string | { text: string; url?: string; annotations?: RichTextItemRequest['annotations'] } | RichTextItemRequest[]
}

  
export class PosModifiersPatchDTO {
  __data: UpdatePageBodyParameters

  constructor(opts: {
    properties?: PosModifiersPropertiesPatch
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
      this.__data.properties['%3BZd%5E'] = {
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

    if (props?.optionsJson !== undefined) {
      this.__data.properties['%40bAp'] = {
        type: 'rich_text',
        rich_text: typeof props.optionsJson === 'string' 
          ? [{ type: 'text', text: { content: props.optionsJson } }]
          : Array.isArray(props.optionsJson)
            ? props.optionsJson
            : props.optionsJson === null
              ? []
              : [
                  {
                    type: 'text',
                    text: {
                      content: props.optionsJson.text,
                      link: props.optionsJson?.url ? { url: props.optionsJson.url } : undefined
                    },
                    annotations: props.optionsJson.annotations
                  },
                ]
      }
    }

    if (props?.loyverseId !== undefined) {
      this.__data.properties['C%7BUZ'] = {
        type: 'rich_text',
        rich_text: typeof props.loyverseId === 'string' 
          ? [{ type: 'text', text: { content: props.loyverseId } }]
          : Array.isArray(props.loyverseId)
            ? props.loyverseId
            : props.loyverseId === null
              ? []
              : [
                  {
                    type: 'text',
                    text: {
                      content: props.loyverseId.text,
                      link: props.loyverseId?.url ? { url: props.loyverseId.url } : undefined
                    },
                    annotations: props.loyverseId.annotations
                  },
                ]
      }
    }

    if (props?.position !== undefined) {
      this.__data.properties['Ph%3EC'] = {
        type: 'number',
        number: props.position,
      }
    }

    if (props?.active !== undefined) {
      this.__data.properties['teX~'] = {
        type: 'checkbox',
        checkbox: props.active,
      }
    }

    if (props?.name !== undefined) {
      this.__data.properties['title'] = {
        type: 'title',
        title: typeof props.name === 'string' 
          ? [{ type: 'text', text: { content: props.name } }]
          : Array.isArray(props.name)
            ? props.name
            : props.name === null
              ? []
              : [
                  {
                    type: 'text',
                    text: {
                      content: props.name.text,
                      link: props.name?.url ? { url: props.name.url } : undefined
                    },
                    annotations: props.name.annotations
                  },
                ]
      }
    }
  }
}
