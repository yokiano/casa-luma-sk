import { CompanyLedgerResponse } from "./types"

export class CompanyLedgerResponseDTO {
  __data: CompanyLedgerResponse
  id: CompanyLedgerResponse['id']
  title: CompanyLedgerResponse['title']
  description: CompanyLedgerResponse['description']
  parent: CompanyLedgerResponse['parent']
  createdBy: CompanyLedgerResponse['created_by']
  lastEditedBy: CompanyLedgerResponse['last_edited_by']
  createdTime: CompanyLedgerResponse['created_time']
  lastEditedTime: CompanyLedgerResponse['last_edited_time']
  isInline: CompanyLedgerResponse['is_inline']
  archived: CompanyLedgerResponse['archived']
  url: CompanyLedgerResponse['url']
  publicUrl: CompanyLedgerResponse['public_url']
  properties: CompanyLedgerPropertiesResponseDTO

  constructor(res: CompanyLedgerResponse) {
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
    this.properties = new CompanyLedgerPropertiesResponseDTO(res.properties)
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
  
export class CompanyLedgerPropertiesResponseDTO {
  __props: CompanyLedgerResponse['properties']
  __data

  constructor(props: CompanyLedgerResponse['properties']) {
    this.__props = props
    this.__data = {
      type: this.__props['Type'],
      amountThb: this.__props['Amount (THB)'],
      notes: this.__props['Notes'],
      date: this.__props['Date'],
      supplier: this.__props['Supplier'],
      status: this.__props['Status'],
      referenceNumber: this.__props['Reference Number'],
      department: this.__props['Department'],
      invoiceReceipt: this.__props['Invoice / Receipt'],
      owner: this.__props['Approved By'],
      paymentMethod: this.__props['Payment Method'],
      category: this.__props['Category'],
      bankAccount: this.__props['Bank Account'],
      description: this.__props['Description'],
      createdBy: this.__props['Created by'],
      lastEditedTime: this.__props['Last edited time'],
      createdTime: this.__props['Created time'],
      lastEditedBy: this.__props['Last edited by'],
    }
  }


  get type() {
    return this.__props['Type']?.select
  }

  get amountThb() {
    return this.__props['Amount (THB)']?.number
  }

  get notes() {
    return {
      text: this.__props['Notes']?.rich_text ? this.__props['Notes'].rich_text.reduce((acc, item) => acc + item.plain_text, '') : undefined,
      links: this.__props['Notes']?.rich_text ? this.__props['Notes'].rich_text.filter((item) => item.href?.length).map((item) => item.href) : [],
      rich_text: this.__props['Notes']?.rich_text,
    }
  }

  get date() {
    return this.__props['Date']?.date
  }

  get supplierIds() {
    return (this.__props['Supplier']?.relation as unknown as Array<{ id: string }>).map((item) => item.id)  
  }


  get status() {
    return this.__props['Status']?.status
  }

  get referenceNumber() {
    return {
      text: this.__props['Reference Number']?.rich_text ? this.__props['Reference Number'].rich_text.reduce((acc, item) => acc + item.plain_text, '') : undefined,
      links: this.__props['Reference Number']?.rich_text ? this.__props['Reference Number'].rich_text.filter((item) => item.href?.length).map((item) => item.href) : [],
      rich_text: this.__props['Reference Number']?.rich_text,
    }
  }

  get department() {
    return this.__props['Department']?.select
  }

  get invoiceReceipt() {
    return {
      urls: this.__props['Invoice / Receipt'].files.map((item) => 
        item.type === 'external' ? item.external.url : item.type === 'file' ? item.file.url : undefined
      ),
    }
  }


  get owner() {
    return this.__props['Approved By']?.select
  }

  get paymentMethod() {
    return this.__props['Payment Method']?.select
  }

  get category() {
    return this.__props['Category']?.select
  }

  get bankAccount() {
    return this.__props['Bank Account']?.select
  }

  get description() {
    return {
      text: this.__props['Description']?.title ? this.__props['Description'].title.reduce((acc, item) => acc + item.plain_text, '') : undefined,
      links: this.__props['Description']?.title ? this.__props['Description'].title.filter((item) => item.href?.length).map((item) => item.href) : [],
      title: this.__props['Description']?.title,
    }
  }

  get createdBy() {
    return this.__props['Created by']?.created_by
  }

  get lastEditedTime() {
    return this.__props['Last edited time']?.last_edited_time
  }

  get createdTime() {
    return this.__props['Created time']?.created_time
  }

  get lastEditedBy() {
    return this.__props['Last edited by']?.last_edited_by
  }
}
