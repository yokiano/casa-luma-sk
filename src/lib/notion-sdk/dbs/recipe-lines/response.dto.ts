import { RecipeLinesResponse } from "./types"

export class RecipeLinesResponseDTO {
  __data: RecipeLinesResponse
  id: RecipeLinesResponse['id']
  title: RecipeLinesResponse['title']
  description: RecipeLinesResponse['description']
  parent: RecipeLinesResponse['parent']
  createdBy: RecipeLinesResponse['created_by']
  lastEditedBy: RecipeLinesResponse['last_edited_by']
  createdTime: RecipeLinesResponse['created_time']
  lastEditedTime: RecipeLinesResponse['last_edited_time']
  isInline: RecipeLinesResponse['is_inline']
  archived: RecipeLinesResponse['archived']
  url: RecipeLinesResponse['url']
  publicUrl: RecipeLinesResponse['public_url']
  properties: RecipeLinesPropertiesResponseDTO

  constructor(res: RecipeLinesResponse) {
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
    this.properties = new RecipeLinesPropertiesResponseDTO(res.properties)
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
  
export class RecipeLinesPropertiesResponseDTO {
  __props: RecipeLinesResponse['properties']
  __data

  constructor(props: RecipeLinesResponse['properties']) {
    this.__props = props
    this.__data = {
      amount: this.__props['Amount'],
      lineCost: this.__props['Line Cost'],
      unit: this.__props['Unit'],
      ingredient: this.__props['Ingredient'],
      name: this.__props['Name'],
    }
  }


  get amount() {
    return this.__props['Amount']?.number
  }

  get lineCost() {
    return this.__props['Line Cost']?.formula
  }

  get unit() {
    return this.__props['Unit']?.formula
  }

  get ingredientIds() {
    return (this.__props['Ingredient']?.relation as unknown as Array<{ id: string }>).map((item) => item.id)  
  }


  get name() {
    return {
      text: this.__props['Name']?.title ? this.__props['Name'].title.reduce((acc, item) => acc + item.plain_text, '') : undefined,
      links: this.__props['Name']?.title ? this.__props['Name'].title.filter((item) => item.href?.length).map((item) => item.href) : [],
      title: this.__props['Name']?.title,
    }
  }
}
