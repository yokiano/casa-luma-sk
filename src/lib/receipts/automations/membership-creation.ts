import type { LoyverseReceipt } from '$lib/receipts/types';
import type { ReceiptAutomation, ReceiptAutomationContext, ReceiptAutomationResult } from './types';
import {
  MEMBERSHIP_PURCHASE_ITEMS,
  type MembershipPurchaseItemConfig,
  type MembershipType
} from './membership-items';

export type FamilyMatch = {
  id: string;
  name: string;
  loyverseCustomerId: string;
};

export type ExistingMembershipQuery = {
  familyId: string;
  type: MembershipType;
  numberOfKids: number;
  startDate: string;
  endDate: string;
  receiptKey?: string;
  receiptNumber: string;
  itemId: string;
};

export type ExistingMembership = {
  id: string;
  name: string;
};

export const MEMBERSHIP_REFUND_NOTE_PREFIX = 'Refund Status: Refund';

export type CreateMembershipFromReceiptInput = {
  familyId: string;
  familyName: string;
  type: MembershipType;
  numberOfKids: number;
  startDate: string;
  endDate: string;
  notes: string;
  receiptUrl?: string;
};

export type CreatedMembership = {
  id: string;
  name: string;
};

export type MembershipAutomationDeps = {
  findFamilyByLoyverseCustomerId(input: { loyverseCustomerId: string }): Promise<FamilyMatch | null>;
  findExistingAutomatedMembership(input: ExistingMembershipQuery): Promise<ExistingMembership | null>;
  findAutomatedMembershipsByReceiptNumber(input: { receiptNumber: string; itemIds?: string[] }): Promise<ExistingMembership[]>;
  markMembershipRefunded(input: {
    membershipId: string;
    originalReceiptNumber: string;
    refundReceiptNumber: string;
    refundReceiptKey?: string;
    refundReceiptUrl?: string;
  }): Promise<ExistingMembership>;
  createMembership(input: CreateMembershipFromReceiptInput): Promise<CreatedMembership>;
};

type MembershipPurchaseGroup = {
  config: MembershipPurchaseItemConfig;
  numberOfKids: number;
  lineIndexes: number[];
};

const normalizeId = (value: string) => value.trim();

const toDateOnly = (value?: string | null): string | null => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    const fallback = value.slice(0, 10);
    return /^\d{4}-\d{2}-\d{2}$/.test(fallback) ? fallback : null;
  }
  return parsed.toISOString().slice(0, 10);
};

const addUtcDays = (date: Date, days: number) => {
  const copy = new Date(date.getTime());
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
};

const computeEndDate = (startDate: string, durationDays: number) => {
  const start = new Date(`${startDate}T00:00:00.000Z`);
  return addUtcDays(start, durationDays - 1).toISOString().slice(0, 10);
};

const getReceiptDate = (receipt: LoyverseReceipt, context: ReceiptAutomationContext) =>
  toDateOnly(receipt.receipt_date) ?? toDateOnly(receipt.created_at) ?? toDateOnly(context.eventCreatedAt);

const getLineQuantityAsKids = (quantity: unknown) => {
  if (typeof quantity !== 'number' || !Number.isFinite(quantity) || quantity <= 0) return 1;
  return Math.max(1, Math.trunc(quantity));
};

const getMembershipPurchaseGroups = (receipt: LoyverseReceipt, itemConfig: MembershipPurchaseItemConfig[]) => {
  const configByItemId = new Map(itemConfig.map((config) => [config.itemId, config]));
  const groups = new Map<string, MembershipPurchaseGroup>();

  for (const [lineIndex, lineItem] of (receipt.line_items ?? []).entries()) {
    const itemId = lineItem.item_id;
    const config = itemId ? configByItemId.get(itemId) : undefined;
    if (!config) continue;

    const key = `${config.itemId}:${config.type}:${config.durationDays}`;
    const group = groups.get(key) ?? { config, numberOfKids: 0, lineIndexes: [] };
    group.numberOfKids += getLineQuantityAsKids(lineItem.quantity);
    group.lineIndexes.push(lineIndex);
    groups.set(key, group);
  }

  return [...groups.values()];
};

export const buildMembershipAutomationNotes = (input: {
  receipt: LoyverseReceipt;
  context: ReceiptAutomationContext;
  itemId: string;
  itemLabel: string;
  lineIndexes: number[];
  numberOfKids: number;
}) => {
  const receiptKey = input.context.receiptKey ?? `${input.context.merchantId ?? 'unknown'}:${input.receipt.receipt_number}`;
  return [
    'Created automatically from Loyverse receipt.',
    `Receipt Number: ${input.receipt.receipt_number}`,
    `Receipt Key: ${receiptKey}`,
    `Loyverse Item ID: ${input.itemId}`,
    `Loyverse Item Label: ${input.itemLabel}`,
    `Receipt Line Indexes: ${input.lineIndexes.join(',')}`,
    `Number of Kids: ${input.numberOfKids}`,
    input.context.eventCreatedAt ? `Webhook Event Created At: ${input.context.eventCreatedAt}` : null,
    'Refund/correction policy: skip automatic reversal/update and notify staff for review.'
  ]
    .filter(Boolean)
    .join('\n');
};

