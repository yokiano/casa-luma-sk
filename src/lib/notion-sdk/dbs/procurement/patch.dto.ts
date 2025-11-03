import { ProcurementResponse } from "./types"
import { UpdatePageBodyParameters,
RichTextItemRequest
} from '../../core/types/notion-api.types'

type TypeFromRecord<Obj, Type> = Obj extends Record<string, infer T> ? Extract<T, Type> : never

export type ProcurementPropertiesPatch = {
  supplier?: string | { text: string; url?: string; annotations?: RichTextItemRequest['annotations'] } | RichTextItemRequest[]
  parentItem?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'relation' }>['relation']
  link?: string | { text: string; url?: string; annotations?: RichTextItemRequest['annotations'] } | RichTextItemRequest[]
  trackingNumber?: string | { text: string; url?: string; annotations?: RichTextItemRequest['annotations'] } | RichTextItemRequest[]
  department?: ProcurementResponse['properties']['Department']['multi_select'][number]['name'][]
  notes?: string | { text: string; url?: string; annotations?: RichTextItemRequest['annotations'] } | RichTextItemRequest[]
  invoice?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'files' }>['files']
  tags?: ProcurementResponse['properties']['Tags']['multi_select'][number]['name'][]
  totalPrice?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'formula' }>['formula']
  priceThb?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'number' }>['number']
  subItem?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'relation' }>['relation']
  paidFrom?: ProcurementResponse['properties']['Paid From']['select']['name']
  image?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'files' }>['files']
  price_1010?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'number' }>['number']
  quantity?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'number' }>['number']
  objectCategory?: ProcurementResponse['properties']['Object Category']['multi_select'][number]['name'][]
  status?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'status' }>['status']
  item?: string | { text: string; url?: string; annotations?: RichTextItemRequest['annotations'] } | RichTextItemRequest[]
}

  
export class ProcurementPatchDTO {
  __data: UpdatePageBodyParameters

  constructor(opts: {
    properties?: ProcurementPropertiesPatch
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
    
    if (props?.supplier !== undefined) {
      this.__data.properties['%3AasX'] = {
        type: 'rich_text',
        rich_text: typeof props.supplier === 'string' 
          ? [{ type: 'text', text: { content: props.supplier } }]
          : Array.isArray(props.supplier)
            ? props.supplier
            : props.supplier === null
              ? []
              : [
                  {
                    type: 'text',
                    text: {
                      content: props.supplier.text,
                      link: props.supplier?.url ? { url: props.supplier.url } : undefined
                    },
                    annotations: props.supplier.annotations
                  },
                ]
      }
    }

    if (props?.parentItem !== undefined) {
      this.__data.properties['ByA%3F'] = {
        type: 'relation',
        relation: props.parentItem,
      }
    }

    if (props?.link !== undefined) {
      this.__data.properties['D%7DIr'] = {
        type: 'rich_text',
        rich_text: typeof props.link === 'string' 
          ? [{ type: 'text', text: { content: props.link } }]
          : Array.isArray(props.link)
            ? props.link
            : props.link === null
              ? []
              : [
                  {
                    type: 'text',
                    text: {
                      content: props.link.text,
                      link: props.link?.url ? { url: props.link.url } : undefined
                    },
                    annotations: props.link.annotations
                  },
                ]
      }
    }

    if (props?.trackingNumber !== undefined) {
      this.__data.properties['G%7DHG'] = {
        type: 'rich_text',
        rich_text: typeof props.trackingNumber === 'string' 
          ? [{ type: 'text', text: { content: props.trackingNumber } }]
          : Array.isArray(props.trackingNumber)
            ? props.trackingNumber
            : props.trackingNumber === null
              ? []
              : [
                  {
                    type: 'text',
                    text: {
                      content: props.trackingNumber.text,
                      link: props.trackingNumber?.url ? { url: props.trackingNumber.url } : undefined
                    },
                    annotations: props.trackingNumber.annotations
                  },
                ]
      }
    }

    if (props?.department !== undefined) {
      this.__data.properties['U%60kx'] = {
        type: 'multi_select',
        multi_select: props.department?.map((item) => ({ name: item })),
      }
    }

    if (props?.notes !== undefined) {
      this.__data.properties['WP%3Ev'] = {
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

    if (props?.invoice !== undefined) {
      this.__data.properties['%5C%5DWc'] = {
        type: 'files',
        files: props.invoice,
      }
    }

    if (props?.tags !== undefined) {
      this.__data.properties['aSo%3B'] = {
        type: 'multi_select',
        multi_select: props.tags?.map((item) => ({ name: item })),
      }
    }

    if (props?.totalPrice !== undefined) {
      this.__data.properties['dGR%7C'] = {
        type: 'formula',
        formula: props.totalPrice,
      }
    }

    if (props?.priceThb !== undefined) {
      this.__data.properties['eug%5C'] = {
        type: 'number',
        number: props.priceThb,
      }
    }

    if (props?.subItem !== undefined) {
      this.__data.properties['iSMi'] = {
        type: 'relation',
        relation: props.subItem,
      }
    }

    if (props?.paidFrom !== undefined) {
      this.__data.properties['jPNR'] = {
        type: 'select',
        select: { name: props.paidFrom },
      }
    }

    if (props?.image !== undefined) {
      this.__data.properties['k%3Bz%3C'] = {
        type: 'files',
        files: props.image,
      }
    }

    if (props?.price_1010 !== undefined) {
      this.__data.properties['sb%3Dq'] = {
        type: 'number',
        number: props.price_1010,
      }
    }

    if (props?.quantity !== undefined) {
      this.__data.properties['uz%3En'] = {
        type: 'number',
        number: props.quantity,
      }
    }

    if (props?.objectCategory !== undefined) {
      this.__data.properties['wI%60N'] = {
        type: 'multi_select',
        multi_select: props.objectCategory?.map((item) => ({ name: item })),
      }
    }

    if (props?.status !== undefined) {
      this.__data.properties['~NX%5B'] = {
        type: 'status',
        status: props.status,
      }
    }

    if (props?.item !== undefined) {
      this.__data.properties['title'] = {
        type: 'title',
        title: typeof props.item === 'string' 
          ? [{ type: 'text', text: { content: props.item } }]
          : Array.isArray(props.item)
            ? props.item
            : props.item === null
              ? []
              : [
                  {
                    type: 'text',
                    text: {
                      content: props.item.text,
                      link: props.item?.url ? { url: props.item.url } : undefined
                    },
                    annotations: props.item.annotations
                  },
                ]
      }
    }
  }
}
