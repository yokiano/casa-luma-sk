import { BalanceSnapshotsResponse } from "./types"

export class BalanceSnapshotsResponseDTO {
  __data: BalanceSnapshotsResponse
  id: BalanceSnapshotsResponse['id']
  title: BalanceSnapshotsResponse['title']
  description: BalanceSnapshotsResponse['description']
  parent: BalanceSnapshotsResponse['parent']
  createdBy: BalanceSnapshotsResponse['created_by']
  lastEditedBy: BalanceSnapshotsResponse['last_edited_by']
  createdTime: BalanceSnapshotsResponse['created_time']
  lastEditedTime: BalanceSnapshotsResponse['last_edited_time']
  isInline: BalanceSnapshotsResponse['is_inline']
  archived: BalanceSnapshotsResponse['archived']
  url: BalanceSnapshotsResponse['url']
  publicUrl: BalanceSnapshotsResponse['public_url']
  properties: BalanceSnapshotsPropertiesResponseDTO

  constructor(res: BalanceSnapshotsResponse) {
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
    this.properties = new BalanceSnapshotsPropertiesResponseDTO(res.properties)
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
  
export class BalanceSnapshotsPropertiesResponseDTO {
  __props: BalanceSnapshotsResponse['properties']
  __data

  constructor(props: BalanceSnapshotsResponse['properties']) {
    this.__props = props
    this.__data = {
      status: this.__props['Status'],
      notes: this.__props['Notes'],
      balanceThb: this.__props['Balance THB'],
      observedAt: this.__props['Observed At'],
      account: this.__props['Account'],
      proof: this.__props['Proof'],
      snapshotRole: this.__props['Snapshot Role'],
      source: this.__props['Source'],
      name: this.__props['Name'],
    }
  }


  get status() {
    return this.__props['Status']?.status
  }

  get notes() {
    return {
      text: this.__props['Notes']?.rich_text ? this.__props['Notes'].rich_text.reduce((acc, item) => acc + item.plain_text, '') : undefined,
      links: this.__props['Notes']?.rich_text ? this.__props['Notes'].rich_text.filter((item) => item.href?.length).map((item) => item.href) : [],
      rich_text: this.__props['Notes']?.rich_text,
    }
  }

  get balanceThb() {
    return this.__props['Balance THB']?.number
  }

  get observedAt() {
    return this.__props['Observed At']?.date
  }

  get account() {
    return this.__props['Account']?.select
  }

  get proof() {
    return {
      urls: this.__props['Proof'].files.map((item) => 
        item.type === 'external' ? item.external.url : item.type === 'file' ? item.file.url : undefined
      ),
    }
  }


  get snapshotRole() {
    return this.__props['Snapshot Role']?.select
  }

  get source() {
    return this.__props['Source']?.select
  }

  get name() {
    return {
      text: this.__props['Name']?.title ? this.__props['Name'].title.reduce((acc, item) => acc + item.plain_text, '') : undefined,
      links: this.__props['Name']?.title ? this.__props['Name'].title.filter((item) => item.href?.length).map((item) => item.href) : [],
      title: this.__props['Name']?.title,
    }
  }
}
