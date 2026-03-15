import { WebsiteImagesResponse } from "./types"

export class WebsiteImagesResponseDTO {
  __data: WebsiteImagesResponse
  id: WebsiteImagesResponse['id']
  title: WebsiteImagesResponse['title']
  description: WebsiteImagesResponse['description']
  parent: WebsiteImagesResponse['parent']
  createdBy: WebsiteImagesResponse['created_by']
  lastEditedBy: WebsiteImagesResponse['last_edited_by']
  createdTime: WebsiteImagesResponse['created_time']
  lastEditedTime: WebsiteImagesResponse['last_edited_time']
  isInline: WebsiteImagesResponse['is_inline']
  archived: WebsiteImagesResponse['archived']
  url: WebsiteImagesResponse['url']
  publicUrl: WebsiteImagesResponse['public_url']
  properties: WebsiteImagesPropertiesResponseDTO

  constructor(res: WebsiteImagesResponse) {
    this.__data = res
    this.id = res.id
    this.title = res.title
    this.description = res.description
    this.parent = res.parent
    this.createdBy = res.created_by
    this.lastEditedBy = res.last_edited_by
    this.createdTime = res.created_time
    this.lastEditedTime = res.last_edited_time
    this.isInline = res.is_inline
    this.archived = res.archived
    this.url = res.url
    this.publicUrl = res.public_url
    this.properties = new WebsiteImagesPropertiesResponseDTO(res.properties)
  }

  get cover() {
    return {
      type: this.__data.cover?.type,
      url: this.__data.cover?.type === 'external' ? this.__data.cover?.external?.url : this.__data.cover?.file?.url,
    }
  }

  get icon() {
    return {
      type: this.__data.icon?.type,
      url:
        this.__data.icon?.type === 'external'
          ? this.__data.icon?.external?.url
          : this.__data.icon?.type === 'file'
            ? this.__data.icon?.file?.url
            : undefined,
      emoji: this.__data.icon?.type === 'emoji' ? this.__data.icon?.emoji : undefined,
    }
  }
}
  
export class WebsiteImagesPropertiesResponseDTO {
  __props: WebsiteImagesResponse['properties']
  __data

  constructor(props: WebsiteImagesResponse['properties']) {
    this.__props = props
    this.__data = {
      section: this.__props['Section'],
      active: this.__props['Active'],
      altText: this.__props['Alt Text'],
      image: this.__props['Image'],
      name: this.__props['Name'],
      slug: this.__props['slug'],
    }
  }


  get section() {
    return this.__props['Section']?.select
  }

  get active() {
    return this.__props['Active']?.checkbox
  }

  get altText() {
    return {
      text: this.__props['Alt Text']?.rich_text ? this.__props['Alt Text'].rich_text.reduce((acc, item) => acc + item.plain_text, '') : undefined,
      links: this.__props['Alt Text']?.rich_text ? this.__props['Alt Text'].rich_text.filter((item) => item.href?.length).map((item) => item.href) : [],
      rich_text: this.__props['Alt Text']?.rich_text,
    }
  }

  get image() {
    return {
      urls: this.__props['Image'].files.map((item) => 
        item.type === 'external' ? item.external.url : item.type === 'file' ? item.file.url : undefined
      ),
    }
  }


  get name() {
    return {
      text: this.__props['Name']?.title ? this.__props['Name'].title.reduce((acc, item) => acc + item.plain_text, '') : undefined,
      links: this.__props['Name']?.title ? this.__props['Name'].title.filter((item) => item.href?.length).map((item) => item.href) : [],
      title: this.__props['Name']?.title,
    }
  }

  get slug() {
    return {
      text: this.__props['slug']?.rich_text ? this.__props['slug'].rich_text.reduce((acc, item) => acc + item.plain_text, '') : undefined,
      links: this.__props['slug']?.rich_text ? this.__props['slug'].rich_text.filter((item) => item.href?.length).map((item) => item.href) : [],
      rich_text: this.__props['slug']?.rich_text,
    }
  }
}
