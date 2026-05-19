import {
  getReceiptToolsMeta,
  NOT_CONVERTED_DURATION_THRESHOLD_MINUTES,
  ONE_HOUR_BASE_DURATION_MINUTES,
  ONE_HOUR_GRACE_PERIOD_MINUTES,
  RECEIPT_TOOLS_TIME_ZONE
} from '$lib/receipts/receipt-tools';
import type { ReceiptValidationRule } from '../types';

export interface OneHourNotConvertedRuleOptions {
  skipRefunds?: boolean;
  thresholdMinutes?: number;
}

export const createOneHourNotConvertedRule = (
  options: OneHourNotConvertedRuleOptions = {}
): ReceiptValidationRule => {
  const skipRefunds = options.skipRefunds ?? true;
  const thresholdMinutes = options.thresholdMinutes ?? NOT_CONVERTED_DURATION_THRESHOLD_MINUTES;

  return {
    code: 'ONE_HOUR_NOT_CONVERTED',
    description:
      'Notify when one-hour item exists, duration exceeds threshold, and conversion item is missing',
    validate: ({ receipt }) => {
      if (skipRefunds && receipt.receipt_type === 'REFUND') return null;

      const toolsMeta = getReceiptToolsMeta(receipt);
      const exceedsThreshold =
        toolsMeta.durationMinutes !== null && toolsMeta.durationMinutes > thresholdMinutes;

      if (!toolsMeta.hasOneHour || toolsMeta.hasOneHourToDay || !exceedsThreshold) return null;

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
          baseDurationMinutes: ONE_HOUR_BASE_DURATION_MINUTES,
          gracePeriodMinutes: ONE_HOUR_GRACE_PERIOD_MINUTES,
          thresholdMinutes,
          timeZone: RECEIPT_TOOLS_TIME_ZONE,
          exceedsUnconvertedThreshold: exceedsThreshold
        }
      };
    }
  };
};
