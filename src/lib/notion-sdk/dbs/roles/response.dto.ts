import { RolesResponse } from "./types"

export class RolesResponseDTO {
  __data: RolesResponse
  id: RolesResponse['id']
  title: RolesResponse['title']
  description: RolesResponse['description']
  parent: RolesResponse['parent']
  createdBy: RolesResponse['created_by']
  lastEditedBy: RolesResponse['last_edited_by']
  createdTime: RolesResponse['created_time']
  lastEditedTime: RolesResponse['last_edited_time']
  isInline: RolesResponse['is_inline']
  archived: RolesResponse['archived']
  url: RolesResponse['url']
  publicUrl: RolesResponse['public_url']
  properties: RolesPropertiesResponseDTO

  constructor(res: RolesResponse) {
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
    this.properties = new RolesPropertiesResponseDTO(res.properties)
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
  
export class RolesPropertiesResponseDTO {
  __props: RolesResponse['properties']
  __data

  constructor(props: RolesResponse['properties']) {
    this.__props = props
    this.__data = {
      employees: this.__props['Employees'],
      active: this.__props['Active'],
      requiredPerDay: this.__props['Required per Day'],
      department: this.__props['Department'],
      role: this.__props['Role'],
    }
  }


  get employeesIds() {
    return (this.__props['Employees']?.relation as unknown as Array<{ id: string }>).map((item) => item.id)  
  }


  get active() {
    return this.__props['Active']?.checkbox
  }

  get requiredPerDay() {
    return this.__props['Required per Day']?.number
  }

  get department() {
    return this.__props['Department']?.select
  }

  get role() {
    return {
      text: this.__props['Role']?.title ? this.__props['Role'].title.reduce((acc, item) => acc + item.plain_text, '') : undefined,
      links: this.__props['Role']?.title ? this.__props['Role'].title.filter((item) => item.href?.length).map((item) => item.href) : [],
      title: this.__props['Role']?.title,
    }
  }
}
