import { getReceiptToolsMeta } from '$lib/receipts/receipt-tools';
import type { ReceiptValidationRule } from '../types';

export interface OneHourNotConvertedRuleOptions {
  skipRefunds?: boolean;
}

export const createOneHourNotConvertedRule = (
  options: OneHourNotConvertedRuleOptions = {}
): ReceiptValidationRule => {
  const skipRefunds = options.skipRefunds ?? true;

  return {
    code: 'ONE_HOUR_NOT_CONVERTED',
    description:
      'Notify when one-hour item exists, duration exceeds threshold, and conversion item is missing',
    validate: ({ receipt }) => {
      if (skipRefunds && receipt.receipt_type === 'REFUND') return null;

      const toolsMeta = getReceiptToolsMeta(receipt);
      if (!toolsMeta.isNotConverted) return null;

      return {
        code: 'ONE_HOUR_NOT_CONVERTED',
        severity: 'critical',
        message: 'One-hour ticket exceeded threshold and was not converted to day pass.',
        details: {
          orderNumber: toolsMeta.orderNumber,
          orderStartTime: toolsMeta.orderStartTime,
          checkoutAt: toolsMeta.checkoutAt,
          durationMinutes: toolsMeta.durationMinutes,
          oneHourQuantity: toolsMeta.oneHourQuantity,
          oneHourToDayQuantity: toolsMeta.oneHourToDayQuantity,
          exceedsUnconvertedThreshold: toolsMeta.exceedsUnconvertedThreshold
        }
      };
    }
  };
};
