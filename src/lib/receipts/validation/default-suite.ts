import { createReceiptValidationSuite } from './engine';
import { createHundredPercentDiscountRule, type HundredPercentDiscountRuleOptions } from './rules/discount-hundred-percent';
import {
  createDiscountTotalOverThresholdRule,
  type DiscountTotalOverThresholdRuleOptions
} from './rules/discount-total-over-threshold';
import { createOneHourNotConvertedRule, type OneHourNotConvertedRuleOptions } from './rules/one-hour-not-converted';
import type { ReceiptValidationRule, ReceiptValidationSuite } from './types';

export interface DefaultReceiptValidationSuiteOptions {
  discountRule?: HundredPercentDiscountRuleOptions;
  discountTotalRule?: DiscountTotalOverThresholdRuleOptions;
  oneHourNotConvertedRule?: OneHourNotConvertedRuleOptions;
  extraRules?: ReceiptValidationRule[];
}

export const createDefaultReceiptValidationSuite = (
  options: DefaultReceiptValidationSuiteOptions = {}
): ReceiptValidationSuite => {
  return createReceiptValidationSuite([
    createHundredPercentDiscountRule(options.discountRule),
    createDiscountTotalOverThresholdRule(options.discountTotalRule),
    createOneHourNotConvertedRule(options.oneHourNotConvertedRule),
    ...(options.extraRules ?? [])
  ], 'receipt-default-suite');
};
