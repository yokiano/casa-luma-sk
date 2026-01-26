import { ShiftsResponse } from "./types"

export class ShiftsResponseDTO {
  __data: ShiftsResponse
  id: ShiftsResponse['id']
  title: ShiftsResponse['title']
  description: ShiftsResponse['description']
  parent: ShiftsResponse['parent']
  createdBy: ShiftsResponse['created_by']
  lastEditedBy: ShiftsResponse['last_edited_by']
  createdTime: ShiftsResponse['created_time']
  lastEditedTime: ShiftsResponse['last_edited_time']
  isInline: ShiftsResponse['is_inline']
  archived: ShiftsResponse['archived']
  url: ShiftsResponse['url']
  publicUrl: ShiftsResponse['public_url']
  properties: ShiftsPropertiesResponseDTO

  constructor(res: ShiftsResponse) {
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
    this.properties = new ShiftsPropertiesResponseDTO(res.properties)
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
  
export class ShiftsPropertiesResponseDTO {
  __props: ShiftsResponse['properties']
  __data

  constructor(props: ShiftsResponse['properties']) {
    this.__props = props
    this.__data = {
      employee: this.__props['Employee'],
      type: this.__props['Type'],
      status: this.__props['Status'],
      shiftTime: this.__props['Shift Time'],
      shiftNote: this.__props['Shift Note'],
      otApprover: this.__props['OT Approver'],
      ot: this.__props['OT'],
      role: this.__props['Role'],
    }
  }


  get employeeIds() {
    return (this.__props['Employee']?.relation as unknown as Array<{ id: string }>).map((item) => item.id)  
  }


  get type() {
    return this.__props['Type']?.select
  }

  get status() {
    return this.__props['Status']?.status
  }

  get shiftTime() {
    return this.__props['Shift Time']?.date
  }

  get shiftNote() {
    return {
      text: this.__props['Shift Note']?.title ? this.__props['Shift Note'].title.reduce((acc, item) => acc + item.plain_text, '') : undefined,
      links: this.__props['Shift Note']?.title ? this.__props['Shift Note'].title.filter((item) => item.href?.length).map((item) => item.href) : [],
      title: this.__props['Shift Note']?.title,
    }
  }
  get otApprover() {
    return {
      values: this.__props['OT Approver']?.multi_select ? this.__props['OT Approver'].multi_select.map((item) => item.name) : [],
      multi_select: this.__props['OT Approver']?.multi_select,
    }
  }

  get ot() {
    return this.__props['OT']?.number
  }

  get roleIds() {
    return (this.__props['Role']?.relation as unknown as Array<{ id: string }>).map((item) => item.id)  
  }

}
