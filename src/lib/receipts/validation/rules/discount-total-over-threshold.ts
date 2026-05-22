import type { LoyverseReceiptDiscount, LoyverseReceiptLineItem } from '$lib/receipts/types';
import type { ReceiptValidationRule } from '../types';

export interface DiscountTotalOverThresholdRuleOptions {
  thresholdAmount?: number;
  skipRefunds?: boolean;
}

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const sumFinite = (values: unknown[]): number =>
  values.reduce<number>((sum, value) => (isFiniteNumber(value) ? sum + value : sum), 0);

const collectDiscountNames = (
  receiptDiscounts: LoyverseReceiptDiscount[] = [],
  lineItems: LoyverseReceiptLineItem[] = []
): string[] => {
  const names = [
    ...receiptDiscounts.map((discount) => discount.name ?? discount.type),
    ...lineItems.flatMap((lineItem) =>
      (lineItem.line_discounts ?? []).map((discount) => discount.name ?? discount.type)
    )
  ].filter((value): value is string => typeof value === 'string' && value.trim().length > 0);

  return [...new Set(names)].slice(0, 5);
};

export const createDiscountTotalOverThresholdRule = (
  options: DiscountTotalOverThresholdRuleOptions = {}
): ReceiptValidationRule => {
  const thresholdAmount = options.thresholdAmount ?? 400;
  const skipRefunds = options.skipRefunds ?? true;

  return {
    code: 'DISCOUNT_TOTAL_OVER_THRESHOLD',
    description: 'Notify when total receipt discount exceeds threshold',
    validate: ({ receipt }) => {
      if (skipRefunds && receipt.receipt_type === 'REFUND') return null;

      const usedReceiptTotal = isFiniteNumber(receipt.total_discount);
      const discountTotal = usedReceiptTotal
        ? receipt.total_discount!
        : sumFinite([
            ...(receipt.line_items ?? []).map((lineItem) => lineItem.total_discount),
            ...(receipt.total_discounts ?? []).map((discount) => discount.money_amount)
          ]);
      const comparableDiscountTotal = Math.abs(discountTotal);

      if (comparableDiscountTotal <= thresholdAmount) return null;

      return {
        code: 'DISCOUNT_TOTAL_OVER_THRESHOLD',
        severity: 'warning',
        message: `Receipt total discount is over ฿${thresholdAmount}.`,
        details: {
          thresholdAmount,
          discountTotal,
          comparableDiscountTotal,
          currency: 'THB',
          source: usedReceiptTotal ? 'receipt.total_discount' : 'line/receipt discount fallback',
          discountNames: collectDiscountNames(receipt.total_discounts, receipt.line_items)
        }
      };
    }
  };
};
