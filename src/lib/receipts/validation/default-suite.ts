import { createReceiptValidationSuite } from './engine';
import { createFlexiCheckinRule, type FlexiCheckinRuleOptions } from './rules/flexi-checkin';
import { createFlexiCheckoutRule, type FlexiCheckoutRuleOptions } from './rules/flexi-checkout';
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
  flexiCheckinRule?: FlexiCheckinRuleOptions;
  flexiCheckoutRule?: FlexiCheckoutRuleOptions;
  /** Deprecated alias for flexiCheckoutRule. */
  flexiPassEntryRule?: FlexiCheckoutRuleOptions;
  discountRule?: HundredPercentDiscountRuleOptions;
  discountTotalRule?: DiscountTotalOverThresholdRuleOptions;
  oneHourNotConvertedRule?: OneHourNotConvertedRuleOptions;
  extraRules?: ReceiptValidationRule[];
}

export const createDefaultReceiptValidationSuite = (
  options: DefaultReceiptValidationSuiteOptions = {}
): ReceiptValidationSuite => {
  const checkoutOptions = options.flexiCheckoutRule ?? options.flexiPassEntryRule;

  return createReceiptValidationSuite([
    createMissingCustomerRule(options.missingCustomerRule),
    createMemberValidVisitRule(options.memberValidVisitRule),
    createFlexiCheckinRule(options.flexiCheckinRule),
    createFlexiCheckoutRule(checkoutOptions),
    createHundredPercentDiscountRule(options.discountRule),
    createDiscountTotalOverThresholdRule(options.discountTotalRule),
    createOneHourNotConvertedRule(options.oneHourNotConvertedRule),
    ...(options.extraRules ?? [])
  ], 'receipt-default-suite');
};