const skipped = (message: string, details?: Record<string, unknown>): ReceiptAutomationResult => ({
  code: 'MEMBERSHIP_CREATION_SKIPPED',
  status: 'skipped',
  message,
  details
});

const failed = (message: string, details?: Record<string, unknown>): ReceiptAutomationResult => ({
  code: 'MEMBERSHIP_CREATION_FAILED',
  status: 'failed',
  message,
  details
});

const missingDeps = (): ReceiptAutomationResult =>
  failed('Membership creation automation dependencies are not configured.', {
    reason: 'missing_dependencies',
    incidentCode: 'MEMBERSHIP_CREATION_NOTION_CREATE_FAILED'
  });

const missingRefundDeps = (): ReceiptAutomationResult =>
  failed('Membership refund automation dependencies are not configured.', {
    reason: 'missing_refund_dependencies',
    incidentCode: 'MEMBERSHIP_REFUND_NOTION_UPDATE_FAILED'
  });

const markRefundedMemberships = async (input: {
  receipt: LoyverseReceipt;
  context: ReceiptAutomationContext;
  deps: MembershipAutomationDeps;
  itemIds: string[];
}): Promise<ReceiptAutomationResult> => {
  const { receipt, context, deps, itemIds } = input;
  const originalReceiptNumber = typeof receipt.refund_for === 'string' ? receipt.refund_for.trim() : '';

  if (!originalReceiptNumber) {
    return skipped('Refund receipt does not reference an original receipt number.', {
      reason: 'refund_missing_original_receipt',
      incidentCode: 'MEMBERSHIP_REFUND_ORIGINAL_RECEIPT_MISSING',
      refundReceiptNumber: receipt.receipt_number,
      itemIds
    });
  }

  try {
    const memberships = await deps.findAutomatedMembershipsByReceiptNumber({
      receiptNumber: originalReceiptNumber,
      itemIds
    });

    if (!memberships.length) {
      return skipped('No automated membership matched the original receipt for this refund.', {
        reason: 'refunded_membership_not_found',
        incidentCode: 'MEMBERSHIP_REFUND_MEMBERSHIP_NOT_FOUND',
        refundReceiptNumber: receipt.receipt_number,
        originalReceiptNumber,
        itemIds
      });
    }

    const updated = await Promise.all(
      memberships.map((membership) =>
        deps.markMembershipRefunded({
          membershipId: membership.id,
          originalReceiptNumber,
          refundReceiptNumber: receipt.receipt_number,
          refundReceiptKey: context.receiptKey,
          refundReceiptUrl: context.receiptUrl
        })
      )
    );

    return {
      code: 'MEMBERSHIP_REFUNDED',
      status: 'completed',
      message: 'Marked automated membership as refunded from Loyverse refund receipt.',
      details: {
        membershipIds: updated.map((membership) => membership.id),
        membershipNames: updated.map((membership) => membership.name),
        refundReceiptNumber: receipt.receipt_number,
        originalReceiptNumber,
        itemIds
      }
    };
  } catch (error) {
    return failed('Failed to mark automated membership as refunded.', {
      reason: 'notion_refund_update_failed',
      incidentCode: 'MEMBERSHIP_REFUND_NOTION_UPDATE_FAILED',
      refundReceiptNumber: receipt.receipt_number,
      originalReceiptNumber,
      itemIds,
      errorMessage: error instanceof Error ? error.message : String(error)
    });
  }
};

