import { MembershipsResponse } from "./types"

export class MembershipsResponseDTO {
  __data: MembershipsResponse
  id: MembershipsResponse['id']
  title: MembershipsResponse['title']
  description: MembershipsResponse['description']
  parent: MembershipsResponse['parent']
  createdBy: MembershipsResponse['created_by']
  lastEditedBy: MembershipsResponse['last_edited_by']
  createdTime: MembershipsResponse['created_time']
  lastEditedTime: MembershipsResponse['last_edited_time']
  isInline: MembershipsResponse['is_inline']
  archived: MembershipsResponse['archived']
  url: MembershipsResponse['url']
  publicUrl: MembershipsResponse['public_url']
  properties: MembershipsPropertiesResponseDTO

  constructor(res: MembershipsResponse) {
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
    this.properties = new MembershipsPropertiesResponseDTO(res.properties)
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
  
export class MembershipsPropertiesResponseDTO {
  __props: MembershipsResponse['properties']
  __data

  constructor(props: MembershipsResponse['properties']) {
    this.__props = props
    this.__data = {
      type: this.__props['Type'],
      hasSiblingDiscount: this.__props['Has Sibling Discount'],
      status: this.__props['Status'],
      family: this.__props['Family'],
      startDate: this.__props['Start Date'],
      endDate: this.__props['End Date'],
      numberOfKids: this.__props['Number of Kids'],
      notes: this.__props['Notes'],
      name: this.__props['Name'],
    }
  }


  get type() {
    return this.__props['Type']?.select
  }

  get hasSiblingDiscount() {
    return this.__props['Has Sibling Discount']?.formula
  }

  get status() {
    return this.__props['Status']?.formula
  }

  get familyIds() {
    return (this.__props['Family']?.relation as unknown as Array<{ id: string }>).map((item) => item.id)  
  }


  get startDate() {
    return this.__props['Start Date']?.date
  }

  get endDate() {
    return this.__props['End Date']?.date
  }

  get numberOfKids() {
    return this.__props['Number of Kids']?.number
  }

  get notes() {
    return {
      text: this.__props['Notes']?.rich_text ? this.__props['Notes'].rich_text.reduce((acc, item) => acc + item.plain_text, '') : undefined,
      links: this.__props['Notes']?.rich_text ? this.__props['Notes'].rich_text.filter((item) => item.href?.length).map((item) => item.href) : [],
      rich_text: this.__props['Notes']?.rich_text,
    }
  }

  get name() {
    return {
      text: this.__props['Name']?.title ? this.__props['Name'].title.reduce((acc, item) => acc + item.plain_text, '') : undefined,
      links: this.__props['Name']?.title ? this.__props['Name'].title.filter((item) => item.href?.length).map((item) => item.href) : [],
      title: this.__props['Name']?.title,
    }
  }
}
