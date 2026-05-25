import { createDefaultReceiptValidationSuite } from './default-suite';

export interface ReceiptValidationCodeMetadata {
  code: string;
  label: string;
  description: string;
  protectsFrom: string;
}

const ruleDescriptions = new Map(
  createDefaultReceiptValidationSuite().rules.map((rule) => [rule.code, rule.description])
);

const metadataByCode: Record<string, Omit<ReceiptValidationCodeMetadata, 'code' | 'description'> & { description?: string }> = {
  RECEIPT_CLOSED_WITHOUT_CUSTOMER: {
    label: 'Closed without customer',
    protectsFrom: 'Unattributed sales that make membership, flexi-pass, and customer follow-up checks impossible.'
  },
  MEMBERSHIP_ENTRY_WITHOUT_VALID_MEMBERSHIP: {
    label: 'Membership entry without valid membership',
    protectsFrom: 'Member Valid Visit usage by customers with no active membership for the receipt date.'
  },
  FLEXI_ENTRY_WITHOUT_AVAILABLE_PASS: {
    label: 'Flexi entry without available pass',
    protectsFrom: 'Flexi Single Entrance usage when the attached customer has no remaining flexi balance.'
  },
  DISCOUNT_100_PRESENT: {
    label: '100% discount used',
    protectsFrom: 'Free or fully-comped sales that need manager review.'
  },
  DISCOUNT_TOTAL_OVER_THRESHOLD: {
    label: 'Discount total over ฿400',
    protectsFrom: 'Large total receipt discounts that may require approval or follow-up.'
  },
  ONE_HOUR_NOT_CONVERTED: {
    label: 'One-hour ticket not converted',
    protectsFrom: 'One-hour playground stays that exceeded the grace period without a day-pass conversion.'
  },
  FORCED_TEST_FAILURE: {
    label: 'Forced test failure',
    description: 'Test-only rule used to verify validation incident and alert plumbing.',
    protectsFrom: 'Nothing in production; this should only appear when forced validation testing is enabled.'
  },
  RECEIPT_WEBHOOK_VALIDATION_ENGINE_ERROR: {
    label: 'Validation engine error',
    description: 'The receipt validation engine failed before it could report a specific rule result.',
    protectsFrom: 'Silent validation outages caused by crashed rules or unexpected receipt data.'
  },
  VALIDATION_ENGINE_ERROR: {
    label: 'Validation engine error',
    description: 'The receipt validation engine failed before it could report a specific rule result.',
    protectsFrom: 'Silent validation outages caused by crashed rules or unexpected receipt data.'
  }
};

export const receiptValidationMetadata: ReceiptValidationCodeMetadata[] = Object.entries(metadataByCode).map(
  ([code, metadata]) => ({
    code,
    label: metadata.label,
    description: metadata.description ?? ruleDescriptions.get(code) ?? 'Receipt validation finding.',
    protectsFrom: metadata.protectsFrom
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
    description: 'Validation finding captured from receipt incident context or payload.',
    protectsFrom: 'Unknown or newly-added validation condition. Check the incident payload for details.'
  };
