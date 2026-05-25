import { ExpenseScanRulesResponse } from "./types"

export class ExpenseScanRulesResponseDTO {
  __data: ExpenseScanRulesResponse
  id: ExpenseScanRulesResponse['id']
  title: ExpenseScanRulesResponse['title']
  description: ExpenseScanRulesResponse['description']
  parent: ExpenseScanRulesResponse['parent']
  createdBy: ExpenseScanRulesResponse['created_by']
  lastEditedBy: ExpenseScanRulesResponse['last_edited_by']
  createdTime: ExpenseScanRulesResponse['created_time']
  lastEditedTime: ExpenseScanRulesResponse['last_edited_time']
  isInline: ExpenseScanRulesResponse['is_inline']
  archived: ExpenseScanRulesResponse['archived']
  url: ExpenseScanRulesResponse['url']
  publicUrl: ExpenseScanRulesResponse['public_url']
  properties: ExpenseScanRulesPropertiesResponseDTO

  constructor(res: ExpenseScanRulesResponse) {
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
    this.properties = new ExpenseScanRulesPropertiesResponseDTO(res.properties)
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
  
export class ExpenseScanRulesPropertiesResponseDTO {
  __props: ExpenseScanRulesResponse['properties']
  __data

  constructor(props: ExpenseScanRulesResponse['properties']) {
    this.__props = props
    this.__data = {
      categoryName: this.__props['Category Name'],
      autoSupplier: this.__props['Auto-Supplier'],
      departmentName: this.__props['Department Name'],
      recipientMatch: this.__props['Recipient Match'],
    }
  }


  get categoryName() {
    return {
      text: this.__props['Category Name']?.rich_text ? this.__props['Category Name'].rich_text.reduce((acc, item) => acc + item.plain_text, '') : undefined,
      links: this.__props['Category Name']?.rich_text ? this.__props['Category Name'].rich_text.filter((item) => item.href?.length).map((item) => item.href) : [],
      rich_text: this.__props['Category Name']?.rich_text,
    }
  }

  get autoSupplierIds() {
    return (this.__props['Auto-Supplier']?.relation as unknown as Array<{ id: string }>).map((item) => item.id)  
  }


  get departmentName() {
    return {
      text: this.__props['Department Name']?.rich_text ? this.__props['Department Name'].rich_text.reduce((acc, item) => acc + item.plain_text, '') : undefined,
      links: this.__props['Department Name']?.rich_text ? this.__props['Department Name'].rich_text.filter((item) => item.href?.length).map((item) => item.href) : [],
      rich_text: this.__props['Department Name']?.rich_text,
    }
  }

  get recipientMatch() {
    return {
      text: this.__props['Recipient Match']?.title ? this.__props['Recipient Match'].title.reduce((acc, item) => acc + item.plain_text, '') : undefined,
      links: this.__props['Recipient Match']?.title ? this.__props['Recipient Match'].title.filter((item) => item.href?.length).map((item) => item.href) : [],
      title: this.__props['Recipient Match']?.title,
    }
  }
}
