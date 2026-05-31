import { BalanceSnapshotsResponse } from "./types"
import { UpdatePageBodyParameters,
RichTextItemRequest
} from '../../core/types/notion-api.types'

type TypeFromRecord<Obj, Type> = Obj extends Record<string, infer T> ? Extract<T, Type> : never

export type BalanceSnapshotsPropertiesPatch = {
  status?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'status' }>['status']
  notes?: string | { text: string; url?: string; annotations?: RichTextItemRequest['annotations'] } | RichTextItemRequest[]
  balanceThb?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'number' }>['number']
  observedAt?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'date' }>['date']
  account?: BalanceSnapshotsResponse['properties']['Account']['select']['name']
  proof?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'files' }>['files']
  snapshotRole?: BalanceSnapshotsResponse['properties']['Snapshot Role']['select']['name']
  source?: BalanceSnapshotsResponse['properties']['Source']['select']['name']
  name?: string | { text: string; url?: string; annotations?: RichTextItemRequest['annotations'] } | RichTextItemRequest[]
}

  
export class BalanceSnapshotsPatchDTO {
  __data: UpdatePageBodyParameters

  constructor(opts: {
    properties?: BalanceSnapshotsPropertiesPatch
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
      this.__data.properties['D%7Dok'] = {
        type: 'status',
        status: props.status,
      }
    }

    if (props?.notes !== undefined) {
      this.__data.properties['%5CR~f'] = {
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

    if (props?.balanceThb !== undefined) {
      this.__data.properties['hXKN'] = {
        type: 'number',
        number: props.balanceThb,
      }
    }

    if (props?.observedAt !== undefined) {
      this.__data.properties['iS%3D%7B'] = {
        type: 'date',
        date: props.observedAt,
      }
    }

    if (props?.account !== undefined) {
      this.__data.properties['leRN'] = {
        type: 'select',
        select: { name: props.account },
      }
    }

    if (props?.proof !== undefined) {
      this.__data.properties['w%3Ejf'] = {
        type: 'files',
        files: props.proof,
      }
    }

    if (props?.snapshotRole !== undefined) {
      this.__data.properties['xmeg'] = {
        type: 'select',
        select: { name: props.snapshotRole },
      }
    }

    if (props?.source !== undefined) {
      this.__data.properties['%7BYc%7B'] = {
        type: 'select',
        select: { name: props.source },
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
