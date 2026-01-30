import { ExpensesTrackerResponse } from "./types"

export class ExpensesTrackerResponseDTO {
  __data: ExpensesTrackerResponse
  id: ExpensesTrackerResponse['id']
  title: ExpensesTrackerResponse['title']
  description: ExpensesTrackerResponse['description']
  parent: ExpensesTrackerResponse['parent']
  createdBy: ExpensesTrackerResponse['created_by']
  lastEditedBy: ExpensesTrackerResponse['last_edited_by']
  createdTime: ExpensesTrackerResponse['created_time']
  lastEditedTime: ExpensesTrackerResponse['last_edited_time']
  isInline: ExpensesTrackerResponse['is_inline']
  archived: ExpensesTrackerResponse['archived']
  url: ExpensesTrackerResponse['url']
  publicUrl: ExpensesTrackerResponse['public_url']
  properties: ExpensesTrackerPropertiesResponseDTO

  constructor(res: ExpensesTrackerResponse) {
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
    this.properties = new ExpensesTrackerPropertiesResponseDTO(res.properties)
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
  
export class ExpensesTrackerPropertiesResponseDTO {
  __props: ExpensesTrackerResponse['properties']
  __data

  constructor(props: ExpensesTrackerResponse['properties']) {
    this.__props = props
    this.__data = {
      category: this.__props['Category'],
      paymentMethod: this.__props['Payment Method'],
      team: this.__props['Team'],
      date: this.__props['Date'],
      department: this.__props['Department'],
      procurementItem: this.__props['Procurement Item'],
      inFavorOf: this.__props['In favor of'],
      status: this.__props['Status'],
      paidBy: this.__props['Paid By'],
      amountThb: this.__props['Amount (THB)'],
      supplier: this.__props['Supplier'],
      invoiceReceipt: this.__props['Invoice / Receipt'],
      expense: this.__props['Expense'],
      referenceNumber: this.__props['Reference Number'],
      notes: this.__props['Notes'],
      createdBy: this.__props['Created by'],
      lastEditedBy: this.__props['Last edited by'],
      lastEditedTime: this.__props['Last edited time'],
      createdTime: this.__props['Created time'],
    }
  }


  get category() {
    return this.__props['Category']?.select
  }

  get paymentMethod() {
    return this.__props['Payment Method']?.select
  }

  get team() {
    return this.__props['Team']?.formula
  }

  get date() {
    return this.__props['Date']?.date
  }

  get department() {
    return this.__props['Department']?.select
  }

  get procurementItemIds() {
    return (this.__props['Procurement Item']?.relation as unknown as Array<{ id: string }>).map((item) => item.id)  
  }


  get inFavorOf() {
    return this.__props['In favor of']?.people
  }

  get status() {
    return this.__props['Status']?.status
  }

  get paidBy() {
    return this.__props['Paid By']?.select
  }

  get amountThb() {
    return this.__props['Amount (THB)']?.number
  }

  get supplierIds() {
    return (this.__props['Supplier']?.relation as unknown as Array<{ id: string }>).map((item) => item.id)  
  }


  get invoiceReceipt() {
    return {
      urls: this.__props['Invoice / Receipt'].files.map((item) => 
        item.type === 'external' ? item.external.url : item.type === 'file' ? item.file.url : undefined
      ),
    }
  }


  get expense() {
    return {
      text: this.__props['Expense']?.title ? this.__props['Expense'].title.reduce((acc, item) => acc + item.plain_text, '') : undefined,
      links: this.__props['Expense']?.title ? this.__props['Expense'].title.filter((item) => item.href?.length).map((item) => item.href) : [],
      title: this.__props['Expense']?.title,
    }
  }

  get referenceNumber() {
    return {
      text: this.__props['Reference Number']?.rich_text ? this.__props['Reference Number'].rich_text.reduce((acc, item) => acc + item.plain_text, '') : undefined,
      links: this.__props['Reference Number']?.rich_text ? this.__props['Reference Number'].rich_text.filter((item) => item.href?.length).map((item) => item.href) : [],
      rich_text: this.__props['Reference Number']?.rich_text,
    }
  }

  get notes() {
    return {
      text: this.__props['Notes']?.rich_text ? this.__props['Notes'].rich_text.reduce((acc, item) => acc + item.plain_text, '') : undefined,
      links: this.__props['Notes']?.rich_text ? this.__props['Notes'].rich_text.filter((item) => item.href?.length).map((item) => item.href) : [],
      rich_text: this.__props['Notes']?.rich_text,
    }
  }

  get createdBy() {
    return this.__props['Created by']?.created_by
  }

  get lastEditedBy() {
    return this.__props['Last edited by']?.last_edited_by
  }

  get lastEditedTime() {
    return this.__props['Last edited time']?.last_edited_time
  }

  get createdTime() {
    return this.__props['Created time']?.created_time
  }
}
