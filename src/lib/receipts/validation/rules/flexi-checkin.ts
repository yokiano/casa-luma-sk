import {
  FLEXI_CARD_ITEM_IDS,
  FLEXI_CHECKOUT_ITEM_ID,
  FLEXI_ENTRANCE_ITEM_ID,
  FLEXI_PASS_ENTRIES_PER_CARD
} from '$lib/receipts/open-play-items';
import { classifyFlexiLineItem, summarizeFlexiEntrance } from '$lib/receipts/flexi-line-items';
import type { FlexiPassBalance } from '$lib/server/db/flexi-pass-queries';
import type { LoyverseReceiptLineItem } from '$lib/receipts/types';
import type { ReceiptValidationContext, ReceiptValidationRule } from '../types';

export interface FlexiCheckinRuleOptions {
  skipRefunds?: boolean;
  skipCancelled?: boolean;
  lookupFlexiBalance?: (input: {
    customerId: string;
    merchantId?: string;
    at: string;
    currentReceiptKey?: string;
    currentVisitPunches: number;
    currentReceiptEntries?: number;
    excludeCurrentReceiptUsage?: boolean;
  }) => Promise<FlexiPassBalance>;
}

const hasCustomer = (customerId?: string | null): customerId is string =>
  typeof customerId === 'string' && customerId.trim().length > 0;

const getReceiptDate = (receipt: { receipt_date?: string; created_at?: string }, context: ReceiptValidationContext): string =>
  receipt.receipt_date ?? receipt.created_at ?? context.eventCreatedAt ?? new Date().toISOString();

const defaultLookupFlexiBalance: NonNullable<FlexiCheckinRuleOptions['lookupFlexiBalance']> = async (input) => {
  const { queryFlexiPassBalanceForCustomer } = await import('$lib/server/db/flexi-pass-queries');
  return queryFlexiPassBalanceForCustomer(input);
};

const lineDetails = (lineItems: LoyverseReceiptLineItem[]) => lineItems.slice(0, 5).map((lineItem, lineIndex) => ({
  lineIndex,
  itemId: lineItem.item_id ?? null,
  variantId: lineItem.variant_id ?? null,
  sku: lineItem.sku ?? null,
  quantity: lineItem.quantity ?? null,
  variantName: lineItem.variant_name ?? null
}));

const finding = (code: string, message: string, details: Record<string, unknown>) => ({
  code,
  severity: 'warning' as const,
  message,
  details
});

export const createFlexiCheckinRule = (
  options: FlexiCheckinRuleOptions = {}
): ReceiptValidationRule => {
  const skipRefunds = options.skipRefunds ?? true;
  const skipCancelled = options.skipCancelled ?? true;
  const lookupFlexiBalance = options.lookupFlexiBalance ?? defaultLookupFlexiBalance;

  return {
    code: 'FLEXI_CHECKIN_WITHOUT_AVAILABLE_PASS',
    description: 'Verify Flexi Entrance check-ins have an attached customer and at least one usable Flexi hour.',
    validate: async ({ receipt, context }) => {
      if (skipRefunds && receipt.receipt_type === 'REFUND') return null;
      if (skipCancelled && receipt.cancelled_at) return null;

      const entranceLines = (receipt.line_items ?? []).filter((lineItem) => {
        const classification = classifyFlexiLineItem(lineItem);
        return classification.kind === 'entrance' || classification.kind === 'invalid-entrance';
      });
      const summary = summarizeFlexiEntrance(receipt.line_items);
      if (!summary.matched) return null;

      const checkedDate = getReceiptDate(receipt, context);
      const commonDetails = {
        checkedDate,
        customerId: hasCustomer(receipt.customer_id) ? receipt.customer_id.trim() : null,
        childCount: summary.kids,
        usageItemId: FLEXI_ENTRANCE_ITEM_ID ?? null,
        checkoutItemId: FLEXI_CHECKOUT_ITEM_ID,
        purchaseItemIds: [...FLEXI_CARD_ITEM_IDS],
        passEntriesPerCard: FLEXI_PASS_ENTRIES_PER_CARD,
        currentVisitPunches: 0,
        lines: lineDetails(entranceLines)
      };

      if (summary.invalid.length) {
        return finding(
          'FLEXI_CHECKIN_INVALID_VARIANT',
          'Flexi Entrance has a missing, unknown, or invalid child-count variant. Do not guess the child count.',
          {
            ...commonDetails,
            reason: 'invalid_entrance_variant',
            validationErrors: summary.invalid.map((item) => item.reason)
          }
        );
      }

      if (!hasCustomer(receipt.customer_id)) {
        return finding(
          'FLEXI_CHECKIN_WITHOUT_AVAILABLE_PASS',
          'Flexi Entrance was used without an attached Loyverse customer.',
          { ...commonDetails, reason: 'missing_customer' }
        );
      }

      const balance = await lookupFlexiBalance({
        customerId: receipt.customer_id.trim(),
        merchantId: context.merchantId,
        at: checkedDate,
        currentReceiptKey: context.receiptKey,
        currentVisitPunches: 0,
        currentReceiptEntries: 0,
        excludeCurrentReceiptUsage: true
      });

      if ((balance.unknownVariantDiagnostics ?? []).length) {
        return finding(
          'FLEXI_CHECKIN_INVALID_VARIANT',
          'Flexi balance history contains an unknown or malformed Checkout variant; review it before allowing check-in.',
          {
            ...commonDetails,
            reason: 'unknown_checkout_history',
            unknownVariantDiagnostics: balance.unknownVariantDiagnostics ?? [],
            cardsPurchased: balance.cardsPurchased,
            entriesPurchased: balance.entriesPurchased
          }
        );
      }

      if (balance.remainingBeforeCurrentReceipt >= 1) return null;

      const reason = balance.entriesPurchased <= 0 ? 'no_flexi_purchase' : 'no_usable_remaining_balance';
      return finding(
        'FLEXI_CHECKIN_WITHOUT_AVAILABLE_PASS',
        reason === 'no_flexi_purchase'
          ? 'Flexi Entrance was used, but no Flexi card purchase history was found for this customer.'
          : 'Flexi Entrance was used, but the customer has no usable Flexi hours remaining.',
        {
          ...commonDetails,
          reason,
          cardsPurchased: balance.cardsPurchased,
          entriesPurchased: balance.entriesPurchased,
          entriesUsedIncludingCurrent: balance.entriesUsedIncludingCurrent,
          remainingBeforeCurrentReceipt: balance.remainingBeforeCurrentReceipt,
          remainingAfterCurrentReceipt: balance.remainingAfterCurrentReceipt,
          firstPurchaseAt: balance.firstPurchaseAt,
          lastPurchaseAt: balance.lastPurchaseAt
        }
      );
    }
  };
};
