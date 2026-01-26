import { RecipesResponse } from "./types"

export class RecipesResponseDTO {
  __data: RecipesResponse
  id: RecipesResponse['id']
  title: RecipesResponse['title']
  description: RecipesResponse['description']
  parent: RecipesResponse['parent']
  createdBy: RecipesResponse['created_by']
  lastEditedBy: RecipesResponse['last_edited_by']
  createdTime: RecipesResponse['created_time']
  lastEditedTime: RecipesResponse['last_edited_time']
  isInline: RecipesResponse['is_inline']
  archived: RecipesResponse['archived']
  url: RecipesResponse['url']
  publicUrl: RecipesResponse['public_url']
  properties: RecipesPropertiesResponseDTO

  constructor(res: RecipesResponse) {
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
    this.properties = new RecipesPropertiesResponseDTO(res.properties)
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
  
export class RecipesPropertiesResponseDTO {
  __props: RecipesResponse['properties']
  __data

  constructor(props: RecipesResponse['properties']) {
    this.__props = props
    this.__data = {
      recipeLines: this.__props['Recipe Lines'],
      cogs: this.__props['COGS'],
      thaiName: this.__props['Thai Name'],
      instructions: this.__props['Instructions'],
      menuItem: this.__props['Menu Item'],
      image: this.__props['Image'],
      name: this.__props['Name'],
    }
  }


  get recipeLinesIds() {
    return (this.__props['Recipe Lines']?.relation as unknown as Array<{ id: string }>).map((item) => item.id)  
  }


  get cogs() {
    return this.__props['COGS']?.rollup
  }

  get thaiName() {
    return {
      text: this.__props['Thai Name']?.rich_text ? this.__props['Thai Name'].rich_text.reduce((acc, item) => acc + item.plain_text, '') : undefined,
      links: this.__props['Thai Name']?.rich_text ? this.__props['Thai Name'].rich_text.filter((item) => item.href?.length).map((item) => item.href) : [],
      rich_text: this.__props['Thai Name']?.rich_text,
    }
  }

  get instructions() {
    return {
      text: this.__props['Instructions']?.rich_text ? this.__props['Instructions'].rich_text.reduce((acc, item) => acc + item.plain_text, '') : undefined,
      links: this.__props['Instructions']?.rich_text ? this.__props['Instructions'].rich_text.filter((item) => item.href?.length).map((item) => item.href) : [],
      rich_text: this.__props['Instructions']?.rich_text,
    }
  }

  get menuItemIds() {
    return (this.__props['Menu Item']?.relation as unknown as Array<{ id: string }>).map((item) => item.id)  
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
