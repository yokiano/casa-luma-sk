import type { LoyverseReceipt } from '$lib/receipts/types';
import { FLEXI_CARD_ITEM_IDS, FLEXI_PASS_ENTRIES_PER_CARD } from '$lib/receipts/open-play-items';
import type { ReceiptAutomation, ReceiptAutomationContext, ReceiptAutomationResult } from './types';

export const FLEXI_PASS_VALIDITY_DAYS = 60;
export const FLEXI_PASS_ACTIVE_STATUS = 'Active';
export const FLEXI_PASS_REFUNDED_STATUS = 'Refunded';
export const FLEXI_PASS_MANUAL_REVIEW_STATUS = 'Manual Review';

export type FlexiPassFamilyMatch = {
  id: string;
  name: string;
  loyverseCustomerId: string;
};

export type FlexiPurchaseLine = {
  lineIndex: number;
  itemId: string;
  itemName?: string | null;
  quantity?: number | null;
  cards: number;
};

export type ExistingFlexiPassRecordQuery = {
  familyId: string;
  sourceReceiptKey?: string;
  sourceReceiptNumber: string;
  sourceItemIds: string[];
};

export type ExistingFlexiPassRecord = {
  id: string;
  name: string;
};

export type CreateFlexiPassRecordInput = {
  familyId: string;
  familyName: string;
  loyverseCustomerId: string;
  cardCount: number;
  entriesGranted: number;
  entriesUsed: number;
  entriesLeft: number;
  validFrom: string;
  validUntil: string;
  sourceReceiptNumber: string;
  sourceReceiptKey: string;
  sourceReceiptUrl?: string;
  sourceLineIndexes: string;
  sourceItemIds: string;
  notes?: string;
};

export type MarkFlexiPassRecordRefundedInput = {
  recordId: string;
  originalReceiptNumber: string;
  refundReceiptNumber: string;
  refundReceiptKey?: string;
  refundReceiptUrl?: string;
};

export type CreatedFlexiPassRecord = {
  id: string;
  name: string;
};

export type FlexiPassPurchaseAutomationDeps = {
  findFamilyByLoyverseCustomerId(input: { loyverseCustomerId: string }): Promise<FlexiPassFamilyMatch | null>;
  findExistingFlexiPassRecord(input: ExistingFlexiPassRecordQuery): Promise<ExistingFlexiPassRecord | null>;
  findFlexiPassRecordsByReceiptNumber(input: { receiptNumber: string; itemIds?: string[] }): Promise<ExistingFlexiPassRecord[]>;
  markFlexiPassRecordRefunded(input: MarkFlexiPassRecordRefundedInput): Promise<ExistingFlexiPassRecord>;
  createFlexiPassRecord(input: CreateFlexiPassRecordInput): Promise<CreatedFlexiPassRecord>;
};

