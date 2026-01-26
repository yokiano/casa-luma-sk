import { RecipeLinesResponse } from "./types"
import { UpdatePageBodyParameters,
RichTextItemRequest
} from '../../core/types/notion-api.types'

type TypeFromRecord<Obj, Type> = Obj extends Record<string, infer T> ? Extract<T, Type> : never

export type RecipeLinesPropertiesPatch = {
  amount?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'number' }>['number']
  lineCost?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'formula' }>['formula']
  unit?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'formula' }>['formula']
  ingredient?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'relation' }>['relation']
  name?: string | { text: string; url?: string; annotations?: RichTextItemRequest['annotations'] } | RichTextItemRequest[]
}

  
export class RecipeLinesPatchDTO {
  __data: UpdatePageBodyParameters

  constructor(opts: {
    properties?: RecipeLinesPropertiesPatch
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
    
    if (props?.amount !== undefined) {
      this.__data.properties['c%5BnZ'] = {
        type: 'number',
        number: props.amount,
      }
    }

    if (props?.lineCost !== undefined) {
      this.__data.properties['e%3Dw%5C'] = {
        type: 'formula',
        formula: props.lineCost,
      }
    }

    if (props?.unit !== undefined) {
      this.__data.properties['kVXs'] = {
        type: 'formula',
        formula: props.unit,
      }
    }

    if (props?.ingredient !== undefined) {
      this.__data.properties['nRYL'] = {
        type: 'relation',
        relation: props.ingredient,
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
