import { StoreItemsResponse } from "./types"
import { UpdatePageBodyParameters,
RichTextItemRequest
} from '../../core/types/notion-api.types'

type TypeFromRecord<Obj, Type> = Obj extends Record<string, infer T> ? Extract<T, Type> : never

export type StoreItemsPropertiesPatch = {
  procurementItem?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'relation' }>['relation']
  category?: StoreItemsResponse['properties']['Category']['select']['name']
  supplier?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'relation' }>['relation']
  price?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'number' }>['number']
  loyverseId?: string | { text: string; url?: string; annotations?: RichTextItemRequest['annotations'] } | RichTextItemRequest[]
  stock?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'number' }>['number']
  expiryDate?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'date' }>['date']
  cogs?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'number' }>['number']
  image?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'files' }>['files']
  description?: string | { text: string; url?: string; annotations?: RichTextItemRequest['annotations'] } | RichTextItemRequest[]
  name?: string | { text: string; url?: string; annotations?: RichTextItemRequest['annotations'] } | RichTextItemRequest[]
}

  
export class StoreItemsPatchDTO {
  __data: UpdatePageBodyParameters

  constructor(opts: {
    properties?: StoreItemsPropertiesPatch
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
    
    if (props?.procurementItem !== undefined) {
      this.__data.properties['CLP%7D'] = {
        type: 'relation',
        relation: props.procurementItem,
      }
    }

    if (props?.category !== undefined) {
      this.__data.properties['MS%5D%40'] = {
        type: 'select',
        select: { name: props.category },
      }
    }

    if (props?.supplier !== undefined) {
      this.__data.properties['YmWi'] = {
        type: 'relation',
        relation: props.supplier,
      }
    }

    if (props?.price !== undefined) {
      this.__data.properties['ZSf%3A'] = {
        type: 'number',
        number: props.price,
      }
    }

    if (props?.loyverseId !== undefined) {
      this.__data.properties['%5CBvy'] = {
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

    if (props?.stock !== undefined) {
      this.__data.properties['aG%5CY'] = {
        type: 'number',
        number: props.stock,
      }
    }

    if (props?.expiryDate !== undefined) {
      this.__data.properties['cZg%5C'] = {
        type: 'date',
        date: props.expiryDate,
      }
    }

    if (props?.cogs !== undefined) {
      this.__data.properties['e%3C%3F%60'] = {
        type: 'number',
        number: props.cogs,
      }
    }

    if (props?.image !== undefined) {
      this.__data.properties['eGda'] = {
        type: 'files',
        files: props.image,
      }
    }

    if (props?.description !== undefined) {
      this.__data.properties['ia%7B%3D'] = {
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
