import { SuppliersResponse } from "./types"

export class SuppliersResponseDTO {
  __data: SuppliersResponse
  id: SuppliersResponse['id']
  title: SuppliersResponse['title']
  description: SuppliersResponse['description']
  parent: SuppliersResponse['parent']
  createdBy: SuppliersResponse['created_by']
  lastEditedBy: SuppliersResponse['last_edited_by']
  createdTime: SuppliersResponse['created_time']
  lastEditedTime: SuppliersResponse['last_edited_time']
  isInline: SuppliersResponse['is_inline']
  archived: SuppliersResponse['archived']
  url: SuppliersResponse['url']
  publicUrl: SuppliersResponse['public_url']
  properties: SuppliersPropertiesResponseDTO

  constructor(res: SuppliersResponse) {
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
    this.properties = new SuppliersPropertiesResponseDTO(res.properties)
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
  
export class SuppliersPropertiesResponseDTO {
  __props: SuppliersResponse['properties']
  __data

  constructor(props: SuppliersResponse['properties']) {
    this.__props = props
    this.__data = {
      website: this.__props['Website'],
      location: this.__props['Location'],
      phone: this.__props['Phone'],
      bankDetails: this.__props['Bank Details'],
      category: this.__props['Category'],
      contactPerson: this.__props['Contact Person'],
      scanPicture: this.__props['Scan picture'],
      email: this.__props['Email'],
      name: this.__props['Name'],
    }
  }


  get website() {
    return this.__props['Website']?.url
  }

  get location() {
    return {
      text: this.__props['Location']?.rich_text ? this.__props['Location'].rich_text.reduce((acc, item) => acc + item.plain_text, '') : undefined,
      links: this.__props['Location']?.rich_text ? this.__props['Location'].rich_text.filter((item) => item.href?.length).map((item) => item.href) : [],
      rich_text: this.__props['Location']?.rich_text,
    }
  }

  get phone() {
    return this.__props['Phone']?.phone_number
  }

  get bankDetails() {
    return {
      text: this.__props['Bank Details']?.rich_text ? this.__props['Bank Details'].rich_text.reduce((acc, item) => acc + item.plain_text, '') : undefined,
      links: this.__props['Bank Details']?.rich_text ? this.__props['Bank Details'].rich_text.filter((item) => item.href?.length).map((item) => item.href) : [],
      rich_text: this.__props['Bank Details']?.rich_text,
    }
  }
  get category() {
    return {
      values: this.__props['Category']?.multi_select ? this.__props['Category'].multi_select.map((item) => item.name) : [],
      multi_select: this.__props['Category']?.multi_select,
    }
  }

  get contactPerson() {
    return {
      text: this.__props['Contact Person']?.rich_text ? this.__props['Contact Person'].rich_text.reduce((acc, item) => acc + item.plain_text, '') : undefined,
      links: this.__props['Contact Person']?.rich_text ? this.__props['Contact Person'].rich_text.filter((item) => item.href?.length).map((item) => item.href) : [],
      rich_text: this.__props['Contact Person']?.rich_text,
    }
  }

  get scanPicture() {
    return {
      urls: this.__props['Scan picture'].files.map((item) => 
        item.type === 'external' ? item.external.url : item.type === 'file' ? item.file.url : undefined
      ),
    }
  }


  get email() {
    return this.__props['Email']?.email
  }

  get name() {
    return {
      text: this.__props['Name']?.title ? this.__props['Name'].title.reduce((acc, item) => acc + item.plain_text, '') : undefined,
      links: this.__props['Name']?.title ? this.__props['Name'].title.filter((item) => item.href?.length).map((item) => item.href) : [],
      title: this.__props['Name']?.title,
    }
  }
}
