import { createDefaultReceiptValidationSuite } from './default-suite';

export type ReceiptValidationTelegramRoute = 'manager' | 'cashier';

export interface ReceiptValidationCodeMetadata {
  code: string;
  label: string;
  criteria: string;
  description: string;
  protectsFrom: string;
  severity: 'info' | 'warning' | 'critical';
  telegramRoutes: ReceiptValidationTelegramRoute[];
  telegramRoutingNote?: string;
  cashierAction?: string;
}

type ReceiptValidationMetadataDefinition = Omit<ReceiptValidationCodeMetadata, 'code'>;

const metadataByCode: Record<string, ReceiptValidationMetadataDefinition> = {
  RECEIPT_CLOSED_WITHOUT_CUSTOMER: {
    label: 'Closed without customer',
    criteria:
      'For a non-refund, non-cancelled receipt with no customer_id, at least one configured customer-required Open Play item must be present. Flexi operational lines are handled by their dedicated checks instead.',
    description: 'Notify when a non-refund closed receipt has no Loyverse customer attached',
    protectsFrom: 'Unattributed Open Play sales that make membership, Flexi Pass, and customer follow-up checks impossible.',
    severity: 'warning',
    telegramRoutes: ['manager', 'cashier'],
    cashierAction: 'Attach the customer to the receipt when possible. If the receipt cannot be corrected, send the receipt number to a manager.'
  },
  MEMBERSHIP_ENTRY_WITHOUT_VALID_MEMBERSHIP: {
    label: 'Membership entry without valid membership',
    criteria:
      'For a non-refund receipt containing Member Valid Visit, the receipt customer must be linked to a Family with at least one active membership covering the receipt date. A missing customer also fails before the membership lookup.',
    description: 'Verify Member Valid Visit receipts have a customer with an active membership',
    protectsFrom: 'Member Valid Visit usage by customers with no active membership for the receipt date.',
    severity: 'warning',
    telegramRoutes: ['manager']
  },
  FLEXI_CHECKIN_WITHOUT_AVAILABLE_PASS: {
    label: 'Flexi check-in without available pass',
    criteria:
      'For a non-refund, non-cancelled receipt containing Flexi Entrance, use one valid 1 to 5 kid variant with quantity 1, attach a customer, and confirm at least one usable Flexi entry remains after valid history is considered.',
    description: 'Verify Flexi Entrance check-ins have an attached customer and at least one usable Flexi hour.',
    protectsFrom: 'Flexi Entrance check-ins that cannot be tied to a customer or supported by remaining pass balance.',
    severity: 'warning',
    telegramRoutes: ['manager', 'cashier'],
    telegramRoutingNote: 'Cashier alerts cover missing customers and insufficient balance. Unknown historical checkout diagnostics remain manager-only.',
    cashierAction: 'Check that the customer is attached and that a usable Flexi balance remains. Escalate to a manager rather than guessing or selling another pass.'
  },
  FLEXI_CHECKIN_INVALID_VARIANT: {
    label: 'Invalid Flexi check-in variant',
    criteria:
      'For a non-refund, non-cancelled receipt containing Flexi Entrance, the child-count variant must be a configured 1 to 5 kid option with quantity 1. Unknown or malformed current lines and unknown checkout history require review.',
    description: 'Reject Flexi Entrance variants that cannot be safely interpreted.',
    protectsFrom: 'Incorrect child counts and unsafe Flexi balance decisions caused by malformed check-in or history data.',
    severity: 'warning',
    telegramRoutes: ['manager', 'cashier'],
    telegramRoutingNote: 'Cashier alerts cover malformed current Entrance lines. Unknown historical checkout diagnostics remain manager-only.',
    cashierAction: 'Select the correct 1 to 5 kid Flexi Entrance variant and keep quantity at 1. Do not guess the child count.'
  },
  FLEXI_CHECKOUT_WITHOUT_AVAILABLE_PASS: {
    label: 'Flexi checkout without available pass',
    criteria:
      'For a non-refund, non-cancelled receipt containing Flexi Checkout, use exactly one configured 1 to 8 hour variant with quantity 1, attach a customer, and confirm the remaining balance covers the selected hours.',
    description: 'Verify Flexi Checkout records the holes punched for this visit and has enough remaining balance.',
    protectsFrom: 'Flexi Checkout visit punches that exceed the customer\'s remaining Flexi balance or cannot be attributed to a customer.',
    severity: 'warning',
    telegramRoutes: ['manager', 'cashier'],
    telegramRoutingNote: 'Cashier alerts cover missing customers and insufficient balance. Unknown historical checkout diagnostics remain manager-only.',
    cashierAction: 'Check the customer and remaining Flexi balance before punching. If the balance is insufficient, stop and ask a manager.'
  },
  FLEXI_CHECKOUT_INVALID_VARIANT: {
    label: 'Invalid Flexi checkout variant',
    criteria:
      'For a non-refund, non-cancelled receipt containing Flexi Checkout, there must be one known 1 to 8 hour variant with quantity 1. Unknown variants, mismatched identifiers, bad quantities, multiple Checkout lines, or unknown history fail; elapsed time and cumulative card holes must not be substituted.',
    description: 'Reject Flexi Checkout selections that cannot be safely interpreted.',
    protectsFrom: 'Incorrect holes punched and unsafe balance mutations caused by malformed or duplicated Checkout data.',
    severity: 'warning',
    telegramRoutes: ['manager', 'cashier'],
    telegramRoutingNote: 'Cashier alerts cover malformed current Checkout lines. Unknown historical checkout diagnostics remain manager-only.',
    cashierAction: 'Choose one Checkout option for the total holes used during this visit and keep quantity at 1. Do not use elapsed time or cumulative card holes.'
  },
  /** Historical code retained so existing incidents render correctly. */
  FLEXI_ENTRY_WITHOUT_AVAILABLE_PASS: {
    label: 'Historical Flexi usage without available pass',
    criteria:
      'Historical incident alias for Flexi usage that was evaluated as having no remaining pass balance. It is retained for old incidents and is not a current POS validation rule.',
    description: 'Historical Flexi usage without available pass.',
    protectsFrom: 'Historical Flexi usage that could not be supported by the customer\'s remaining balance.',
    severity: 'warning',
    telegramRoutes: ['manager']
  },
  DISCOUNT_100_PRESENT: {
    label: '100% discount used',
    criteria:
      'For a non-refund receipt, a receipt-level or line-level discount with percentage greater than or equal to 99.99 must be present.',
    description: 'Notify when any 100% discount is present in a receipt',
    protectsFrom: 'Free or fully-comped sales that need manager review.',
    severity: 'warning',
    telegramRoutes: ['manager']
  },
  DISCOUNT_TOTAL_OVER_THRESHOLD: {
    label: 'Discount total over ฿400',
    criteria:
      'For a non-refund receipt, use finite receipt.total_discount when available; otherwise sum finite line and receipt discount amounts. Compare the absolute total and flag only values strictly greater than 400 THB.',
    description: 'Notify when total receipt discount exceeds threshold',
    protectsFrom: 'Large total receipt discounts that may require approval or follow-up.',
    severity: 'warning',
    telegramRoutes: ['manager']
  },
  ONE_HOUR_NOT_CONVERTED: {
    label: 'One-hour ticket not converted',
    criteria:
      'For a non-refund receipt, a configured one-hour item must be present, the one-hour-to-day conversion item must be absent, and the calculated stay must exceed 75 minutes in Asia/Bangkok. The threshold is 60 minutes plus a 15-minute grace period.',
    description: 'Notify when one-hour item exists, duration exceeds threshold, and conversion item is missing',
    protectsFrom: 'One-hour playground stays that exceeded the grace period without a day-pass conversion.',
    severity: 'critical',
    telegramRoutes: ['manager', 'cashier'],
    cashierAction: 'Check whether the one-hour ticket should have been converted to a day pass. Correct it if possible; if the time looks wrong, tell a manager.'
  },
  FORCED_TEST_FAILURE: {
    label: 'Forced test failure',
    criteria: 'Only the explicit validation test mode adds this rule; it then returns a finding for every receipt.',
    description: 'Test-only rule used to verify validation incident and alert plumbing.',
    protectsFrom: 'Nothing in production; this should only appear when forced validation testing is enabled.',
    severity: 'warning',
    telegramRoutes: []
  },
  RECEIPT_WEBHOOK_VALIDATION_ENGINE_ERROR: {
    label: 'Validation engine error',
    criteria: 'A validation rule throws while a receipt is being evaluated, producing a RULE_EXECUTION_ERROR finding.',
    description: 'The receipt validation engine failed before it could report a specific rule result.',
    protectsFrom: 'Silent validation outages caused by crashed rules or unexpected receipt data.',
    severity: 'critical',
    telegramRoutes: ['manager']
  },
  VALIDATION_ENGINE_ERROR: {
    label: 'Validation engine error',
    criteria: 'A validation engine failure is represented in a test or legacy incident context rather than as a business-rule finding.',
    description: 'The receipt validation engine failed before it could report a specific rule result.',
    protectsFrom: 'Silent validation outages caused by crashed rules or unexpected receipt data.',
    severity: 'critical',
    telegramRoutes: ['manager']
  }
};

