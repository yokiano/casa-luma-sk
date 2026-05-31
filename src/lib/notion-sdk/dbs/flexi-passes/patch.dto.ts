import { FlexiPassesResponse } from "./types"
import { UpdatePageBodyParameters,
RichTextItemRequest
} from '../../core/types/notion-api.types'

type TypeFromRecord<Obj, Type> = Obj extends Record<string, infer T> ? Extract<T, Type> : never

export type FlexiPassesPropertiesPatch = {
  sourceReceiptKey?: string | { text: string; url?: string; annotations?: RichTextItemRequest['annotations'] } | RichTextItemRequest[]
  entriesGranted?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'number' }>['number']
  sourceItemIds?: string | { text: string; url?: string; annotations?: RichTextItemRequest['annotations'] } | RichTextItemRequest[]
  loyverseCustomerId?: string | { text: string; url?: string; annotations?: RichTextItemRequest['annotations'] } | RichTextItemRequest[]
  sourceLineIndexes?: string | { text: string; url?: string; annotations?: RichTextItemRequest['annotations'] } | RichTextItemRequest[]
  notes?: string | { text: string; url?: string; annotations?: RichTextItemRequest['annotations'] } | RichTextItemRequest[]
  family?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'relation' }>['relation']
  entriesLeft?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'number' }>['number']
  validFrom?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'date' }>['date']
  sourceReceiptUrl?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'url' }>['url']
  sourceReceiptNumber?: string | { text: string; url?: string; annotations?: RichTextItemRequest['annotations'] } | RichTextItemRequest[]
  cardCount?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'number' }>['number']
  refundReceiptNumber?: string | { text: string; url?: string; annotations?: RichTextItemRequest['annotations'] } | RichTextItemRequest[]
  entriesUsed?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'number' }>['number']
  validUntil?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'date' }>['date']
  automationStatus?: FlexiPassesResponse['properties']['Automation Status']['select']['name']
  name?: string | { text: string; url?: string; annotations?: RichTextItemRequest['annotations'] } | RichTextItemRequest[]
}

  
export class FlexiPassesPatchDTO {
  __data: UpdatePageBodyParameters

  constructor(opts: {
    properties?: FlexiPassesPropertiesPatch
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
    
    if (props?.sourceReceiptKey !== undefined) {
      this.__data.properties['%3A%3CsL'] = {
        type: 'rich_text',
        rich_text: typeof props.sourceReceiptKey === 'string' 
          ? [{ type: 'text', text: { content: props.sourceReceiptKey } }]
          : Array.isArray(props.sourceReceiptKey)
            ? props.sourceReceiptKey
            : props.sourceReceiptKey === null
              ? []
              : [
                  {
                    type: 'text',
                    text: {
                      content: props.sourceReceiptKey.text,
                      link: props.sourceReceiptKey?.url ? { url: props.sourceReceiptKey.url } : undefined
                    },
                    annotations: props.sourceReceiptKey.annotations
                  },
                ]
      }
    }

    if (props?.entriesGranted !== undefined) {
      this.__data.properties['%3BTRk'] = {
        type: 'number',
        number: props.entriesGranted,
      }
    }

    if (props?.sourceItemIds !== undefined) {
      this.__data.properties['Adwh'] = {
        type: 'rich_text',
        rich_text: typeof props.sourceItemIds === 'string' 
          ? [{ type: 'text', text: { content: props.sourceItemIds } }]
          : Array.isArray(props.sourceItemIds)
            ? props.sourceItemIds
            : props.sourceItemIds === null
              ? []
              : [
                  {
                    type: 'text',
                    text: {
                      content: props.sourceItemIds.text,
                      link: props.sourceItemIds?.url ? { url: props.sourceItemIds.url } : undefined
                    },
                    annotations: props.sourceItemIds.annotations
                  },
                ]
      }
    }

    if (props?.loyverseCustomerId !== undefined) {
      this.__data.properties['C_jo'] = {
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

    if (props?.sourceLineIndexes !== undefined) {
      this.__data.properties['EKnt'] = {
        type: 'rich_text',
        rich_text: typeof props.sourceLineIndexes === 'string' 
          ? [{ type: 'text', text: { content: props.sourceLineIndexes } }]
          : Array.isArray(props.sourceLineIndexes)
            ? props.sourceLineIndexes
            : props.sourceLineIndexes === null
              ? []
              : [
                  {
                    type: 'text',
                    text: {
                      content: props.sourceLineIndexes.text,
                      link: props.sourceLineIndexes?.url ? { url: props.sourceLineIndexes.url } : undefined
                    },
                    annotations: props.sourceLineIndexes.annotations
                  },
                ]
      }
    }

    if (props?.notes !== undefined) {
      this.__data.properties['PTUE'] = {
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

    if (props?.family !== undefined) {
      this.__data.properties['RPwP'] = {
        type: 'relation',
        relation: props.family,
      }
    }

    if (props?.entriesLeft !== undefined) {
      this.__data.properties['RXPv'] = {
        type: 'number',
        number: props.entriesLeft,
      }
    }

    if (props?.validFrom !== undefined) {
      this.__data.properties['S%7CrF'] = {
        type: 'date',
        date: props.validFrom,
      }
    }

    if (props?.sourceReceiptUrl !== undefined) {
      this.__data.properties['ZNOW'] = {
        type: 'url',
        url: props.sourceReceiptUrl,
      }
    }

    if (props?.sourceReceiptNumber !== undefined) {
      this.__data.properties['ZR%60%7B'] = {
        type: 'rich_text',
        rich_text: typeof props.sourceReceiptNumber === 'string' 
          ? [{ type: 'text', text: { content: props.sourceReceiptNumber } }]
          : Array.isArray(props.sourceReceiptNumber)
            ? props.sourceReceiptNumber
            : props.sourceReceiptNumber === null
              ? []
              : [
                  {
                    type: 'text',
                    text: {
                      content: props.sourceReceiptNumber.text,
                      link: props.sourceReceiptNumber?.url ? { url: props.sourceReceiptNumber.url } : undefined
                    },
                    annotations: props.sourceReceiptNumber.annotations
                  },
                ]
      }
    }

    if (props?.cardCount !== undefined) {
      this.__data.properties['aSvg'] = {
        type: 'number',
        number: props.cardCount,
      }
    }

    if (props?.refundReceiptNumber !== undefined) {
      this.__data.properties['peHm'] = {
        type: 'rich_text',
        rich_text: typeof props.refundReceiptNumber === 'string' 
          ? [{ type: 'text', text: { content: props.refundReceiptNumber } }]
          : Array.isArray(props.refundReceiptNumber)
            ? props.refundReceiptNumber
            : props.refundReceiptNumber === null
              ? []
              : [
                  {
                    type: 'text',
                    text: {
                      content: props.refundReceiptNumber.text,
                      link: props.refundReceiptNumber?.url ? { url: props.refundReceiptNumber.url } : undefined
                    },
                    annotations: props.refundReceiptNumber.annotations
                  },
                ]
      }
    }

    if (props?.entriesUsed !== undefined) {
      this.__data.properties['zT%3By'] = {
        type: 'number',
        number: props.entriesUsed,
      }
    }

    if (props?.validUntil !== undefined) {
      this.__data.properties['zXVG'] = {
        type: 'date',
        date: props.validUntil,
      }
    }

    if (props?.automationStatus !== undefined) {
      this.__data.properties['z%7Cw%5B'] = {
        type: 'select',
        select: { name: props.automationStatus },
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
