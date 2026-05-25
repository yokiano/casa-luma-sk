import { WebsiteImagesResponse, WebsiteImagesQuery, WebsiteImagesQueryResponse } from './types'
import { WebsiteImagesPatchDTO } from './patch.dto'
import { GenericDatabaseClass, DatabaseOptions } from '../../core/src/generic-db'
import { WEBSITE_IMAGES_PROPS_TO_TYPES, WEBSITE_IMAGES_PROPS_TO_IDS, WebsiteImagesDTOProperties } from './constants'

export class WebsiteImagesDatabase extends GenericDatabaseClass<
  WebsiteImagesResponse,
  WebsiteImagesPatchDTO,
  WebsiteImagesQuery,
  WebsiteImagesQueryResponse,
  WebsiteImagesDTOProperties
> {
  protected notionDatabaseId: string
  
  constructor(options: DatabaseOptions) {
    super(options)

    this.notionDatabaseId = '9b7b4439a1664f349ea8da91c8e21add'
  }

  protected queryRemapFilter(filter?: Record<string, unknown>) {
    if (!filter) {
      return undefined
    }

    const notionFilter = {} as Record<string, unknown>

    Object.entries(filter).forEach(([key, value]) => {
      if (key === 'and' || key === 'or') {
        if (Array.isArray(value)) {
          notionFilter[key] = value.map((v) => this.queryRemapFilter(v))
        } else {
          throw new Error(`WebsiteImages: Invalid filter value for ${key}: ${value}`)
        }
      } else {
        if (!(key in WEBSITE_IMAGES_PROPS_TO_TYPES)) {
          throw new Error(`WebsiteImages: Invalid filter key: ${key}`)
        }

        const propType = WEBSITE_IMAGES_PROPS_TO_TYPES[key as keyof typeof WEBSITE_IMAGES_PROPS_TO_TYPES];
        const propId = WEBSITE_IMAGES_PROPS_TO_IDS[key as keyof typeof WEBSITE_IMAGES_PROPS_TO_IDS];

        notionFilter['property'] = propId
        notionFilter[propType] = value
      }
    })
    
    return notionFilter
  }

  protected queryRemapSorts(sorts?: Record<string, string>[]) {
    return sorts?.map((sort) => {
      if ('property' in sort) {
        return {
          property: WEBSITE_IMAGES_PROPS_TO_IDS[sort.property as keyof typeof WEBSITE_IMAGES_PROPS_TO_IDS],
          direction: sort.direction,
        }
      }

      return sort
    })
  }

  protected queryRemapFilterProperties(filterProps?: string[]) {
    return filterProps?.map((p) => WEBSITE_IMAGES_PROPS_TO_IDS[p as keyof typeof WEBSITE_IMAGES_PROPS_TO_IDS])
  }
}
