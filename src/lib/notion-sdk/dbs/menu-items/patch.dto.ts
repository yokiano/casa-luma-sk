import { MenuItemsResponse } from "./types"
import { UpdatePageBodyParameters,
RichTextItemRequest
} from '../../core/types/notion-api.types'

type TypeFromRecord<Obj, Type> = Obj extends Record<string, infer T> ? Extract<T, Type> : never

export type MenuItemsPropertiesPatch = {
  description?: string | { text: string; url?: string; annotations?: RichTextItemRequest['annotations'] } | RichTextItemRequest[]
  dietaryOptions?: MenuItemsResponse['properties']['Dietary Options']['multi_select'][number]['name'][]
  cogs?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'number' }>['number']
  price?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'number' }>['number']
  ingridients?: MenuItemsResponse['properties']['Ingridients']['multi_select'][number]['name'][]
  allergens?: MenuItemsResponse['properties']['Allergens']['multi_select'][number]['name'][]
  image?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'files' }>['files']
  category?: MenuItemsResponse['properties']['Category']['select']['name']
  name?: string | { text: string; url?: string; annotations?: RichTextItemRequest['annotations'] } | RichTextItemRequest[]
  loyverseId?: string | { text: string; url?: string; annotations?: RichTextItemRequest['annotations'] } | RichTextItemRequest[]
  grandCategory?: MenuItemsResponse['properties']['Grand Category']['select']['name']
  status?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'status' }>['status']
}

  
export class MenuItemsPatchDTO {
  __data: UpdatePageBodyParameters

  constructor(opts: {
    properties?: MenuItemsPropertiesPatch
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
    
    if (props?.description !== undefined) {
      this.__data.properties['%40w%3Bd'] = {
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

    if (props?.dietaryOptions !== undefined) {
      this.__data.properties['B%5CRW'] = {
        type: 'multi_select',
        multi_select: props.dietaryOptions?.map((item) => ({ name: item })),
      }
    }

    if (props?.cogs !== undefined) {
      this.__data.properties['QFbw'] = {
        type: 'number',
        number: props.cogs,
      }
    }

    if (props?.price !== undefined) {
      this.__data.properties['QGW%3B'] = {
        type: 'number',
        number: props.price,
      }
    }

    if (props?.ingridients !== undefined) {
      this.__data.properties['SLSP'] = {
        type: 'multi_select',
        multi_select: props.ingridients?.map((item) => ({ name: item })),
      }
    }

    if (props?.allergens !== undefined) {
      this.__data.properties['a%5DkJ'] = {
        type: 'multi_select',
        multi_select: props.allergens?.map((item) => ({ name: item })),
      }
    }

    if (props?.image !== undefined) {
      this.__data.properties['t%3DM%40'] = {
        type: 'files',
        files: props.image,
      }
    }

    if (props?.category !== undefined) {
      this.__data.properties['z%40vA'] = {
        type: 'select',
        select: { name: props.category },
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
      this.__data.properties['%5B%3DN%3E'] = {
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

    if (props?.grandCategory !== undefined) {
      this.__data.properties['Bfwb'] = {
        type: 'select',
        select: { name: props.grandCategory },
      }
    }

    if (props?.status !== undefined) {
      this.__data.properties['%5B%5Bjz'] = {
        type: 'status',
        status: props.status,
      }
    }
  }
}
