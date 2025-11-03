import { CasaLumaWaitlistResponse } from "./types"

export class CasaLumaWaitlistResponseDTO {
  __data: CasaLumaWaitlistResponse
  id: CasaLumaWaitlistResponse['id']
  title: CasaLumaWaitlistResponse['title']
  description: CasaLumaWaitlistResponse['description']
  parent: CasaLumaWaitlistResponse['parent']
  createdBy: CasaLumaWaitlistResponse['created_by']
  lastEditedBy: CasaLumaWaitlistResponse['last_edited_by']
  createdTime: CasaLumaWaitlistResponse['created_time']
  lastEditedTime: CasaLumaWaitlistResponse['last_edited_time']
  isInline: CasaLumaWaitlistResponse['is_inline']
  archived: CasaLumaWaitlistResponse['archived']
  url: CasaLumaWaitlistResponse['url']
  publicUrl: CasaLumaWaitlistResponse['public_url']
  properties: CasaLumaWaitlistPropertiesResponseDTO

  constructor(res: CasaLumaWaitlistResponse) {
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
    this.properties = new CasaLumaWaitlistPropertiesResponseDTO(res.properties)
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
  
export class CasaLumaWaitlistPropertiesResponseDTO {
  __props: CasaLumaWaitlistResponse['properties']
  __data

  constructor(props: CasaLumaWaitlistResponse['properties']) {
    this.__props = props
    this.__data = {
      convertedToRsvp: this.__props['Converted to RSVP'],
      phone: this.__props['Phone'],
      event: this.__props['Event'],
      notified: this.__props['Notified'],
      guestName: this.__props['Guest Name'],
      email: this.__props['Email'],
      waitlistId: this.__props['Waitlist ID'],
      addedAt: this.__props['Added At'],
    }
  }


  get convertedToRsvpIds() {
    return (this.__props['Converted to RSVP']?.relation as unknown as Array<{ id: string }>).map((item) => item.id)  
  }


  get phone() {
    return this.__props['Phone']?.phone_number
  }

  get eventIds() {
    return (this.__props['Event']?.relation as unknown as Array<{ id: string }>).map((item) => item.id)  
  }


  get notified() {
    return this.__props['Notified']?.checkbox
  }

  get guestName() {
    return {
      text: this.__props['Guest Name']?.rich_text ? this.__props['Guest Name'].rich_text.reduce((acc, item) => acc + item.plain_text, '') : undefined,
      links: this.__props['Guest Name']?.rich_text ? this.__props['Guest Name'].rich_text.filter((item) => item.href?.length).map((item) => item.href) : [],
      rich_text: this.__props['Guest Name']?.rich_text,
    }
  }

  get email() {
    return this.__props['Email']?.email
  }

  get waitlistId() {
    return {
      text: this.__props['Waitlist ID']?.title ? this.__props['Waitlist ID'].title.reduce((acc, item) => acc + item.plain_text, '') : undefined,
      links: this.__props['Waitlist ID']?.title ? this.__props['Waitlist ID'].title.filter((item) => item.href?.length).map((item) => item.href) : [],
      title: this.__props['Waitlist ID']?.title,
    }
  }

  get addedAt() {
    return this.__props['Added At']?.created_time
  }
}
