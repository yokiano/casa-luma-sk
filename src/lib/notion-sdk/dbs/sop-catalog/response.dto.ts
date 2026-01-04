import { SopCatalogResponse } from "./types"

export class SopCatalogResponseDTO {
  __data: SopCatalogResponse
  id: SopCatalogResponse['id']
  title: SopCatalogResponse['title']
  description: SopCatalogResponse['description']
  parent: SopCatalogResponse['parent']
  createdBy: SopCatalogResponse['created_by']
  lastEditedBy: SopCatalogResponse['last_edited_by']
  createdTime: SopCatalogResponse['created_time']
  lastEditedTime: SopCatalogResponse['last_edited_time']
  isInline: SopCatalogResponse['is_inline']
  archived: SopCatalogResponse['archived']
  url: SopCatalogResponse['url']
  publicUrl: SopCatalogResponse['public_url']
  properties: SopCatalogPropertiesResponseDTO

  constructor(res: SopCatalogResponse) {
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
    this.properties = new SopCatalogPropertiesResponseDTO(res.properties)
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
  
export class SopCatalogPropertiesResponseDTO {
  __props: SopCatalogResponse['properties']
  __data

  constructor(props: SopCatalogResponse['properties']) {
    this.__props = props
    this.__data = {
      role: this.__props['Role'],
      when: this.__props['When'],
      status: this.__props['Status'],
      sopType: this.__props['SOP Type'],
      department: this.__props['Department'],
      name: this.__props['Name'],
    }
  }


  get roleIds() {
    return (this.__props['Role']?.relation as unknown as Array<{ id: string }>).map((item) => item.id)  
  }


  get when() {
    return this.__props['When']?.select
  }

  get status() {
    return this.__props['Status']?.status
  }

  get sopType() {
    return this.__props['SOP Type']?.select
  }

  get department() {
    return this.__props['Department']?.select
  }

  get name() {
    return {
      text: this.__props['Name']?.title ? this.__props['Name'].title.reduce((acc, item) => acc + item.plain_text, '') : undefined,
      links: this.__props['Name']?.title ? this.__props['Name'].title.filter((item) => item.href?.length).map((item) => item.href) : [],
      title: this.__props['Name']?.title,
    }
  }
}
