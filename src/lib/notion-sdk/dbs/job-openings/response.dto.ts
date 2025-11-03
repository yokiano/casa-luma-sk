import { JobOpeningsResponse } from "./types"

export class JobOpeningsResponseDTO {
  __data: JobOpeningsResponse
  id: JobOpeningsResponse['id']
  title: JobOpeningsResponse['title']
  description: JobOpeningsResponse['description']
  parent: JobOpeningsResponse['parent']
  createdBy: JobOpeningsResponse['created_by']
  lastEditedBy: JobOpeningsResponse['last_edited_by']
  createdTime: JobOpeningsResponse['created_time']
  lastEditedTime: JobOpeningsResponse['last_edited_time']
  isInline: JobOpeningsResponse['is_inline']
  archived: JobOpeningsResponse['archived']
  url: JobOpeningsResponse['url']
  publicUrl: JobOpeningsResponse['public_url']
  properties: JobOpeningsPropertiesResponseDTO

  constructor(res: JobOpeningsResponse) {
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
    this.properties = new JobOpeningsPropertiesResponseDTO(res.properties)
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
  
export class JobOpeningsPropertiesResponseDTO {
  __props: JobOpeningsResponse['properties']
  __data

  constructor(props: JobOpeningsResponse['properties']) {
    this.__props = props
    this.__data = {
      location: this.__props['Location'],
      requirements: this.__props['Requirements'],
      department: this.__props['Department'],
      employmentType: this.__props['Employment Type'],
      experienceLevel: this.__props['Experience Level'],
      jobBoards: this.__props['Job Boards'],
      requiredSkills: this.__props['Required Skills'],
      openPositions: this.__props['Open Positions'],
      expectedSalary: this.__props['Expected Salary'],
      responsibilities: this.__props['Responsibilities'],
      openingDate: this.__props['Opening Date'],
      status: this.__props['Status'],
      jobTitle: this.__props['Job Title'],
      jobPost: this.__props['Job Post'],
      pointOfContact: this.__props['Point of Contact'],
    }
  }


  get location() {
    return this.__props['Location']?.select
  }

  get requirements() {
    return {
      text: this.__props['Requirements']?.rich_text ? this.__props['Requirements'].rich_text.reduce((acc, item) => acc + item.plain_text, '') : undefined,
      links: this.__props['Requirements']?.rich_text ? this.__props['Requirements'].rich_text.filter((item) => item.href?.length).map((item) => item.href) : [],
      rich_text: this.__props['Requirements']?.rich_text,
    }
  }

  get department() {
    return this.__props['Department']?.select
  }

  get employmentType() {
    return this.__props['Employment Type']?.select
  }

  get experienceLevel() {
    return this.__props['Experience Level']?.select
  }
  get jobBoards() {
    return {
      values: this.__props['Job Boards']?.multi_select ? this.__props['Job Boards'].multi_select.map((item) => item.name) : [],
      multi_select: this.__props['Job Boards']?.multi_select,
    }
  }
  get requiredSkills() {
    return {
      values: this.__props['Required Skills']?.multi_select ? this.__props['Required Skills'].multi_select.map((item) => item.name) : [],
      multi_select: this.__props['Required Skills']?.multi_select,
    }
  }

  get openPositions() {
    return this.__props['Open Positions']?.number
  }

  get expectedSalary() {
    return this.__props['Expected Salary']?.number
  }

  get responsibilities() {
    return {
      text: this.__props['Responsibilities']?.rich_text ? this.__props['Responsibilities'].rich_text.reduce((acc, item) => acc + item.plain_text, '') : undefined,
      links: this.__props['Responsibilities']?.rich_text ? this.__props['Responsibilities'].rich_text.filter((item) => item.href?.length).map((item) => item.href) : [],
      rich_text: this.__props['Responsibilities']?.rich_text,
    }
  }

  get openingDate() {
    return this.__props['Opening Date']?.date
  }

  get status() {
    return this.__props['Status']?.status
  }

  get jobTitle() {
    return {
      text: this.__props['Job Title']?.title ? this.__props['Job Title'].title.reduce((acc, item) => acc + item.plain_text, '') : undefined,
      links: this.__props['Job Title']?.title ? this.__props['Job Title'].title.filter((item) => item.href?.length).map((item) => item.href) : [],
      title: this.__props['Job Title']?.title,
    }
  }

  get jobPost() {
    return {
      text: this.__props['Job Post']?.rich_text ? this.__props['Job Post'].rich_text.reduce((acc, item) => acc + item.plain_text, '') : undefined,
      links: this.__props['Job Post']?.rich_text ? this.__props['Job Post'].rich_text.filter((item) => item.href?.length).map((item) => item.href) : [],
      rich_text: this.__props['Job Post']?.rich_text,
    }
  }

  get pointOfContact() {
    return {
      text: this.__props['Point of Contact']?.rich_text ? this.__props['Point of Contact'].rich_text.reduce((acc, item) => acc + item.plain_text, '') : undefined,
      links: this.__props['Point of Contact']?.rich_text ? this.__props['Point of Contact'].rich_text.filter((item) => item.href?.length).map((item) => item.href) : [],
      rich_text: this.__props['Point of Contact']?.rich_text,
    }
  }
}
