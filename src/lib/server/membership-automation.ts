import { NOTION_API_KEY } from '$env/static/private';
import { FamiliesDatabase, FamiliesResponseDTO } from '$lib/notion-sdk/dbs/families';
import { MembershipsDatabase, MembershipsPatchDTO, MembershipsResponseDTO } from '$lib/notion-sdk/dbs/memberships';
import {
  createMembershipFromReceiptAutomation,
  type CreateMembershipFromReceiptInput,
  type ExistingMembershipQuery,
  type MembershipAutomationDeps
} from '$lib/receipts/automations/membership-creation';
import type { ReceiptAutomation } from '$lib/receipts/automations/types';

const normalizeId = (value: string) => value.trim();

const toMembershipName = (input: Pick<CreateMembershipFromReceiptInput, 'familyName' | 'type' | 'numberOfKids'>) => {
  const kidsLabel = input.numberOfKids === 1 ? 'kid' : 'kids';
  return `${input.familyName} - ${input.type} - ${input.numberOfKids} ${kidsLabel}`;
};

const notesContainReceiptProvenance = (notes: string | null | undefined, query: ExistingMembershipQuery) => {
  if (!notes) return false;
  const receiptTokens = [
    `Receipt Number: ${query.receiptNumber}`,
    query.receiptKey ? `Receipt Key: ${query.receiptKey}` : null,
    `Loyverse Item ID: ${query.itemId}`
  ].filter(Boolean) as string[];

  return receiptTokens.every((token) => notes.includes(token));
};

const toExistingMembership = (dto: MembershipsResponseDTO) => ({
  id: dto.id,
  name: dto.properties.name?.text ?? 'Untitled Membership',
  type: dto.properties.type?.name ?? null,
  numberOfKids: dto.properties.numberOfKids ?? null,
  startDate: dto.properties.startDate?.start ?? null,
  endDate: dto.properties.endDate?.start ?? null,
  notes: dto.properties.notes?.text ?? null
});

export const createNotionMembershipAutomationDeps = (): MembershipAutomationDeps => ({
  async findFamilyByLoyverseCustomerId({ loyverseCustomerId }) {
    const normalizedCustomerId = normalizeId(loyverseCustomerId);
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

    if (!familyDto) return null;

    return {
      id: familyDto.id,
      name: familyDto.properties.familyName?.text ?? 'Untitled Family',
      loyverseCustomerId: normalizedCustomerId
    };
  },

  async findExistingAutomatedMembership(query) {
    const membershipsDb = new MembershipsDatabase({ notionSecret: NOTION_API_KEY });
    const membershipResponse = await membershipsDb.query({
      page_size: 100,
      filter: {
        family: { contains: query.familyId }
      }
    } as any);

    const existing = membershipResponse.results
      .map((result) => toExistingMembership(new MembershipsResponseDTO(result as any)))
      .find(
        (membership) =>
          membership.type === query.type &&
          membership.numberOfKids === query.numberOfKids &&
          membership.startDate === query.startDate &&
          membership.endDate === query.endDate &&
          notesContainReceiptProvenance(membership.notes, query)
      );

    return existing ? { id: existing.id, name: existing.name } : null;
  },

  async createMembership(input) {
    const membershipsDb = new MembershipsDatabase({ notionSecret: NOTION_API_KEY });
    const name = toMembershipName(input);
    const patch = new MembershipsPatchDTO({
      properties: {
        name,
        type: input.type,
        numberOfKids: input.numberOfKids,
        family: [{ id: input.familyId }],
        startDate: { start: input.startDate },
        endDate: { start: input.endDate },
        notes: input.notes,
        receipt: input.receiptUrl
      }
    });

    const created = await membershipsDb.createPage(patch);
    const dto = new MembershipsResponseDTO(created);

    return {
      id: dto.id,
      name: dto.properties.name?.text ?? name
    };
  }
});

export const createDefaultReceiptAutomationSuite = (): ReceiptAutomation[] => [
  createMembershipFromReceiptAutomation({ deps: createNotionMembershipAutomationDeps() })
];
