import { EmployeesResponse } from "./types"
import { UpdatePageBodyParameters,
RichTextItemRequest
} from '../../core/types/notion-api.types'

type TypeFromRecord<Obj, Type> = Obj extends Record<string, infer T> ? Extract<T, Type> : never

export type EmployeesPropertiesPatch = {
  visaExpiry?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'date' }>['date']
  workPermitExpiry?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'date' }>['date']
  photo?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'files' }>['files']
  salaryThb?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'number' }>['number']
  languages?: EmployeesResponse['properties']['Languages']['multi_select'][number]['name'][]
  employmentType?: EmployeesResponse['properties']['Employment Type']['select']['name']
  emergencyContact?: string | { text: string; url?: string; annotations?: RichTextItemRequest['annotations'] } | RichTextItemRequest[]
  department?: EmployeesResponse['properties']['Department']['select']['name']
  endDate?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'date' }>['date']
  nationality?: EmployeesResponse['properties']['Nationality']['select']['name']
  whatsAppLine?: string | { text: string; url?: string; annotations?: RichTextItemRequest['annotations'] } | RichTextItemRequest[]
  workPermitNumber?: string | { text: string; url?: string; annotations?: RichTextItemRequest['annotations'] } | RichTextItemRequest[]
  email?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'email' }>['email']
  paymentFrequency?: EmployeesResponse['properties']['Payment Frequency']['select']['name']
  skills?: string | { text: string; url?: string; annotations?: RichTextItemRequest['annotations'] } | RichTextItemRequest[]
  fullName?: string | { text: string; url?: string; annotations?: RichTextItemRequest['annotations'] } | RichTextItemRequest[]
  documents?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'files' }>['files']
  address?: string | { text: string; url?: string; annotations?: RichTextItemRequest['annotations'] } | RichTextItemRequest[]
  notes?: string | { text: string; url?: string; annotations?: RichTextItemRequest['annotations'] } | RichTextItemRequest[]
  bankAccountDetails?: string | { text: string; url?: string; annotations?: RichTextItemRequest['annotations'] } | RichTextItemRequest[]
  phone?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'phone_number' }>['phone_number']
  position?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'relation' }>['relation']
  bio?: string | { text: string; url?: string; annotations?: RichTextItemRequest['annotations'] } | RichTextItemRequest[]
  hometown?: string | { text: string; url?: string; annotations?: RichTextItemRequest['annotations'] } | RichTextItemRequest[]
  emergencyPhone?: string | { text: string; url?: string; annotations?: RichTextItemRequest['annotations'] } | RichTextItemRequest[]
  employmentStatus?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'status' }>['status']
  reportsTo?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'people' }>['people']
  startDate?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'date' }>['date']
  nickname?: string | { text: string; url?: string; annotations?: RichTextItemRequest['annotations'] } | RichTextItemRequest[]
  taxId?: string | { text: string; url?: string; annotations?: RichTextItemRequest['annotations'] } | RichTextItemRequest[]
  idPassportNo?: string | { text: string; url?: string; annotations?: RichTextItemRequest['annotations'] } | RichTextItemRequest[]
  hasWorkPermit?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'checkbox' }>['checkbox']
  dateOfBirth?: TypeFromRecord<UpdatePageBodyParameters['properties'], { type?: 'date' }>['date']
}

  
export class EmployeesPatchDTO {
  __data: UpdatePageBodyParameters

