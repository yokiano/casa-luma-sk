import { createReceiptValidationSuite } from './engine';
import { createHundredPercentDiscountRule, type HundredPercentDiscountRuleOptions } from './rules/discount-hundred-percent';
import { createOneHourNotConvertedRule, type OneHourNotConvertedRuleOptions } from './rules/one-hour-not-converted';
import type { ReceiptValidationRule, ReceiptValidationSuite } from './types';

export interface DefaultReceiptValidationSuiteOptions {
  discountRule?: HundredPercentDiscountRuleOptions;
  oneHourNotConvertedRule?: OneHourNotConvertedRuleOptions;
  extraRules?: ReceiptValidationRule[];
}

export const createDefaultReceiptValidationSuite = (
  options: DefaultReceiptValidationSuiteOptions = {}
): ReceiptValidationSuite => {
  return createReceiptValidationSuite([
    createHundredPercentDiscountRule(options.discountRule),
    createOneHourNotConvertedRule(options.oneHourNotConvertedRule),
    ...(options.extraRules ?? [])
  ], 'receipt-default-suite');
};
