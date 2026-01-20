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
  variantOption_1Name?: string | { text: string; url?: string; annotations?: RichTextItemRequest['annotations'] } | RichTextItemRequest[]
  variantsJson?: string | { text: string; url?: string; annotations?: RichTextItemRequest['annotations'] } | RichTextItemRequest[]
  loyverseHandle?: string | { text: string; url?: string; annotations?: RichTextItemRequest['annotations'] } | RichTextItemRequest[]
  hasVariants?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'checkbox' }>['checkbox']
  variantOption_3Name?: string | { text: string; url?: string; annotations?: RichTextItemRequest['annotations'] } | RichTextItemRequest[]
  variantOption_2Name?: string | { text: string; url?: string; annotations?: RichTextItemRequest['annotations'] } | RichTextItemRequest[]
  modifiers?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'relation' }>['relation']
  order?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'number' }>['number']
  thaiName?: string | { text: string; url?: string; annotations?: RichTextItemRequest['annotations'] } | RichTextItemRequest[]
  recommended?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'checkbox' }>['checkbox']
  thaiDescription?: string | { text: string; url?: string; annotations?: RichTextItemRequest['annotations'] } | RichTextItemRequest[]
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

    if (props?.variantOption_1Name !== undefined) {
      this.__data.properties['Fak%7B'] = {
        type: 'rich_text',
        rich_text: typeof props.variantOption_1Name === 'string' 
          ? [{ type: 'text', text: { content: props.variantOption_1Name } }]
          : Array.isArray(props.variantOption_1Name)
            ? props.variantOption_1Name
            : props.variantOption_1Name === null
              ? []
              : [
                  {
                    type: 'text',
                    text: {
                      content: props.variantOption_1Name.text,
                      link: props.variantOption_1Name?.url ? { url: props.variantOption_1Name.url } : undefined
                    },
                    annotations: props.variantOption_1Name.annotations
                  },
                ]
      }
    }

    if (props?.variantsJson !== undefined) {
      this.__data.properties['GBdq'] = {
        type: 'rich_text',
        rich_text: typeof props.variantsJson === 'string' 
          ? [{ type: 'text', text: { content: props.variantsJson } }]
          : Array.isArray(props.variantsJson)
            ? props.variantsJson
            : props.variantsJson === null
              ? []
              : [
                  {
                    type: 'text',
                    text: {
                      content: props.variantsJson.text,
                      link: props.variantsJson?.url ? { url: props.variantsJson.url } : undefined
                    },
                    annotations: props.variantsJson.annotations
                  },
                ]
      }
    }

    if (props?.loyverseHandle !== undefined) {
      this.__data.properties['PdEI'] = {
        type: 'rich_text',
        rich_text: typeof props.loyverseHandle === 'string' 
          ? [{ type: 'text', text: { content: props.loyverseHandle } }]
          : Array.isArray(props.loyverseHandle)
            ? props.loyverseHandle
            : props.loyverseHandle === null
              ? []
              : [
                  {
                    type: 'text',
                    text: {
                      content: props.loyverseHandle.text,
                      link: props.loyverseHandle?.url ? { url: props.loyverseHandle.url } : undefined
                    },
                    annotations: props.loyverseHandle.annotations
                  },
                ]
      }
    }

    if (props?.hasVariants !== undefined) {
      this.__data.properties['Y%5DwL'] = {
        type: 'checkbox',
        checkbox: props.hasVariants,
      }
    }

    if (props?.variantOption_3Name !== undefined) {
      this.__data.properties['a%3CZ%40'] = {
        type: 'rich_text',
        rich_text: typeof props.variantOption_3Name === 'string' 
          ? [{ type: 'text', text: { content: props.variantOption_3Name } }]
          : Array.isArray(props.variantOption_3Name)
            ? props.variantOption_3Name
            : props.variantOption_3Name === null
              ? []
              : [
                  {
                    type: 'text',
                    text: {
                      content: props.variantOption_3Name.text,
                      link: props.variantOption_3Name?.url ? { url: props.variantOption_3Name.url } : undefined
                    },
                    annotations: props.variantOption_3Name.annotations
                  },
                ]
      }
    }

    if (props?.variantOption_2Name !== undefined) {
      this.__data.properties['wt%7Dr'] = {
        type: 'rich_text',
        rich_text: typeof props.variantOption_2Name === 'string' 
          ? [{ type: 'text', text: { content: props.variantOption_2Name } }]
          : Array.isArray(props.variantOption_2Name)
            ? props.variantOption_2Name
            : props.variantOption_2Name === null
              ? []
              : [
                  {
                    type: 'text',
                    text: {
                      content: props.variantOption_2Name.text,
                      link: props.variantOption_2Name?.url ? { url: props.variantOption_2Name.url } : undefined
                    },
                    annotations: props.variantOption_2Name.annotations
                  },
                ]
      }
    }

    if (props?.modifiers !== undefined) {
      this.__data.properties['eqWu'] = {
        type: 'relation',
        relation: props.modifiers,
      }
    }

    if (props?.order !== undefined) {
      this.__data.properties['TAGg'] = {
        type: 'number',
        number: props.order,
      }
    }

    if (props?.thaiName !== undefined) {
      this.__data.properties['K%7DaB'] = {
        type: 'rich_text',
        rich_text: typeof props.thaiName === 'string' 
          ? [{ type: 'text', text: { content: props.thaiName } }]
          : Array.isArray(props.thaiName)
            ? props.thaiName
            : props.thaiName === null
              ? []
              : [
                  {
                    type: 'text',
                    text: {
                      content: props.thaiName.text,
                      link: props.thaiName?.url ? { url: props.thaiName.url } : undefined
                    },
                    annotations: props.thaiName.annotations
                  },
                ]
      }
    }

    if (props?.recommended !== undefined) {
      this.__data.properties['APh%5C'] = {
        type: 'checkbox',
        checkbox: props.recommended,
      }
    }

    if (props?.thaiDescription !== undefined) {
      this.__data.properties['OoM%7D'] = {
        type: 'rich_text',
        rich_text: typeof props.thaiDescription === 'string' 
          ? [{ type: 'text', text: { content: props.thaiDescription } }]
          : Array.isArray(props.thaiDescription)
            ? props.thaiDescription
            : props.thaiDescription === null
              ? []
              : [
                  {
                    type: 'text',
                    text: {
                      content: props.thaiDescription.text,
                      link: props.thaiDescription?.url ? { url: props.thaiDescription.url } : undefined
                    },
                    annotations: props.thaiDescription.annotations
                  },
                ]
      }
    }
  }
}
