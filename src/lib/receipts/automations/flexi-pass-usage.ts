import type { LoyverseReceipt } from '$lib/receipts/types';
import { summarizeFlexiCheckout } from '$lib/receipts/flexi-line-items';
import type { FlexiPassBalance } from '$lib/server/db/flexi-pass-queries';
import type { ReceiptAutomation, ReceiptAutomationContext, ReceiptAutomationResult } from './types';

export type FlexiPassUsageRecord = {
  id: string;
  name: string;
  entriesGranted: number;
  entriesUsed: number;
  entriesLeft: number;
  validFrom: string | null;
  validUntil: string | null;
  createdTime: string;
};

export type UpdateFlexiPassUsageInput = {
  recordId: string;
  entriesUsed: number;
  entriesLeft: number;
  receiptNumber: string;
  receiptKey?: string;
};

type FlexiUsageFamilyMatch = {
  id: string;
  name: string;
};

export type FlexiPassUsageAutomationDeps = {
  lookupFlexiBalance(input: {
    customerId: string;
    merchantId?: string;
    at: string;
    currentReceiptKey?: string;
    currentVisitPunches: number;
    currentReceiptEntries?: number;
  }): Promise<FlexiPassBalance>;
  findFlexiPassRecordsForUsage(input: { loyverseCustomerId: string; at: string }): Promise<FlexiPassUsageRecord[]>;
  findFamilyByLoyverseCustomerId?(input: { loyverseCustomerId: string }): Promise<FlexiUsageFamilyMatch | null>;
  updateFlexiPassUsage(input: UpdateFlexiPassUsageInput): Promise<FlexiPassUsageRecord>;
};

export type FlexiPassUsageAutomationOptions = {
  /** Optional test/legacy restriction. Normal operation classifies the full receipt. */
  itemId?: string;
  deps: FlexiPassUsageAutomationDeps;
};

type UsageAllocation = FlexiPassUsageRecord & {
  nextEntriesUsed: number;
  nextEntriesLeft: number;
};

const skipped = (message: string, details?: Record<string, unknown>): ReceiptAutomationResult => ({
  code: 'FLEXI_PASS_USAGE_SKIPPED',
  status: 'skipped',
  message,
  details
});

const failed = (message: string, details?: Record<string, unknown>): ReceiptAutomationResult => ({
  code: 'FLEXI_PASS_USAGE_FAILED',
  status: 'failed',
  message,
  details
});

const getReceiptKey = (receipt: LoyverseReceipt, context: ReceiptAutomationContext) =>
  context.receiptKey ?? `${context.merchantId ?? 'unknown'}:${receipt.receipt_number}`;

const getReceiptDate = (receipt: LoyverseReceipt, context: ReceiptAutomationContext) =>
  receipt.receipt_date ?? receipt.created_at ?? context.eventCreatedAt ?? new Date().toISOString();

const asNonNegativeNumber = (value: number | null | undefined) =>
  typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0;

export const allocateFlexiUsage = (
  records: FlexiPassUsageRecord[],
  entriesUsedIncludingCurrent: number
): UsageAllocation[] => {
  let remainingUsed = Math.max(0, entriesUsedIncludingCurrent);

  return [...records]
    .sort((a, b) => (a.validFrom ?? a.createdTime).localeCompare(b.validFrom ?? b.createdTime))
    .map((record) => {
      const entriesGranted = asNonNegativeNumber(record.entriesGranted);
      const nextEntriesUsed = Math.min(entriesGranted, remainingUsed);
      remainingUsed -= nextEntriesUsed;

      return {
        ...record,
        nextEntriesUsed,
        nextEntriesLeft: Math.max(0, entriesGranted - nextEntriesUsed)
      };
    });
};

