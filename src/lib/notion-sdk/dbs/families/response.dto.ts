import { FamiliesResponse } from "./types"

export class FamiliesResponseDTO {
  __data: FamiliesResponse
  id: FamiliesResponse['id']
  title: FamiliesResponse['title']
  description: FamiliesResponse['description']
  parent: FamiliesResponse['parent']
  createdBy: FamiliesResponse['created_by']
  lastEditedBy: FamiliesResponse['last_edited_by']
  createdTime: FamiliesResponse['created_time']
  lastEditedTime: FamiliesResponse['last_edited_time']
  isInline: FamiliesResponse['is_inline']
  archived: FamiliesResponse['archived']
  url: FamiliesResponse['url']
  publicUrl: FamiliesResponse['public_url']
  properties: FamiliesPropertiesResponseDTO

  constructor(res: FamiliesResponse) {
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
    this.properties = new FamiliesPropertiesResponseDTO(res.properties)
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
  
export class FamiliesPropertiesResponseDTO {
  __props: FamiliesResponse['properties']
  __data

  constructor(props: FamiliesResponse['properties']) {
    this.__props = props
    this.__data = {
      mainEmail: this.__props['Main Email'],
      livesInKohPhangan: this.__props['Lives in Koh Phangan'],
      loyverseCustomerId: this.__props['Loyverse Customer ID'],
      status: this.__props['Status'],
      nationality: this.__props['Nationality'],
      members: this.__props['Members'],
      mainPhone: this.__props['Main Phone'],
      specialNotes: this.__props['Special Notes'],
      dietaryPreferenceFamily: this.__props['Dietary Preference (Family)'],
      howDidYouHearAboutUs: this.__props['How did you hear about us?'],
      familyName: this.__props['Family Name'],
      customerNumber: this.__props['Customer Code'],
    }
  }


  get mainEmail() {
    return this.__props['Main Email']?.email
  }

  get livesInKohPhangan() {
    return this.__props['Lives in Koh Phangan']?.checkbox
  }

  get loyverseCustomerId() {
    return {
      text: this.__props['Loyverse Customer ID']?.rich_text ? this.__props['Loyverse Customer ID'].rich_text.reduce((acc, item) => acc + item.plain_text, '') : undefined,
      links: this.__props['Loyverse Customer ID']?.rich_text ? this.__props['Loyverse Customer ID'].rich_text.filter((item) => item.href?.length).map((item) => item.href) : [],
      rich_text: this.__props['Loyverse Customer ID']?.rich_text,
    }
  }

  get status() {
    return this.__props['Status']?.select
  }

  get nationality() {
    return {
      text: this.__props['Nationality']?.rich_text ? this.__props['Nationality'].rich_text.reduce((acc, item) => acc + item.plain_text, '') : undefined,
      links: this.__props['Nationality']?.rich_text ? this.__props['Nationality'].rich_text.filter((item) => item.href?.length).map((item) => item.href) : [],
      rich_text: this.__props['Nationality']?.rich_text,
    }
  }

  get membersIds() {
    return (this.__props['Members']?.relation as unknown as Array<{ id: string }>).map((item) => item.id)  
  }


  get mainPhone() {
    return this.__props['Main Phone']?.phone_number
  }

  get specialNotes() {
    return {
      text: this.__props['Special Notes']?.rich_text ? this.__props['Special Notes'].rich_text.reduce((acc, item) => acc + item.plain_text, '') : undefined,
      links: this.__props['Special Notes']?.rich_text ? this.__props['Special Notes'].rich_text.filter((item) => item.href?.length).map((item) => item.href) : [],
      rich_text: this.__props['Special Notes']?.rich_text,
    }
  }

  get dietaryPreferenceFamily() {
    return this.__props['Dietary Preference (Family)']?.select
  }

  get howDidYouHearAboutUs() {
    return this.__props['How did you hear about us?']?.select
  }

  get familyName() {
    return {
      text: this.__props['Family Name']?.title ? this.__props['Family Name'].title.reduce((acc, item) => acc + item.plain_text, '') : undefined,
      links: this.__props['Family Name']?.title ? this.__props['Family Name'].title.filter((item) => item.href?.length).map((item) => item.href) : [],
      title: this.__props['Family Name']?.title,
    }
  }

  get customerNumber() {
    return {
      text: this.__props['Customer Code']?.rich_text ? this.__props['Customer Code'].rich_text.reduce((acc, item) => acc + item.plain_text, '') : undefined,
      links: this.__props['Customer Code']?.rich_text ? this.__props['Customer Code'].rich_text.filter((item) => item.href?.length).map((item) => item.href) : [],
      rich_text: this.__props['Customer Code']?.rich_text,
    }
  }
}
