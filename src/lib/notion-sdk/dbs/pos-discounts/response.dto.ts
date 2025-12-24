import { PosDiscountsResponse } from "./types"

export class PosDiscountsResponseDTO {
  __data: PosDiscountsResponse
  id: PosDiscountsResponse['id']
  title: PosDiscountsResponse['title']
  description: PosDiscountsResponse['description']
  parent: PosDiscountsResponse['parent']
  createdBy: PosDiscountsResponse['created_by']
  lastEditedBy: PosDiscountsResponse['last_edited_by']
  createdTime: PosDiscountsResponse['created_time']
  lastEditedTime: PosDiscountsResponse['last_edited_time']
  isInline: PosDiscountsResponse['is_inline']
  archived: PosDiscountsResponse['archived']
  url: PosDiscountsResponse['url']
  publicUrl: PosDiscountsResponse['public_url']
  properties: PosDiscountsPropertiesResponseDTO

  constructor(res: PosDiscountsResponse) {
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
    this.properties = new PosDiscountsPropertiesResponseDTO(res.properties)
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
  
export class PosDiscountsPropertiesResponseDTO {
  __props: PosDiscountsResponse['properties']
  __data

  constructor(props: PosDiscountsResponse['properties']) {
    this.__props = props
    this.__data = {
      value: this.__props['Value'],
      active: this.__props['Active'],
      restrictedAccess: this.__props['Restricted access'],
      type: this.__props['Type'],
      loyverseId: this.__props['LoyverseID'],
      appliesTo: this.__props['Applies to'],
      name: this.__props['Name'],
    }
  }


  get value() {
    return this.__props['Value']?.number
  }

  get active() {
    return this.__props['Active']?.checkbox
  }

  get restrictedAccess() {
    return this.__props['Restricted access']?.checkbox
  }

  get type() {
    return this.__props['Type']?.select
  }

  get loyverseId() {
    return {
      text: this.__props['LoyverseID']?.rich_text ? this.__props['LoyverseID'].rich_text.reduce((acc, item) => acc + item.plain_text, '') : undefined,
      links: this.__props['LoyverseID']?.rich_text ? this.__props['LoyverseID'].rich_text.filter((item) => item.href?.length).map((item) => item.href) : [],
      rich_text: this.__props['LoyverseID']?.rich_text,
    }
  }

  get appliesTo() {
    return this.__props['Applies to']?.select
  }

  get name() {
    return {
      text: this.__props['Name']?.title ? this.__props['Name'].title.reduce((acc, item) => acc + item.plain_text, '') : undefined,
      links: this.__props['Name']?.title ? this.__props['Name'].title.filter((item) => item.href?.length).map((item) => item.href) : [],
      title: this.__props['Name']?.title,
    }
  }
}
