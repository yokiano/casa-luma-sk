import { FlexiPassesResponse } from "./types"

export class FlexiPassesResponseDTO {
  __data: FlexiPassesResponse
  id: FlexiPassesResponse['id']
  title: FlexiPassesResponse['title']
  description: FlexiPassesResponse['description']
  parent: FlexiPassesResponse['parent']
  createdBy: FlexiPassesResponse['created_by']
  lastEditedBy: FlexiPassesResponse['last_edited_by']
  createdTime: FlexiPassesResponse['created_time']
  lastEditedTime: FlexiPassesResponse['last_edited_time']
  isInline: FlexiPassesResponse['is_inline']
  archived: FlexiPassesResponse['archived']
  url: FlexiPassesResponse['url']
  publicUrl: FlexiPassesResponse['public_url']
  properties: FlexiPassesPropertiesResponseDTO

  constructor(res: FlexiPassesResponse) {
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
    this.properties = new FlexiPassesPropertiesResponseDTO(res.properties)
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
  
export class FlexiPassesPropertiesResponseDTO {
  __props: FlexiPassesResponse['properties']
  __data

  constructor(props: FlexiPassesResponse['properties']) {
    this.__props = props
    this.__data = {
      sourceReceiptKey: this.__props['Source Receipt Key'],
      entriesGranted: this.__props['Entries Granted'],
      sourceItemIds: this.__props['Source Item IDs'],
      loyverseCustomerId: this.__props['Loyverse Customer ID'],
      sourceLineIndexes: this.__props['Source Line Indexes'],
      notes: this.__props['Notes'],
      family: this.__props['Family'],
      entriesLeft: this.__props['Entries Left'],
      validFrom: this.__props['Valid From'],
      sourceReceiptUrl: this.__props['Source Receipt URL'],
      sourceReceiptNumber: this.__props['Source Receipt Number'],
      cardCount: this.__props['Card Count'],
      refundReceiptNumber: this.__props['Refund Receipt Number'],
      entriesUsed: this.__props['Entries Used'],
      validUntil: this.__props['Valid Until'],
      automationStatus: this.__props['Automation Status'],
      name: this.__props['Name'],
    }
  }


  get sourceReceiptKey() {
    return {
      text: this.__props['Source Receipt Key']?.rich_text ? this.__props['Source Receipt Key'].rich_text.reduce((acc, item) => acc + item.plain_text, '') : undefined,
      links: this.__props['Source Receipt Key']?.rich_text ? this.__props['Source Receipt Key'].rich_text.filter((item) => item.href?.length).map((item) => item.href) : [],
      rich_text: this.__props['Source Receipt Key']?.rich_text,
    }
  }

  get entriesGranted() {
    return this.__props['Entries Granted']?.number
  }

  get sourceItemIds() {
    return {
      text: this.__props['Source Item IDs']?.rich_text ? this.__props['Source Item IDs'].rich_text.reduce((acc, item) => acc + item.plain_text, '') : undefined,
      links: this.__props['Source Item IDs']?.rich_text ? this.__props['Source Item IDs'].rich_text.filter((item) => item.href?.length).map((item) => item.href) : [],
      rich_text: this.__props['Source Item IDs']?.rich_text,
    }
  }

  get loyverseCustomerId() {
    return {
      text: this.__props['Loyverse Customer ID']?.rich_text ? this.__props['Loyverse Customer ID'].rich_text.reduce((acc, item) => acc + item.plain_text, '') : undefined,
      links: this.__props['Loyverse Customer ID']?.rich_text ? this.__props['Loyverse Customer ID'].rich_text.filter((item) => item.href?.length).map((item) => item.href) : [],
      rich_text: this.__props['Loyverse Customer ID']?.rich_text,
    }
  }

  get sourceLineIndexes() {
    return {
      text: this.__props['Source Line Indexes']?.rich_text ? this.__props['Source Line Indexes'].rich_text.reduce((acc, item) => acc + item.plain_text, '') : undefined,
      links: this.__props['Source Line Indexes']?.rich_text ? this.__props['Source Line Indexes'].rich_text.filter((item) => item.href?.length).map((item) => item.href) : [],
      rich_text: this.__props['Source Line Indexes']?.rich_text,
    }
  }

  get notes() {
    return {
      text: this.__props['Notes']?.rich_text ? this.__props['Notes'].rich_text.reduce((acc, item) => acc + item.plain_text, '') : undefined,
      links: this.__props['Notes']?.rich_text ? this.__props['Notes'].rich_text.filter((item) => item.href?.length).map((item) => item.href) : [],
      rich_text: this.__props['Notes']?.rich_text,
    }
  }

  get familyIds() {
    return (this.__props['Family']?.relation as unknown as Array<{ id: string }>).map((item) => item.id)  
  }


  get entriesLeft() {
    return this.__props['Entries Left']?.number
  }

  get validFrom() {
    return this.__props['Valid From']?.date
  }

  get sourceReceiptUrl() {
    return this.__props['Source Receipt URL']?.url
  }

  get sourceReceiptNumber() {
    return {
      text: this.__props['Source Receipt Number']?.rich_text ? this.__props['Source Receipt Number'].rich_text.reduce((acc, item) => acc + item.plain_text, '') : undefined,
      links: this.__props['Source Receipt Number']?.rich_text ? this.__props['Source Receipt Number'].rich_text.filter((item) => item.href?.length).map((item) => item.href) : [],
      rich_text: this.__props['Source Receipt Number']?.rich_text,
    }
  }

  get cardCount() {
    return this.__props['Card Count']?.number
  }

  get refundReceiptNumber() {
    return {
      text: this.__props['Refund Receipt Number']?.rich_text ? this.__props['Refund Receipt Number'].rich_text.reduce((acc, item) => acc + item.plain_text, '') : undefined,
      links: this.__props['Refund Receipt Number']?.rich_text ? this.__props['Refund Receipt Number'].rich_text.filter((item) => item.href?.length).map((item) => item.href) : [],
      rich_text: this.__props['Refund Receipt Number']?.rich_text,
    }
  }

  get entriesUsed() {
    return this.__props['Entries Used']?.number
  }

  get validUntil() {
    return this.__props['Valid Until']?.date
  }

  get automationStatus() {
    return this.__props['Automation Status']?.select
  }

  get name() {
    return {
      text: this.__props['Name']?.title ? this.__props['Name'].title.reduce((acc, item) => acc + item.plain_text, '') : undefined,
      links: this.__props['Name']?.title ? this.__props['Name'].title.filter((item) => item.href?.length).map((item) => item.href) : [],
      title: this.__props['Name']?.title,
    }
  }
}