const createGroupResult = async (input: {
  receipt: LoyverseReceipt;
  context: ReceiptAutomationContext;
  deps: MembershipAutomationDeps;
  group: MembershipPurchaseGroup;
}): Promise<ReceiptAutomationResult> => {
  const { receipt, context, deps, group } = input;
  const { config, numberOfKids, lineIndexes } = group;
  const customerId = typeof receipt.customer_id === 'string' ? normalizeId(receipt.customer_id) : '';

  if (!customerId) {
    return failed('Membership purchase receipt has no Loyverse customer id.', {
      reason: 'missing_customer',
      incidentCode: 'MEMBERSHIP_CREATION_MISSING_CUSTOMER',
      receiptNumber: receipt.receipt_number,
      itemId: config.itemId,
      lineIndexes
    });
  }

  const startDate = getReceiptDate(receipt, context);
  if (!startDate) {
    return failed('Membership purchase receipt has no usable receipt date.', {
      reason: 'missing_receipt_date',
      incidentCode: 'MEMBERSHIP_CREATION_NOTION_CREATE_FAILED',
      receiptNumber: receipt.receipt_number,
      itemId: config.itemId,
      lineIndexes
    });
  }

  const family = await deps.findFamilyByLoyverseCustomerId({ loyverseCustomerId: customerId });
  if (!family) {
    return failed('No Notion Family matched the receipt Loyverse customer id.', {
      reason: 'family_not_found',
      incidentCode: 'MEMBERSHIP_CREATION_FAMILY_NOT_FOUND',
      receiptNumber: receipt.receipt_number,
      customerId,
      itemId: config.itemId,
      lineIndexes
    });
  }

  const endDate = computeEndDate(startDate, config.durationDays);
  const receiptKey = context.receiptKey ?? `${context.merchantId ?? 'unknown'}:${receipt.receipt_number}`;
  const existing = await deps.findExistingAutomatedMembership({
    familyId: family.id,
    type: config.type,
    numberOfKids,
    startDate,
    endDate,
    receiptKey,
    receiptNumber: receipt.receipt_number,
    itemId: config.itemId
  });

  if (existing) {
    return skipped('Automated membership already exists for this receipt; possible corrected receipt skipped for manual review.', {
      reason: 'already_created_or_corrected_receipt',
      incidentCode: 'MEMBERSHIP_CREATION_CORRECTED_RECEIPT_SKIPPED',
      membershipId: existing.id,
      receiptNumber: receipt.receipt_number,
      receiptKey,
      familyId: family.id,
      itemId: config.itemId,
      lineIndexes,
      numberOfKids
    });
  }

  try {
    const created = await deps.createMembership({
      familyId: family.id,
      familyName: family.name,
      type: config.type,
      numberOfKids,
      startDate,
      endDate,
      notes: buildMembershipAutomationNotes({
        receipt,
        context: { ...context, receiptKey },
        itemId: config.itemId,
        itemLabel: config.label,
        lineIndexes,
        numberOfKids
      }),
      receiptUrl: context.receiptUrl
    });

    return {
      code: 'MEMBERSHIP_CREATED',
      status: 'completed',
      message: 'Created Notion membership from Loyverse receipt.',
      details: {
        membershipId: created.id,
        membershipName: created.name,
        familyId: family.id,
        familyName: family.name,
        receiptNumber: receipt.receipt_number,
        receiptKey,
        itemId: config.itemId,
        type: config.type,
        numberOfKids,
        startDate,
        endDate,
        lineIndexes
      }
    };
  } catch (error) {
    return failed('Failed to create Notion membership from Loyverse receipt.', {
      reason: 'notion_create_failed',
      incidentCode: 'MEMBERSHIP_CREATION_NOTION_CREATE_FAILED',
      receiptNumber: receipt.receipt_number,
      receiptKey,
      customerId,
      familyId: family.id,
      itemId: config.itemId,
      lineIndexes,
      numberOfKids,
      errorMessage: error instanceof Error ? error.message : String(error)
    });
  }
};

export const createMembershipFromReceiptAutomation = (
  options: {
    itemConfig?: MembershipPurchaseItemConfig[];
    deps?: Partial<MembershipAutomationDeps>;
  } = {}
): ReceiptAutomation => {
  const itemConfig = options.itemConfig ?? MEMBERSHIP_PURCHASE_ITEMS;

  return {
    code: 'membership-creation',
    description: 'Create Notion Membership rows from eligible Loyverse membership purchase receipts.',
    async run({ receipt, context }) {
      const groups = getMembershipPurchaseGroups(receipt, itemConfig);
      if (!groups.length) {
        return skipped('Receipt has no configured membership purchase items.', { reason: 'no_matching_item' });
      }

      if (receipt.receipt_type === 'REFUND') {
        const deps = options.deps;
        if (!deps?.findAutomatedMembershipsByReceiptNumber || !deps.markMembershipRefunded) {
          return missingRefundDeps();
        }

        return markRefundedMemberships({
          receipt,
          context,
          deps: deps as MembershipAutomationDeps,
          itemIds: groups.map((group) => group.config.itemId)
        });
      }

      if (receipt.cancelled_at) {
        return skipped('Cancelled receipts do not create memberships; staff should review whether any membership needs manual reversal.', {
          reason: 'cancelled_receipt',
          incidentCode: 'MEMBERSHIP_CREATION_CANCELLED_SKIPPED',
          receiptNumber: receipt.receipt_number,
          itemIds: groups.map((group) => group.config.itemId)
        });
      }

      const deps = options.deps;
      if (!deps?.findFamilyByLoyverseCustomerId || !deps.findExistingAutomatedMembership || !deps.createMembership) {
        return missingDeps();
      }

      return Promise.all(
        groups.map((group) =>
          createGroupResult({
            receipt,
            context,
            deps: deps as MembershipAutomationDeps,
            group
          })
        )
      );
    }
  };
};
