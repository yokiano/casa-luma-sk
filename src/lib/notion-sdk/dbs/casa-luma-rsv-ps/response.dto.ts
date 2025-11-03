import { CasaLumaRsvPsResponse } from "./types"

export class CasaLumaRsvPsResponseDTO {
  __data: CasaLumaRsvPsResponse
  id: CasaLumaRsvPsResponse['id']
  title: CasaLumaRsvPsResponse['title']
  description: CasaLumaRsvPsResponse['description']
  parent: CasaLumaRsvPsResponse['parent']
  createdBy: CasaLumaRsvPsResponse['created_by']
  lastEditedBy: CasaLumaRsvPsResponse['last_edited_by']
  createdTime: CasaLumaRsvPsResponse['created_time']
  lastEditedTime: CasaLumaRsvPsResponse['last_edited_time']
  isInline: CasaLumaRsvPsResponse['is_inline']
  archived: CasaLumaRsvPsResponse['archived']
  url: CasaLumaRsvPsResponse['url']
  publicUrl: CasaLumaRsvPsResponse['public_url']
  properties: CasaLumaRsvPsPropertiesResponseDTO

  constructor(res: CasaLumaRsvPsResponse) {
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
    this.properties = new CasaLumaRsvPsPropertiesResponseDTO(res.properties)
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
  
export class CasaLumaRsvPsPropertiesResponseDTO {
  __props: CasaLumaRsvPsResponse['properties']
  __data

  constructor(props: CasaLumaRsvPsResponse['properties']) {
    this.__props = props
    this.__data = {
      notes: this.__props['Notes'],
      dietaryRestrictions: this.__props['Dietary Restrictions'],
      source: this.__props['Source'],
      confirmedAt: this.__props['Confirmed At'],
      numberOfGuests: this.__props['Number of Guests'],
      status: this.__props['Status'],
      phone: this.__props['Phone'],
      event: this.__props['Event'],
      email: this.__props['Email'],
      checkInStatus: this.__props['Check-in Status'],
      guestName: this.__props['Guest Name'],
      internalNotes: this.__props['Internal Notes'],
      paymentStatus: this.__props['Payment Status'],
      rsvpId: this.__props['RSVP ID'],
      createdAt: this.__props['Created At'],
    }
  }


  get notes() {
    return {
      text: this.__props['Notes']?.rich_text ? this.__props['Notes'].rich_text.reduce((acc, item) => acc + item.plain_text, '') : undefined,
      links: this.__props['Notes']?.rich_text ? this.__props['Notes'].rich_text.filter((item) => item.href?.length).map((item) => item.href) : [],
      rich_text: this.__props['Notes']?.rich_text,
    }
  }
  get dietaryRestrictions() {
    return {
      values: this.__props['Dietary Restrictions']?.multi_select ? this.__props['Dietary Restrictions'].multi_select.map((item) => item.name) : [],
      multi_select: this.__props['Dietary Restrictions']?.multi_select,
    }
  }

  get source() {
    return this.__props['Source']?.select
  }

  get confirmedAt() {
    return this.__props['Confirmed At']?.date
  }

  get numberOfGuests() {
    return this.__props['Number of Guests']?.number
  }

  get status() {
    return this.__props['Status']?.select
  }

  get phone() {
    return this.__props['Phone']?.phone_number
  }

  get eventIds() {
    return (this.__props['Event']?.relation as unknown as Array<{ id: string }>).map((item) => item.id)  
  }


  get email() {
    return this.__props['Email']?.email
  }

  get checkInStatus() {
    return this.__props['Check-in Status']?.checkbox
  }

  get guestName() {
    return {
      text: this.__props['Guest Name']?.rich_text ? this.__props['Guest Name'].rich_text.reduce((acc, item) => acc + item.plain_text, '') : undefined,
      links: this.__props['Guest Name']?.rich_text ? this.__props['Guest Name'].rich_text.filter((item) => item.href?.length).map((item) => item.href) : [],
      rich_text: this.__props['Guest Name']?.rich_text,
    }
  }

  get internalNotes() {
    return {
      text: this.__props['Internal Notes']?.rich_text ? this.__props['Internal Notes'].rich_text.reduce((acc, item) => acc + item.plain_text, '') : undefined,
      links: this.__props['Internal Notes']?.rich_text ? this.__props['Internal Notes'].rich_text.filter((item) => item.href?.length).map((item) => item.href) : [],
      rich_text: this.__props['Internal Notes']?.rich_text,
    }
  }

  get paymentStatus() {
    return this.__props['Payment Status']?.select
  }

  get rsvpId() {
    return {
      text: this.__props['RSVP ID']?.title ? this.__props['RSVP ID'].title.reduce((acc, item) => acc + item.plain_text, '') : undefined,
      links: this.__props['RSVP ID']?.title ? this.__props['RSVP ID'].title.filter((item) => item.href?.length).map((item) => item.href) : [],
      title: this.__props['RSVP ID']?.title,
    }
  }

  get createdAt() {
    return this.__props['Created At']?.created_time
  }
}
