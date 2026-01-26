import { IngredientsResponse } from "./types"

export class IngredientsResponseDTO {
  __data: IngredientsResponse
  id: IngredientsResponse['id']
  title: IngredientsResponse['title']
  description: IngredientsResponse['description']
  parent: IngredientsResponse['parent']
  createdBy: IngredientsResponse['created_by']
  lastEditedBy: IngredientsResponse['last_edited_by']
  createdTime: IngredientsResponse['created_time']
  lastEditedTime: IngredientsResponse['last_edited_time']
  isInline: IngredientsResponse['is_inline']
  archived: IngredientsResponse['archived']
  url: IngredientsResponse['url']
  publicUrl: IngredientsResponse['public_url']
  properties: IngredientsPropertiesResponseDTO

  constructor(res: IngredientsResponse) {
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
    this.properties = new IngredientsPropertiesResponseDTO(res.properties)
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
  
export class IngredientsPropertiesResponseDTO {
  __props: IngredientsResponse['properties']
  __data

  constructor(props: IngredientsResponse['properties']) {
    this.__props = props
    this.__data = {
      cost: this.__props['Cost'],
      department: this.__props['Department'],
      supplier: this.__props['Supplier'],
      unit: this.__props['Unit'],
      sku: this.__props['Sku'],
      thaiName: this.__props['Thai Name'],
      weightG: this.__props['Weight (g)'],
      orderLink: this.__props['Order Link'],
      image: this.__props['Image'],
      name: this.__props['Name'],
    }
  }


  get cost() {
    return this.__props['Cost']?.number
  }
  get department() {
    return {
      values: this.__props['Department']?.multi_select ? this.__props['Department'].multi_select.map((item) => item.name) : [],
      multi_select: this.__props['Department']?.multi_select,
    }
  }

  get supplierIds() {
    return (this.__props['Supplier']?.relation as unknown as Array<{ id: string }>).map((item) => item.id)  
  }


  get unit() {
    return this.__props['Unit']?.select
  }

  get sku() {
    return {
      text: this.__props['Sku']?.rich_text ? this.__props['Sku'].rich_text.reduce((acc, item) => acc + item.plain_text, '') : undefined,
      links: this.__props['Sku']?.rich_text ? this.__props['Sku'].rich_text.filter((item) => item.href?.length).map((item) => item.href) : [],
      rich_text: this.__props['Sku']?.rich_text,
    }
  }

  get thaiName() {
    return {
      text: this.__props['Thai Name']?.rich_text ? this.__props['Thai Name'].rich_text.reduce((acc, item) => acc + item.plain_text, '') : undefined,
      links: this.__props['Thai Name']?.rich_text ? this.__props['Thai Name'].rich_text.filter((item) => item.href?.length).map((item) => item.href) : [],
      rich_text: this.__props['Thai Name']?.rich_text,
    }
  }

  get weightG() {
    return this.__props['Weight (g)']?.number
  }

  get orderLink() {
    return this.__props['Order Link']?.url
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
}
