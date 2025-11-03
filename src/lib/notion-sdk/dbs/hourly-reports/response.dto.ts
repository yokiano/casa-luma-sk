import { HourlyReportsResponse } from "./types"

export class HourlyReportsResponseDTO {
  __data: HourlyReportsResponse
  id: HourlyReportsResponse['id']
  title: HourlyReportsResponse['title']
  description: HourlyReportsResponse['description']
  parent: HourlyReportsResponse['parent']
  createdBy: HourlyReportsResponse['created_by']
  lastEditedBy: HourlyReportsResponse['last_edited_by']
  createdTime: HourlyReportsResponse['created_time']
  lastEditedTime: HourlyReportsResponse['last_edited_time']
  isInline: HourlyReportsResponse['is_inline']
  archived: HourlyReportsResponse['archived']
  url: HourlyReportsResponse['url']
  publicUrl: HourlyReportsResponse['public_url']
  properties: HourlyReportsPropertiesResponseDTO

  constructor(res: HourlyReportsResponse) {
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
    this.properties = new HourlyReportsPropertiesResponseDTO(res.properties)
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
  
export class HourlyReportsPropertiesResponseDTO {
  __props: HourlyReportsResponse['properties']
  __data

  constructor(props: HourlyReportsResponse['properties']) {
    this.__props = props
    this.__data = {
      employee: this.__props['Employee'],
      tasksDescription: this.__props['Tasks/Description'],
      endTime: this.__props['End Time'],
      workDate: this.__props['Work Date'],
      startTime: this.__props['Start Time'],
      status: this.__props['Status'],
      notes: this.__props['Notes'],
      reportTitle: this.__props['Report Title'],
      submittedOn: this.__props['Submitted On'],
      submittedBy: this.__props['Submitted By'],
    }
  }


  get employee() {
    return this.__props['Employee']?.people
  }

  get tasksDescription() {
    return {
      text: this.__props['Tasks/Description']?.rich_text ? this.__props['Tasks/Description'].rich_text.reduce((acc, item) => acc + item.plain_text, '') : undefined,
      links: this.__props['Tasks/Description']?.rich_text ? this.__props['Tasks/Description'].rich_text.filter((item) => item.href?.length).map((item) => item.href) : [],
      rich_text: this.__props['Tasks/Description']?.rich_text,
    }
  }

  get endTime() {
    return this.__props['End Time']?.date
  }

  get workDate() {
    return this.__props['Work Date']?.date
  }

  get startTime() {
    return this.__props['Start Time']?.date
  }

  get status() {
    return this.__props['Status']?.status
  }

  get notes() {
    return {
      text: this.__props['Notes']?.rich_text ? this.__props['Notes'].rich_text.reduce((acc, item) => acc + item.plain_text, '') : undefined,
      links: this.__props['Notes']?.rich_text ? this.__props['Notes'].rich_text.filter((item) => item.href?.length).map((item) => item.href) : [],
      rich_text: this.__props['Notes']?.rich_text,
    }
  }

  get reportTitle() {
    return {
      text: this.__props['Report Title']?.title ? this.__props['Report Title'].title.reduce((acc, item) => acc + item.plain_text, '') : undefined,
      links: this.__props['Report Title']?.title ? this.__props['Report Title'].title.filter((item) => item.href?.length).map((item) => item.href) : [],
      title: this.__props['Report Title']?.title,
    }
  }

  get submittedOn() {
    return this.__props['Submitted On']?.created_time
  }

  get submittedBy() {
    return this.__props['Submitted By']?.created_by
  }
}