  constructor(opts: {
    properties?: EmployeesPropertiesPatch
    coverUrl?: string
    icon?: UpdatePageBodyParameters['icon']
    archived?: UpdatePageBodyParameters['archived']
  }) {
    const { properties: props, coverUrl, icon, archived } = opts

    this.__data = {}
    this.__data.properties = {}
    this.__data.cover = coverUrl ? { type: 'external', external: { url: coverUrl } } : undefined
    this.__data.icon = icon
    this.__data.archived = archived
    
    if (props?.visaExpiry !== undefined) {
      this.__data.properties['%3CK%5BF'] = {
        type: 'date',
        date: props.visaExpiry,
      }
    }

    if (props?.workPermitExpiry !== undefined) {
      this.__data.properties['%3D%3EfR'] = {
        type: 'date',
        date: props.workPermitExpiry,
      }
    }

    if (props?.photo !== undefined) {
      this.__data.properties['%3FOvv'] = {
        type: 'files',
        files: props.photo,
      }
    }

    if (props?.salaryThb !== undefined) {
      this.__data.properties['%3FdnC'] = {
        type: 'number',
        number: props.salaryThb,
      }
    }

    if (props?.languages !== undefined) {
      this.__data.properties['B%5C%7BK'] = {
        type: 'multi_select',
        multi_select: props.languages?.map((item) => ({ name: item })),
      }
    }

    if (props?.employmentType !== undefined) {
      this.__data.properties['Bop%3E'] = {
        type: 'select',
        select: { name: props.employmentType },
      }
    }

    if (props?.emergencyContact !== undefined) {
      this.__data.properties['EIXp'] = {
        type: 'rich_text',
        rich_text: typeof props.emergencyContact === 'string' 
          ? [{ type: 'text', text: { content: props.emergencyContact } }]
          : Array.isArray(props.emergencyContact)
            ? props.emergencyContact
            : props.emergencyContact === null
              ? []
              : [
                  {
                    type: 'text',
                    text: {
                      content: props.emergencyContact.text,
                      link: props.emergencyContact?.url ? { url: props.emergencyContact.url } : undefined
                    },
                    annotations: props.emergencyContact.annotations
                  },
                ]
      }
    }

    if (props?.department !== undefined) {
      this.__data.properties['HpjN'] = {
        type: 'select',
        select: { name: props.department },
      }
    }

    if (props?.endDate !== undefined) {
      this.__data.properties['KpQj'] = {
        type: 'date',
        date: props.endDate,
      }
    }

    if (props?.nationality !== undefined) {
      this.__data.properties['MUL%3E'] = {
        type: 'select',
        select: { name: props.nationality },
      }
    }

    if (props?.whatsAppLine !== undefined) {
      this.__data.properties['PPRm'] = {
        type: 'rich_text',
        rich_text: typeof props.whatsAppLine === 'string' 
          ? [{ type: 'text', text: { content: props.whatsAppLine } }]
          : Array.isArray(props.whatsAppLine)
            ? props.whatsAppLine
            : props.whatsAppLine === null
              ? []
              : [
                  {
                    type: 'text',
                    text: {
                      content: props.whatsAppLine.text,
                      link: props.whatsAppLine?.url ? { url: props.whatsAppLine.url } : undefined
                    },
                    annotations: props.whatsAppLine.annotations
                  },
                ]
      }
    }

    if (props?.workPermitNumber !== undefined) {
      this.__data.properties['QVjs'] = {
        type: 'rich_text',
        rich_text: typeof props.workPermitNumber === 'string' 
          ? [{ type: 'text', text: { content: props.workPermitNumber } }]
          : Array.isArray(props.workPermitNumber)
            ? props.workPermitNumber
            : props.workPermitNumber === null
              ? []
              : [
                  {
                    type: 'text',
                    text: {
                      content: props.workPermitNumber.text,
                      link: props.workPermitNumber?.url ? { url: props.workPermitNumber.url } : undefined
                    },
                    annotations: props.workPermitNumber.annotations
                  },
                ]
      }
    }

    if (props?.email !== undefined) {
      this.__data.properties['Xtg%3C'] = {
        type: 'email',
        email: props.email,
      }
    }

    if (props?.paymentFrequency !== undefined) {
      this.__data.properties['Z%60%60%5E'] = {
        type: 'select',
        select: { name: props.paymentFrequency },
      }
    }

    if (props?.skills !== undefined) {
      this.__data.properties['crRF'] = {
        type: 'rich_text',
        rich_text: typeof props.skills === 'string' 
          ? [{ type: 'text', text: { content: props.skills } }]
          : Array.isArray(props.skills)
            ? props.skills
            : props.skills === null
              ? []
              : [
                  {
                    type: 'text',
                    text: {
                      content: props.skills.text,
                      link: props.skills?.url ? { url: props.skills.url } : undefined
                    },
                    annotations: props.skills.annotations
                  },
                ]
      }
    }

    if (props?.fullName !== undefined) {
      this.__data.properties['dNc~'] = {
        type: 'rich_text',
        rich_text: typeof props.fullName === 'string' 
          ? [{ type: 'text', text: { content: props.fullName } }]
          : Array.isArray(props.fullName)
            ? props.fullName
            : props.fullName === null
              ? []
              : [
                  {
                    type: 'text',
                    text: {
                      content: props.fullName.text,
                      link: props.fullName?.url ? { url: props.fullName.url } : undefined
                    },
                    annotations: props.fullName.annotations
                  },
                ]
      }
    }

    if (props?.documents !== undefined) {
      this.__data.properties['deEH'] = {
        type: 'files',
        files: props.documents,
      }
    }

    if (props?.address !== undefined) {
      this.__data.properties['dw%7Bq'] = {
        type: 'rich_text',
        rich_text: typeof props.address === 'string' 
          ? [{ type: 'text', text: { content: props.address } }]
          : Array.isArray(props.address)
            ? props.address
            : props.address === null
              ? []
              : [
                  {
                    type: 'text',
                    text: {
                      content: props.address.text,
                      link: props.address?.url ? { url: props.address.url } : undefined
                    },
                    annotations: props.address.annotations
                  },
                ]
      }
    }

    if (props?.notes !== undefined) {
      this.__data.properties['gdZF'] = {
        type: 'rich_text',
        rich_text: typeof props.notes === 'string' 
          ? [{ type: 'text', text: { content: props.notes } }]
          : Array.isArray(props.notes)
            ? props.notes
            : props.notes === null
              ? []
              : [
                  {
                    type: 'text',
                    text: {
                      content: props.notes.text,
                      link: props.notes?.url ? { url: props.notes.url } : undefined
                    },
                    annotations: props.notes.annotations
                  },
                ]
      }
    }

    if (props?.bankAccountDetails !== undefined) {
      this.__data.properties['jNcC'] = {
        type: 'rich_text',
        rich_text: typeof props.bankAccountDetails === 'string' 
          ? [{ type: 'text', text: { content: props.bankAccountDetails } }]
          : Array.isArray(props.bankAccountDetails)
            ? props.bankAccountDetails
            : props.bankAccountDetails === null
              ? []
              : [
                  {
                    type: 'text',
                    text: {
                      content: props.bankAccountDetails.text,
                      link: props.bankAccountDetails?.url ? { url: props.bankAccountDetails.url } : undefined
                    },
                    annotations: props.bankAccountDetails.annotations
                  },
                ]
      }
    }

    if (props?.phone !== undefined) {
      this.__data.properties['lJ%7CL'] = {
        type: 'phone_number',
        phone_number: props.phone,
      }
    }

    if (props?.position !== undefined) {
      this.__data.properties['o%5DfK'] = {
        type: 'relation',
        relation: props.position,
      }
    }

    if (props?.bio !== undefined) {
      this.__data.properties['owDI'] = {
        type: 'rich_text',
        rich_text: typeof props.bio === 'string' 
          ? [{ type: 'text', text: { content: props.bio } }]
          : Array.isArray(props.bio)
            ? props.bio
            : props.bio === null
              ? []
              : [
                  {
                    type: 'text',
                    text: {
                      content: props.bio.text,
                      link: props.bio?.url ? { url: props.bio.url } : undefined
                    },
                    annotations: props.bio.annotations
                  },
                ]
      }
    }

    if (props?.hometown !== undefined) {
      this.__data.properties['pi%5Dw'] = {
        type: 'rich_text',
        rich_text: typeof props.hometown === 'string' 
          ? [{ type: 'text', text: { content: props.hometown } }]
          : Array.isArray(props.hometown)
            ? props.hometown
            : props.hometown === null
              ? []
              : [
                  {
                    type: 'text',
                    text: {
                      content: props.hometown.text,
                      link: props.hometown?.url ? { url: props.hometown.url } : undefined
                    },
                    annotations: props.hometown.annotations
                  },
                ]
      }
    }

    if (props?.emergencyPhone !== undefined) {
      this.__data.properties['r%7BrR'] = {
        type: 'rich_text',
        rich_text: typeof props.emergencyPhone === 'string' 
          ? [{ type: 'text', text: { content: props.emergencyPhone } }]
          : Array.isArray(props.emergencyPhone)
            ? props.emergencyPhone
            : props.emergencyPhone === null
              ? []
              : [
                  {
                    type: 'text',
                    text: {
                      content: props.emergencyPhone.text,
                      link: props.emergencyPhone?.url ? { url: props.emergencyPhone.url } : undefined
                    },
                    annotations: props.emergencyPhone.annotations
                  },
                ]
      }
    }

    if (props?.employmentStatus !== undefined) {
      this.__data.properties['vCD%5E'] = {
        type: 'status',
        status: props.employmentStatus,
      }
    }

    if (props?.reportsTo !== undefined) {
      this.__data.properties['wUr%5B'] = {
        type: 'people',
        people: props.reportsTo,
      }
    }

    if (props?.startDate !== undefined) {
      this.__data.properties['zLrJ'] = {
        type: 'date',
        date: props.startDate,
      }
    }

    if (props?.nickname !== undefined) {
      this.__data.properties['title'] = {
        type: 'title',
        title: typeof props.nickname === 'string' 
          ? [{ type: 'text', text: { content: props.nickname } }]
          : Array.isArray(props.nickname)
            ? props.nickname
            : props.nickname === null
              ? []
              : [
                  {
                    type: 'text',
                    text: {
                      content: props.nickname.text,
                      link: props.nickname?.url ? { url: props.nickname.url } : undefined
                    },
                    annotations: props.nickname.annotations
                  },
                ]
      }
    }

    if (props?.taxId !== undefined) {
      this.__data.properties['%3FRoK'] = {
        type: 'rich_text',
        rich_text: typeof props.taxId === 'string' 
          ? [{ type: 'text', text: { content: props.taxId } }]
          : Array.isArray(props.taxId)
            ? props.taxId
            : props.taxId === null
              ? []
              : [
                  {
                    type: 'text',
                    text: {
                      content: props.taxId.text,
                      link: props.taxId?.url ? { url: props.taxId.url } : undefined
                    },
                    annotations: props.taxId.annotations
                  },
                ]
      }
    }

    if (props?.idPassportNo !== undefined) {
      this.__data.properties['IaO%3B'] = {
        type: 'rich_text',
        rich_text: typeof props.idPassportNo === 'string' 
          ? [{ type: 'text', text: { content: props.idPassportNo } }]
          : Array.isArray(props.idPassportNo)
            ? props.idPassportNo
            : props.idPassportNo === null
              ? []
              : [
                  {
                    type: 'text',
                    text: {
                      content: props.idPassportNo.text,
                      link: props.idPassportNo?.url ? { url: props.idPassportNo.url } : undefined
                    },
                    annotations: props.idPassportNo.annotations
                  },
                ]
      }
    }

    if (props?.hasWorkPermit !== undefined) {
      this.__data.properties['WH%5Da'] = {
        type: 'checkbox',
        checkbox: props.hasWorkPermit,
      }
    }

    if (props?.dateOfBirth !== undefined) {
      this.__data.properties['tIHh'] = {
        type: 'date',
        date: props.dateOfBirth,
      }
    }
  }
}
