import { PayForPlayItemsResponse } from "./types"

export class PayForPlayItemsResponseDTO {
  __data: PayForPlayItemsResponse
  id: PayForPlayItemsResponse['id']
  title: PayForPlayItemsResponse['title']
  description: PayForPlayItemsResponse['description']
  parent: PayForPlayItemsResponse['parent']
  createdBy: PayForPlayItemsResponse['created_by']
  lastEditedBy: PayForPlayItemsResponse['last_edited_by']
  createdTime: PayForPlayItemsResponse['created_time']
  lastEditedTime: PayForPlayItemsResponse['last_edited_time']
  isInline: PayForPlayItemsResponse['is_inline']
  archived: PayForPlayItemsResponse['archived']
  url: PayForPlayItemsResponse['url']
  publicUrl: PayForPlayItemsResponse['public_url']
  properties: PayForPlayItemsPropertiesResponseDTO

  constructor(res: PayForPlayItemsResponse) {
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
    this.properties = new PayForPlayItemsPropertiesResponseDTO(res.properties)
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
  
export class PayForPlayItemsPropertiesResponseDTO {
  __props: PayForPlayItemsResponse['properties']
  __data

  constructor(props: PayForPlayItemsResponse['properties']) {
    this.__props = props
    this.__data = {
      stock: this.__props['Stock'],
      price: this.__props['Price'],
      category: this.__props['Category'],
      cogs: this.__props['COGS'],
      description: this.__props['Description'],
      supplier: this.__props['Supplier'],
      image: this.__props['Image'],
      name: this.__props['Name'],
      createdTime: this.__props['Created time'],
      lastEditedTime: this.__props['Last edited time'],
      lastEditedBy: this.__props['Last edited by'],
      createdBy: this.__props['Created by'],
    }
  }


  get stock() {
    return this.__props['Stock']?.number
  }

  get price() {
    return this.__props['Price']?.number
  }

  get category() {
    return this.__props['Category']?.select
  }

  get cogs() {
    return this.__props['COGS']?.number
  }

  get description() {
    return {
      text: this.__props['Description']?.rich_text ? this.__props['Description'].rich_text.reduce((acc, item) => acc + item.plain_text, '') : undefined,
      links: this.__props['Description']?.rich_text ? this.__props['Description'].rich_text.filter((item) => item.href?.length).map((item) => item.href) : [],
      rich_text: this.__props['Description']?.rich_text,
    }
  }

  get supplierIds() {
    return (this.__props['Supplier']?.relation as unknown as Array<{ id: string }>).map((item) => item.id)  
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

  get createdTime() {
    return this.__props['Created time']?.created_time
  }

  get lastEditedTime() {
    return this.__props['Last edited time']?.last_edited_time
  }

  get lastEditedBy() {
    return this.__props['Last edited by']?.last_edited_by
  }

  get createdBy() {
    return this.__props['Created by']?.created_by
  }
}
