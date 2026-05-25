import { CasaLumaEventsResponse } from "./types"

export class CasaLumaEventsResponseDTO {
  __data: CasaLumaEventsResponse
  id: CasaLumaEventsResponse['id']
  title: CasaLumaEventsResponse['title']
  description: CasaLumaEventsResponse['description']
  parent: CasaLumaEventsResponse['parent']
  createdBy: CasaLumaEventsResponse['created_by']
  lastEditedBy: CasaLumaEventsResponse['last_edited_by']
  createdTime: CasaLumaEventsResponse['created_time']
  lastEditedTime: CasaLumaEventsResponse['last_edited_time']
  isInline: CasaLumaEventsResponse['is_inline']
  archived: CasaLumaEventsResponse['archived']
  url: CasaLumaEventsResponse['url']
  publicUrl: CasaLumaEventsResponse['public_url']
  properties: CasaLumaEventsPropertiesResponseDTO

  constructor(res: CasaLumaEventsResponse) {
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
    this.properties = new CasaLumaEventsPropertiesResponseDTO(res.properties)
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
  
export class CasaLumaEventsPropertiesResponseDTO {
  __props: CasaLumaEventsResponse['properties']
  __data

  constructor(props: CasaLumaEventsResponse['properties']) {
    this.__props = props
    this.__data = {
      status: this.__props['Status'],
      price: this.__props['Price'],
      waitlistEntries: this.__props['Waitlist Entries'],
      shortDescription: this.__props['Short Description'],
      language: this.__props['Language'],
      availableSpots: this.__props['Available Spots'],
      gallery: this.__props['Gallery'],
      description: this.__props['Description'],
      featuredImage: this.__props['Featured Image'],
      slug: this.__props['Slug'],
      requirements: this.__props['Requirements'],
      registrationStatus: this.__props['Registration Status'],
      recurrenceType: this.__props['Recurrence Type'],
      capacity: this.__props['Capacity'],
      date: this.__props['Date'],
      endDate: this.__props['End Date'],
      rsvPs: this.__props['RSVPs'],
      location: this.__props['Location'],
      instructor: this.__props['Instructor'],
      eventType: this.__props['Event Type'],
      tags: this.__props['Tags'],
      eventName: this.__props['Event Name'],
      created: this.__props['Created'],
      updated: this.__props['Updated'],
    }
  }


  get status() {
    return this.__props['Status']?.select
  }

  get price() {
    return this.__props['Price']?.number
  }

  get waitlistEntriesIds() {
    return (this.__props['Waitlist Entries']?.relation as unknown as Array<{ id: string }>).map((item) => item.id)  
  }


  get shortDescription() {
    return {
      text: this.__props['Short Description']?.rich_text ? this.__props['Short Description'].rich_text.reduce((acc, item) => acc + item.plain_text, '') : undefined,
      links: this.__props['Short Description']?.rich_text ? this.__props['Short Description'].rich_text.filter((item) => item.href?.length).map((item) => item.href) : [],
      rich_text: this.__props['Short Description']?.rich_text,
    }
  }

  get language() {
    return this.__props['Language']?.select
  }

  get availableSpots() {
    return this.__props['Available Spots']?.formula
  }

  get gallery() {
    return {
      urls: this.__props['Gallery'].files.map((item) => 
        item.type === 'external' ? item.external.url : item.type === 'file' ? item.file.url : undefined
      ),
    }
  }


  get description() {
    return {
      text: this.__props['Description']?.rich_text ? this.__props['Description'].rich_text.reduce((acc, item) => acc + item.plain_text, '') : undefined,
      links: this.__props['Description']?.rich_text ? this.__props['Description'].rich_text.filter((item) => item.href?.length).map((item) => item.href) : [],
      rich_text: this.__props['Description']?.rich_text,
    }
  }

  get featuredImage() {
    return {
      urls: this.__props['Featured Image'].files.map((item) => 
        item.type === 'external' ? item.external.url : item.type === 'file' ? item.file.url : undefined
      ),
    }
  }


  get slug() {
    return this.__props['Slug']?.formula
  }

  get requirements() {
    return {
      text: this.__props['Requirements']?.rich_text ? this.__props['Requirements'].rich_text.reduce((acc, item) => acc + item.plain_text, '') : undefined,
      links: this.__props['Requirements']?.rich_text ? this.__props['Requirements'].rich_text.filter((item) => item.href?.length).map((item) => item.href) : [],
      rich_text: this.__props['Requirements']?.rich_text,
    }
  }

  get registrationStatus() {
    return this.__props['Registration Status']?.select
  }

  get recurrenceType() {
    return this.__props['Recurrence Type']?.select
  }

  get capacity() {
    return this.__props['Capacity']?.number
  }

  get date() {
    return this.__props['Date']?.date
  }

  get endDate() {
    return this.__props['End Date']?.date
  }

  get rsvPsIds() {
    return (this.__props['RSVPs']?.relation as unknown as Array<{ id: string }>).map((item) => item.id)  
  }


  get location() {
    return this.__props['Location']?.select
  }

  get instructor() {
    return this.__props['Instructor']?.people
  }

  get eventType() {
    return this.__props['Event Type']?.select
  }
  get tags() {
    return {
      values: this.__props['Tags']?.multi_select ? this.__props['Tags'].multi_select.map((item) => item.name) : [],
      multi_select: this.__props['Tags']?.multi_select,
    }
  }

  get eventName() {
    return {
      text: this.__props['Event Name']?.title ? this.__props['Event Name'].title.reduce((acc, item) => acc + item.plain_text, '') : undefined,
      links: this.__props['Event Name']?.title ? this.__props['Event Name'].title.filter((item) => item.href?.length).map((item) => item.href) : [],
      title: this.__props['Event Name']?.title,
    }
  }

  get created() {
    return this.__props['Created']?.created_time
  }

  get updated() {
    return this.__props['Updated']?.last_edited_time
  }
}
