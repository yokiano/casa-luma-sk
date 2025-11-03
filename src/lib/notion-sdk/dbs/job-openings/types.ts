import { WithOptional, Join, PathsToStringProps } from '../../core/types/helper.types'
import {
DatabaseObjectResponse,
StringRequest,
DatePropertyItemObjectResponse,
MultiSelectPropertyItemObjectResponse,
NumberPropertyItemObjectResponse,
RichTextPropertyItemObjectResponse,
SelectPropertyItemObjectResponse,
StatusPropertyItemObjectResponse,
TitlePropertyItemObjectResponse,
ExistencePropertyFilter,
QueryDatabaseBodyParameters,
TimestampCreatedTimeFilter,
TimestampLastEditedTimeFilter,
DatePropertyFilter,
NumberPropertyFilter,
TextPropertyFilter
} from '../../core/types/notion-api.types'
import { JOB_OPENINGS_PROPS_TO_IDS } from './constants'

export interface JobOpeningsResponse extends WithOptional<Omit<DatabaseObjectResponse, 'properties'>, 'title'| 'description'| 'is_inline'| 'url'| 'public_url'> {
  properties: {
    "Location": Omit<SelectPropertyItemObjectResponse, 'select'> & { select: { id: StringRequest, name: 'Remote', color: 'blue' } | { id: StringRequest, name: 'Hybrid', color: 'purple' } | { id: StringRequest, name: 'On-site', color: 'green' } | { id: StringRequest, name: 'Multiple Locations', color: 'pink' } | { id: StringRequest, name: 'International', color: 'red' } | { id: StringRequest, name: 'Regional', color: 'orange' } | { id: StringRequest, name: 'Headquarters', color: 'yellow' }},
    "Requirements": RichTextPropertyItemObjectResponse,
    "Department": Omit<SelectPropertyItemObjectResponse, 'select'> & { select: { id: StringRequest, name: 'Café', color: 'purple' } | { id: StringRequest, name: 'Open Play', color: 'brown' } | { id: StringRequest, name: 'Marketing', color: 'pink' } | { id: StringRequest, name: 'Maintenance', color: 'red' }},
    "Employment Type": Omit<SelectPropertyItemObjectResponse, 'select'> & { select: { id: StringRequest, name: 'Full-time', color: 'blue' } | { id: StringRequest, name: 'Part-time', color: 'green' } | { id: StringRequest, name: 'Contract', color: 'orange' } | { id: StringRequest, name: 'Internship', color: 'purple' } | { id: StringRequest, name: 'Temporary', color: 'yellow' } | { id: StringRequest, name: 'Freelance', color: 'pink' } | { id: StringRequest, name: 'Seasonal', color: 'brown' } | { id: StringRequest, name: 'Part Time / Shifts', color: 'gray' }},
    "Experience Level": Omit<SelectPropertyItemObjectResponse, 'select'> & { select: { id: StringRequest, name: 'Entry-level', color: 'blue' } | { id: StringRequest, name: 'Junior', color: 'green' } | { id: StringRequest, name: 'Mid-level', color: 'yellow' } | { id: StringRequest, name: 'Senior', color: 'orange' } | { id: StringRequest, name: 'Lead', color: 'purple' } | { id: StringRequest, name: 'Manager', color: 'pink' } | { id: StringRequest, name: 'Director', color: 'red' } | { id: StringRequest, name: 'Executive', color: 'brown' } | { id: StringRequest, name: 'Basic', color: 'default' }},
    "Job Boards": Omit<MultiSelectPropertyItemObjectResponse, 'multi_select'> & { multi_select: [{ id: StringRequest, name: 'Facebook Groups', color: 'blue' } | { id: StringRequest, name: 'Thai Job Board', color: 'red' } | { id: StringRequest, name: 'WhatsApp Groups', color: 'green' } | { id: StringRequest, name: 'JobsDB', color: 'orange' } | { id: StringRequest, name: 'LINE Groups', color: 'green' } | { id: StringRequest, name: 'Local Classifieds', color: 'gray' } | { id: StringRequest, name: 'Community Board', color: 'brown' } | { id: StringRequest, name: 'Word of Mouth', color: 'purple' } | { id: StringRequest, name: 'University Network', color: 'pink' }]},
    "Required Skills": Omit<MultiSelectPropertyItemObjectResponse, 'multi_select'> & { multi_select: [{ id: StringRequest, name: 'Project Management', color: 'purple' } | { id: StringRequest, name: 'Leadership', color: 'red' } | { id: StringRequest, name: 'Problem Solving', color: 'green' } | { id: StringRequest, name: 'English', color: 'yellow' } | { id: StringRequest, name: 'Handyman', color: 'default' } | { id: StringRequest, name: 'Coffee Machine', color: 'pink' } | { id: StringRequest, name: 'Cashier', color: 'blue' } | { id: StringRequest, name: 'Customer Service', color: 'brown' }]},
    "Open Positions": NumberPropertyItemObjectResponse,
    "Expected Salary": NumberPropertyItemObjectResponse,
    "Responsibilities": RichTextPropertyItemObjectResponse,
    "Opening Date": DatePropertyItemObjectResponse,
    "Status": Omit<StatusPropertyItemObjectResponse, 'status'> & { status: { id: StringRequest, name: 'Draft', color: 'gray' } | { id: StringRequest, name: 'Open', color: 'green' } | { id: StringRequest, name: 'In Progress', color: 'blue' } | { id: StringRequest, name: 'On Hold', color: 'orange' } | { id: StringRequest, name: 'Filled', color: 'purple' } | { id: StringRequest, name: 'Closed', color: 'red' }},
    "Job Title": TitlePropertyItemObjectResponse,
    "Job Post": RichTextPropertyItemObjectResponse,
    "Point of Contact": RichTextPropertyItemObjectResponse
  }
}

