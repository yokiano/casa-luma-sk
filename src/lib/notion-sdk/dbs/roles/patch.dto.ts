import { RolesResponse } from "./types"
import { UpdatePageBodyParameters,
RichTextItemRequest
} from '../../core/types/notion-api.types'

type TypeFromRecord<Obj, Type> = Obj extends Record<string, infer T> ? Extract<T, Type> : never

export type RolesPropertiesPatch = {
  employees?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'relation' }>['relation']
  active?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'checkbox' }>['checkbox']
  requiredPerDay?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'number' }>['number']
  department?: RolesResponse['properties']['Department']['select']['name']
  role?: string | { text: string; url?: string; annotations?: RichTextItemRequest['annotations'] } | RichTextItemRequest[]
}

  
export class RolesPatchDTO {
  __data: UpdatePageBodyParameters

  constructor(opts: {
    properties?: RolesPropertiesPatch
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
    
    if (props?.employees !== undefined) {
      this.__data.properties['HIEV'] = {
        type: 'relation',
        relation: props.employees,
      }
    }

    if (props?.active !== undefined) {
      this.__data.properties['YFml'] = {
        type: 'checkbox',
        checkbox: props.active,
      }
    }

    if (props?.requiredPerDay !== undefined) {
      this.__data.properties['_YcL'] = {
        type: 'number',
        number: props.requiredPerDay,
      }
    }

    if (props?.department !== undefined) {
      this.__data.properties['dgcQ'] = {
        type: 'select',
        select: { name: props.department },
      }
    }

    if (props?.role !== undefined) {
      this.__data.properties['title'] = {
        type: 'title',
        title: typeof props.role === 'string' 
          ? [{ type: 'text', text: { content: props.role } }]
          : Array.isArray(props.role)
            ? props.role
            : props.role === null
              ? []
              : [
                  {
                    type: 'text',
                    text: {
                      content: props.role.text,
                      link: props.role?.url ? { url: props.role.url } : undefined
                    },
                    annotations: props.role.annotations
                  },
                ]
      }
    }
  }
}
