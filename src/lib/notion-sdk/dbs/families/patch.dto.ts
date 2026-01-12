import { FamiliesResponse } from "./types"
import { UpdatePageBodyParameters,
RichTextItemRequest
} from '../../core/types/notion-api.types'

type TypeFromRecord<Obj, Type> = Obj extends Record<string, infer T> ? Extract<T, Type> : never

export type FamiliesPropertiesPatch = {
  mainEmail?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'email' }>['email']
  livesInKohPhangan?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'checkbox' }>['checkbox']
  loyverseCustomerId?: string | { text: string; url?: string; annotations?: RichTextItemRequest['annotations'] } | RichTextItemRequest[]
  status?: FamiliesResponse['properties']['Status']['select']['name']
  nationality?: string | { text: string; url?: string; annotations?: RichTextItemRequest['annotations'] } | RichTextItemRequest[]
  members?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'relation' }>['relation']
  mainPhone?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'phone_number' }>['phone_number']
  specialNotes?: string | { text: string; url?: string; annotations?: RichTextItemRequest['annotations'] } | RichTextItemRequest[]
  dietaryPreferenceFamily?: FamiliesResponse['properties']['Dietary Preference (Family)']['select']['name']
  howDidYouHearAboutUs?: FamiliesResponse['properties']['How did you hear about us?']['select']['name']
  familyName?: string | { text: string; url?: string; annotations?: RichTextItemRequest['annotations'] } | RichTextItemRequest[]
  customerNumber?: string | { text: string; url?: string; annotations?: RichTextItemRequest['annotations'] } | RichTextItemRequest[]
}

  
export class FamiliesPatchDTO {
  __data: UpdatePageBodyParameters

  constructor(opts: {
    properties?: FamiliesPropertiesPatch
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
    
    if (props?.mainEmail !== undefined) {
      this.__data.properties['AA%5B%5B'] = {
        type: 'email',
        email: props.mainEmail,
      }
    }

    if (props?.livesInKohPhangan !== undefined) {
      this.__data.properties['Ai%5Cc'] = {
        type: 'checkbox',
        checkbox: props.livesInKohPhangan,
      }
    }

    if (props?.loyverseCustomerId !== undefined) {
      this.__data.properties['LgsR'] = {
        type: 'rich_text',
        rich_text: typeof props.loyverseCustomerId === 'string' 
          ? [{ type: 'text', text: { content: props.loyverseCustomerId } }]
          : Array.isArray(props.loyverseCustomerId)
            ? props.loyverseCustomerId
            : props.loyverseCustomerId === null
              ? []
              : [
                  {
                    type: 'text',
                    text: {
                      content: props.loyverseCustomerId.text,
                      link: props.loyverseCustomerId?.url ? { url: props.loyverseCustomerId.url } : undefined
                    },
                    annotations: props.loyverseCustomerId.annotations
                  },
                ]
      }
    }

    if (props?.status !== undefined) {
      this.__data.properties['LiO%5D'] = {
        type: 'select',
        select: { name: props.status },
      }
    }

    if (props?.nationality !== undefined) {
      this.__data.properties['R%5BPE'] = {
        type: 'rich_text',
        rich_text: typeof props.nationality === 'string' 
          ? [{ type: 'text', text: { content: props.nationality } }]
          : Array.isArray(props.nationality)
            ? props.nationality
            : props.nationality === null
              ? []
              : [
                  {
                    type: 'text',
                    text: {
                      content: props.nationality.text,
                      link: props.nationality?.url ? { url: props.nationality.url } : undefined
                    },
                    annotations: props.nationality.annotations
                  },
                ]
      }
    }

    if (props?.members !== undefined) {
      this.__data.properties['SC%3FD'] = {
        type: 'relation',
        relation: props.members,
      }
    }

    if (props?.mainPhone !== undefined) {
      this.__data.properties['e%3Faj'] = {
        type: 'phone_number',
        phone_number: props.mainPhone,
      }
    }

    if (props?.specialNotes !== undefined) {
      this.__data.properties['e~QZ'] = {
        type: 'rich_text',
        rich_text: typeof props.specialNotes === 'string' 
          ? [{ type: 'text', text: { content: props.specialNotes } }]
          : Array.isArray(props.specialNotes)
            ? props.specialNotes
            : props.specialNotes === null
              ? []
              : [
                  {
                    type: 'text',
                    text: {
                      content: props.specialNotes.text,
                      link: props.specialNotes?.url ? { url: props.specialNotes.url } : undefined
                    },
                    annotations: props.specialNotes.annotations
                  },
                ]
      }
    }

    if (props?.dietaryPreferenceFamily !== undefined) {
      this.__data.properties['klPk'] = {
        type: 'select',
        select: { name: props.dietaryPreferenceFamily },
      }
    }

    if (props?.howDidYouHearAboutUs !== undefined) {
      this.__data.properties['mKsK'] = {
        type: 'select',
        select: { name: props.howDidYouHearAboutUs },
      }
    }

    if (props?.familyName !== undefined) {
      this.__data.properties['title'] = {
        type: 'title',
        title: typeof props.familyName === 'string' 
          ? [{ type: 'text', text: { content: props.familyName } }]
          : Array.isArray(props.familyName)
            ? props.familyName
            : props.familyName === null
              ? []
              : [
                  {
                    type: 'text',
                    text: {
                      content: props.familyName.text,
                      link: props.familyName?.url ? { url: props.familyName.url } : undefined
                    },
                    annotations: props.familyName.annotations
                  },
                ]
      }
    }

    if (props?.customerNumber !== undefined) {
      this.__data.properties['hO%3Eb'] = {
        type: 'rich_text',
        rich_text: typeof props.customerNumber === 'string' 
          ? [{ type: 'text', text: { content: props.customerNumber } }]
          : Array.isArray(props.customerNumber)
            ? props.customerNumber
            : props.customerNumber === null
              ? []
              : [
                  {
                    type: 'text',
                    text: {
                      content: props.customerNumber.text,
                      link: props.customerNumber?.url ? { url: props.customerNumber.url } : undefined
                    },
                    annotations: props.customerNumber.annotations
                  },
                ]
      }
    }
  }
}