export type JobOpeningsResponseProperties = keyof JobOpeningsResponse['properties']
export type JobOpeningsPath = Join<PathsToStringProps<JobOpeningsResponse>>


export type JobOpeningsLocationPropertyType = JobOpeningsResponse['properties']['Location']['select']['name']

type JobOpeningsLocationPropertyFilter =
  | {
      equals: JobOpeningsLocationPropertyType
    }
  | {
      does_not_equal: JobOpeningsLocationPropertyType
    }
  | ExistencePropertyFilter      

type JobOpeningsRequirementsPropertyFilter = TextPropertyFilter

export type JobOpeningsDepartmentPropertyType = JobOpeningsResponse['properties']['Department']['select']['name']

type JobOpeningsDepartmentPropertyFilter =
  | {
      equals: JobOpeningsDepartmentPropertyType
    }
  | {
      does_not_equal: JobOpeningsDepartmentPropertyType
    }
  | ExistencePropertyFilter      


export type JobOpeningsEmploymentTypePropertyType = JobOpeningsResponse['properties']['Employment Type']['select']['name']

type JobOpeningsEmploymentTypePropertyFilter =
  | {
      equals: JobOpeningsEmploymentTypePropertyType
    }
  | {
      does_not_equal: JobOpeningsEmploymentTypePropertyType
    }
  | ExistencePropertyFilter      


export type JobOpeningsExperienceLevelPropertyType = JobOpeningsResponse['properties']['Experience Level']['select']['name']

type JobOpeningsExperienceLevelPropertyFilter =
  | {
      equals: JobOpeningsExperienceLevelPropertyType
    }
  | {
      does_not_equal: JobOpeningsExperienceLevelPropertyType
    }
  | ExistencePropertyFilter      


export type JobOpeningsJobBoardsPropertyType = JobOpeningsResponse['properties']['Job Boards']['multi_select'][number]['name']

type JobOpeningsJobBoardsPropertyFilter =
  | {
      contains: JobOpeningsJobBoardsPropertyType
    }
  | {
      does_not_contain: JobOpeningsJobBoardsPropertyType
    }          
  | ExistencePropertyFilter


