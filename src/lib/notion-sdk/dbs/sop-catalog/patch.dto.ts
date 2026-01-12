import { SopCatalogResponse } from "./types"
import { UpdatePageBodyParameters,
RichTextItemRequest
} from '../../core/types/notion-api.types'

type TypeFromRecord<Obj, Type> = Obj extends Record<string, infer T> ? Extract<T, Type> : never

export type SopCatalogPropertiesPatch = {
  role?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'relation' }>['relation']
  when?: SopCatalogResponse['properties']['When']['select']['name']
  status?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'status' }>['status']
  sopType?: SopCatalogResponse['properties']['SOP Type']['select']['name']
  department?: SopCatalogResponse['properties']['Department']['select']['name']
  name?: string | { text: string; url?: string; annotations?: RichTextItemRequest['annotations'] } | RichTextItemRequest[]
}

  
export class SopCatalogPatchDTO {
  __data: UpdatePageBodyParameters

  constructor(opts: {
    properties?: SopCatalogPropertiesPatch
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
    
    if (props?.role !== undefined) {
      this.__data.properties['%40pJj'] = {
        type: 'relation',
        relation: props.role,
      }
    }

    if (props?.when !== undefined) {
      this.__data.properties['JsMl'] = {
        type: 'select',
        select: { name: props.when },
      }
    }

    if (props?.status !== undefined) {
      this.__data.properties['%5D%40Pq'] = {
        type: 'status',
        status: props.status,
      }
    }

    if (props?.sopType !== undefined) {
      this.__data.properties['pf%60b'] = {
        type: 'select',
        select: { name: props.sopType },
      }
    }

    if (props?.department !== undefined) {
      this.__data.properties['ybjG'] = {
        type: 'select',
        select: { name: props.department },
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
