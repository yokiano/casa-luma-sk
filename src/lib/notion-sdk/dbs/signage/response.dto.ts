import { SignageResponse } from "./types"

export class SignageResponseDTO {
  __data: SignageResponse
  id: SignageResponse['id']
  title: SignageResponse['title']
  description: SignageResponse['description']
  parent: SignageResponse['parent']
  createdBy: SignageResponse['created_by']
  lastEditedBy: SignageResponse['last_edited_by']
  createdTime: SignageResponse['created_time']
  lastEditedTime: SignageResponse['last_edited_time']
  isInline: SignageResponse['is_inline']
  archived: SignageResponse['archived']
  url: SignageResponse['url']
  publicUrl: SignageResponse['public_url']
  properties: SignagePropertiesResponseDTO

  constructor(res: SignageResponse) {
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
    this.properties = new SignagePropertiesResponseDTO(res.properties)
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
  
export class SignagePropertiesResponseDTO {
  __props: SignageResponse['properties']
  __data

  constructor(props: SignageResponse['properties']) {
    this.__props = props
    this.__data = {
      location: this.__props['Location'],
      type: this.__props['Type'],
      copy: this.__props['Copy'],
      signId: this.__props['Sign ID'],
      status: this.__props['Status'],
      name: this.__props['Name'],
    }
  }


  get location() {
    return this.__props['Location']?.select
  }

  get type() {
    return this.__props['Type']?.select
  }

  get copy() {
    return {
      text: this.__props['Copy']?.rich_text ? this.__props['Copy'].rich_text.reduce((acc, item) => acc + item.plain_text, '') : undefined,
      links: this.__props['Copy']?.rich_text ? this.__props['Copy'].rich_text.filter((item) => item.href?.length).map((item) => item.href) : [],
      rich_text: this.__props['Copy']?.rich_text,
    }
  }

  get signId() {
    return {
      text: this.__props['Sign ID']?.rich_text ? this.__props['Sign ID'].rich_text.reduce((acc, item) => acc + item.plain_text, '') : undefined,
      links: this.__props['Sign ID']?.rich_text ? this.__props['Sign ID'].rich_text.filter((item) => item.href?.length).map((item) => item.href) : [],
      rich_text: this.__props['Sign ID']?.rich_text,
    }
  }

  get status() {
    return this.__props['Status']?.status
  }

  get name() {
    return {
      text: this.__props['Name']?.title ? this.__props['Name'].title.reduce((acc, item) => acc + item.plain_text, '') : undefined,
      links: this.__props['Name']?.title ? this.__props['Name'].title.filter((item) => item.href?.length).map((item) => item.href) : [],
      title: this.__props['Name']?.title,
    }
  }
}
