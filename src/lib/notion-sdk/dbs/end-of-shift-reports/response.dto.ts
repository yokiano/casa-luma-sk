import { EndOfShiftReportsResponse } from "./types"

export class EndOfShiftReportsResponseDTO {
  __data: EndOfShiftReportsResponse
  id: EndOfShiftReportsResponse['id']
  title: EndOfShiftReportsResponse['title']
  description: EndOfShiftReportsResponse['description']
  parent: EndOfShiftReportsResponse['parent']
  createdBy: EndOfShiftReportsResponse['created_by']
  lastEditedBy: EndOfShiftReportsResponse['last_edited_by']
  createdTime: EndOfShiftReportsResponse['created_time']
  lastEditedTime: EndOfShiftReportsResponse['last_edited_time']
  isInline: EndOfShiftReportsResponse['is_inline']
  archived: EndOfShiftReportsResponse['archived']
  url: EndOfShiftReportsResponse['url']
  publicUrl: EndOfShiftReportsResponse['public_url']
  properties: EndOfShiftReportsPropertiesResponseDTO

  constructor(res: EndOfShiftReportsResponse) {
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
    this.properties = new EndOfShiftReportsPropertiesResponseDTO(res.properties)
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
  
export class EndOfShiftReportsPropertiesResponseDTO {
  __props: EndOfShiftReportsResponse['properties']
  __data

  constructor(props: EndOfShiftReportsResponse['properties']) {
    this.__props = props
    this.__data = {
      cardPayments: this.__props['Card Payments'],
      notes: this.__props['Notes'],
      expectedCash: this.__props['Expected Cash'],
      closedBy: this.__props['Closed By'],
      posSummary: this.__props['POS Summary'],
      scanPayments: this.__props['Scan Payments'],
      date: this.__props['Date'],
      shiftDate: this.__props['Shift Date'],
      actualCash_1: this.__props['Actual Cash 1'],
      cashDifference_1: this.__props['Cash Difference 1'],
      bill_1000Baht_1: this.__props['Bill 1000 Baht 1'],
      coin_1Baht_1: this.__props['Coin 1 Baht 1'],
      bill_500Baht_1: this.__props['Bill 500 Baht 1'],
      bill_20Baht_1: this.__props['Bill 20 Baht 1'],
      bill_50Baht_1: this.__props['Bill 50 Baht 1'],
      coin_10Baht_1: this.__props['Coin 10 Baht 1'],
      coin_5Baht_1: this.__props['Coin 5 Baht 1'],
      bill_100Baht_1: this.__props['Bill 100 Baht 1'],
      coin_2Baht_1: this.__props['Coin 2 Baht 1'],
      allIncome: this.__props['All Income'],
    }
  }


  get cardPayments() {
    return this.__props['Card Payments']?.number
  }

  get notes() {
    return {
      text: this.__props['Notes']?.rich_text ? this.__props['Notes'].rich_text.reduce((acc, item) => acc + item.plain_text, '') : undefined,
      links: this.__props['Notes']?.rich_text ? this.__props['Notes'].rich_text.filter((item) => item.href?.length).map((item) => item.href) : [],
      rich_text: this.__props['Notes']?.rich_text,
    }
  }

  get expectedCash() {
    return this.__props['Expected Cash']?.number
  }

  get closedBy() {
    return this.__props['Closed By']?.people
  }

  get posSummary() {
    return {
      urls: this.__props['POS Summary'].files.map((item) => 
        item.type === 'external' ? item.external.url : item.type === 'file' ? item.file.url : undefined
      ),
    }
  }


  get scanPayments() {
    return this.__props['Scan Payments']?.number
  }

  get date() {
    return this.__props['Date']?.date
  }

  get shiftDate() {
    return {
      text: this.__props['Shift Date']?.title ? this.__props['Shift Date'].title.reduce((acc, item) => acc + item.plain_text, '') : undefined,
      links: this.__props['Shift Date']?.title ? this.__props['Shift Date'].title.filter((item) => item.href?.length).map((item) => item.href) : [],
      title: this.__props['Shift Date']?.title,
    }
  }

  get actualCash_1() {
    return this.__props['Actual Cash 1']?.formula
  }

  get cashDifference_1() {
    return this.__props['Cash Difference 1']?.formula
  }

  get bill_1000Baht_1() {
    return this.__props['Bill 1000 Baht 1']?.number
  }

  get coin_1Baht_1() {
    return this.__props['Coin 1 Baht 1']?.number
  }

  get bill_500Baht_1() {
    return this.__props['Bill 500 Baht 1']?.number
  }

  get bill_20Baht_1() {
    return this.__props['Bill 20 Baht 1']?.number
  }

  get bill_50Baht_1() {
    return this.__props['Bill 50 Baht 1']?.number
  }

  get coin_10Baht_1() {
    return this.__props['Coin 10 Baht 1']?.number
  }

  get coin_5Baht_1() {
    return this.__props['Coin 5 Baht 1']?.number
  }

  get bill_100Baht_1() {
    return this.__props['Bill 100 Baht 1']?.number
  }

  get coin_2Baht_1() {
    return this.__props['Coin 2 Baht 1']?.number
  }

  get allIncome() {
    return this.__props['All Income']?.formula
  }
}
