import {
  createFlexiCheckoutRule,
  type FlexiCheckoutRuleOptions
} from './flexi-checkout';

/**
 * Historical compatibility wrapper. New receipts use the Checkout rule, while
 * stored FLEXI_ENTRY_WITHOUT_AVAILABLE_PASS incidents remain readable.
 */
export type FlexiPassEntryRuleOptions = FlexiCheckoutRuleOptions;

export const createFlexiPassEntryRule = (
  options: FlexiPassEntryRuleOptions = {}
) => createFlexiCheckoutRule({
  ...options,
  code: 'FLEXI_ENTRY_WITHOUT_AVAILABLE_PASS'
});
