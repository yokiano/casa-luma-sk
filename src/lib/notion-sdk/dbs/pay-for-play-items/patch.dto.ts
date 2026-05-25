import { PayForPlayItemsResponse } from "./types"
import { UpdatePageBodyParameters,
RichTextItemRequest
} from '../../core/types/notion-api.types'

type TypeFromRecord<Obj, Type> = Obj extends Record<string, infer T> ? Extract<T, Type> : never

export type PayForPlayItemsPropertiesPatch = {
  stock?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'number' }>['number']
  price?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'number' }>['number']
  category?: PayForPlayItemsResponse['properties']['Category']['select']['name']
  cogs?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'number' }>['number']
  description?: string | { text: string; url?: string; annotations?: RichTextItemRequest['annotations'] } | RichTextItemRequest[]
  supplier?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'relation' }>['relation']
  image?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'files' }>['files']
  name?: string | { text: string; url?: string; annotations?: RichTextItemRequest['annotations'] } | RichTextItemRequest[]
  loyverseId?: string | { text: string; url?: string; annotations?: RichTextItemRequest['annotations'] } | RichTextItemRequest[]
  procurementItem?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'relation' }>['relation']
  purchaseLink?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'url' }>['url']
}

  
export class PayForPlayItemsPatchDTO {
  __data: UpdatePageBodyParameters

  constructor(opts: {
    properties?: PayForPlayItemsPropertiesPatch
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
    
    if (props?.stock !== undefined) {
      this.__data.properties['%3Bh~%60'] = {
        type: 'number',
        number: props.stock,
      }
    }

    if (props?.price !== undefined) {
      this.__data.properties['KX%5CR'] = {
        type: 'number',
        number: props.price,
      }
    }

    if (props?.category !== undefined) {
      this.__data.properties['%5EF%60d'] = {
        type: 'select',
        select: { name: props.category },
      }
    }

    if (props?.cogs !== undefined) {
      this.__data.properties['bZUB'] = {
        type: 'number',
        number: props.cogs,
      }
    }

    if (props?.description !== undefined) {
      this.__data.properties['dN%3DU'] = {
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

    if (props?.supplier !== undefined) {
      this.__data.properties['m%3CbL'] = {
        type: 'relation',
        relation: props.supplier,
      }
    }

    if (props?.image !== undefined) {
      this.__data.properties['yBrb'] = {
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

    if (props?.loyverseId !== undefined) {
      this.__data.properties['%3ByPL'] = {
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

    if (props?.procurementItem !== undefined) {
      this.__data.properties['K%3DPZ'] = {
        type: 'relation',
        relation: props.procurementItem,
      }
    }

    if (props?.purchaseLink !== undefined) {
      this.__data.properties['DR%5CB'] = {
        type: 'url',
        url: props.purchaseLink,
      }
    }
  }
}
