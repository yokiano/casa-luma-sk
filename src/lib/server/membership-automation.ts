import { NOTION_API_KEY } from '$env/static/private';
import { FamiliesDatabase } from '$lib/notion-sdk/dbs/families/db';
import { FamiliesResponseDTO } from '$lib/notion-sdk/dbs/families/response.dto';
import { MembershipsDatabase } from '$lib/notion-sdk/dbs/memberships/db';
import { MembershipsPatchDTO } from '$lib/notion-sdk/dbs/memberships/patch.dto';
import { MembershipsResponseDTO } from '$lib/notion-sdk/dbs/memberships/response.dto';
import {
  MEMBERSHIP_REFUND_NOTE_PREFIX,
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

const appendRefundNote = (notes: string | null | undefined, input: {
  originalReceiptNumber: string;
  refundReceiptNumber: string;
  refundReceiptKey?: string;
  refundReceiptUrl?: string;
}) => {
  const existingNotes = notes?.trim() ?? '';
  if (existingNotes.includes(`${MEMBERSHIP_REFUND_NOTE_PREFIX}: ${input.refundReceiptNumber}`)) {
    return existingNotes;
  }

  return [
    existingNotes || null,
    [
      `${MEMBERSHIP_REFUND_NOTE_PREFIX}: ${input.refundReceiptNumber}`,
      `Refunded Original Receipt Number: ${input.originalReceiptNumber}`,
      input.refundReceiptKey ? `Refund Receipt Key: ${input.refundReceiptKey}` : null,
      input.refundReceiptUrl ? `Refund Receipt URL: ${input.refundReceiptUrl}` : null
    ]
      .filter(Boolean)
      .join('\n')
  ]
    .filter(Boolean)
    .join('\n\n');
};

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

  async findAutomatedMembershipsByReceiptNumber({ receiptNumber, itemIds }) {
    const membershipsDb = new MembershipsDatabase({ notionSecret: NOTION_API_KEY });
    const membershipResponse = await membershipsDb.query({
      page_size: 100,
      filter: {
        notes: { contains: `Receipt Number: ${receiptNumber}` }
      }
    } as any);

    const itemIdSet = new Set(itemIds ?? []);
    return membershipResponse.results
      .map((result) => toExistingMembership(new MembershipsResponseDTO(result as any)))
      .filter((membership) => {
        const notes = membership.notes ?? '';
        if (!notes.includes('Created automatically from Loyverse receipt.')) return false;
        if (!notes.includes(`Receipt Number: ${receiptNumber}`)) return false;
        if (!itemIdSet.size) return true;
        return [...itemIdSet].some((itemId) => notes.includes(`Loyverse Item ID: ${itemId}`));
      })
      .map((membership) => ({ id: membership.id, name: membership.name }));
  },

  async markMembershipRefunded(input) {
    const membershipsDb = new MembershipsDatabase({ notionSecret: NOTION_API_KEY });
    const current = await membershipsDb.getPage(input.membershipId);
    const currentDto = new MembershipsResponseDTO(current as any);
    const currentMembership = toExistingMembership(currentDto);
    const notes = appendRefundNote(currentMembership.notes, input);

    // Notion Status is currently a formula, so it is not directly writable. The refund marker in Notes
    // is used by the app as the manual status override and can be picked up by a future Status formula.
    const updated = await membershipsDb.updatePage(input.membershipId, new MembershipsPatchDTO({
      properties: { notes }
    }));
    const updatedDto = new MembershipsResponseDTO(updated);

    return {
      id: updatedDto.id,
      name: updatedDto.properties.name?.text ?? currentMembership.name
    };
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
