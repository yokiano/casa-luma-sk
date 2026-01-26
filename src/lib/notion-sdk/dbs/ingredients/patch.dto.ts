import { IngredientsResponse } from "./types"
import { UpdatePageBodyParameters,
RichTextItemRequest
} from '../../core/types/notion-api.types'

type TypeFromRecord<Obj, Type> = Obj extends Record<string, infer T> ? Extract<T, Type> : never

export type IngredientsPropertiesPatch = {
  cost?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'number' }>['number']
  department?: IngredientsResponse['properties']['Department']['multi_select'][number]['name'][]
  supplier?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'relation' }>['relation']
  unit?: IngredientsResponse['properties']['Unit']['select']['name']
  sku?: string | { text: string; url?: string; annotations?: RichTextItemRequest['annotations'] } | RichTextItemRequest[]
  thaiName?: string | { text: string; url?: string; annotations?: RichTextItemRequest['annotations'] } | RichTextItemRequest[]
  weightG?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'number' }>['number']
  orderLink?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'url' }>['url']
  image?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'files' }>['files']
  name?: string | { text: string; url?: string; annotations?: RichTextItemRequest['annotations'] } | RichTextItemRequest[]
}

  
export class IngredientsPatchDTO {
  __data: UpdatePageBodyParameters

  constructor(opts: {
    properties?: IngredientsPropertiesPatch
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
    
    if (props?.cost !== undefined) {
      this.__data.properties['%3Cr%5Dr'] = {
        type: 'number',
        number: props.cost,
      }
    }

    if (props?.department !== undefined) {
      this.__data.properties['%3DLVj'] = {
        type: 'multi_select',
        multi_select: props.department?.map((item) => ({ name: item })),
      }
    }

    if (props?.supplier !== undefined) {
      this.__data.properties['%3DaXL'] = {
        type: 'relation',
        relation: props.supplier,
      }
    }

    if (props?.unit !== undefined) {
      this.__data.properties['B%60hP'] = {
        type: 'select',
        select: { name: props.unit },
      }
    }

    if (props?.sku !== undefined) {
      this.__data.properties['L~Gj'] = {
        type: 'rich_text',
        rich_text: typeof props.sku === 'string' 
          ? [{ type: 'text', text: { content: props.sku } }]
          : Array.isArray(props.sku)
            ? props.sku
            : props.sku === null
              ? []
              : [
                  {
                    type: 'text',
                    text: {
                      content: props.sku.text,
                      link: props.sku?.url ? { url: props.sku.url } : undefined
                    },
                    annotations: props.sku.annotations
                  },
                ]
      }
    }

    if (props?.thaiName !== undefined) {
      this.__data.properties['MifD'] = {
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

    if (props?.weightG !== undefined) {
      this.__data.properties['%5COA%60'] = {
        type: 'number',
        number: props.weightG,
      }
    }

    if (props?.orderLink !== undefined) {
      this.__data.properties['%5DUmz'] = {
        type: 'url',
        url: props.orderLink,
      }
    }

    if (props?.image !== undefined) {
      this.__data.properties['yw%5D%3E'] = {
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
  }
}
