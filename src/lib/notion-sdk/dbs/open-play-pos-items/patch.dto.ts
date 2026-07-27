import { OpenPlayPosItemsResponse } from "./types"
import { UpdatePageBodyParameters,
RichTextItemRequest
} from '../../core/types/notion-api.types'

type TypeFromRecord<Obj, Type> = Obj extends Record<string, infer T> ? Extract<T, Type> : never

export type OpenPlayPosItemsPropertiesPatch = {
  highlight?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'checkbox' }>['checkbox']
  foodDiscount?: string | { text: string; url?: string; annotations?: RichTextItemRequest['annotations'] } | RichTextItemRequest[]
  id?: string | { text: string; url?: string; annotations?: RichTextItemRequest['annotations'] } | RichTextItemRequest[]
  workshopsIncluded?: string | { text: string; url?: string; annotations?: RichTextItemRequest['annotations'] } | RichTextItemRequest[]
  duration?: string | { text: string; url?: string; annotations?: RichTextItemRequest['annotations'] } | RichTextItemRequest[]
  perks?: OpenPlayPosItemsResponse['properties']['Perks']['multi_select'][number]['name'][]
  description?: string | { text: string; url?: string; annotations?: RichTextItemRequest['annotations'] } | RichTextItemRequest[]
  priceBaht?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'number' }>['number']
  name?: string | { text: string; url?: string; annotations?: RichTextItemRequest['annotations'] } | RichTextItemRequest[]
  category?: OpenPlayPosItemsResponse['properties']['Category']['select']['name']
  loyverseId?: string | { text: string; url?: string; annotations?: RichTextItemRequest['annotations'] } | RichTextItemRequest[]
  variantOption_2Name?: string | { text: string; url?: string; annotations?: RichTextItemRequest['annotations'] } | RichTextItemRequest[]
  thaiDescription?: string | { text: string; url?: string; annotations?: RichTextItemRequest['annotations'] } | RichTextItemRequest[]
  hasVariants?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'checkbox' }>['checkbox']
  variantOption_1Name?: string | { text: string; url?: string; annotations?: RichTextItemRequest['annotations'] } | RichTextItemRequest[]
  variantsJson?: string | { text: string; url?: string; annotations?: RichTextItemRequest['annotations'] } | RichTextItemRequest[]
  variantOption_3Name?: string | { text: string; url?: string; annotations?: RichTextItemRequest['annotations'] } | RichTextItemRequest[]
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

    if (props?.description !== undefined) {
      this.__data.properties['xUkM'] = {
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

    if (props?.loyverseId !== undefined) {
      this.__data.properties['CN~l'] = {
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

    if (props?.variantOption_2Name !== undefined) {
      this.__data.properties['DRoF'] = {
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

    if (props?.thaiDescription !== undefined) {
      this.__data.properties['MkKz'] = {
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

    if (props?.hasVariants !== undefined) {
      this.__data.properties['X%40%5CJ'] = {
        type: 'checkbox',
        checkbox: props.hasVariants,
      }
    }

    if (props?.variantOption_1Name !== undefined) {
      this.__data.properties['Y%3B%5Dj'] = {
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
      this.__data.properties['%5D_WB'] = {
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

    if (props?.variantOption_3Name !== undefined) {
      this.__data.properties['dD_L'] = {
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
  }
}
