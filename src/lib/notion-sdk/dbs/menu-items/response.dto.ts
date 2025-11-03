import { MenuItemsResponse } from "./types"

export class MenuItemsResponseDTO {
  __data: MenuItemsResponse
  id: MenuItemsResponse['id']
  title: MenuItemsResponse['title']
  description: MenuItemsResponse['description']
  parent: MenuItemsResponse['parent']
  createdBy: MenuItemsResponse['created_by']
  lastEditedBy: MenuItemsResponse['last_edited_by']
  createdTime: MenuItemsResponse['created_time']
  lastEditedTime: MenuItemsResponse['last_edited_time']
  isInline: MenuItemsResponse['is_inline']
  archived: MenuItemsResponse['archived']
  url: MenuItemsResponse['url']
  publicUrl: MenuItemsResponse['public_url']
  properties: MenuItemsPropertiesResponseDTO

  constructor(res: MenuItemsResponse) {
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
    this.properties = new MenuItemsPropertiesResponseDTO(res.properties)
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
  
export class MenuItemsPropertiesResponseDTO {
  __props: MenuItemsResponse['properties']
  __data

  constructor(props: MenuItemsResponse['properties']) {
    this.__props = props
    this.__data = {
      description: this.__props['Description'],
      dietaryOptions: this.__props['Dietary Options'],
      cogs: this.__props['COGS'],
      price: this.__props['Price'],
      ingridients: this.__props['Ingridients'],
      allergens: this.__props['Allergens'],
      image: this.__props['Image'],
      category: this.__props['Category'],
      name: this.__props['Name'],
    }
  }


  get description() {
    return {
      text: this.__props['Description']?.rich_text ? this.__props['Description'].rich_text.reduce((acc, item) => acc + item.plain_text, '') : undefined,
      links: this.__props['Description']?.rich_text ? this.__props['Description'].rich_text.filter((item) => item.href?.length).map((item) => item.href) : [],
      rich_text: this.__props['Description']?.rich_text,
    }
  }
  get dietaryOptions() {
    return {
      values: this.__props['Dietary Options']?.multi_select ? this.__props['Dietary Options'].multi_select.map((item) => item.name) : [],
      multi_select: this.__props['Dietary Options']?.multi_select,
    }
  }

  get cogs() {
    return this.__props['COGS']?.number
  }

  get price() {
    return this.__props['Price']?.number
  }
  get ingridients() {
    return {
      values: this.__props['Ingridients']?.multi_select ? this.__props['Ingridients'].multi_select.map((item) => item.name) : [],
      multi_select: this.__props['Ingridients']?.multi_select,
    }
  }
  get allergens() {
    return {
      values: this.__props['Allergens']?.multi_select ? this.__props['Allergens'].multi_select.map((item) => item.name) : [],
      multi_select: this.__props['Allergens']?.multi_select,
    }
  }

  get image() {
    return {
      urls: this.__props['Image'].files.map((item) => 
        item.type === 'external' ? item.external.url : item.type === 'file' ? item.file.url : undefined
      ),
    }
  }


  get category() {
    return this.__props['Category']?.select
  }

  get name() {
    return {
      text: this.__props['Name']?.title ? this.__props['Name'].title.reduce((acc, item) => acc + item.plain_text, '') : undefined,
      links: this.__props['Name']?.title ? this.__props['Name'].title.filter((item) => item.href?.length).map((item) => item.href) : [],
      title: this.__props['Name']?.title,
    }
  }
}