export const receiptValidationMetadata: ReceiptValidationCodeMetadata[] = Object.entries(metadataByCode).map(
  ([code, metadata]) => ({
    code,
    ...metadata
  })
);

export const receiptValidationMetadataByCode = Object.fromEntries(
  receiptValidationMetadata.map((metadata) => [metadata.code, metadata])
) as Record<string, ReceiptValidationCodeMetadata>;

export const getReceiptValidationMetadata = (code: string): ReceiptValidationCodeMetadata =>
  receiptValidationMetadataByCode[code] ?? {
    code,
    label: code
      .toLowerCase()
      .split(/[_:]+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' '),
    criteria: 'A validation finding was captured for this code; inspect the incident details for its runtime criteria.',
    description: 'Validation finding captured from receipt incident context or payload.',
    protectsFrom: 'Unknown or newly-added validation condition. Check the incident payload for details.',
    severity: 'warning',
    telegramRoutes: ['manager']
  };

/**
 * Returns the default suite's metadata in suite order. The explicit failure makes a
 * missing catalog entry visible at runtime instead of silently rendering a fallback.
 */
export const getDefaultReceiptValidationMetadata = (): ReceiptValidationCodeMetadata[] =>
  createDefaultReceiptValidationSuite().rules.map((rule) => {
    const metadata = receiptValidationMetadataByCode[rule.code];
    if (!metadata) throw new Error(`Missing receipt validation metadata for ${rule.code}`);
    return metadata;
  });
