import { OpenPlayPosItemsResponse } from "./types"
import { UpdatePageBodyParameters,
RichTextItemRequest
} from '../../core/types/notion-api.types'

type TypeFromRecord<Obj, Type> = Obj extends Record<string, infer T> ? Extract<T, Type> : never

export type OpenPlayPosItemsPropertiesPatch = {
  highlight?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'checkbox' }>['checkbox']
  iconChar?: string | { text: string; url?: string; annotations?: RichTextItemRequest['annotations'] } | RichTextItemRequest[]
  foodDiscount?: string | { text: string; url?: string; annotations?: RichTextItemRequest['annotations'] } | RichTextItemRequest[]
  id?: string | { text: string; url?: string; annotations?: RichTextItemRequest['annotations'] } | RichTextItemRequest[]
  workshopsIncluded?: string | { text: string; url?: string; annotations?: RichTextItemRequest['annotations'] } | RichTextItemRequest[]
  duration?: string | { text: string; url?: string; annotations?: RichTextItemRequest['annotations'] } | RichTextItemRequest[]
  perks?: OpenPlayPosItemsResponse['properties']['Perks']['multi_select'][number]['name'][]
  access?: string | { text: string; url?: string; annotations?: RichTextItemRequest['annotations'] } | RichTextItemRequest[]
  priceBaht?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'number' }>['number']
  name?: string | { text: string; url?: string; annotations?: RichTextItemRequest['annotations'] } | RichTextItemRequest[]
  category?: OpenPlayPosItemsResponse['properties']['Category']['select']['name']
}

  
export class OpenPlayPosItemsPatchDTO {
  __data: UpdatePageBodyParameters

  constructor(opts: {
    properties?: OpenPlayPosItemsPropertiesPatch
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
    
    if (props?.highlight !== undefined) {
      this.__data.properties['%3BTO~'] = {
        type: 'checkbox',
        checkbox: props.highlight,
      }
    }

    if (props?.iconChar !== undefined) {
      this.__data.properties['%3C%5DT%3A'] = {
        type: 'rich_text',
        rich_text: typeof props.iconChar === 'string' 
          ? [{ type: 'text', text: { content: props.iconChar } }]
          : Array.isArray(props.iconChar)
            ? props.iconChar
            : props.iconChar === null
              ? []
              : [
                  {
                    type: 'text',
                    text: {
                      content: props.iconChar.text,
                      link: props.iconChar?.url ? { url: props.iconChar.url } : undefined
                    },
                    annotations: props.iconChar.annotations
                  },
                ]
      }
    }

    if (props?.foodDiscount !== undefined) {
      this.__data.properties['RWeU'] = {
        type: 'rich_text',
        rich_text: typeof props.foodDiscount === 'string' 
          ? [{ type: 'text', text: { content: props.foodDiscount } }]
          : Array.isArray(props.foodDiscount)
            ? props.foodDiscount
            : props.foodDiscount === null
              ? []
              : [
                  {
                    type: 'text',
                    text: {
                      content: props.foodDiscount.text,
                      link: props.foodDiscount?.url ? { url: props.foodDiscount.url } : undefined
                    },
                    annotations: props.foodDiscount.annotations
                  },
                ]
      }
    }

    if (props?.id !== undefined) {
      this.__data.properties['Y%3E%7Cv'] = {
        type: 'rich_text',
        rich_text: typeof props.id === 'string' 
          ? [{ type: 'text', text: { content: props.id } }]
          : Array.isArray(props.id)
            ? props.id
            : props.id === null
              ? []
              : [
                  {
                    type: 'text',
                    text: {
                      content: props.id.text,
                      link: props.id?.url ? { url: props.id.url } : undefined
                    },
                    annotations: props.id.annotations
                  },
                ]
      }
    }

    if (props?.workshopsIncluded !== undefined) {
      this.__data.properties['sQCI'] = {
        type: 'rich_text',
        rich_text: typeof props.workshopsIncluded === 'string' 
          ? [{ type: 'text', text: { content: props.workshopsIncluded } }]
          : Array.isArray(props.workshopsIncluded)
            ? props.workshopsIncluded
            : props.workshopsIncluded === null
              ? []
              : [
                  {
                    type: 'text',
                    text: {
                      content: props.workshopsIncluded.text,
                      link: props.workshopsIncluded?.url ? { url: props.workshopsIncluded.url } : undefined
                    },
                    annotations: props.workshopsIncluded.annotations
                  },
                ]
      }
    }

    if (props?.duration !== undefined) {
      this.__data.properties['tgPF'] = {
        type: 'rich_text',
        rich_text: typeof props.duration === 'string' 
          ? [{ type: 'text', text: { content: props.duration } }]
          : Array.isArray(props.duration)
            ? props.duration
            : props.duration === null
              ? []
              : [
                  {
                    type: 'text',
                    text: {
                      content: props.duration.text,
                      link: props.duration?.url ? { url: props.duration.url } : undefined
                    },
                    annotations: props.duration.annotations
                  },
                ]
      }
    }

    if (props?.perks !== undefined) {
      this.__data.properties['vzoC'] = {
        type: 'multi_select',
        multi_select: props.perks?.map((item) => ({ name: item })),
      }
    }

    if (props?.access !== undefined) {
      this.__data.properties['xUkM'] = {
        type: 'rich_text',
        rich_text: typeof props.access === 'string' 
          ? [{ type: 'text', text: { content: props.access } }]
          : Array.isArray(props.access)
            ? props.access
            : props.access === null
              ? []
              : [
                  {
                    type: 'text',
                    text: {
                      content: props.access.text,
                      link: props.access?.url ? { url: props.access.url } : undefined
                    },
                    annotations: props.access.annotations
                  },
                ]
      }
    }

    if (props?.priceBaht !== undefined) {
      this.__data.properties['%7B%5BoE'] = {
        type: 'number',
        number: props.priceBaht,
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

    if (props?.category !== undefined) {
      this.__data.properties['O%3D%5Dz'] = {
        type: 'select',
        select: { name: props.category },
      }
    }
  }
}
