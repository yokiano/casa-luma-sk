import { MembershipsResponse } from "./types"
import { UpdatePageBodyParameters,
RichTextItemRequest
} from '../../core/types/notion-api.types'

type TypeFromRecord<Obj, Type> = Obj extends Record<string, infer T> ? Extract<T, Type> : never

export type MembershipsPropertiesPatch = {
  type?: MembershipsResponse['properties']['Type']['select']['name']
  hasSiblingDiscount?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'formula' }>['formula']
  status?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'formula' }>['formula']
  family?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'relation' }>['relation']
  startDate?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'date' }>['date']
  endDate?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'date' }>['date']
  numberOfKids?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'number' }>['number']
  notes?: string | { text: string; url?: string; annotations?: RichTextItemRequest['annotations'] } | RichTextItemRequest[]
  name?: string | { text: string; url?: string; annotations?: RichTextItemRequest['annotations'] } | RichTextItemRequest[]
}

  
export class MembershipsPatchDTO {
  __data: UpdatePageBodyParameters

  constructor(opts: {
    properties?: MembershipsPropertiesPatch
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
    
    if (props?.type !== undefined) {
      this.__data.properties['GY%3E%3F'] = {
        type: 'select',
        select: { name: props.type },
      }
    }

    if (props?.hasSiblingDiscount !== undefined) {
      this.__data.properties['NbGe'] = {
        type: 'formula',
        formula: props.hasSiblingDiscount,
      }
    }

    if (props?.status !== undefined) {
      this.__data.properties['%5CdlW'] = {
        type: 'formula',
        formula: props.status,
      }
    }

    if (props?.family !== undefined) {
      this.__data.properties['c%60rq'] = {
        type: 'relation',
        relation: props.family,
      }
    }

    if (props?.startDate !== undefined) {
      this.__data.properties['ev%5Et'] = {
        type: 'date',
        date: props.startDate,
      }
    }

    if (props?.endDate !== undefined) {
      this.__data.properties['iSVs'] = {
        type: 'date',
        date: props.endDate,
      }
    }

    if (props?.numberOfKids !== undefined) {
      this.__data.properties['kYoY'] = {
        type: 'number',
        number: props.numberOfKids,
      }
    }

    if (props?.notes !== undefined) {
      this.__data.properties['%7Caqz'] = {
        type: 'rich_text',
        rich_text: typeof props.notes === 'string' 
          ? [{ type: 'text', text: { content: props.notes } }]
          : Array.isArray(props.notes)
            ? props.notes
            : props.notes === null
              ? []
              : [
                  {
                    type: 'text',
                    text: {
                      content: props.notes.text,
                      link: props.notes?.url ? { url: props.notes.url } : undefined
                    },
                    annotations: props.notes.annotations
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
