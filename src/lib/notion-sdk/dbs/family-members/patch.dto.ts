import { FamilyMembersResponse } from "./types"
import { UpdatePageBodyParameters,
RichTextItemRequest
} from '../../core/types/notion-api.types'

type TypeFromRecord<Obj, Type> = Obj extends Record<string, infer T> ? Extract<T, Type> : never

export type FamilyMembersPropertiesPatch = {
  memberType?: FamilyMembersResponse['properties']['Member Type']['select']['name']
  contactMethod?: FamilyMembersResponse['properties']['Contact Method']['select']['name']
  caregiverRole?: FamilyMembersResponse['properties']['Caregiver Role']['select']['name']
  notes?: string | { text: string; url?: string; annotations?: RichTextItemRequest['annotations'] } | RichTextItemRequest[]
  email?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'email' }>['email']
  dob?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'date' }>['date']
  gender?: FamilyMembersResponse['properties']['Gender']['select']['name']
  family?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'relation' }>['relation']
  phone?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'phone_number' }>['phone_number']
  name?: string | { text: string; url?: string; annotations?: RichTextItemRequest['annotations'] } | RichTextItemRequest[]
}

  
export class FamilyMembersPatchDTO {
  __data: UpdatePageBodyParameters

  constructor(opts: {
    properties?: FamilyMembersPropertiesPatch
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
    
    if (props?.memberType !== undefined) {
      this.__data.properties['%3BsKT'] = {
        type: 'select',
        select: { name: props.memberType },
      }
    }

    if (props?.contactMethod !== undefined) {
      this.__data.properties['Lptv'] = {
        type: 'select',
        select: { name: props.contactMethod },
      }
    }

    if (props?.caregiverRole !== undefined) {
      this.__data.properties['N%7CR%3C'] = {
        type: 'select',
        select: { name: props.caregiverRole },
      }
    }

    if (props?.notes !== undefined) {
      this.__data.properties['T%3AgX'] = {
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

    if (props?.email !== undefined) {
      this.__data.properties['TSd~'] = {
        type: 'email',
        email: props.email,
      }
    }

    if (props?.dob !== undefined) {
      this.__data.properties['YFwB'] = {
        type: 'date',
        date: props.dob,
      }
    }

    if (props?.gender !== undefined) {
      this.__data.properties['g%60j%7D'] = {
        type: 'select',
        select: { name: props.gender },
      }
    }

    if (props?.family !== undefined) {
      this.__data.properties['qI%7Cv'] = {
        type: 'relation',
        relation: props.family,
      }
    }

    if (props?.phone !== undefined) {
      this.__data.properties['%7Djl%5C'] = {
        type: 'phone_number',
        phone_number: props.phone,
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
