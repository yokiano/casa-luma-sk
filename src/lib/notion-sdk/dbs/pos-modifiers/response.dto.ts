import { PosModifiersResponse } from "./types"

export class PosModifiersResponseDTO {
  __data: PosModifiersResponse
  id: PosModifiersResponse['id']
  title: PosModifiersResponse['title']
  description: PosModifiersResponse['description']
  parent: PosModifiersResponse['parent']
  createdBy: PosModifiersResponse['created_by']
  lastEditedBy: PosModifiersResponse['last_edited_by']
  createdTime: PosModifiersResponse['created_time']
  lastEditedTime: PosModifiersResponse['last_edited_time']
  isInline: PosModifiersResponse['is_inline']
  archived: PosModifiersResponse['archived']
  url: PosModifiersResponse['url']
  publicUrl: PosModifiersResponse['public_url']
  properties: PosModifiersPropertiesResponseDTO

  constructor(res: PosModifiersResponse) {
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
    this.properties = new PosModifiersPropertiesResponseDTO(res.properties)
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
  
export class PosModifiersPropertiesResponseDTO {
  __props: PosModifiersResponse['properties']
  __data

  constructor(props: PosModifiersResponse['properties']) {
    this.__props = props
    this.__data = {
      notes: this.__props['Notes'],
      optionsJson: this.__props['Options JSON'],
      loyverseId: this.__props['LoyverseID'],
      position: this.__props['Position'],
      active: this.__props['Active'],
      name: this.__props['Name'],
    }
  }


  get notes() {
    return {
      text: this.__props['Notes']?.rich_text ? this.__props['Notes'].rich_text.reduce((acc, item) => acc + item.plain_text, '') : undefined,
      links: this.__props['Notes']?.rich_text ? this.__props['Notes'].rich_text.filter((item) => item.href?.length).map((item) => item.href) : [],
      rich_text: this.__props['Notes']?.rich_text,
    }
  }

  get optionsJson() {
    return {
      text: this.__props['Options JSON']?.rich_text ? this.__props['Options JSON'].rich_text.reduce((acc, item) => acc + item.plain_text, '') : undefined,
      links: this.__props['Options JSON']?.rich_text ? this.__props['Options JSON'].rich_text.filter((item) => item.href?.length).map((item) => item.href) : [],
      rich_text: this.__props['Options JSON']?.rich_text,
    }
  }

  get loyverseId() {
    return {
      text: this.__props['LoyverseID']?.rich_text ? this.__props['LoyverseID'].rich_text.reduce((acc, item) => acc + item.plain_text, '') : undefined,
      links: this.__props['LoyverseID']?.rich_text ? this.__props['LoyverseID'].rich_text.filter((item) => item.href?.length).map((item) => item.href) : [],
      rich_text: this.__props['LoyverseID']?.rich_text,
    }
  }

  get position() {
    return this.__props['Position']?.number
  }

  get active() {
    return this.__props['Active']?.checkbox
  }

  get name() {
    return {
      text: this.__props['Name']?.title ? this.__props['Name'].title.reduce((acc, item) => acc + item.plain_text, '') : undefined,
      links: this.__props['Name']?.title ? this.__props['Name'].title.filter((item) => item.href?.length).map((item) => item.href) : [],
      title: this.__props['Name']?.title,
    }
  }
}