export type FlexiPassPurchaseAutomationOptions = {
  itemIds?: readonly string[];
  deps: FlexiPassPurchaseAutomationDeps;
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

const computeFlexiEndDate = (startDate: string) => {
  const start = new Date(`${startDate}T00:00:00.000Z`);
  return addUtcDays(start, FLEXI_PASS_VALIDITY_DAYS - 1).toISOString().slice(0, 10);
};

const getReceiptDate = (receipt: LoyverseReceipt, context: ReceiptAutomationContext) =>
  toDateOnly(receipt.receipt_date) ?? toDateOnly(receipt.created_at) ?? toDateOnly(context.eventCreatedAt);

const getReceiptKey = (receipt: LoyverseReceipt, context: ReceiptAutomationContext) =>
  context.receiptKey ?? `${context.merchantId ?? 'unknown'}:${receipt.receipt_number}`;

const getFlexiCardQuantity = (quantity: unknown) => {
  if (typeof quantity !== 'number' || !Number.isFinite(quantity) || quantity <= 0) return 1;
  return Math.max(1, Math.trunc(quantity));
};

export const getFlexiPurchaseLines = (receipt: LoyverseReceipt, itemIds: readonly string[]): FlexiPurchaseLine[] => {
  const itemIdSet = new Set(itemIds);

  return (receipt.line_items ?? []).flatMap((lineItem, lineIndex) => {
    const itemId = lineItem.item_id;
    if (!itemId || !itemIdSet.has(itemId)) return [];

    return [{
      lineIndex,
      itemId,
      itemName: lineItem.item_name ?? null,
      quantity: lineItem.quantity ?? null,
      cards: getFlexiCardQuantity(lineItem.quantity)
    }];
  });
};

export const buildFlexiPassAutomationNotes = (input: {
  receipt: LoyverseReceipt;
  context: ReceiptAutomationContext;
  lines: FlexiPurchaseLine[];
}) => [
  'Created automatically from Loyverse flexi pass receipt.',
  `Receipt Number: ${input.receipt.receipt_number}`,
  `Receipt Key: ${getReceiptKey(input.receipt, input.context)}`,
  input.context.eventCreatedAt ? `Webhook Event Created At: ${input.context.eventCreatedAt}` : null,
  'Staff notes can be added below this line.'
]
  .filter(Boolean)
  .join('\n');

const skipped = (message: string, details?: Record<string, unknown>): ReceiptAutomationResult => ({
  code: 'FLEXI_PASS_PURCHASE_SKIPPED',
  status: 'skipped',
  message,
  details
});

const failed = (message: string, details?: Record<string, unknown>): ReceiptAutomationResult => ({
  code: 'FLEXI_PASS_PURCHASE_FAILED',
  status: 'failed',
  message,
  details
});

const refundFlexiPasses = async (input: {
  receipt: LoyverseReceipt;
  context: ReceiptAutomationContext;
  deps: FlexiPassPurchaseAutomationDeps;
  itemIds: string[];
}): Promise<ReceiptAutomationResult> => {
  const { receipt, context, deps, itemIds } = input;
  const originalReceiptNumber = typeof receipt.refund_for === 'string' ? receipt.refund_for.trim() : '';

  if (!originalReceiptNumber) {
    return skipped('Refund receipt does not reference an original receipt number for the flexi pass purchase.', {
      reason: 'refund_missing_original_receipt',
      incidentCode: 'FLEXI_PASS_REFUND_ORIGINAL_RECEIPT_MISSING',
      refundReceiptNumber: receipt.receipt_number,
      itemIds
    });
  }

  try {
    const records = await deps.findFlexiPassRecordsByReceiptNumber({ receiptNumber: originalReceiptNumber, itemIds });
    if (!records.length) {
      return skipped('No flexi pass record matched the original receipt for this refund.', {
        reason: 'refunded_pass_not_found',
        incidentCode: 'FLEXI_PASS_REFUND_RECORD_NOT_FOUND',
        refundReceiptNumber: receipt.receipt_number,
        originalReceiptNumber,
        itemIds
      });
    }

    const updated = await Promise.all(records.map((record) => deps.markFlexiPassRecordRefunded({
      recordId: record.id,
      originalReceiptNumber,
      refundReceiptNumber: receipt.receipt_number,
      refundReceiptKey: getReceiptKey(receipt, context),
      refundReceiptUrl: context.receiptUrl
    })));

    return {
      code: 'FLEXI_PASSES_REFUNDED',
      status: 'completed',
      message: 'Marked flexi pass records as refunded in Notion.',
      details: {
        recordIds: updated.map((record) => record.id),
        recordNames: updated.map((record) => record.name),
        refundReceiptNumber: receipt.receipt_number,
        originalReceiptNumber,
        itemIds
      }
    };
  } catch (error) {
    return failed('Failed to mark flexi pass records as refunded in Notion.', {
      reason: 'notion_refund_update_failed',
      incidentCode: 'FLEXI_PASS_REFUND_NOTION_UPDATE_FAILED',
      refundReceiptNumber: receipt.receipt_number,
      originalReceiptNumber,
      itemIds,
      errorMessage: error instanceof Error ? error.message : String(error)
    });
  }
};

const createPurchaseResult = async (input: {
  receipt: LoyverseReceipt;
  context: ReceiptAutomationContext;
  deps: FlexiPassPurchaseAutomationDeps;
  lines: FlexiPurchaseLine[];
}): Promise<ReceiptAutomationResult> => {
  const { receipt, context, deps, lines } = input;
  const customerId = typeof receipt.customer_id === 'string' ? normalizeId(receipt.customer_id) : '';

  if (!customerId) {
    return failed('Flexi pass purchase receipt has no Loyverse customer id.', {
      reason: 'missing_customer',
      incidentCode: 'FLEXI_PASS_PURCHASE_MISSING_CUSTOMER',
      receiptNumber: receipt.receipt_number,
      itemIds: lines.map((line) => line.itemId),
      lineIndexes: lines.map((line) => line.lineIndex)
    });
  }

  const validFrom = getReceiptDate(receipt, context);
  if (!validFrom) {
    return failed('Flexi pass purchase receipt has no usable receipt date.', {
      reason: 'missing_receipt_date',
      incidentCode: 'FLEXI_PASS_PURCHASE_NOTION_CREATE_FAILED',
      receiptNumber: receipt.receipt_number,
      customerId
    });
  }

  const family = await deps.findFamilyByLoyverseCustomerId({ loyverseCustomerId: customerId });
  if (!family) {
    return failed('No Notion Family matched the receipt Loyverse customer id.', {
      reason: 'family_not_found',
      incidentCode: 'FLEXI_PASS_PURCHASE_FAMILY_NOT_FOUND',
      receiptNumber: receipt.receipt_number,
      customerId,
      itemIds: lines.map((line) => line.itemId),
      lineIndexes: lines.map((line) => line.lineIndex)
    });
  }

  const validUntil = computeFlexiEndDate(validFrom);
  const sourceReceiptKey = getReceiptKey(receipt, context);
  const cardCount = lines.reduce((sum, line) => sum + line.cards, 0);
  const entriesGranted = cardCount * FLEXI_PASS_ENTRIES_PER_CARD;
  const sourceItemIds = [...new Set(lines.map((line) => line.itemId))];
  const sourceLineIndexes = lines.map((line) => line.lineIndex).join(',');

  const existing = await deps.findExistingFlexiPassRecord({
    familyId: family.id,
    sourceReceiptKey,
    sourceReceiptNumber: receipt.receipt_number,
    sourceItemIds
  });

  if (existing) {
    return skipped('Flexi pass record already exists for this receipt; possible corrected receipt skipped for manual review.', {
      reason: 'already_created_or_corrected_receipt',
      incidentCode: 'FLEXI_PASS_PURCHASE_CORRECTED_RECEIPT_SKIPPED',
      recordId: existing.id,
      receiptNumber: receipt.receipt_number,
      sourceReceiptKey,
      familyId: family.id,
      itemIds: sourceItemIds,
      lineIndexes: lines.map((line) => line.lineIndex),
      cardCount,
      entriesGranted
    });
  }

  try {
    const created = await deps.createFlexiPassRecord({
      familyId: family.id,
      familyName: family.name,
      loyverseCustomerId: customerId,
      cardCount,
      entriesGranted,
      entriesUsed: 0,
      entriesLeft: entriesGranted,
      validFrom,
      validUntil,
      sourceReceiptNumber: receipt.receipt_number,
      sourceReceiptKey,
      sourceReceiptUrl: context.receiptUrl,
      sourceLineIndexes,
      sourceItemIds: sourceItemIds.join(','),
      notes: buildFlexiPassAutomationNotes({ receipt, context: { ...context, receiptKey: sourceReceiptKey }, lines })
    });

    return {
      code: 'FLEXI_PASSES_CREATED',
      status: 'completed',
      message: 'Created structured Notion flexi pass record from Loyverse receipt.',
      details: {
        recordId: created.id,
        recordName: created.name,
        familyId: family.id,
        familyName: family.name,
        customerId,
        receiptNumber: receipt.receipt_number,
        sourceReceiptKey,
        itemIds: sourceItemIds,
        cardCount,
        entriesGranted,
        entriesLeft: entriesGranted,
        validFrom,
        validUntil,
        lineIndexes: lines.map((line) => line.lineIndex)
      }
    };
  } catch (error) {
    return failed('Failed to create Notion flexi pass record from Loyverse receipt.', {
      reason: 'notion_create_failed',
      incidentCode: 'FLEXI_PASS_PURCHASE_NOTION_CREATE_FAILED',
      receiptNumber: receipt.receipt_number,
      sourceReceiptKey,
      customerId,
      familyId: family.id,
      itemIds: sourceItemIds,
      lineIndexes: lines.map((line) => line.lineIndex),
      cardCount,
      entriesGranted,
      errorMessage: error instanceof Error ? error.message : String(error)
    });
  }
};

export const createFlexiPassPurchaseAutomation = (options: FlexiPassPurchaseAutomationOptions): ReceiptAutomation => {
  const itemIds = options.itemIds ?? FLEXI_CARD_ITEM_IDS;

  return {
    code: 'flexi-pass-purchase',
    description: 'Create structured Notion flexi pass records from eligible Loyverse flexi card purchase receipts.',
    async run({ receipt, context }) {
      const lines = getFlexiPurchaseLines(receipt, itemIds);
      if (!lines.length) {
        return skipped('Receipt has no configured flexi pass purchase items.', { reason: 'no_matching_item' });
      }

      if (receipt.receipt_type === 'REFUND') {
        return refundFlexiPasses({ receipt, context, deps: options.deps, itemIds: [...new Set(lines.map((line) => line.itemId))] });
      }

      if (receipt.cancelled_at) {
        return skipped('Cancelled receipts do not create flexi pass records; staff should review whether any record needs reversal.', {
          reason: 'cancelled_receipt',
          incidentCode: 'FLEXI_PASS_PURCHASE_CANCELLED_SKIPPED',
          receiptNumber: receipt.receipt_number,
          itemIds: lines.map((line) => line.itemId)
        });
      }

      return createPurchaseResult({ receipt, context, deps: options.deps, lines });
    }
  };
};