export const createFlexiPassUsageAutomation = (options: FlexiPassUsageAutomationOptions): ReceiptAutomation => ({
  code: 'flexi-pass-usage',
  description: 'Synchronize Flexi Passes Notion usage from Flexi Checkout visit punches.',
  async run({ receipt, context }) {
    const lineItems = options.itemId
      ? (receipt.line_items ?? []).filter((lineItem) => lineItem.item_id === options.itemId)
      : receipt.line_items ?? [];
    const checkout = summarizeFlexiCheckout(lineItems);

    if (!checkout.matched) {
      return skipped('Receipt has no Flexi Checkout usage item.', { reason: 'no_matching_item' });
    }

    if (checkout.invalid.length || checkout.validLineCount !== 1 || checkout.hours <= 0) {
      return skipped('Flexi Checkout has an invalid shape; Notion usage was not changed.', {
        reason: 'invalid_checkout_variant',
        incidentCode: 'FLEXI_PASS_USAGE_INVALID_CHECKOUT',
        receiptNumber: receipt.receipt_number,
        selectedVisitPunches: checkout.hours,
        validationErrors: checkout.invalid.map((item) => item.reason)
      });
    }

    if (receipt.receipt_type === 'REFUND') {
      return skipped('Refund receipts do not decrement Flexi pass usage.', {
        reason: 'refund_receipt',
        receiptNumber: receipt.receipt_number
      });
    }

    if (receipt.cancelled_at) {
      return skipped('Cancelled receipts do not decrement Flexi pass usage.', {
        reason: 'cancelled_receipt',
        incidentCode: 'FLEXI_PASS_USAGE_CANCELLED_SKIPPED',
        receiptNumber: receipt.receipt_number
      });
    }

    const customerId = typeof receipt.customer_id === 'string' ? receipt.customer_id.trim() : '';
    if (!customerId) {
      return skipped('Flexi Checkout receipt has no Loyverse customer id; validation will flag this.', {
        reason: 'missing_customer',
        incidentCode: 'FLEXI_PASS_USAGE_MISSING_CUSTOMER',
        receiptNumber: receipt.receipt_number,
        selectedVisitPunches: checkout.hours
      });
    }

    const checkedDate = getReceiptDate(receipt, context);
    const receiptKey = getReceiptKey(receipt, context);

    try {
      const [balance, records] = await Promise.all([
        options.deps.lookupFlexiBalance({
          customerId,
          merchantId: context.merchantId,
          at: checkedDate,
          currentReceiptKey: receiptKey,
          currentVisitPunches: checkout.hours,
          currentReceiptEntries: checkout.hours
        }),
        options.deps.findFlexiPassRecordsForUsage({ loyverseCustomerId: customerId, at: checkedDate })
      ]);

      if ((balance.unknownVariantDiagnostics ?? []).length) {
        return skipped('Flexi balance history contains an unknown or malformed Checkout variant; Notion usage was not changed.', {
          reason: 'unknown_checkout_history',
          incidentCode: 'FLEXI_PASS_USAGE_INVALID_CHECKOUT',
          receiptNumber: receipt.receipt_number,
          customerId,
          selectedVisitPunches: checkout.hours,
          unknownVariantDiagnostics: balance.unknownVariantDiagnostics ?? []
        });
      }

      if (!records.length) {
        const hasPurchasedFlexiEntries = balance.entriesPurchased > 0;
        const family = options.deps.findFamilyByLoyverseCustomerId
          ? await options.deps.findFamilyByLoyverseCustomerId({ loyverseCustomerId: customerId })
          : null;

        return skipped('No Flexi Passes Notion records found for this usage receipt.', {
          reason: 'no_flexi_pass_records',
          ...(hasPurchasedFlexiEntries ? { incidentCode: 'FLEXI_PASS_USAGE_NO_NOTION_RECORDS' } : {}),
          receiptNumber: receipt.receipt_number,
          customerId,
          familyId: family?.id,
          familyName: family?.name,
          selectedVisitPunches: checkout.hours,
          currentVisitPunches: checkout.hours,
          currentReceiptEntries: checkout.hours,
          cardsPurchased: balance.cardsPurchased,
          entriesPurchased: balance.entriesPurchased,
          entriesUsedIncludingCurrent: balance.entriesUsedIncludingCurrent,
          remainingBeforeCurrentReceipt: balance.remainingBeforeCurrentReceipt,
          remainingAfterCurrentReceipt: balance.remainingAfterCurrentReceipt,
          firstPurchaseAt: balance.firstPurchaseAt,
          lastPurchaseAt: balance.lastPurchaseAt
        });
      }

      const allocations = allocateFlexiUsage(records, balance.entriesUsedIncludingCurrent);
      const changed = allocations.filter(
        (record) => record.entriesUsed !== record.nextEntriesUsed || record.entriesLeft !== record.nextEntriesLeft
      );

      if (changed.length) {
        await Promise.all(changed.map((record) => options.deps.updateFlexiPassUsage({
          recordId: record.id,
          entriesUsed: record.nextEntriesUsed,
          entriesLeft: record.nextEntriesLeft,
          receiptNumber: receipt.receipt_number,
          receiptKey
        })));
      }

      return {
        code: 'FLEXI_PASS_USAGE_UPDATED',
        status: 'completed',
        message: changed.length
          ? 'Updated Flexi Passes Notion usage counters from Flexi Checkout visit punches.'
          : 'Flexi Passes Notion usage counters were already up to date.',
        details: {
          receiptNumber: receipt.receipt_number,
          customerId,
          selectedVisitPunches: checkout.hours,
          currentVisitPunches: checkout.hours,
          currentReceiptEntries: checkout.hours,
          entriesUsedIncludingCurrent: balance.entriesUsedIncludingCurrent,
          recordsChecked: records.length,
          recordsUpdated: changed.length,
          recordIds: changed.map((record) => record.id),
          remainingAfterCurrentReceipt: balance.remainingAfterCurrentReceipt
        }
      };
    } catch (error) {
      const family = options.deps.findFamilyByLoyverseCustomerId
        ? await options.deps.findFamilyByLoyverseCustomerId({ loyverseCustomerId: customerId })
        : null;

      return failed('Failed to synchronize Flexi Passes Notion usage counters.', {
        reason: 'notion_usage_update_failed',
        incidentCode: 'FLEXI_PASS_USAGE_NOTION_UPDATE_FAILED',
        receiptNumber: receipt.receipt_number,
        customerId,
        familyId: family?.id,
        familyName: family?.name,
        selectedVisitPunches: checkout.hours,
        currentVisitPunches: checkout.hours,
        currentReceiptEntries: checkout.hours,
        errorMessage: error instanceof Error ? error.message : String(error)
      });
    }
  }
});
