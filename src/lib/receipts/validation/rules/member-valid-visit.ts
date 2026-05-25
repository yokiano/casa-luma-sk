import { MEMBER_VALID_VISIT_ITEM_ID } from '$lib/receipts/open-play-items';
import type { MembershipValidationLookup } from '$lib/server/membership-validation';
import type { LoyverseReceiptLineItem } from '$lib/receipts/types';
import type { ReceiptValidationContext, ReceiptValidationRule } from '../types';

export interface MemberValidVisitRuleOptions {
  skipRefunds?: boolean;
  lookupMembership?: (input: { loyverseCustomerId: string; atDate: string }) => Promise<MembershipValidationLookup>;
}

const hasCustomer = (customerId?: string | null): customerId is string =>
  typeof customerId === 'string' && customerId.trim().length > 0;

const quantityForItem = (lineItems: LoyverseReceiptLineItem[] = [], itemId: string): number =>
  lineItems.reduce((sum, lineItem) => {
    if (lineItem.item_id !== itemId) return sum;
    const quantity = typeof lineItem.quantity === 'number' && Number.isFinite(lineItem.quantity) ? lineItem.quantity : 1;
    return sum + quantity;
  }, 0);

const getReceiptDate = (receipt: { receipt_date?: string; created_at?: string }, context: ReceiptValidationContext): string =>
  receipt.receipt_date ?? receipt.created_at ?? context.eventCreatedAt ?? new Date().toISOString();

const defaultLookupMembership: NonNullable<MemberValidVisitRuleOptions['lookupMembership']> = async (input) => {
  const { lookupFamilyMembershipForReceipt } = await import('$lib/server/membership-validation');
  return lookupFamilyMembershipForReceipt(input);
};

export const createMemberValidVisitRule = (
  options: MemberValidVisitRuleOptions = {}
): ReceiptValidationRule => {
  const skipRefunds = options.skipRefunds ?? true;
  const lookupMembership = options.lookupMembership ?? defaultLookupMembership;

  return {
    code: 'MEMBERSHIP_ENTRY_WITHOUT_VALID_MEMBERSHIP',
    description: 'Verify Member Valid Visit receipts have a customer with an active membership',
    validate: async ({ receipt, context }) => {
      if (skipRefunds && receipt.receipt_type === 'REFUND') return null;

      const memberEntryQuantity = quantityForItem(receipt.line_items, MEMBER_VALID_VISIT_ITEM_ID);
      if (memberEntryQuantity <= 0) return null;

      const checkedDate = getReceiptDate(receipt, context);

      if (!hasCustomer(receipt.customer_id)) {
        return {
          code: 'MEMBERSHIP_ENTRY_WITHOUT_VALID_MEMBERSHIP',
          severity: 'warning',
          message: 'Member Valid Visit was used, but the receipt has no Loyverse customer attached.',
          details: {
            reason: 'missing_customer',
            checkedDate,
            customerId: null,
            memberEntryQuantity,
            itemId: MEMBER_VALID_VISIT_ITEM_ID,
            itemName: 'Member Valid Visit'
          }
        };
      }

      const lookup = await lookupMembership({ loyverseCustomerId: receipt.customer_id, atDate: checkedDate });
      if (lookup.activeMemberships.length > 0) return null;

      const reason = lookup.matchedFamily ? 'no_active_membership' : 'family_not_found';
      return {
        code: 'MEMBERSHIP_ENTRY_WITHOUT_VALID_MEMBERSHIP',
        severity: 'warning',
        message: lookup.matchedFamily
          ? 'Member Valid Visit was used, but no valid membership was found for the receipt date.'
          : 'Member Valid Visit was used, but the Loyverse customer is not linked to a Family in Notion.',
        details: {
          reason,
          checkedDate: lookup.checkedDate,
          customerId: receipt.customer_id,
          memberEntryQuantity,
          itemId: MEMBER_VALID_VISIT_ITEM_ID,
          itemName: 'Member Valid Visit',
          matchedFamily: lookup.matchedFamily,
          activeMembershipCount: lookup.activeMemberships.length
        }
      };
    }
  };
};
