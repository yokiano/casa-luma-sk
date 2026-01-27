import { SalaryAdjustmentsResponse } from "./types"

export class SalaryAdjustmentsResponseDTO {
  __data: SalaryAdjustmentsResponse
  id: SalaryAdjustmentsResponse['id']
  title: SalaryAdjustmentsResponse['title']
  description: SalaryAdjustmentsResponse['description']
  parent: SalaryAdjustmentsResponse['parent']
  createdBy: SalaryAdjustmentsResponse['created_by']
  lastEditedBy: SalaryAdjustmentsResponse['last_edited_by']
  createdTime: SalaryAdjustmentsResponse['created_time']
  lastEditedTime: SalaryAdjustmentsResponse['last_edited_time']
  isInline: SalaryAdjustmentsResponse['is_inline']
  archived: SalaryAdjustmentsResponse['archived']
  url: SalaryAdjustmentsResponse['url']
  publicUrl: SalaryAdjustmentsResponse['public_url']
  properties: SalaryAdjustmentsPropertiesResponseDTO

  constructor(res: SalaryAdjustmentsResponse) {
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
    this.properties = new SalaryAdjustmentsPropertiesResponseDTO(res.properties)
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
  
export class SalaryAdjustmentsPropertiesResponseDTO {
  __props: SalaryAdjustmentsResponse['properties']
  __data

  constructor(props: SalaryAdjustmentsResponse['properties']) {
    this.__props = props
    this.__data = {
      adjustmentType: this.__props['Adjustment Type'],
      employee: this.__props['Employee'],
      appliedToPayment: this.__props['Applied to Payment'],
      notes: this.__props['Notes'],
      approvedBy: this.__props['Approved By'],
      date: this.__props['Date'],
      amountThb: this.__props['Amount (THB)'],
      adjustmentTitle: this.__props['Adjustment Title'],
    }
  }


  get adjustmentType() {
    return this.__props['Adjustment Type']?.select
  }

  get employeeIds() {
    return (this.__props['Employee']?.relation as unknown as Array<{ id: string }>).map((item) => item.id)  
  }


  get appliedToPaymentIds() {
    return (this.__props['Applied to Payment']?.relation as unknown as Array<{ id: string }>).map((item) => item.id)  
  }


  get notes() {
    return {
      text: this.__props['Notes']?.rich_text ? this.__props['Notes'].rich_text.reduce((acc, item) => acc + item.plain_text, '') : undefined,
      links: this.__props['Notes']?.rich_text ? this.__props['Notes'].rich_text.filter((item) => item.href?.length).map((item) => item.href) : [],
      rich_text: this.__props['Notes']?.rich_text,
    }
  }

  get approvedBy() {
    return this.__props['Approved By']?.select
  }

  get date() {
    return this.__props['Date']?.date
  }

  get amountThb() {
    return this.__props['Amount (THB)']?.number
  }

  get adjustmentTitle() {
    return {
      text: this.__props['Adjustment Title']?.title ? this.__props['Adjustment Title'].title.reduce((acc, item) => acc + item.plain_text, '') : undefined,
      links: this.__props['Adjustment Title']?.title ? this.__props['Adjustment Title'].title.filter((item) => item.href?.length).map((item) => item.href) : [],
      title: this.__props['Adjustment Title']?.title,
    }
  }
}
