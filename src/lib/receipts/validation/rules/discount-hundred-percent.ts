import type { LoyverseReceiptDiscount } from '$lib/receipts/types';
import type { ReceiptValidationRule } from '../types';

export interface HundredPercentDiscountRuleOptions {
  minPercentage?: number;
  skipRefunds?: boolean;
}

const hasDiscountAtOrAboveThreshold = (
  discount: LoyverseReceiptDiscount,
  minPercentage: number
): boolean => {
  if (discount.percentage === undefined || discount.percentage === null) return false;
  return discount.percentage >= minPercentage;
};

export const createHundredPercentDiscountRule = (
  options: HundredPercentDiscountRuleOptions = {}
): ReceiptValidationRule => {
  const minPercentage = options.minPercentage ?? 99.99;
  const skipRefunds = options.skipRefunds ?? true;

  return {
    code: 'DISCOUNT_100_PRESENT',
    description: 'Notify when any 100% discount is present in a receipt',
    validate: ({ receipt }) => {
      if (skipRefunds && receipt.receipt_type === 'REFUND') return null;

      const receiptLevelMatches = (receipt.total_discounts ?? []).filter((discount) =>
        hasDiscountAtOrAboveThreshold(discount, minPercentage)
      );

      const lineLevelMatches = (receipt.line_items ?? []).flatMap((lineItem, lineIndex) =>
        (lineItem.line_discounts ?? [])
          .filter((discount) => hasDiscountAtOrAboveThreshold(discount, minPercentage))
          .map((discount) => ({
            lineIndex,
            itemId: lineItem.item_id ?? null,
            itemName: lineItem.item_name ?? null,
            discountId: discount.id ?? null,
            discountName: discount.name ?? null,
            percentage: discount.percentage ?? null
          }))
      );

      if (!receiptLevelMatches.length && !lineLevelMatches.length) return null;

      return {
        code: 'DISCOUNT_100_PRESENT',
        severity: 'warning',
        message: 'Receipt contains at least one 100% discount.',
        details: {
          thresholdPercentage: minPercentage,
          receiptLevelDiscounts: receiptLevelMatches.map((discount) => ({
            discountId: discount.id ?? null,
            discountName: discount.name ?? null,
            percentage: discount.percentage ?? null
          })),
          lineLevelDiscounts: lineLevelMatches
        }
      };
    }
  };
};
