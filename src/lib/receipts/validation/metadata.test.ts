import { describe, expect, it } from 'vitest';
import { createDefaultReceiptValidationSuite } from './default-suite';
import {
  getDefaultReceiptValidationMetadata,
  receiptValidationMetadataByCode,
  type ReceiptValidationCodeMetadata
} from './metadata';

const requiredTextFields: Array<keyof Pick<ReceiptValidationCodeMetadata, 'label' | 'criteria' | 'description' | 'protectsFrom'>> = [
  'label',
  'criteria',
  'description',
  'protectsFrom'
];

describe('receipt validation metadata', () => {
  it('covers every default-suite rule with complete catalog and routing metadata', () => {
    const rules = createDefaultReceiptValidationSuite().rules;
    const catalog = getDefaultReceiptValidationMetadata();

    expect(catalog.map((metadata) => metadata.code)).toEqual(rules.map((rule) => rule.code));

    for (const rule of rules) {
      const metadata = receiptValidationMetadataByCode[rule.code];
      expect(metadata, `missing metadata for ${rule.code}`).toBeDefined();
      if (!metadata) throw new Error(`missing metadata for ${rule.code}`);

      for (const field of requiredTextFields) {
        expect(metadata[field], `${rule.code} is missing ${field}`).toEqual(expect.any(String));
        expect(metadata[field].trim(), `${rule.code} has blank ${field}`).not.toBe('');
      }

      expect(['info', 'warning', 'critical']).toContain(metadata.severity);
      expect(Array.isArray(metadata.telegramRoutes)).toBe(true);
      expect(metadata.telegramRoutes.every((route) => route === 'manager' || route === 'cashier')).toBe(true);
      if (metadata.telegramRoutes.includes('cashier')) {
        expect(metadata.cashierAction, `${rule.code} needs cashier guidance`).toEqual(expect.any(String));
        expect(metadata.cashierAction?.trim()).not.toBe('');
      }
    }
  });

  it('keeps the catalog aware of cashier and no-route entries', () => {
    expect(receiptValidationMetadataByCode.ONE_HOUR_NOT_CONVERTED.telegramRoutes).toEqual(['manager', 'cashier']);
    expect(receiptValidationMetadataByCode.FORCED_TEST_FAILURE.telegramRoutes).toEqual([]);
  });

  it('documents that historical Flexi diagnostics remain manager-only', () => {
    for (const code of [
      'FLEXI_CHECKIN_WITHOUT_AVAILABLE_PASS',
      'FLEXI_CHECKIN_INVALID_VARIANT',
      'FLEXI_CHECKOUT_WITHOUT_AVAILABLE_PASS',
      'FLEXI_CHECKOUT_INVALID_VARIANT'
    ]) {
      expect(receiptValidationMetadataByCode[code].telegramRoutingNote).toContain('manager-only');
    }
  });
});
