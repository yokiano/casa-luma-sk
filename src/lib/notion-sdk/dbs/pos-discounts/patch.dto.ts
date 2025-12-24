import { PosDiscountsResponse } from "./types"
import { UpdatePageBodyParameters,
RichTextItemRequest
} from '../../core/types/notion-api.types'

type TypeFromRecord<Obj, Type> = Obj extends Record<string, infer T> ? Extract<T, Type> : never

export type PosDiscountsPropertiesPatch = {
  value?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'number' }>['number']
  active?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'checkbox' }>['checkbox']
  restrictedAccess?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'checkbox' }>['checkbox']
  type?: PosDiscountsResponse['properties']['Type']['select']['name']
  loyverseId?: string | { text: string; url?: string; annotations?: RichTextItemRequest['annotations'] } | RichTextItemRequest[]
  appliesTo?: PosDiscountsResponse['properties']['Applies to']['select']['name']
  name?: string | { text: string; url?: string; annotations?: RichTextItemRequest['annotations'] } | RichTextItemRequest[]
}

  
export class PosDiscountsPatchDTO {
  __data: UpdatePageBodyParameters

  constructor(opts: {
    properties?: PosDiscountsPropertiesPatch
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
    
    if (props?.value !== undefined) {
      this.__data.properties['%3Aqj_'] = {
        type: 'number',
        number: props.value,
      }
    }

    if (props?.active !== undefined) {
      this.__data.properties['B%5D%3A%3C'] = {
        type: 'checkbox',
        checkbox: props.active,
      }
    }

    if (props?.restrictedAccess !== undefined) {
      this.__data.properties['GeG%3C'] = {
        type: 'checkbox',
        checkbox: props.restrictedAccess,
      }
    }

    if (props?.type !== undefined) {
      this.__data.properties['npz%7D'] = {
        type: 'select',
        select: { name: props.type },
      }
    }

    if (props?.loyverseId !== undefined) {
      this.__data.properties['wqUi'] = {
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

    if (props?.appliesTo !== undefined) {
      this.__data.properties['%7B_%60%5C'] = {
        type: 'select',
        select: { name: props.appliesTo },
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
