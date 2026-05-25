import { createReceiptValidationSuite } from './engine';
import { createFlexiPassEntryRule, type FlexiPassEntryRuleOptions } from './rules/flexi-pass-entry';
import { createHundredPercentDiscountRule, type HundredPercentDiscountRuleOptions } from './rules/discount-hundred-percent';
import {
  createDiscountTotalOverThresholdRule,
  type DiscountTotalOverThresholdRuleOptions
} from './rules/discount-total-over-threshold';
import { createMemberValidVisitRule, type MemberValidVisitRuleOptions } from './rules/member-valid-visit';
import { createMissingCustomerRule, type MissingCustomerRuleOptions } from './rules/missing-customer';
import { createOneHourNotConvertedRule, type OneHourNotConvertedRuleOptions } from './rules/one-hour-not-converted';
import type { ReceiptValidationRule, ReceiptValidationSuite } from './types';

export interface DefaultReceiptValidationSuiteOptions {
  missingCustomerRule?: MissingCustomerRuleOptions;
  memberValidVisitRule?: MemberValidVisitRuleOptions;
  flexiPassEntryRule?: FlexiPassEntryRuleOptions;
  discountRule?: HundredPercentDiscountRuleOptions;
  discountTotalRule?: DiscountTotalOverThresholdRuleOptions;
  oneHourNotConvertedRule?: OneHourNotConvertedRuleOptions;
  extraRules?: ReceiptValidationRule[];
}

export const createDefaultReceiptValidationSuite = (
  options: DefaultReceiptValidationSuiteOptions = {}
): ReceiptValidationSuite => {
  return createReceiptValidationSuite([
    createMissingCustomerRule(options.missingCustomerRule),
    createMemberValidVisitRule(options.memberValidVisitRule),
    createFlexiPassEntryRule(options.flexiPassEntryRule),
    createHundredPercentDiscountRule(options.discountRule),
    createDiscountTotalOverThresholdRule(options.discountTotalRule),
    createOneHourNotConvertedRule(options.oneHourNotConvertedRule),
    ...(options.extraRules ?? [])
  ], 'receipt-default-suite');
};
