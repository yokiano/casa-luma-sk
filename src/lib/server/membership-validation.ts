import { NOTION_API_KEY } from '$env/static/private';
import { FamiliesDatabase, FamiliesResponseDTO } from '$lib/notion-sdk/dbs/families';
import { MembershipsDatabase, MembershipsResponseDTO } from '$lib/notion-sdk/dbs/memberships';

export type MembershipValidationFamily = {
  id: string;
  name: string;
  loyverseCustomerId: string;
  status: string | null;
};

export type MembershipValidationMembership = {
  id: string;
  name: string;
  type: string | null;
  startDate: string | null;
  endDate: string | null;
  numberOfKids: number | null;
  status: string | null;
};

export type MembershipValidationLookup = {
  matchedFamily: MembershipValidationFamily | null;
  activeMemberships: MembershipValidationMembership[];
  checkedDate: string;
};

const getFormulaText = (formula: unknown): string | null => {
  if (!formula || typeof formula !== 'object') return null;
  const value = formula as { string?: string | null; number?: number | null; boolean?: boolean | null };
  if (typeof value.string === 'string') return value.string;
  if (typeof value.number === 'number') return String(value.number);
  if (typeof value.boolean === 'boolean') return value.boolean ? 'Yes' : 'No';
  return null;
};

const normalizeId = (value: string) => value.trim();

const toDateOnly = (value: string): string => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value.slice(0, 10);
  return parsed.toISOString().slice(0, 10);
};

const isMembershipActiveOnDate = (membership: MembershipValidationMembership, checkedDate: string) => {
  const start = membership.startDate;
  const end = membership.endDate;

  if (start && start > checkedDate) return false;
  if (end && end < checkedDate) return false;
  return true;
};

const toMembership = (dto: MembershipsResponseDTO): MembershipValidationMembership => ({
  id: dto.id,
  name: dto.properties.name?.text ?? 'Untitled Membership',
  type: dto.properties.type?.name ?? null,
  startDate: dto.properties.startDate?.start ?? null,
  endDate: dto.properties.endDate?.start ?? null,
  numberOfKids: dto.properties.numberOfKids ?? null,
  status: getFormulaText(dto.properties.status),
});

export const lookupFamilyMembershipForReceipt = async ({
  loyverseCustomerId,
  atDate
}: {
  loyverseCustomerId: string;
  atDate: string;
}): Promise<MembershipValidationLookup> => {
  const normalizedCustomerId = normalizeId(loyverseCustomerId);
  const checkedDate = toDateOnly(atDate);

  const familiesDb = new FamiliesDatabase({ notionSecret: NOTION_API_KEY });
  const familyResponse = await familiesDb.query({
    page_size: 5,
    filter: {
      loyverseCustomerId: { contains: normalizedCustomerId }
    }
  } as any);

  const familyDto = familyResponse.results
    .map((result) => new FamiliesResponseDTO(result as any))
    .find((dto) => normalizeId(dto.properties.loyverseCustomerId?.text ?? '') === normalizedCustomerId);

  if (!familyDto) {
    return {
      matchedFamily: null,
      activeMemberships: [],
      checkedDate
    };
  }

  const matchedFamily: MembershipValidationFamily = {
    id: familyDto.id,
    name: familyDto.properties.familyName?.text ?? 'Untitled Family',
    loyverseCustomerId: normalizedCustomerId,
    status: familyDto.properties.status?.name ?? null
  };

  const membershipsDb = new MembershipsDatabase({ notionSecret: NOTION_API_KEY });
  const membershipResponse = await membershipsDb.query({
    page_size: 25,
    filter: {
      family: { contains: familyDto.id }
    }
  } as any);

  const activeMemberships = membershipResponse.results
    .map((result) => toMembership(new MembershipsResponseDTO(result as any)))
    .filter((membership) => isMembershipActiveOnDate(membership, checkedDate));

  return {
    matchedFamily,
    activeMemberships,
    checkedDate
  };
};
