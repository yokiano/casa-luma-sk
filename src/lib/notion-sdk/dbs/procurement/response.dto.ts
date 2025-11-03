import { ProcurementResponse } from "./types"

export class ProcurementResponseDTO {
  __data: ProcurementResponse
  id: ProcurementResponse['id']
  title: ProcurementResponse['title']
  description: ProcurementResponse['description']
  parent: ProcurementResponse['parent']
  createdBy: ProcurementResponse['created_by']
  lastEditedBy: ProcurementResponse['last_edited_by']
  createdTime: ProcurementResponse['created_time']
  lastEditedTime: ProcurementResponse['last_edited_time']
  isInline: ProcurementResponse['is_inline']
  archived: ProcurementResponse['archived']
  url: ProcurementResponse['url']
  publicUrl: ProcurementResponse['public_url']
  properties: ProcurementPropertiesResponseDTO

  constructor(res: ProcurementResponse) {
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
    this.properties = new ProcurementPropertiesResponseDTO(res.properties)
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
  
export class ProcurementPropertiesResponseDTO {
  __props: ProcurementResponse['properties']
  __data

  constructor(props: ProcurementResponse['properties']) {
    this.__props = props
    this.__data = {
      supplier: this.__props['Supplier'],
      parentItem: this.__props['Parent item'],
      link: this.__props['Link'],
      trackingNumber: this.__props['Tracking Number'],
      department: this.__props['Department'],
      notes: this.__props['Notes'],
      invoice: this.__props['Invoice'],
      tags: this.__props['Tags'],
      totalPrice: this.__props['Total Price'],
      priceThb: this.__props['Price (THB)'],
      subItem: this.__props['Sub-item'],
      paidFrom: this.__props['Paid From'],
      image: this.__props['Image'],
      price_1010: this.__props['Price 10/10'],
      quantity: this.__props['Quantity'],
      objectCategory: this.__props['Object Category'],
      status: this.__props['Status'],
      item: this.__props['Item'],
      createdBy: this.__props['Created by'],
      lastEditedBy: this.__props['Last edited by'],
      createdTime: this.__props['Created time'],
      lastEditedTime: this.__props['Last edited time'],
    }
  }


  get supplier() {
    return {
      text: this.__props['Supplier']?.rich_text ? this.__props['Supplier'].rich_text.reduce((acc, item) => acc + item.plain_text, '') : undefined,
      links: this.__props['Supplier']?.rich_text ? this.__props['Supplier'].rich_text.filter((item) => item.href?.length).map((item) => item.href) : [],
      rich_text: this.__props['Supplier']?.rich_text,
    }
  }

  get parentItemIds() {
    return (this.__props['Parent item']?.relation as unknown as Array<{ id: string }>).map((item) => item.id)  
  }


  get link() {
    return {
      text: this.__props['Link']?.rich_text ? this.__props['Link'].rich_text.reduce((acc, item) => acc + item.plain_text, '') : undefined,
      links: this.__props['Link']?.rich_text ? this.__props['Link'].rich_text.filter((item) => item.href?.length).map((item) => item.href) : [],
      rich_text: this.__props['Link']?.rich_text,
    }
  }

  get trackingNumber() {
    return {
      text: this.__props['Tracking Number']?.rich_text ? this.__props['Tracking Number'].rich_text.reduce((acc, item) => acc + item.plain_text, '') : undefined,
      links: this.__props['Tracking Number']?.rich_text ? this.__props['Tracking Number'].rich_text.filter((item) => item.href?.length).map((item) => item.href) : [],
      rich_text: this.__props['Tracking Number']?.rich_text,
    }
  }
  get department() {
    return {
      values: this.__props['Department']?.multi_select ? this.__props['Department'].multi_select.map((item) => item.name) : [],
      multi_select: this.__props['Department']?.multi_select,
    }
  }

  get notes() {
    return {
      text: this.__props['Notes']?.rich_text ? this.__props['Notes'].rich_text.reduce((acc, item) => acc + item.plain_text, '') : undefined,
      links: this.__props['Notes']?.rich_text ? this.__props['Notes'].rich_text.filter((item) => item.href?.length).map((item) => item.href) : [],
      rich_text: this.__props['Notes']?.rich_text,
    }
  }

  get invoice() {
    return {
      urls: this.__props['Invoice'].files.map((item) => 
        item.type === 'external' ? item.external.url : item.type === 'file' ? item.file.url : undefined
      ),
    }
  }

  get tags() {
    return {
      values: this.__props['Tags']?.multi_select ? this.__props['Tags'].multi_select.map((item) => item.name) : [],
      multi_select: this.__props['Tags']?.multi_select,
    }
  }

  get totalPrice() {
    return this.__props['Total Price']?.formula
  }

  get priceThb() {
    return this.__props['Price (THB)']?.number
  }

  get subItemIds() {
    return (this.__props['Sub-item']?.relation as unknown as Array<{ id: string }>).map((item) => item.id)  
  }


  get paidFrom() {
    return this.__props['Paid From']?.select
  }

  get image() {
    return {
      urls: this.__props['Image'].files.map((item) => 
        item.type === 'external' ? item.external.url : item.type === 'file' ? item.file.url : undefined
      ),
    }
  }


  get price_1010() {
    return this.__props['Price 10/10']?.number
  }

  get quantity() {
    return this.__props['Quantity']?.number
  }
  get objectCategory() {
    return {
      values: this.__props['Object Category']?.multi_select ? this.__props['Object Category'].multi_select.map((item) => item.name) : [],
      multi_select: this.__props['Object Category']?.multi_select,
    }
  }

  get status() {
    return this.__props['Status']?.status
  }

  get item() {
    return {
      text: this.__props['Item']?.title ? this.__props['Item'].title.reduce((acc, item) => acc + item.plain_text, '') : undefined,
      links: this.__props['Item']?.title ? this.__props['Item'].title.filter((item) => item.href?.length).map((item) => item.href) : [],
      title: this.__props['Item']?.title,
    }
  }

  get createdBy() {
    return this.__props['Created by']?.created_by
  }

  get lastEditedBy() {
    return this.__props['Last edited by']?.last_edited_by
  }

  get createdTime() {
    return this.__props['Created time']?.created_time
  }

  get lastEditedTime() {
    return this.__props['Last edited time']?.last_edited_time
  }
}
