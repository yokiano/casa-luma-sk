import type { LoyverseReceipt } from '$lib/receipts/types';
import { FLEXI_SINGLE_ENTRANCE_ITEM_ID } from '$lib/receipts/open-play-items';
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

export type FlexiPassUsageAutomationDeps = {
  lookupFlexiBalance(input: {
    customerId: string;
    merchantId?: string;
    at: string;
    currentReceiptKey?: string;
    currentReceiptEntries: number;
  }): Promise<FlexiPassBalance>;
  findFlexiPassRecordsForUsage(input: { loyverseCustomerId: string; at: string }): Promise<FlexiPassUsageRecord[]>;
  updateFlexiPassUsage(input: UpdateFlexiPassUsageInput): Promise<FlexiPassUsageRecord>;
};

export type FlexiPassUsageAutomationOptions = {
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

const quantityForItem = (receipt: LoyverseReceipt, itemId: string) =>
  (receipt.line_items ?? []).reduce((sum, lineItem) => {
    if (lineItem.item_id !== itemId) return sum;
    const quantity = typeof lineItem.quantity === 'number' && Number.isFinite(lineItem.quantity) ? lineItem.quantity : 1;
    return sum + quantity;
  }, 0);

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

export const createFlexiPassUsageAutomation = (options: FlexiPassUsageAutomationOptions): ReceiptAutomation => {
  const itemId = options.itemId ?? FLEXI_SINGLE_ENTRANCE_ITEM_ID;

  return {
    code: 'flexi-pass-usage',
    description: 'Synchronize Flexi Passes Notion Entries Used/Left from Flexi Single Entrance receipts.',
    async run({ receipt, context }) {
      const currentReceiptEntries = quantityForItem(receipt, itemId);
      if (currentReceiptEntries <= 0) {
        return skipped('Receipt has no Flexi Single Entrance usage item.', { reason: 'no_matching_item' });
      }

      if (receipt.receipt_type === 'REFUND') {
        return skipped('Refund receipts do not decrement flexi pass usage.', {
          reason: 'refund_receipt',
          receiptNumber: receipt.receipt_number
        });
      }

      if (receipt.cancelled_at) {
        return skipped('Cancelled receipts do not decrement flexi pass usage.', {
          reason: 'cancelled_receipt',
          incidentCode: 'FLEXI_PASS_USAGE_CANCELLED_SKIPPED',
          receiptNumber: receipt.receipt_number
        });
      }

      const customerId = typeof receipt.customer_id === 'string' ? receipt.customer_id.trim() : '';
      if (!customerId) {
        return skipped('Flexi Single Entrance receipt has no Loyverse customer id; validation will flag this.', {
          reason: 'missing_customer',
          receiptNumber: receipt.receipt_number
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
            currentReceiptEntries
          }),
          options.deps.findFlexiPassRecordsForUsage({ loyverseCustomerId: customerId, at: checkedDate })
        ]);

        if (!records.length) {
          return skipped('No Flexi Passes Notion records found for this usage receipt.', {
            reason: 'no_flexi_pass_records',
            receiptNumber: receipt.receipt_number,
            customerId,
            currentReceiptEntries
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
            ? 'Updated Flexi Passes Notion usage counters from receipt history.'
            : 'Flexi Passes Notion usage counters were already up to date.',
          details: {
            receiptNumber: receipt.receipt_number,
            customerId,
            currentReceiptEntries,
            entriesUsedIncludingCurrent: balance.entriesUsedIncludingCurrent,
            recordsChecked: records.length,
            recordsUpdated: changed.length,
            recordIds: changed.map((record) => record.id),
            remainingAfterCurrentReceipt: balance.remainingAfterCurrentReceipt
          }
        };
      } catch (error) {
        return failed('Failed to synchronize Flexi Passes Notion usage counters.', {
          reason: 'notion_usage_update_failed',
          incidentCode: 'FLEXI_PASS_USAGE_NOTION_UPDATE_FAILED',
          receiptNumber: receipt.receipt_number,
          customerId,
          currentReceiptEntries,
          errorMessage: error instanceof Error ? error.message : String(error)
        });
      }
    }
  };
};
