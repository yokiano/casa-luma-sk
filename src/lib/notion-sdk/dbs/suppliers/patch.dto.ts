import { SuppliersResponse } from "./types"
import { UpdatePageBodyParameters,
RichTextItemRequest
} from '../../core/types/notion-api.types'

type TypeFromRecord<Obj, Type> = Obj extends Record<string, infer T> ? Extract<T, Type> : never

export type SuppliersPropertiesPatch = {
  website?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'url' }>['url']
  location?: string | { text: string; url?: string; annotations?: RichTextItemRequest['annotations'] } | RichTextItemRequest[]
  phone?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'phone_number' }>['phone_number']
  bankDetails?: string | { text: string; url?: string; annotations?: RichTextItemRequest['annotations'] } | RichTextItemRequest[]
  category?: SuppliersResponse['properties']['Category']['multi_select'][number]['name'][]
  contactPerson?: string | { text: string; url?: string; annotations?: RichTextItemRequest['annotations'] } | RichTextItemRequest[]
  scanPicture?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'files' }>['files']
  email?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'email' }>['email']
  name?: string | { text: string; url?: string; annotations?: RichTextItemRequest['annotations'] } | RichTextItemRequest[]
}

  
export class SuppliersPatchDTO {
  __data: UpdatePageBodyParameters

  constructor(opts: {
    properties?: SuppliersPropertiesPatch
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
    
    if (props?.website !== undefined) {
      this.__data.properties['D%3CzK'] = {
        type: 'url',
        url: props.website,
      }
    }

    if (props?.location !== undefined) {
      this.__data.properties['L%5D%3An'] = {
        type: 'rich_text',
        rich_text: typeof props.location === 'string' 
          ? [{ type: 'text', text: { content: props.location } }]
          : Array.isArray(props.location)
            ? props.location
            : props.location === null
              ? []
              : [
                  {
                    type: 'text',
                    text: {
                      content: props.location.text,
                      link: props.location?.url ? { url: props.location.url } : undefined
                    },
                    annotations: props.location.annotations
                  },
                ]
      }
    }

    if (props?.phone !== undefined) {
      this.__data.properties['W%3Fxz'] = {
        type: 'phone_number',
        phone_number: props.phone,
      }
    }

    if (props?.bankDetails !== undefined) {
      this.__data.properties['%5EK%7DY'] = {
        type: 'rich_text',
        rich_text: typeof props.bankDetails === 'string' 
          ? [{ type: 'text', text: { content: props.bankDetails } }]
          : Array.isArray(props.bankDetails)
            ? props.bankDetails
            : props.bankDetails === null
              ? []
              : [
                  {
                    type: 'text',
                    text: {
                      content: props.bankDetails.text,
                      link: props.bankDetails?.url ? { url: props.bankDetails.url } : undefined
                    },
                    annotations: props.bankDetails.annotations
                  },
                ]
      }
    }

    if (props?.category !== undefined) {
      this.__data.properties['caqu'] = {
        type: 'multi_select',
        multi_select: props.category?.map((item) => ({ name: item })),
      }
    }

    if (props?.contactPerson !== undefined) {
      this.__data.properties['u%3FeQ'] = {
        type: 'rich_text',
        rich_text: typeof props.contactPerson === 'string' 
          ? [{ type: 'text', text: { content: props.contactPerson } }]
          : Array.isArray(props.contactPerson)
            ? props.contactPerson
            : props.contactPerson === null
              ? []
              : [
                  {
                    type: 'text',
                    text: {
                      content: props.contactPerson.text,
                      link: props.contactPerson?.url ? { url: props.contactPerson.url } : undefined
                    },
                    annotations: props.contactPerson.annotations
                  },
                ]
      }
    }

    if (props?.scanPicture !== undefined) {
      this.__data.properties['zTr_'] = {
        type: 'files',
        files: props.scanPicture,
      }
    }

    if (props?.email !== undefined) {
      this.__data.properties['zjGR'] = {
        type: 'email',
        email: props.email,
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
