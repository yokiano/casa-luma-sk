import { describe, expect, it } from 'vitest';
import { deriveFinancialLedgerCompleteness } from './financial-ledger-completeness';

describe('Financial Ledger completeness', () => {
  it('requires category and receipt evidence when both are absent', () => {
    expect(deriveFinancialLedgerCompleteness({})).toMatchObject({
      reviewRequired: true,
      missingFields: ['category', 'invoiceReceipt']
    });
  });

  it('clears review when category and receipt evidence are present', () => {
    expect(deriveFinancialLedgerCompleteness({ category: 'Bills', invoiceReceiptCount: 1 })).toMatchObject({
      reviewRequired: false,
      missingFields: [],
      hasInvoiceReceipt: true
    });
  });

  it('allows an explicit receipt exemption but still requires category', () => {
    expect(deriveFinancialLedgerCompleteness({ receiptNotRequired: true })).toMatchObject({
      reviewRequired: true,
      missingFields: ['category'],
      receiptNotRequired: true,
      hasInvoiceReceipt: false
    });

    expect(deriveFinancialLedgerCompleteness({ category: 'Revenue', receiptNotRequired: true })).toMatchObject({
      reviewRequired: false,
      missingFields: []
    });
  });

  it('treats whitespace-only category as missing', () => {
    expect(deriveFinancialLedgerCompleteness({ category: '  ', invoiceReceiptCount: 1 })).toMatchObject({
      reviewRequired: true,
      missingFields: ['category']
    });
  });
});
