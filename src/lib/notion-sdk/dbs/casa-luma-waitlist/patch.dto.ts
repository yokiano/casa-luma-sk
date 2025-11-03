import { CasaLumaWaitlistResponse } from "./types"
import { UpdatePageBodyParameters,
RichTextItemRequest
} from '../../core/types/notion-api.types'

type TypeFromRecord<Obj, Type> = Obj extends Record<string, infer T> ? Extract<T, Type> : never

export type CasaLumaWaitlistPropertiesPatch = {
  convertedToRsvp?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'relation' }>['relation']
  phone?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'phone_number' }>['phone_number']
  event?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'relation' }>['relation']
  notified?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'checkbox' }>['checkbox']
  guestName?: string | { text: string; url?: string; annotations?: RichTextItemRequest['annotations'] } | RichTextItemRequest[]
  email?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'email' }>['email']
  waitlistId?: string | { text: string; url?: string; annotations?: RichTextItemRequest['annotations'] } | RichTextItemRequest[]
}

  
export class CasaLumaWaitlistPatchDTO {
  __data: UpdatePageBodyParameters

  constructor(opts: {
    properties?: CasaLumaWaitlistPropertiesPatch
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
    
    if (props?.convertedToRsvp !== undefined) {
      this.__data.properties['%3BQKj'] = {
        type: 'relation',
        relation: props.convertedToRsvp,
      }
    }

    if (props?.phone !== undefined) {
      this.__data.properties['IObD'] = {
        type: 'phone_number',
        phone_number: props.phone,
      }
    }

    if (props?.event !== undefined) {
      this.__data.properties['h%3D%5Df'] = {
        type: 'relation',
        relation: props.event,
      }
    }

    if (props?.notified !== undefined) {
      this.__data.properties['i%5C%3EY'] = {
        type: 'checkbox',
        checkbox: props.notified,
      }
    }

    if (props?.guestName !== undefined) {
      this.__data.properties['tJ%7BV'] = {
        type: 'rich_text',
        rich_text: typeof props.guestName === 'string' 
          ? [{ type: 'text', text: { content: props.guestName } }]
          : Array.isArray(props.guestName)
            ? props.guestName
            : props.guestName === null
              ? []
              : [
                  {
                    type: 'text',
                    text: {
                      content: props.guestName.text,
                      link: props.guestName?.url ? { url: props.guestName.url } : undefined
                    },
                    annotations: props.guestName.annotations
                  },
                ]
      }
    }

    if (props?.email !== undefined) {
      this.__data.properties['y%3BE%3A'] = {
        type: 'email',
        email: props.email,
      }
    }

    if (props?.waitlistId !== undefined) {
      this.__data.properties['title'] = {
        type: 'title',
        title: typeof props.waitlistId === 'string' 
          ? [{ type: 'text', text: { content: props.waitlistId } }]
          : Array.isArray(props.waitlistId)
            ? props.waitlistId
            : props.waitlistId === null
              ? []
              : [
                  {
                    type: 'text',
                    text: {
                      content: props.waitlistId.text,
                      link: props.waitlistId?.url ? { url: props.waitlistId.url } : undefined
                    },
                    annotations: props.waitlistId.annotations
                  },
                ]
      }
    }
  }
}
