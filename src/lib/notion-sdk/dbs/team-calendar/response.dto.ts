import { TeamCalendarResponse } from "./types"

export class TeamCalendarResponseDTO {
  __data: TeamCalendarResponse
  id: TeamCalendarResponse['id']
  title: TeamCalendarResponse['title']
  description: TeamCalendarResponse['description']
  parent: TeamCalendarResponse['parent']
  createdBy: TeamCalendarResponse['created_by']
  lastEditedBy: TeamCalendarResponse['last_edited_by']
  createdTime: TeamCalendarResponse['created_time']
  lastEditedTime: TeamCalendarResponse['last_edited_time']
  isInline: TeamCalendarResponse['is_inline']
  archived: TeamCalendarResponse['archived']
  url: TeamCalendarResponse['url']
  publicUrl: TeamCalendarResponse['public_url']
  properties: TeamCalendarPropertiesResponseDTO

  constructor(res: TeamCalendarResponse) {
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
    this.properties = new TeamCalendarPropertiesResponseDTO(res.properties)
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
  
export class TeamCalendarPropertiesResponseDTO {
  __props: TeamCalendarResponse['properties']
  __data

  constructor(props: TeamCalendarResponse['properties']) {
    this.__props = props
    this.__data = {
      date: this.__props['Date'],
      description: this.__props['Description'],
      eventName: this.__props['Event Name'],
    }
  }


  get date() {
    return this.__props['Date']?.date
  }

  get description() {
    return {
      text: this.__props['Description']?.rich_text ? this.__props['Description'].rich_text.reduce((acc, item) => acc + item.plain_text, '') : undefined,
      links: this.__props['Description']?.rich_text ? this.__props['Description'].rich_text.filter((item) => item.href?.length).map((item) => item.href) : [],
      rich_text: this.__props['Description']?.rich_text,
    }
  }

  get eventName() {
    return {
      text: this.__props['Event Name']?.title ? this.__props['Event Name'].title.reduce((acc, item) => acc + item.plain_text, '') : undefined,
      links: this.__props['Event Name']?.title ? this.__props['Event Name'].title.filter((item) => item.href?.length).map((item) => item.href) : [],
      title: this.__props['Event Name']?.title,
    }
  }
}