export type JobOpeningsRequiredSkillsPropertyType = JobOpeningsResponse['properties']['Required Skills']['multi_select'][number]['name']

type JobOpeningsRequiredSkillsPropertyFilter =
  | {
      contains: JobOpeningsRequiredSkillsPropertyType
    }
  | {
      does_not_contain: JobOpeningsRequiredSkillsPropertyType
    }          
  | ExistencePropertyFilter

type JobOpeningsOpenPositionsPropertyFilter = NumberPropertyFilter
type JobOpeningsExpectedSalaryPropertyFilter = NumberPropertyFilter
type JobOpeningsResponsibilitiesPropertyFilter = TextPropertyFilter
type JobOpeningsOpeningDatePropertyFilter = DatePropertyFilter

export type JobOpeningsStatusPropertyType = JobOpeningsResponse['properties']['Status']['status']['name']

type JobOpeningsStatusPropertyFilter =
  | {
      equals: JobOpeningsStatusPropertyType
    }
  | {
      does_not_equal: JobOpeningsStatusPropertyType
    }
  | ExistencePropertyFilter      

type JobOpeningsJobTitlePropertyFilter = TextPropertyFilter
type JobOpeningsJobPostPropertyFilter = TextPropertyFilter
type JobOpeningsPointOfContactPropertyFilter = TextPropertyFilter

export type JobOpeningsPropertyFilter = { location: JobOpeningsLocationPropertyFilter } | { requirements: JobOpeningsRequirementsPropertyFilter } | { department: JobOpeningsDepartmentPropertyFilter } | { employmentType: JobOpeningsEmploymentTypePropertyFilter } | { experienceLevel: JobOpeningsExperienceLevelPropertyFilter } | { jobBoards: JobOpeningsJobBoardsPropertyFilter } | { requiredSkills: JobOpeningsRequiredSkillsPropertyFilter } | { openPositions: JobOpeningsOpenPositionsPropertyFilter } | { expectedSalary: JobOpeningsExpectedSalaryPropertyFilter } | { responsibilities: JobOpeningsResponsibilitiesPropertyFilter } | { openingDate: JobOpeningsOpeningDatePropertyFilter } | { status: JobOpeningsStatusPropertyFilter } | { jobTitle: JobOpeningsJobTitlePropertyFilter } | { jobPost: JobOpeningsJobPostPropertyFilter } | { pointOfContact: JobOpeningsPointOfContactPropertyFilter }

export type JobOpeningsQuery = Omit<QueryDatabaseBodyParameters, 'filter' | 'sorts'> & {
  sorts?: Array<
  | {
      property: keyof typeof JOB_OPENINGS_PROPS_TO_IDS
      direction: 'ascending' | 'descending'
    }
  | {
      timestamp: 'created_time' | 'last_edited_time'
      direction: 'ascending' | 'descending'
    }
  >
  filter?:
    | {
        or: Array<
          | JobOpeningsPropertyFilter
          | TimestampCreatedTimeFilter
          | TimestampLastEditedTimeFilter
          | {
              // or: JobOpeningsQuery['filter']
              or: Array<JobOpeningsPropertyFilter>
            }
          | {
              // and: JobOpeningsQuery['filter']
              and: Array<JobOpeningsPropertyFilter>
            }
        >
      }
    | {
        and: Array<
          | JobOpeningsPropertyFilter
          | TimestampCreatedTimeFilter
          | TimestampLastEditedTimeFilter
          | {
              // or: JobOpeningsQuery['filter']
              or: Array<JobOpeningsPropertyFilter>
            }
          | {
              // and: JobOpeningsQuery['filter']
              and: Array<JobOpeningsPropertyFilter>
            }
        >
      }
    | JobOpeningsPropertyFilter
    | TimestampCreatedTimeFilter
    | TimestampLastEditedTimeFilter
}

export type JobOpeningsQueryFilter = JobOpeningsQuery['filter']

export type JobOpeningsQueryResponse = {
  results: JobOpeningsResponse[]
  next_cursor: string | null
  has_more: boolean
}

