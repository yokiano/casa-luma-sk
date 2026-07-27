import {
  FLEXI_CARD_ITEM_IDS,
  FLEXI_CHECKOUT_ITEM_ID,
  FLEXI_PASS_ENTRIES_PER_CARD
} from '$lib/receipts/open-play-items';
import { classifyFlexiLineItem, summarizeFlexiCheckout } from '$lib/receipts/flexi-line-items';
import type { FlexiPassBalance } from '$lib/server/db/flexi-pass-queries';
import type { LoyverseReceiptLineItem } from '$lib/receipts/types';
import type { ReceiptValidationContext, ReceiptValidationRule } from '../types';

export interface FlexiCheckoutRuleOptions {
  skipRefunds?: boolean;
  skipCancelled?: boolean;
  /** Compatibility only for historical incident code rendering. */
  code?: string;
  lookupFlexiBalance?: (input: {
    customerId: string;
    merchantId?: string;
    at: string;
    currentVisitPunches: number;
    currentReceiptEntries?: number;
    currentReceiptKey?: string;
  }) => Promise<FlexiPassBalance>;
}

const hasCustomer = (customerId?: string | null): customerId is string =>
  typeof customerId === 'string' && customerId.trim().length > 0;

const getReceiptDate = (receipt: { receipt_date?: string; created_at?: string }, context: ReceiptValidationContext): string =>
  receipt.receipt_date ?? receipt.created_at ?? context.eventCreatedAt ?? new Date().toISOString();

const defaultLookupFlexiBalance: NonNullable<FlexiCheckoutRuleOptions['lookupFlexiBalance']> = async (input) => {
  const { queryFlexiPassBalanceForCustomer } = await import('$lib/server/db/flexi-pass-queries');
  return queryFlexiPassBalanceForCustomer(input);
};

const lineDetails = (lineItems: LoyverseReceiptLineItem[]) => lineItems.slice(0, 5).map((lineItem, lineIndex) => ({
  lineIndex,
  itemId: lineItem.item_id ?? null,
  variantId: lineItem.variant_id ?? null,
  variantName: lineItem.variant_name ?? null,
  sku: lineItem.sku ?? null,
  quantity: lineItem.quantity ?? null
}));

const finding = (code: string, message: string, details: Record<string, unknown>) => ({
  code,
  severity: 'warning' as const,
  message,
  details
});

export const createFlexiCheckoutRule = (
  options: FlexiCheckoutRuleOptions = {}
): ReceiptValidationRule => {
  const skipRefunds = options.skipRefunds ?? true;
  const skipCancelled = options.skipCancelled ?? true;
  const lookupFlexiBalance = options.lookupFlexiBalance ?? defaultLookupFlexiBalance;
  const code = options.code ?? 'FLEXI_CHECKOUT_WITHOUT_AVAILABLE_PASS';

  return {
    code,
    description: 'Verify Flexi Checkout records the holes punched for this visit and has enough remaining balance.',
    validate: async ({ receipt, context }) => {
      if (skipRefunds && receipt.receipt_type === 'REFUND') return null;
      if (skipCancelled && receipt.cancelled_at) return null;

      const checkoutLines = (receipt.line_items ?? []).filter((lineItem) => {
        const classification = classifyFlexiLineItem(lineItem);
        return classification.kind === 'checkout' || classification.kind === 'invalid-checkout';
      });
      const summary = summarizeFlexiCheckout(receipt.line_items);
      if (!summary.matched) return null;

      const checkedDate = getReceiptDate(receipt, context);
      const commonDetails = {
        checkedDate,
        customerId: hasCustomer(receipt.customer_id) ? receipt.customer_id.trim() : null,
        usageItemId: FLEXI_CHECKOUT_ITEM_ID,
        purchaseItemIds: [...FLEXI_CARD_ITEM_IDS],
        passEntriesPerCard: FLEXI_PASS_ENTRIES_PER_CARD,
        selectedVisitPunches: summary.hours,
        currentVisitPunches: summary.hours,
        currentReceiptEntries: summary.hours,
        lines: lineDetails(checkoutLines)
      };

      if (summary.invalid.length || summary.validLineCount !== 1) {
        return finding(
          'FLEXI_CHECKOUT_INVALID_VARIANT',
          'Flexi Checkout has an unknown variant, invalid quantity, or multiple Checkout lines. Select one variant for the total holes punched during this visit, then use quantity 1.',
          {
            ...commonDetails,
            reason: summary.validLineCount > 1 ? 'multiple_checkout_lines' : 'invalid_checkout_variant',
            validationErrors: summary.invalid.map((item) => item.reason),
            elapsedTimeMustNotBeUsed: true,
            cumulativeCardHolesMustNotBeUsed: true
          }
        );
      }

      if (!hasCustomer(receipt.customer_id)) {
        return finding(
          code,
          'Flexi Checkout was used without an attached Loyverse customer.',
          { ...commonDetails, reason: 'missing_customer' }
        );
      }

      const balance = await lookupFlexiBalance({
        customerId: receipt.customer_id.trim(),
        merchantId: context.merchantId,
        at: checkedDate,
        currentReceiptKey: context.receiptKey,
        currentVisitPunches: summary.hours,
        currentReceiptEntries: summary.hours
      });

      if ((balance.unknownVariantDiagnostics ?? []).length) {
        return finding(
          'FLEXI_CHECKOUT_INVALID_VARIANT',
          'Flexi balance history contains an unknown or malformed Checkout variant; no balance decision is safe until it is reviewed.',
          {
            ...commonDetails,
            reason: 'unknown_checkout_history',
            unknownVariantDiagnostics: balance.unknownVariantDiagnostics ?? [],
            cardsPurchased: balance.cardsPurchased,
            entriesPurchased: balance.entriesPurchased
          }
        );
      }

      if (balance.remainingBeforeCurrentReceipt >= summary.hours) return null;

      const reason = balance.entriesPurchased <= 0 ? 'no_flexi_purchase' : 'insufficient_remaining_entries';
      return finding(
        code,
        reason === 'no_flexi_purchase'
          ? 'Flexi Checkout was used, but no Flexi card purchase history was found for this customer.'
          : 'Flexi Checkout selected more holes than the customer has remaining on their Flexi pass.',
        {
          ...commonDetails,
          reason,
          cardsPurchased: balance.cardsPurchased,
          entriesPurchased: balance.entriesPurchased,
          entriesUsedIncludingCurrent: balance.entriesUsedIncludingCurrent,
          remainingBeforeCurrentReceipt: balance.remainingBeforeCurrentReceipt,
          remainingAfterCurrentReceipt: balance.remainingAfterCurrentReceipt,
          firstPurchaseAt: balance.firstPurchaseAt,
          lastPurchaseAt: balance.lastPurchaseAt,
          elapsedTimeMustNotBeUsed: true,
          cumulativeCardHolesMustNotBeUsed: true
        }
      );
    }
  };
};
