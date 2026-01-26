import { RecipesResponse } from "./types"
import { UpdatePageBodyParameters,
RichTextItemRequest
} from '../../core/types/notion-api.types'

type TypeFromRecord<Obj, Type> = Obj extends Record<string, infer T> ? Extract<T, Type> : never

export type RecipesPropertiesPatch = {
  recipeLines?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'relation' }>['relation']
  thaiName?: string | { text: string; url?: string; annotations?: RichTextItemRequest['annotations'] } | RichTextItemRequest[]
  instructions?: string | { text: string; url?: string; annotations?: RichTextItemRequest['annotations'] } | RichTextItemRequest[]
  menuItem?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'relation' }>['relation']
  image?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'files' }>['files']
  name?: string | { text: string; url?: string; annotations?: RichTextItemRequest['annotations'] } | RichTextItemRequest[]
}

  
export class RecipesPatchDTO {
  __data: UpdatePageBodyParameters

  constructor(opts: {
    properties?: RecipesPropertiesPatch
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
    
    if (props?.recipeLines !== undefined) {
      this.__data.properties['%3EAo%5D'] = {
        type: 'relation',
        relation: props.recipeLines,
      }
    }

    if (props?.thaiName !== undefined) {
      this.__data.properties['K%3E%3AU'] = {
        type: 'rich_text',
        rich_text: typeof props.thaiName === 'string' 
          ? [{ type: 'text', text: { content: props.thaiName } }]
          : Array.isArray(props.thaiName)
            ? props.thaiName
            : props.thaiName === null
              ? []
              : [
                  {
                    type: 'text',
                    text: {
                      content: props.thaiName.text,
                      link: props.thaiName?.url ? { url: props.thaiName.url } : undefined
                    },
                    annotations: props.thaiName.annotations
                  },
                ]
      }
    }

    if (props?.instructions !== undefined) {
      this.__data.properties['Uqli'] = {
        type: 'rich_text',
        rich_text: typeof props.instructions === 'string' 
          ? [{ type: 'text', text: { content: props.instructions } }]
          : Array.isArray(props.instructions)
            ? props.instructions
            : props.instructions === null
              ? []
              : [
                  {
                    type: 'text',
                    text: {
                      content: props.instructions.text,
                      link: props.instructions?.url ? { url: props.instructions.url } : undefined
                    },
                    annotations: props.instructions.annotations
                  },
                ]
      }
    }

    if (props?.menuItem !== undefined) {
      this.__data.properties['_nNq'] = {
        type: 'relation',
        relation: props.menuItem,
      }
    }

    if (props?.image !== undefined) {
      this.__data.properties['ruvh'] = {
        type: 'files',
        files: props.image,
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
