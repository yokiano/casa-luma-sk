import { CasaLumaEventsResponse } from "./types"
import { UpdatePageBodyParameters,
RichTextItemRequest
} from '../../core/types/notion-api.types'

type TypeFromRecord<Obj, Type> = Obj extends Record<string, infer T> ? Extract<T, Type> : never

export type CasaLumaEventsPropertiesPatch = {
  status?: CasaLumaEventsResponse['properties']['Status']['select']['name']
  price?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'number' }>['number']
  waitlistEntries?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'relation' }>['relation']
  shortDescription?: string | { text: string; url?: string; annotations?: RichTextItemRequest['annotations'] } | RichTextItemRequest[]
  language?: CasaLumaEventsResponse['properties']['Language']['select']['name']
  availableSpots?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'formula' }>['formula']
  gallery?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'files' }>['files']
  description?: string | { text: string; url?: string; annotations?: RichTextItemRequest['annotations'] } | RichTextItemRequest[]
  featuredImage?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'files' }>['files']
  slug?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'formula' }>['formula']
  requirements?: string | { text: string; url?: string; annotations?: RichTextItemRequest['annotations'] } | RichTextItemRequest[]
  registrationStatus?: CasaLumaEventsResponse['properties']['Registration Status']['select']['name']
  recurrenceType?: CasaLumaEventsResponse['properties']['Recurrence Type']['select']['name']
  capacity?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'number' }>['number']
  date?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'date' }>['date']
  endDate?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'date' }>['date']
  rsvPs?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'relation' }>['relation']
  location?: CasaLumaEventsResponse['properties']['Location']['select']['name']
  instructor?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'people' }>['people']
  eventType?: CasaLumaEventsResponse['properties']['Event Type']['select']['name']
  tags?: CasaLumaEventsResponse['properties']['Tags']['multi_select'][number]['name'][]
  eventName?: string | { text: string; url?: string; annotations?: RichTextItemRequest['annotations'] } | RichTextItemRequest[]
}

  
export class CasaLumaEventsPatchDTO {
  __data: UpdatePageBodyParameters

  constructor(opts: {
    properties?: CasaLumaEventsPropertiesPatch
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
    
    if (props?.status !== undefined) {
      this.__data.properties['%3AJCP'] = {
        type: 'select',
        select: { name: props.status },
      }
    }

    if (props?.price !== undefined) {
      this.__data.properties['%3B%3ERu'] = {
        type: 'number',
        number: props.price,
      }
    }

    if (props?.waitlistEntries !== undefined) {
      this.__data.properties['%3CRm%3B'] = {
        type: 'relation',
        relation: props.waitlistEntries,
      }
    }

    if (props?.shortDescription !== undefined) {
      this.__data.properties['%3E%5CgQ'] = {
        type: 'rich_text',
        rich_text: typeof props.shortDescription === 'string' 
          ? [{ type: 'text', text: { content: props.shortDescription } }]
          : Array.isArray(props.shortDescription)
            ? props.shortDescription
            : props.shortDescription === null
              ? []
              : [
                  {
                    type: 'text',
                    text: {
                      content: props.shortDescription.text,
                      link: props.shortDescription?.url ? { url: props.shortDescription.url } : undefined
                    },
                    annotations: props.shortDescription.annotations
                  },
                ]
      }
    }

    if (props?.language !== undefined) {
      this.__data.properties['A%5CK%3C'] = {
        type: 'select',
        select: { name: props.language },
      }
    }

    if (props?.availableSpots !== undefined) {
      this.__data.properties['KZUb'] = {
        type: 'formula',
        formula: props.availableSpots,
      }
    }

    if (props?.gallery !== undefined) {
      this.__data.properties['PU_Q'] = {
        type: 'files',
        files: props.gallery,
      }
    }

    if (props?.description !== undefined) {
      this.__data.properties['RgFs'] = {
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

    if (props?.featuredImage !== undefined) {
      this.__data.properties['SH%60R'] = {
        type: 'files',
        files: props.featuredImage,
      }
    }

    if (props?.slug !== undefined) {
      this.__data.properties['TNDu'] = {
        type: 'formula',
        formula: props.slug,
      }
    }

    if (props?.requirements !== undefined) {
      this.__data.properties['%5EYVv'] = {
        type: 'rich_text',
        rich_text: typeof props.requirements === 'string' 
          ? [{ type: 'text', text: { content: props.requirements } }]
          : Array.isArray(props.requirements)
            ? props.requirements
            : props.requirements === null
              ? []
              : [
                  {
                    type: 'text',
                    text: {
                      content: props.requirements.text,
                      link: props.requirements?.url ? { url: props.requirements.url } : undefined
                    },
                    annotations: props.requirements.annotations
                  },
                ]
      }
    }

    if (props?.registrationStatus !== undefined) {
      this.__data.properties['cHDA'] = {
        type: 'select',
        select: { name: props.registrationStatus },
      }
    }

    if (props?.recurrenceType !== undefined) {
      this.__data.properties['eae%7C'] = {
        type: 'select',
        select: { name: props.recurrenceType },
      }
    }

    if (props?.capacity !== undefined) {
      this.__data.properties['gmnU'] = {
        type: 'number',
        number: props.capacity,
      }
    }

    if (props?.date !== undefined) {
      this.__data.properties['kLjM'] = {
        type: 'date',
        date: props.date,
      }
    }

    if (props?.endDate !== undefined) {
      this.__data.properties['qC%3B%60'] = {
        type: 'date',
        date: props.endDate,
      }
    }

    if (props?.rsvPs !== undefined) {
      this.__data.properties['wMP%40'] = {
        type: 'relation',
        relation: props.rsvPs,
      }
    }

    if (props?.location !== undefined) {
      this.__data.properties['x%5Dcl'] = {
        type: 'select',
        select: { name: props.location },
      }
    }

    if (props?.instructor !== undefined) {
      this.__data.properties['yevg'] = {
        type: 'people',
        people: props.instructor,
      }
    }

    if (props?.eventType !== undefined) {
      this.__data.properties['z%3AD_'] = {
        type: 'select',
        select: { name: props.eventType },
      }
    }

    if (props?.tags !== undefined) {
      this.__data.properties['%7D%7Ch%3F'] = {
        type: 'multi_select',
        multi_select: props.tags?.map((item) => ({ name: item })),
      }
    }

    if (props?.eventName !== undefined) {
      this.__data.properties['title'] = {
        type: 'title',
        title: typeof props.eventName === 'string' 
          ? [{ type: 'text', text: { content: props.eventName } }]
          : Array.isArray(props.eventName)
            ? props.eventName
            : props.eventName === null
              ? []
              : [
                  {
                    type: 'text',
                    text: {
                      content: props.eventName.text,
                      link: props.eventName?.url ? { url: props.eventName.url } : undefined
                    },
                    annotations: props.eventName.annotations
                  },
                ]
      }
    }
  }
}
