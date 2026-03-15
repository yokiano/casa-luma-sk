import { WebsiteImagesResponse } from "./types"
import { UpdatePageBodyParameters,
RichTextItemRequest
} from '../../core/types/notion-api.types'

type TypeFromRecord<Obj, Type> = Obj extends Record<string, infer T> ? Extract<T, Type> : never

export type WebsiteImagesPropertiesPatch = {
  section?: WebsiteImagesResponse['properties']['Section']['select']['name']
  active?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'checkbox' }>['checkbox']
  altText?: string | { text: string; url?: string; annotations?: RichTextItemRequest['annotations'] } | RichTextItemRequest[]
  image?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'files' }>['files']
  name?: string | { text: string; url?: string; annotations?: RichTextItemRequest['annotations'] } | RichTextItemRequest[]
  slug?: string | { text: string; url?: string; annotations?: RichTextItemRequest['annotations'] } | RichTextItemRequest[]
}

  
export class WebsiteImagesPatchDTO {
  __data: UpdatePageBodyParameters

  constructor(opts: {
    properties?: WebsiteImagesPropertiesPatch
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
    
    if (props?.section !== undefined) {
      this.__data.properties['%3Bfir'] = {
        type: 'select',
        select: { name: props.section },
      }
    }

    if (props?.active !== undefined) {
      this.__data.properties['Rjej'] = {
        type: 'checkbox',
        checkbox: props.active,
      }
    }

    if (props?.altText !== undefined) {
      this.__data.properties['VKLn'] = {
        type: 'rich_text',
        rich_text: typeof props.altText === 'string' 
          ? [{ type: 'text', text: { content: props.altText } }]
          : Array.isArray(props.altText)
            ? props.altText
            : props.altText === null
              ? []
              : [
                  {
                    type: 'text',
                    text: {
                      content: props.altText.text,
                      link: props.altText?.url ? { url: props.altText.url } : undefined
                    },
                    annotations: props.altText.annotations
                  },
                ]
      }
    }

    if (props?.image !== undefined) {
      this.__data.properties['%5Bd%5C%5B'] = {
        type: 'files',
        files: props.image,
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

    if (props?.slug !== undefined) {
      this.__data.properties['C%7BuL'] = {
        type: 'rich_text',
        rich_text: typeof props.slug === 'string' 
          ? [{ type: 'text', text: { content: props.slug } }]
          : Array.isArray(props.slug)
            ? props.slug
            : props.slug === null
              ? []
              : [
                  {
                    type: 'text',
                    text: {
                      content: props.slug.text,
                      link: props.slug?.url ? { url: props.slug.url } : undefined
                    },
                    annotations: props.slug.annotations
                  },
                ]
      }
    }
  }
}
