import { WithOptional, Join, PathsToStringProps } from '../../core/types/helper.types'
import {
DatabaseObjectResponse,
StringRequest,
CheckboxPropertyItemObjectResponse,
FilesPropertyItemObjectResponse,
RichTextPropertyItemObjectResponse,
SelectPropertyItemObjectResponse,
TitlePropertyItemObjectResponse,
ExistencePropertyFilter,
QueryDatabaseBodyParameters,
TimestampCreatedTimeFilter,
TimestampLastEditedTimeFilter,
CheckboxPropertyFilter,
TextPropertyFilter
} from '../../core/types/notion-api.types'
import { WEBSITE_IMAGES_PROPS_TO_IDS } from './constants'

export interface WebsiteImagesResponse extends WithOptional<Omit<DatabaseObjectResponse, 'properties'>, 'title'| 'description'| 'is_inline'| 'url'| 'public_url'> {
  properties: {
    "Section": Omit<SelectPropertyItemObjectResponse, 'select'> & { select: { id: StringRequest, name: 'Hero', color: 'blue' } | { id: StringRequest, name: 'Gallery', color: 'green' } | { id: StringRequest, name: 'About', color: 'purple' } | { id: StringRequest, name: 'Menu', color: 'orange' } | { id: StringRequest, name: 'Events', color: 'pink' } | { id: StringRequest, name: 'Other', color: 'gray' }},
    "Active": CheckboxPropertyItemObjectResponse,
    "Alt Text": RichTextPropertyItemObjectResponse,
    "Image": FilesPropertyItemObjectResponse,
    "Name": TitlePropertyItemObjectResponse,
    "slug": RichTextPropertyItemObjectResponse
  }
}

export type WebsiteImagesResponseProperties = keyof WebsiteImagesResponse['properties']
export type WebsiteImagesPath = Join<PathsToStringProps<WebsiteImagesResponse>>


export type WebsiteImagesSectionPropertyType = WebsiteImagesResponse['properties']['Section']['select']['name']

type WebsiteImagesSectionPropertyFilter =
  | {
      equals: WebsiteImagesSectionPropertyType
    }
  | {
      does_not_equal: WebsiteImagesSectionPropertyType
    }
  | ExistencePropertyFilter      

type WebsiteImagesActivePropertyFilter = CheckboxPropertyFilter
type WebsiteImagesAltTextPropertyFilter = TextPropertyFilter
type WebsiteImagesImagePropertyFilter = ExistencePropertyFilter
type WebsiteImagesNamePropertyFilter = TextPropertyFilter
type WebsiteImagesSlugPropertyFilter = TextPropertyFilter

export type WebsiteImagesPropertyFilter = { section: WebsiteImagesSectionPropertyFilter } | { active: WebsiteImagesActivePropertyFilter } | { altText: WebsiteImagesAltTextPropertyFilter } | { image: WebsiteImagesImagePropertyFilter } | { name: WebsiteImagesNamePropertyFilter } | { slug: WebsiteImagesSlugPropertyFilter }

export type WebsiteImagesQuery = Omit<QueryDatabaseBodyParameters, 'filter' | 'sorts'> & {
  sorts?: Array<
  | {
      property: keyof typeof WEBSITE_IMAGES_PROPS_TO_IDS
      direction: 'ascending' | 'descending'
    }
  | {
      timestamp: 'created_time' | 'last_edited_time'
      direction: 'ascending' | 'descending'
    }
  >
  filter?:
    | {
        or: Array<
          | WebsiteImagesPropertyFilter
          | TimestampCreatedTimeFilter
          | TimestampLastEditedTimeFilter
          | {
              // or: WebsiteImagesQuery['filter']
              or: Array<WebsiteImagesPropertyFilter>
            }
          | {
              // and: WebsiteImagesQuery['filter']
              and: Array<WebsiteImagesPropertyFilter>
            }
        >
      }
    | {
        and: Array<
          | WebsiteImagesPropertyFilter
          | TimestampCreatedTimeFilter
          | TimestampLastEditedTimeFilter
          | {
              // or: WebsiteImagesQuery['filter']
              or: Array<WebsiteImagesPropertyFilter>
            }
          | {
              // and: WebsiteImagesQuery['filter']
              and: Array<WebsiteImagesPropertyFilter>
            }
        >
      }
    | WebsiteImagesPropertyFilter
    | TimestampCreatedTimeFilter
    | TimestampLastEditedTimeFilter
}

export type WebsiteImagesQueryFilter = WebsiteImagesQuery['filter']

export type WebsiteImagesQueryResponse = {
  results: WebsiteImagesResponse[]
  next_cursor: string | null
  has_more: boolean
}

