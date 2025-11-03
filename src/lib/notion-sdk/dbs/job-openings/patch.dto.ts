import { JobOpeningsResponse } from "./types"
import { UpdatePageBodyParameters,
RichTextItemRequest
} from '../../core/types/notion-api.types'

type TypeFromRecord<Obj, Type> = Obj extends Record<string, infer T> ? Extract<T, Type> : never

export type JobOpeningsPropertiesPatch = {
  location?: JobOpeningsResponse['properties']['Location']['select']['name']
  requirements?: string | { text: string; url?: string; annotations?: RichTextItemRequest['annotations'] } | RichTextItemRequest[]
  department?: JobOpeningsResponse['properties']['Department']['select']['name']
  employmentType?: JobOpeningsResponse['properties']['Employment Type']['select']['name']
  experienceLevel?: JobOpeningsResponse['properties']['Experience Level']['select']['name']
  jobBoards?: JobOpeningsResponse['properties']['Job Boards']['multi_select'][number]['name'][]
  requiredSkills?: JobOpeningsResponse['properties']['Required Skills']['multi_select'][number]['name'][]
  openPositions?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'number' }>['number']
  expectedSalary?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'number' }>['number']
  responsibilities?: string | { text: string; url?: string; annotations?: RichTextItemRequest['annotations'] } | RichTextItemRequest[]
  openingDate?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'date' }>['date']
  status?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'status' }>['status']
  jobTitle?: string | { text: string; url?: string; annotations?: RichTextItemRequest['annotations'] } | RichTextItemRequest[]
  jobPost?: string | { text: string; url?: string; annotations?: RichTextItemRequest['annotations'] } | RichTextItemRequest[]
  pointOfContact?: string | { text: string; url?: string; annotations?: RichTextItemRequest['annotations'] } | RichTextItemRequest[]
}

  
export class JobOpeningsPatchDTO {
  __data: UpdatePageBodyParameters

  constructor(opts: {
    properties?: JobOpeningsPropertiesPatch
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
    
    if (props?.location !== undefined) {
      this.__data.properties['%40DSX'] = {
        type: 'select',
        select: { name: props.location },
      }
    }

    if (props?.requirements !== undefined) {
      this.__data.properties['DUmM'] = {
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

    if (props?.department !== undefined) {
      this.__data.properties['EnG%3F'] = {
        type: 'select',
        select: { name: props.department },
      }
    }

    if (props?.employmentType !== undefined) {
      this.__data.properties['JfQ%3B'] = {
        type: 'select',
        select: { name: props.employmentType },
      }
    }

    if (props?.experienceLevel !== undefined) {
      this.__data.properties['SF%3FZ'] = {
        type: 'select',
        select: { name: props.experienceLevel },
      }
    }

    if (props?.jobBoards !== undefined) {
      this.__data.properties['Sbsi'] = {
        type: 'multi_select',
        multi_select: props.jobBoards?.map((item) => ({ name: item })),
      }
    }

    if (props?.requiredSkills !== undefined) {
      this.__data.properties['Vds%3A'] = {
        type: 'multi_select',
        multi_select: props.requiredSkills?.map((item) => ({ name: item })),
      }
    }

    if (props?.openPositions !== undefined) {
      this.__data.properties['Y%3Cej'] = {
        type: 'number',
        number: props.openPositions,
      }
    }

    if (props?.expectedSalary !== undefined) {
      this.__data.properties['%5Cjb%7D'] = {
        type: 'number',
        number: props.expectedSalary,
      }
    }

    if (props?.responsibilities !== undefined) {
      this.__data.properties['anDd'] = {
        type: 'rich_text',
        rich_text: typeof props.responsibilities === 'string' 
          ? [{ type: 'text', text: { content: props.responsibilities } }]
          : Array.isArray(props.responsibilities)
            ? props.responsibilities
            : props.responsibilities === null
              ? []
              : [
                  {
                    type: 'text',
                    text: {
                      content: props.responsibilities.text,
                      link: props.responsibilities?.url ? { url: props.responsibilities.url } : undefined
                    },
                    annotations: props.responsibilities.annotations
                  },
                ]
      }
    }

    if (props?.openingDate !== undefined) {
      this.__data.properties['muO_'] = {
        type: 'date',
        date: props.openingDate,
      }
    }

    if (props?.status !== undefined) {
      this.__data.properties['pUJ_'] = {
        type: 'status',
        status: props.status,
      }
    }

    if (props?.jobTitle !== undefined) {
      this.__data.properties['title'] = {
        type: 'title',
        title: typeof props.jobTitle === 'string' 
          ? [{ type: 'text', text: { content: props.jobTitle } }]
          : Array.isArray(props.jobTitle)
            ? props.jobTitle
            : props.jobTitle === null
              ? []
              : [
                  {
                    type: 'text',
                    text: {
                      content: props.jobTitle.text,
                      link: props.jobTitle?.url ? { url: props.jobTitle.url } : undefined
                    },
                    annotations: props.jobTitle.annotations
                  },
                ]
      }
    }

    if (props?.jobPost !== undefined) {
      this.__data.properties['Snli'] = {
        type: 'rich_text',
        rich_text: typeof props.jobPost === 'string' 
          ? [{ type: 'text', text: { content: props.jobPost } }]
          : Array.isArray(props.jobPost)
            ? props.jobPost
            : props.jobPost === null
              ? []
              : [
                  {
                    type: 'text',
                    text: {
                      content: props.jobPost.text,
                      link: props.jobPost?.url ? { url: props.jobPost.url } : undefined
                    },
                    annotations: props.jobPost.annotations
                  },
                ]
      }
    }

    if (props?.pointOfContact !== undefined) {
      this.__data.properties['Bng%3E'] = {
        type: 'rich_text',
        rich_text: typeof props.pointOfContact === 'string' 
          ? [{ type: 'text', text: { content: props.pointOfContact } }]
          : Array.isArray(props.pointOfContact)
            ? props.pointOfContact
            : props.pointOfContact === null
              ? []
              : [
                  {
                    type: 'text',
                    text: {
                      content: props.pointOfContact.text,
                      link: props.pointOfContact?.url ? { url: props.pointOfContact.url } : undefined
                    },
                    annotations: props.pointOfContact.annotations
                  },
                ]
      }
    }
  }
}
