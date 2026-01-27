import { SalaryPaymentsResponse } from "./types"

export class SalaryPaymentsResponseDTO {
  __data: SalaryPaymentsResponse
  id: SalaryPaymentsResponse['id']
  title: SalaryPaymentsResponse['title']
  description: SalaryPaymentsResponse['description']
  parent: SalaryPaymentsResponse['parent']
  createdBy: SalaryPaymentsResponse['created_by']
  lastEditedBy: SalaryPaymentsResponse['last_edited_by']
  createdTime: SalaryPaymentsResponse['created_time']
  lastEditedTime: SalaryPaymentsResponse['last_edited_time']
  isInline: SalaryPaymentsResponse['is_inline']
  archived: SalaryPaymentsResponse['archived']
  url: SalaryPaymentsResponse['url']
  publicUrl: SalaryPaymentsResponse['public_url']
  properties: SalaryPaymentsPropertiesResponseDTO

  constructor(res: SalaryPaymentsResponse) {
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
    this.properties = new SalaryPaymentsPropertiesResponseDTO(res.properties)
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
  
export class SalaryPaymentsPropertiesResponseDTO {
  __props: SalaryPaymentsResponse['properties']
  __data

  constructor(props: SalaryPaymentsResponse['properties']) {
    this.__props = props
    this.__data = {
      notes: this.__props['Notes'],
      baseSalaryThb: this.__props['Base Salary (THB)'],
      paySlip: this.__props['Pay Slip'],
      paymentDate: this.__props['Payment Date'],
      employee: this.__props['Employee'],
      advancesThb: this.__props['Advances (THB)'],
      otAmountThb: this.__props['OT Amount (THB)'],
      totalPaidThb: this.__props['Total Paid (THB)'],
      deductionsThb: this.__props['Deductions (THB)'],
      paymentTitle: this.__props['Payment Title'],
    }
  }


  get notes() {
    return {
      text: this.__props['Notes']?.rich_text ? this.__props['Notes'].rich_text.reduce((acc, item) => acc + item.plain_text, '') : undefined,
      links: this.__props['Notes']?.rich_text ? this.__props['Notes'].rich_text.filter((item) => item.href?.length).map((item) => item.href) : [],
      rich_text: this.__props['Notes']?.rich_text,
    }
  }

  get baseSalaryThb() {
    return this.__props['Base Salary (THB)']?.number
  }

  get paySlip() {
    return {
      urls: this.__props['Pay Slip'].files.map((item) => 
        item.type === 'external' ? item.external.url : item.type === 'file' ? item.file.url : undefined
      ),
    }
  }


  get paymentDate() {
    return this.__props['Payment Date']?.date
  }

  get employeeIds() {
    return (this.__props['Employee']?.relation as unknown as Array<{ id: string }>).map((item) => item.id)  
  }


  get advancesThb() {
    return this.__props['Advances (THB)']?.number
  }

  get otAmountThb() {
    return this.__props['OT Amount (THB)']?.number
  }

  get totalPaidThb() {
    return this.__props['Total Paid (THB)']?.number
  }

  get deductionsThb() {
    return this.__props['Deductions (THB)']?.number
  }

  get paymentTitle() {
    return {
      text: this.__props['Payment Title']?.title ? this.__props['Payment Title'].title.reduce((acc, item) => acc + item.plain_text, '') : undefined,
      links: this.__props['Payment Title']?.title ? this.__props['Payment Title'].title.filter((item) => item.href?.length).map((item) => item.href) : [],
      title: this.__props['Payment Title']?.title,
    }
  }
}
