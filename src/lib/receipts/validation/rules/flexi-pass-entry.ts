import {
  FLEXI_CARD_ITEM_IDS,
  FLEXI_PASS_ENTRIES_PER_CARD,
  FLEXI_SINGLE_ENTRANCE_ITEM_ID
} from '$lib/receipts/open-play-items';
import type { FlexiPassBalance } from '$lib/server/db/flexi-pass-queries';
import type { LoyverseReceiptLineItem } from '$lib/receipts/types';
import type { ReceiptValidationContext, ReceiptValidationRule } from '../types';

export interface FlexiPassEntryRuleOptions {
  skipRefunds?: boolean;
  lookupFlexiBalance?: (input: {
    customerId: string;
    merchantId?: string;
    at: string;
    currentReceiptKey?: string;
    currentReceiptEntries: number;
  }) => Promise<FlexiPassBalance>;
}

const hasCustomer = (customerId?: string | null): customerId is string =>
  typeof customerId === 'string' && customerId.trim().length > 0;

const quantityForItem = (lineItems: LoyverseReceiptLineItem[] = [], itemId: string): number =>
  lineItems.reduce((sum, lineItem) => {
    if (lineItem.item_id !== itemId) return sum;
    const quantity = typeof lineItem.quantity === 'number' && Number.isFinite(lineItem.quantity) ? lineItem.quantity : 1;
    return sum + quantity;
  }, 0);

const getReceiptDate = (receipt: { receipt_date?: string; created_at?: string }, context: ReceiptValidationContext): string =>
  receipt.receipt_date ?? receipt.created_at ?? context.eventCreatedAt ?? new Date().toISOString();

const defaultLookupFlexiBalance: NonNullable<FlexiPassEntryRuleOptions['lookupFlexiBalance']> = async (input) => {
  const { queryFlexiPassBalanceForCustomer } = await import('$lib/server/db/flexi-pass-queries');
  return queryFlexiPassBalanceForCustomer(input);
};

export const createFlexiPassEntryRule = (
  options: FlexiPassEntryRuleOptions = {}
): ReceiptValidationRule => {
  const skipRefunds = options.skipRefunds ?? true;
  const lookupFlexiBalance = options.lookupFlexiBalance ?? defaultLookupFlexiBalance;

  return {
    code: 'FLEXI_ENTRY_WITHOUT_AVAILABLE_PASS',
    description: 'Verify Flexi Single Entrance receipts have an attached customer with remaining flexi passes',
    validate: async ({ receipt, context }) => {
      if (skipRefunds && receipt.receipt_type === 'REFUND') return null;

      const currentReceiptEntries = quantityForItem(receipt.line_items, FLEXI_SINGLE_ENTRANCE_ITEM_ID);
      if (currentReceiptEntries <= 0) return null;

      const checkedDate = getReceiptDate(receipt, context);

      if (!hasCustomer(receipt.customer_id)) {
        return {
          code: 'FLEXI_ENTRY_WITHOUT_AVAILABLE_PASS',
          severity: 'warning',
          message: 'Flexi Single Entrance was used, but the receipt has no Loyverse customer attached.',
          details: {
            reason: 'missing_customer',
            checkedDate,
            customerId: null,
            currentReceiptEntries,
            usageItemId: FLEXI_SINGLE_ENTRANCE_ITEM_ID,
            usageItemName: 'Flexi Single Entrance',
            purchaseItemIds: [...FLEXI_CARD_ITEM_IDS],
            passEntriesPerCard: FLEXI_PASS_ENTRIES_PER_CARD
          }
        };
      }

      const balance = await lookupFlexiBalance({
        customerId: receipt.customer_id,
        merchantId: context.merchantId,
        at: checkedDate,
        currentReceiptKey: context.receiptKey,
        currentReceiptEntries
      });

      if (balance.remainingBeforeCurrentReceipt >= currentReceiptEntries) return null;

      const reason = balance.entriesPurchased <= 0 ? 'no_flexi_purchase' : 'insufficient_remaining_entries';
      return {
        code: 'FLEXI_ENTRY_WITHOUT_AVAILABLE_PASS',
        severity: 'warning',
        message: reason === 'no_flexi_purchase'
          ? 'Flexi Single Entrance was used, but no flexi-card purchase history was found for this customer.'
          : 'Flexi Single Entrance was used, but the customer did not have enough remaining flexi passes.',
        details: {
          reason,
          checkedDate,
          customerId: receipt.customer_id,
          currentReceiptEntries,
          usageItemId: FLEXI_SINGLE_ENTRANCE_ITEM_ID,
          usageItemName: 'Flexi Single Entrance',
          purchaseItemIds: [...FLEXI_CARD_ITEM_IDS],
          passEntriesPerCard: FLEXI_PASS_ENTRIES_PER_CARD,
          cardsPurchased: balance.cardsPurchased,
          entriesPurchased: balance.entriesPurchased,
          entriesUsedIncludingCurrent: balance.entriesUsedIncludingCurrent,
          remainingBeforeCurrentReceipt: balance.remainingBeforeCurrentReceipt,
          remainingAfterCurrentReceipt: balance.remainingAfterCurrentReceipt,
          firstPurchaseAt: balance.firstPurchaseAt,
          lastPurchaseAt: balance.lastPurchaseAt
        }
      };
    }
  };
};
