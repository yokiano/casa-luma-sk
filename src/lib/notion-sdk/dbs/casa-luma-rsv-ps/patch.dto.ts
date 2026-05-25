import { CasaLumaRsvPsResponse } from "./types"
import { UpdatePageBodyParameters,
RichTextItemRequest
} from '../../core/types/notion-api.types'

type TypeFromRecord<Obj, Type> = Obj extends Record<string, infer T> ? Extract<T, Type> : never

export type CasaLumaRsvPsPropertiesPatch = {
  notes?: string | { text: string; url?: string; annotations?: RichTextItemRequest['annotations'] } | RichTextItemRequest[]
  dietaryRestrictions?: CasaLumaRsvPsResponse['properties']['Dietary Restrictions']['multi_select'][number]['name'][]
  source?: CasaLumaRsvPsResponse['properties']['Source']['select']['name']
  confirmedAt?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'date' }>['date']
  numberOfGuests?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'number' }>['number']
  status?: CasaLumaRsvPsResponse['properties']['Status']['select']['name']
  phone?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'phone_number' }>['phone_number']
  event?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'relation' }>['relation']
  email?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'email' }>['email']
  checkInStatus?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'checkbox' }>['checkbox']
  guestName?: string | { text: string; url?: string; annotations?: RichTextItemRequest['annotations'] } | RichTextItemRequest[]
  internalNotes?: string | { text: string; url?: string; annotations?: RichTextItemRequest['annotations'] } | RichTextItemRequest[]
  paymentStatus?: CasaLumaRsvPsResponse['properties']['Payment Status']['select']['name']
  rsvpId?: string | { text: string; url?: string; annotations?: RichTextItemRequest['annotations'] } | RichTextItemRequest[]
}

  
export class CasaLumaRsvPsPatchDTO {
  __data: UpdatePageBodyParameters

  constructor(opts: {
    properties?: CasaLumaRsvPsPropertiesPatch
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
    
    if (props?.notes !== undefined) {
      this.__data.properties['%3DQSs'] = {
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

    if (props?.dietaryRestrictions !== undefined) {
      this.__data.properties['%3DsE%5B'] = {
        type: 'multi_select',
        multi_select: props.dietaryRestrictions?.map((item) => ({ name: item })),
      }
    }

    if (props?.source !== undefined) {
      this.__data.properties['D_%5D%3E'] = {
        type: 'select',
        select: { name: props.source },
      }
    }

    if (props?.confirmedAt !== undefined) {
      this.__data.properties['F%5EiO'] = {
        type: 'date',
        date: props.confirmedAt,
      }
    }

    if (props?.numberOfGuests !== undefined) {
      this.__data.properties['LNBq'] = {
        type: 'number',
        number: props.numberOfGuests,
      }
    }

    if (props?.status !== undefined) {
      this.__data.properties['MZRS'] = {
        type: 'select',
        select: { name: props.status },
      }
    }

    if (props?.phone !== undefined) {
      this.__data.properties['PnW%40'] = {
        type: 'phone_number',
        phone_number: props.phone,
      }
    }

    if (props?.event !== undefined) {
      this.__data.properties['_LMp'] = {
        type: 'relation',
        relation: props.event,
      }
    }

    if (props?.email !== undefined) {
      this.__data.properties['%60%5BuY'] = {
        type: 'email',
        email: props.email,
      }
    }

    if (props?.checkInStatus !== undefined) {
      this.__data.properties['cFDH'] = {
        type: 'checkbox',
        checkbox: props.checkInStatus,
      }
    }

    if (props?.guestName !== undefined) {
      this.__data.properties['fI%40f'] = {
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

    if (props?.internalNotes !== undefined) {
      this.__data.properties['wKeg'] = {
        type: 'rich_text',
        rich_text: typeof props.internalNotes === 'string' 
          ? [{ type: 'text', text: { content: props.internalNotes } }]
          : Array.isArray(props.internalNotes)
            ? props.internalNotes
            : props.internalNotes === null
              ? []
              : [
                  {
                    type: 'text',
                    text: {
                      content: props.internalNotes.text,
                      link: props.internalNotes?.url ? { url: props.internalNotes.url } : undefined
                    },
                    annotations: props.internalNotes.annotations
                  },
                ]
      }
    }

    if (props?.paymentStatus !== undefined) {
      this.__data.properties['wxji'] = {
        type: 'select',
        select: { name: props.paymentStatus },
      }
    }

    if (props?.rsvpId !== undefined) {
      this.__data.properties['title'] = {
        type: 'title',
        title: typeof props.rsvpId === 'string' 
          ? [{ type: 'text', text: { content: props.rsvpId } }]
          : Array.isArray(props.rsvpId)
            ? props.rsvpId
            : props.rsvpId === null
              ? []
              : [
                  {
                    type: 'text',
                    text: {
                      content: props.rsvpId.text,
                      link: props.rsvpId?.url ? { url: props.rsvpId.url } : undefined
                    },
                    annotations: props.rsvpId.annotations
                  },
                ]
      }
    }
  }
}
