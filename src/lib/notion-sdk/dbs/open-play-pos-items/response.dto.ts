import { OpenPlayPosItemsResponse } from "./types"

export class OpenPlayPosItemsResponseDTO {
  __data: OpenPlayPosItemsResponse
  id: OpenPlayPosItemsResponse['id']
  title: OpenPlayPosItemsResponse['title']
  description: OpenPlayPosItemsResponse['description']
  parent: OpenPlayPosItemsResponse['parent']
  createdBy: OpenPlayPosItemsResponse['created_by']
  lastEditedBy: OpenPlayPosItemsResponse['last_edited_by']
  createdTime: OpenPlayPosItemsResponse['created_time']
  lastEditedTime: OpenPlayPosItemsResponse['last_edited_time']
  isInline: OpenPlayPosItemsResponse['is_inline']
  archived: OpenPlayPosItemsResponse['archived']
  url: OpenPlayPosItemsResponse['url']
  publicUrl: OpenPlayPosItemsResponse['public_url']
  properties: OpenPlayPosItemsPropertiesResponseDTO

  constructor(res: OpenPlayPosItemsResponse) {
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
    this.properties = new OpenPlayPosItemsPropertiesResponseDTO(res.properties)
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
  
export class OpenPlayPosItemsPropertiesResponseDTO {
  __props: OpenPlayPosItemsResponse['properties']
  __data

  constructor(props: OpenPlayPosItemsResponse['properties']) {
    this.__props = props
    this.__data = {
      highlight: this.__props['Highlight'],
      iconChar: this.__props['Icon Char'],
      foodDiscount: this.__props['Food Discount'],
      id: this.__props['ID'],
      workshopsIncluded: this.__props['Workshops Included'],
      duration: this.__props['Duration'],
      perks: this.__props['Perks'],
      access: this.__props['Access'],
      priceBaht: this.__props['Price (Baht)'],
      name: this.__props['Name'],
      category: this.__props['Category'],
    }
  }


  get highlight() {
    return this.__props['Highlight']?.checkbox
  }

  get iconChar() {
    return {
      text: this.__props['Icon Char']?.rich_text ? this.__props['Icon Char'].rich_text.reduce((acc, item) => acc + item.plain_text, '') : undefined,
      links: this.__props['Icon Char']?.rich_text ? this.__props['Icon Char'].rich_text.filter((item) => item.href?.length).map((item) => item.href) : [],
      rich_text: this.__props['Icon Char']?.rich_text,
    }
  }

  get foodDiscount() {
    return {
      text: this.__props['Food Discount']?.rich_text ? this.__props['Food Discount'].rich_text.reduce((acc, item) => acc + item.plain_text, '') : undefined,
      links: this.__props['Food Discount']?.rich_text ? this.__props['Food Discount'].rich_text.filter((item) => item.href?.length).map((item) => item.href) : [],
      rich_text: this.__props['Food Discount']?.rich_text,
    }
  }

  get id() {
    return {
      text: this.__props['ID']?.rich_text ? this.__props['ID'].rich_text.reduce((acc, item) => acc + item.plain_text, '') : undefined,
      links: this.__props['ID']?.rich_text ? this.__props['ID'].rich_text.filter((item) => item.href?.length).map((item) => item.href) : [],
      rich_text: this.__props['ID']?.rich_text,
    }
  }

  get workshopsIncluded() {
    return {
      text: this.__props['Workshops Included']?.rich_text ? this.__props['Workshops Included'].rich_text.reduce((acc, item) => acc + item.plain_text, '') : undefined,
      links: this.__props['Workshops Included']?.rich_text ? this.__props['Workshops Included'].rich_text.filter((item) => item.href?.length).map((item) => item.href) : [],
      rich_text: this.__props['Workshops Included']?.rich_text,
    }
  }

  get duration() {
    return {
      text: this.__props['Duration']?.rich_text ? this.__props['Duration'].rich_text.reduce((acc, item) => acc + item.plain_text, '') : undefined,
      links: this.__props['Duration']?.rich_text ? this.__props['Duration'].rich_text.filter((item) => item.href?.length).map((item) => item.href) : [],
      rich_text: this.__props['Duration']?.rich_text,
    }
  }
  get perks() {
    return {
      values: this.__props['Perks']?.multi_select ? this.__props['Perks'].multi_select.map((item) => item.name) : [],
      multi_select: this.__props['Perks']?.multi_select,
    }
  }

  get access() {
    return {
      text: this.__props['Access']?.rich_text ? this.__props['Access'].rich_text.reduce((acc, item) => acc + item.plain_text, '') : undefined,
      links: this.__props['Access']?.rich_text ? this.__props['Access'].rich_text.filter((item) => item.href?.length).map((item) => item.href) : [],
      rich_text: this.__props['Access']?.rich_text,
    }
  }

  get priceBaht() {
    return this.__props['Price (Baht)']?.number
  }

  get name() {
    return {
      text: this.__props['Name']?.title ? this.__props['Name'].title.reduce((acc, item) => acc + item.plain_text, '') : undefined,
      links: this.__props['Name']?.title ? this.__props['Name'].title.filter((item) => item.href?.length).map((item) => item.href) : [],
      title: this.__props['Name']?.title,
    }
  }

  get category() {
    return this.__props['Category']?.select
  }
}
