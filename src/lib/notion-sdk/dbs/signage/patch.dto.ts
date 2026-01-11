import { SignageResponse } from "./types"
import { UpdatePageBodyParameters,
RichTextItemRequest
} from '../../core/types/notion-api.types'

type TypeFromRecord<Obj, Type> = Obj extends Record<string, infer T> ? Extract<T, Type> : never

export type SignagePropertiesPatch = {
  location?: SignageResponse['properties']['Location']['select']['name']
  type?: SignageResponse['properties']['Type']['select']['name']
  copy?: string | { text: string; url?: string; annotations?: RichTextItemRequest['annotations'] } | RichTextItemRequest[]
  signId?: string | { text: string; url?: string; annotations?: RichTextItemRequest['annotations'] } | RichTextItemRequest[]
  status?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'status' }>['status']
  name?: string | { text: string; url?: string; annotations?: RichTextItemRequest['annotations'] } | RichTextItemRequest[]
  linkToFile?: string | { text: string; url?: string; annotations?: RichTextItemRequest['annotations'] } | RichTextItemRequest[]
}

  
export class SignagePatchDTO {
  __data: UpdatePageBodyParameters

  constructor(opts: {
    properties?: SignagePropertiesPatch
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
    
    if (props?.location !== undefined) {
      this.__data.properties['%40Gj%7C'] = {
        type: 'select',
        select: { name: props.location },
      }
    }

    if (props?.type !== undefined) {
      this.__data.properties['%40WZI'] = {
        type: 'select',
        select: { name: props.type },
      }
    }

    if (props?.copy !== undefined) {
      this.__data.properties['CsT%5C'] = {
        type: 'rich_text',
        rich_text: typeof props.copy === 'string' 
          ? [{ type: 'text', text: { content: props.copy } }]
          : Array.isArray(props.copy)
            ? props.copy
            : props.copy === null
              ? []
              : [
                  {
                    type: 'text',
                    text: {
                      content: props.copy.text,
                      link: props.copy?.url ? { url: props.copy.url } : undefined
                    },
                    annotations: props.copy.annotations
                  },
                ]
      }
    }

    if (props?.signId !== undefined) {
      this.__data.properties['Q%3FI%5D'] = {
        type: 'rich_text',
        rich_text: typeof props.signId === 'string' 
          ? [{ type: 'text', text: { content: props.signId } }]
          : Array.isArray(props.signId)
            ? props.signId
            : props.signId === null
              ? []
              : [
                  {
                    type: 'text',
                    text: {
                      content: props.signId.text,
                      link: props.signId?.url ? { url: props.signId.url } : undefined
                    },
                    annotations: props.signId.annotations
                  },
                ]
      }
    }

    if (props?.status !== undefined) {
      this.__data.properties['U%3A%3F%3A'] = {
        type: 'status',
        status: props.status,
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

    if (props?.linkToFile !== undefined) {
      this.__data.properties['vWoE'] = {
        type: 'rich_text',
        rich_text: typeof props.linkToFile === 'string' 
          ? [{ type: 'text', text: { content: props.linkToFile } }]
          : Array.isArray(props.linkToFile)
            ? props.linkToFile
            : props.linkToFile === null
              ? []
              : [
                  {
                    type: 'text',
                    text: {
                      content: props.linkToFile.text,
                      link: props.linkToFile?.url ? { url: props.linkToFile.url } : undefined
                    },
                    annotations: props.linkToFile.annotations
                  },
                ]
      }
    }
  }
}
