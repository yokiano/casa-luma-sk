import type { LoyverseReceiptLineItem } from '$lib/receipts/types';
import { OPEN_PLAY_CUSTOMER_REQUIRED_ITEM_IDS } from '$lib/receipts/open-play-items';
import type { ReceiptValidationRule } from '../types';

export interface MissingCustomerRuleOptions {
  skipRefunds?: boolean;
  skipCancelled?: boolean;
  requiredItemIds?: readonly string[];
}

const hasCustomer = (customerId?: string | null): boolean =>
  typeof customerId === 'string' && customerId.trim().length > 0;

const summarizeItems = (lineItems: LoyverseReceiptLineItem[] = []) =>
  lineItems.slice(0, 5).map((lineItem, lineIndex) => ({
    lineIndex,
    itemId: lineItem.item_id ?? null,
    itemName: lineItem.item_name ?? null,
    quantity: lineItem.quantity ?? null
  }));

export const createMissingCustomerRule = (
  options: MissingCustomerRuleOptions = {}
): ReceiptValidationRule => {
  const skipRefunds = options.skipRefunds ?? true;
  const skipCancelled = options.skipCancelled ?? true;
  const requiredItemIds = new Set(options.requiredItemIds ?? OPEN_PLAY_CUSTOMER_REQUIRED_ITEM_IDS);

  return {
    code: 'RECEIPT_CLOSED_WITHOUT_CUSTOMER',
    description: 'Notify when a non-refund closed receipt has no Loyverse customer attached',
    validate: ({ receipt }) => {
      if (skipRefunds && receipt.receipt_type === 'REFUND') return null;
      if (skipCancelled && receipt.cancelled_at) return null;
      if (hasCustomer(receipt.customer_id)) return null;

      const matchingItems = (receipt.line_items ?? []).filter(
        (lineItem) => typeof lineItem.item_id === 'string' && requiredItemIds.has(lineItem.item_id)
      );
      if (!matchingItems.length) return null;

      return {
        code: 'RECEIPT_CLOSED_WITHOUT_CUSTOMER',
        severity: 'warning',
        message: 'Receipt was closed without a Loyverse customer attached.',
        details: {
          receiptNumber: receipt.receipt_number,
          receiptType: receipt.receipt_type ?? null,
          totalMoney: receipt.total_money ?? null,
          itemCount: matchingItems.length,
          items: summarizeItems(matchingItems)
        }
      };
    }
  };
};
