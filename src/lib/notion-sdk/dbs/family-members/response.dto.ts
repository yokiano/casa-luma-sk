import { FamilyMembersResponse } from "./types"

export class FamilyMembersResponseDTO {
  __data: FamilyMembersResponse
  id: FamilyMembersResponse['id']
  title: FamilyMembersResponse['title']
  description: FamilyMembersResponse['description']
  parent: FamilyMembersResponse['parent']
  createdBy: FamilyMembersResponse['created_by']
  lastEditedBy: FamilyMembersResponse['last_edited_by']
  createdTime: FamilyMembersResponse['created_time']
  lastEditedTime: FamilyMembersResponse['last_edited_time']
  isInline: FamilyMembersResponse['is_inline']
  archived: FamilyMembersResponse['archived']
  url: FamilyMembersResponse['url']
  publicUrl: FamilyMembersResponse['public_url']
  properties: FamilyMembersPropertiesResponseDTO

  constructor(res: FamilyMembersResponse) {
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
    this.properties = new FamilyMembersPropertiesResponseDTO(res.properties)
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
  
export class FamilyMembersPropertiesResponseDTO {
  __props: FamilyMembersResponse['properties']
  __data

  constructor(props: FamilyMembersResponse['properties']) {
    this.__props = props
    this.__data = {
      memberType: this.__props['Member Type'],
      contactMethod: this.__props['Contact Method'],
      caregiverRole: this.__props['Caregiver Role'],
      notes: this.__props['Notes'],
      email: this.__props['Email'],
      dob: this.__props['DOB'],
      gender: this.__props['Gender'],
      family: this.__props['Family'],
      phone: this.__props['Phone'],
      name: this.__props['Name'],
    }
  }


  get memberType() {
    return this.__props['Member Type']?.select
  }

  get contactMethod() {
    return this.__props['Contact Method']?.select
  }

  get caregiverRole() {
    return this.__props['Caregiver Role']?.select
  }

  get notes() {
    return {
      text: this.__props['Notes']?.rich_text ? this.__props['Notes'].rich_text.reduce((acc, item) => acc + item.plain_text, '') : undefined,
      links: this.__props['Notes']?.rich_text ? this.__props['Notes'].rich_text.filter((item) => item.href?.length).map((item) => item.href) : [],
      rich_text: this.__props['Notes']?.rich_text,
    }
  }

  get email() {
    return this.__props['Email']?.email
  }

  get dob() {
    return this.__props['DOB']?.date
  }

  get gender() {
    return this.__props['Gender']?.select
  }

  get familyIds() {
    return (this.__props['Family']?.relation as unknown as Array<{ id: string }>).map((item) => item.id)  
  }


  get phone() {
    return this.__props['Phone']?.phone_number
  }

  get name() {
    return {
      text: this.__props['Name']?.title ? this.__props['Name'].title.reduce((acc, item) => acc + item.plain_text, '') : undefined,
      links: this.__props['Name']?.title ? this.__props['Name'].title.filter((item) => item.href?.length).map((item) => item.href) : [],
      title: this.__props['Name']?.title,
    }
  }
}
