import { ExpenseScanRulesResponse } from "./types"
import { UpdatePageBodyParameters,
RichTextItemRequest
} from '../../core/types/notion-api.types'

type TypeFromRecord<Obj, Type> = Obj extends Record<string, infer T> ? Extract<T, Type> : never

export type ExpenseScanRulesPropertiesPatch = {
  categoryName?: string | { text: string; url?: string; annotations?: RichTextItemRequest['annotations'] } | RichTextItemRequest[]
  autoSupplier?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'relation' }>['relation']
  departmentName?: string | { text: string; url?: string; annotations?: RichTextItemRequest['annotations'] } | RichTextItemRequest[]
  recipientMatch?: string | { text: string; url?: string; annotations?: RichTextItemRequest['annotations'] } | RichTextItemRequest[]
}

  
export class ExpenseScanRulesPatchDTO {
  __data: UpdatePageBodyParameters

  constructor(opts: {
    properties?: ExpenseScanRulesPropertiesPatch
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
    
    if (props?.categoryName !== undefined) {
      this.__data.properties['%3C%3AwL'] = {
        type: 'rich_text',
        rich_text: typeof props.categoryName === 'string' 
          ? [{ type: 'text', text: { content: props.categoryName } }]
          : Array.isArray(props.categoryName)
            ? props.categoryName
            : props.categoryName === null
              ? []
              : [
                  {
                    type: 'text',
                    text: {
                      content: props.categoryName.text,
                      link: props.categoryName?.url ? { url: props.categoryName.url } : undefined
                    },
                    annotations: props.categoryName.annotations
                  },
                ]
      }
    }

    if (props?.autoSupplier !== undefined) {
      this.__data.properties['edis'] = {
        type: 'relation',
        relation: props.autoSupplier,
      }
    }

    if (props?.departmentName !== undefined) {
      this.__data.properties['~NEX'] = {
        type: 'rich_text',
        rich_text: typeof props.departmentName === 'string' 
          ? [{ type: 'text', text: { content: props.departmentName } }]
          : Array.isArray(props.departmentName)
            ? props.departmentName
            : props.departmentName === null
              ? []
              : [
                  {
                    type: 'text',
                    text: {
                      content: props.departmentName.text,
                      link: props.departmentName?.url ? { url: props.departmentName.url } : undefined
                    },
                    annotations: props.departmentName.annotations
                  },
                ]
      }
    }

    if (props?.recipientMatch !== undefined) {
      this.__data.properties['title'] = {
        type: 'title',
        title: typeof props.recipientMatch === 'string' 
          ? [{ type: 'text', text: { content: props.recipientMatch } }]
          : Array.isArray(props.recipientMatch)
            ? props.recipientMatch
            : props.recipientMatch === null
              ? []
              : [
                  {
                    type: 'text',
                    text: {
                      content: props.recipientMatch.text,
                      link: props.recipientMatch?.url ? { url: props.recipientMatch.url } : undefined
                    },
                    annotations: props.recipientMatch.annotations
                  },
                ]
      }
    }
  }
}
