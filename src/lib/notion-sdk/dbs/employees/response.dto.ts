import { EmployeesResponse } from "./types"

export class EmployeesResponseDTO {
  __data: EmployeesResponse
  id: EmployeesResponse['id']
  title: EmployeesResponse['title']
  description: EmployeesResponse['description']
  parent: EmployeesResponse['parent']
  createdBy: EmployeesResponse['created_by']
  lastEditedBy: EmployeesResponse['last_edited_by']
  createdTime: EmployeesResponse['created_time']
  lastEditedTime: EmployeesResponse['last_edited_time']
  isInline: EmployeesResponse['is_inline']
  archived: EmployeesResponse['archived']
  url: EmployeesResponse['url']
  publicUrl: EmployeesResponse['public_url']
  properties: EmployeesPropertiesResponseDTO

  constructor(res: EmployeesResponse) {
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
    this.properties = new EmployeesPropertiesResponseDTO(res.properties)
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
  
export class EmployeesPropertiesResponseDTO {
  __props: EmployeesResponse['properties']
  __data

  constructor(props: EmployeesResponse['properties']) {
    this.__props = props
    this.__data = {
      visaExpiry: this.__props['Visa Expiry'],
      workPermitExpiry: this.__props['Work Permit Expiry'],
      photo: this.__props['Photo'],
      salaryThb: this.__props['Salary (THB)'],
      languages: this.__props['Languages'],
      employmentType: this.__props['Employment Type'],
      emergencyContact: this.__props['Emergency Contact'],
      department: this.__props['Department'],
      endDate: this.__props['End Date'],
      nationality: this.__props['Nationality'],
      whatsAppLine: this.__props['WhatsApp/LINE'],
      workPermitNumber: this.__props['Work Permit Number'],
      email: this.__props['Email'],
      paymentFrequency: this.__props['Payment Frequency'],
      skills: this.__props['Skills'],
      fullName: this.__props['Full Name'],
      documents: this.__props['Documents'],
      address: this.__props['Address'],
      notes: this.__props['Notes'],
      bankAccountDetails: this.__props['Bank Account Details'],
      phone: this.__props['Phone'],
      position: this.__props['Role'],
      bio: this.__props['Bio'],
      hometown: this.__props['Hometown'],
      emergencyPhone: this.__props['Emergency Phone'],
      employmentStatus: this.__props['Employment Status'],
      reportsTo: this.__props['Reports To'],
      startDate: this.__props['Start Date'],
      nickname: this.__props['Nickname'],
      taxId: this.__props['Tax ID'],
      idPassportNo: this.__props['ID/Passport No.'],
      hasWorkPermit: this.__props['Has Work Permit'],
      shifts: this.__props['Shifts'],
      country: this.__props['Country'],
      dateOfBirth: this.__props['Date of Birth'],
    }
  }


  get visaExpiry() {
    return this.__props['Visa Expiry']?.date
  }

  get workPermitExpiry() {
    return this.__props['Work Permit Expiry']?.date
  }

  get photo() {
    return {
      urls: this.__props['Photo'].files.map((item) => 
        item.type === 'external' ? item.external.url : item.type === 'file' ? item.file.url : undefined
      ),
    }
  }


  get salaryThb() {
    return this.__props['Salary (THB)']?.number
  }
  get languages() {
    return {
      values: this.__props['Languages']?.multi_select ? this.__props['Languages'].multi_select.map((item) => item.name) : [],
      multi_select: this.__props['Languages']?.multi_select,
    }
  }

  get employmentType() {
    return this.__props['Employment Type']?.select
  }

  get emergencyContact() {
    return {
      text: this.__props['Emergency Contact']?.rich_text ? this.__props['Emergency Contact'].rich_text.reduce((acc, item) => acc + item.plain_text, '') : undefined,
      links: this.__props['Emergency Contact']?.rich_text ? this.__props['Emergency Contact'].rich_text.filter((item) => item.href?.length).map((item) => item.href) : [],
      rich_text: this.__props['Emergency Contact']?.rich_text,
    }
  }

  get department() {
    return this.__props['Department']?.select
  }

  get endDate() {
    return this.__props['End Date']?.date
  }

  get nationality() {
    return this.__props['Nationality']?.select
  }

  get whatsAppLine() {
    return {
      text: this.__props['WhatsApp/LINE']?.rich_text ? this.__props['WhatsApp/LINE'].rich_text.reduce((acc, item) => acc + item.plain_text, '') : undefined,
      links: this.__props['WhatsApp/LINE']?.rich_text ? this.__props['WhatsApp/LINE'].rich_text.filter((item) => item.href?.length).map((item) => item.href) : [],
      rich_text: this.__props['WhatsApp/LINE']?.rich_text,
    }
  }

  get workPermitNumber() {
    return {
      text: this.__props['Work Permit Number']?.rich_text ? this.__props['Work Permit Number'].rich_text.reduce((acc, item) => acc + item.plain_text, '') : undefined,
      links: this.__props['Work Permit Number']?.rich_text ? this.__props['Work Permit Number'].rich_text.filter((item) => item.href?.length).map((item) => item.href) : [],
      rich_text: this.__props['Work Permit Number']?.rich_text,
    }
  }

  get email() {
    return this.__props['Email']?.email
  }

  get paymentFrequency() {
    return this.__props['Payment Frequency']?.select
  }

  get skills() {
    return {
      text: this.__props['Skills']?.rich_text ? this.__props['Skills'].rich_text.reduce((acc, item) => acc + item.plain_text, '') : undefined,
      links: this.__props['Skills']?.rich_text ? this.__props['Skills'].rich_text.filter((item) => item.href?.length).map((item) => item.href) : [],
      rich_text: this.__props['Skills']?.rich_text,
    }
  }

  get fullName() {
    return {
      text: this.__props['Full Name']?.rich_text ? this.__props['Full Name'].rich_text.reduce((acc, item) => acc + item.plain_text, '') : undefined,
      links: this.__props['Full Name']?.rich_text ? this.__props['Full Name'].rich_text.filter((item) => item.href?.length).map((item) => item.href) : [],
      rich_text: this.__props['Full Name']?.rich_text,
    }
  }

  get documents() {
    return {
      urls: this.__props['Documents'].files.map((item) => 
        item.type === 'external' ? item.external.url : item.type === 'file' ? item.file.url : undefined
      ),
    }
  }


  get address() {
    return {
      text: this.__props['Address']?.rich_text ? this.__props['Address'].rich_text.reduce((acc, item) => acc + item.plain_text, '') : undefined,
      links: this.__props['Address']?.rich_text ? this.__props['Address'].rich_text.filter((item) => item.href?.length).map((item) => item.href) : [],
      rich_text: this.__props['Address']?.rich_text,
    }
  }

  get notes() {
    return {
      text: this.__props['Notes']?.rich_text ? this.__props['Notes'].rich_text.reduce((acc, item) => acc + item.plain_text, '') : undefined,
      links: this.__props['Notes']?.rich_text ? this.__props['Notes'].rich_text.filter((item) => item.href?.length).map((item) => item.href) : [],
      rich_text: this.__props['Notes']?.rich_text,
    }
  }

  get bankAccountDetails() {
    return {
      text: this.__props['Bank Account Details']?.rich_text ? this.__props['Bank Account Details'].rich_text.reduce((acc, item) => acc + item.plain_text, '') : undefined,
      links: this.__props['Bank Account Details']?.rich_text ? this.__props['Bank Account Details'].rich_text.filter((item) => item.href?.length).map((item) => item.href) : [],
      rich_text: this.__props['Bank Account Details']?.rich_text,
    }
  }

  get phone() {
    return this.__props['Phone']?.phone_number
  }

  get positionIds() {
    return (this.__props['Role']?.relation as unknown as Array<{ id: string }>).map((item) => item.id)  
  }


  get bio() {
    return {
      text: this.__props['Bio']?.rich_text ? this.__props['Bio'].rich_text.reduce((acc, item) => acc + item.plain_text, '') : undefined,
      links: this.__props['Bio']?.rich_text ? this.__props['Bio'].rich_text.filter((item) => item.href?.length).map((item) => item.href) : [],
      rich_text: this.__props['Bio']?.rich_text,
    }
  }

  get hometown() {
    return {
      text: this.__props['Hometown']?.rich_text ? this.__props['Hometown'].rich_text.reduce((acc, item) => acc + item.plain_text, '') : undefined,
      links: this.__props['Hometown']?.rich_text ? this.__props['Hometown'].rich_text.filter((item) => item.href?.length).map((item) => item.href) : [],
      rich_text: this.__props['Hometown']?.rich_text,
    }
  }

  get emergencyPhone() {
    return {
      text: this.__props['Emergency Phone']?.rich_text ? this.__props['Emergency Phone'].rich_text.reduce((acc, item) => acc + item.plain_text, '') : undefined,
      links: this.__props['Emergency Phone']?.rich_text ? this.__props['Emergency Phone'].rich_text.filter((item) => item.href?.length).map((item) => item.href) : [],
      rich_text: this.__props['Emergency Phone']?.rich_text,
    }
  }

  get employmentStatus() {
    return this.__props['Employment Status']?.status
  }

  get reportsTo() {
    return this.__props['Reports To']?.people
  }

  get startDate() {
    return this.__props['Start Date']?.date
  }

  get nickname() {
    return {
      text: this.__props['Nickname']?.title ? this.__props['Nickname'].title.reduce((acc, item) => acc + item.plain_text, '') : undefined,
      links: this.__props['Nickname']?.title ? this.__props['Nickname'].title.filter((item) => item.href?.length).map((item) => item.href) : [],
      title: this.__props['Nickname']?.title,
    }
  }

  get taxId() {
    return {
      text: this.__props['Tax ID']?.rich_text ? this.__props['Tax ID'].rich_text.reduce((acc, item) => acc + item.plain_text, '') : undefined,
      links: this.__props['Tax ID']?.rich_text ? this.__props['Tax ID'].rich_text.filter((item) => item.href?.length).map((item) => item.href) : [],
      rich_text: this.__props['Tax ID']?.rich_text,
    }
  }

  get idPassportNo() {
    return {
      text: this.__props['ID/Passport No.']?.rich_text ? this.__props['ID/Passport No.'].rich_text.reduce((acc, item) => acc + item.plain_text, '') : undefined,
      links: this.__props['ID/Passport No.']?.rich_text ? this.__props['ID/Passport No.'].rich_text.filter((item) => item.href?.length).map((item) => item.href) : [],
      rich_text: this.__props['ID/Passport No.']?.rich_text,
    }
  }

  get hasWorkPermit() {
    return this.__props['Has Work Permit']?.checkbox
  }

  get shiftsIds() {
    return (this.__props['Shifts']?.relation as unknown as Array<{ id: string }>).map((item) => item.id)  
  }


  get country() {
    return this.__props['Country']?.select
  }

  get dateOfBirth() {
    return this.__props['Date of Birth']?.date
  }
}
