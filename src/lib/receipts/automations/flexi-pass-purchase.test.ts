import { describe, expect, it, vi } from 'vitest';
import type { LoyverseReceipt } from '$lib/receipts/types';
import { FLEXI_PASS_ENTRIES_PER_CARD } from '$lib/receipts/open-play-items';
import {
  FLEXI_PASS_ACTIVE_STATUS,
  createFlexiPassPurchaseAutomation,
  getFlexiPurchaseLines,
  type FlexiPassPurchaseAutomationDeps
} from './flexi-pass-purchase';

const residentItemId = 'resident-flexi';
const regularItemId = 'regular-flexi';

const createReceipt = (overrides: Partial<LoyverseReceipt> = {}): LoyverseReceipt => ({
  receipt_number: 'R-1000',
  receipt_type: 'SALE',
  customer_id: ' cust-1 ',
  receipt_date: '2026-01-12T10:30:00.000Z',
  line_items: [{ item_id: residentItemId, item_name: 'Flexible Resident', quantity: 1 }],
  ...overrides
});

const createDeps = (overrides: Partial<FlexiPassPurchaseAutomationDeps> = {}): FlexiPassPurchaseAutomationDeps => ({
  findFamilyByLoyverseCustomerId: vi.fn().mockResolvedValue({
    id: 'family-1',
    name: 'Test Family',
    loyverseCustomerId: 'cust-1'
  }),
  findExistingFlexiPassRecord: vi.fn().mockResolvedValue(null),
  findFlexiPassRecordsByReceiptNumber: vi.fn().mockResolvedValue([]),
  markFlexiPassRecordRefunded: vi.fn().mockResolvedValue({ id: 'flexi-1', name: 'Test Family - Flexi - 1 card' }),
  createFlexiPassRecord: vi.fn().mockResolvedValue({ id: 'flexi-1', name: 'Test Family - Flexi - 1 card' }),
  ...overrides
});

const runAutomation = async (receipt: LoyverseReceipt, deps = createDeps(), itemIds = [residentItemId, regularItemId]) => {
  const automation = createFlexiPassPurchaseAutomation({ itemIds, deps });
  const result = await automation.run({
    receipt,
    context: {
      merchantId: 'merchant-1',
      receiptKey: `merchant-1:${receipt.receipt_number}`,
      eventType: 'receipts.closed',
      eventCreatedAt: '2026-01-12T10:31:00.000Z',
      receiptUrl: `https://example.com/tools/receipts/${receipt.receipt_number}`
    }
  });
  return Array.isArray(result) ? result : [result];
};

describe('flexi pass purchase automation', () => {
  it('creates a structured Notion flexi pass record for one card purchase', async () => {
    const deps = createDeps();

    const results = await runAutomation(createReceipt(), deps);

    expect(results[0]).toMatchObject({
      code: 'FLEXI_PASSES_CREATED',
      status: 'completed',
      details: {
        cardCount: 1,
        entriesGranted: 11,
        entriesLeft: 11,
        validFrom: '2026-01-12',
        validUntil: '2026-03-12'
      }
    });
    expect(deps.findFamilyByLoyverseCustomerId).toHaveBeenCalledWith({ loyverseCustomerId: 'cust-1' });
    expect(deps.findExistingFlexiPassRecord).toHaveBeenCalledWith(expect.objectContaining({
      familyId: 'family-1',
      sourceReceiptKey: 'merchant-1:R-1000',
      sourceReceiptNumber: 'R-1000',
      sourceItemIds: [residentItemId]
    }));
    expect(deps.createFlexiPassRecord).toHaveBeenCalledWith(expect.objectContaining({
      familyId: 'family-1',
      familyName: 'Test Family',
      loyverseCustomerId: 'cust-1',
      cardCount: 1,
      entriesGranted: FLEXI_PASS_ENTRIES_PER_CARD,
      entriesUsed: 0,
      entriesLeft: FLEXI_PASS_ENTRIES_PER_CARD,
      validFrom: '2026-01-12',
      validUntil: '2026-03-12',
      sourceReceiptNumber: 'R-1000',
      sourceReceiptKey: 'merchant-1:R-1000',
      sourceReceiptUrl: 'https://example.com/tools/receipts/R-1000',
      sourceLineIndexes: '0',
      sourceItemIds: residentItemId,
      notes: expect.stringContaining('Created automatically from Loyverse flexi pass receipt.')
    }));
  });

  it('creates one flexi record for quantity 2 with 22 entries', async () => {
    const deps = createDeps();

    const results = await runAutomation(createReceipt({ line_items: [{ item_id: residentItemId, quantity: 2 }] }), deps);

    expect(results[0]).toMatchObject({ status: 'completed', details: { cardCount: 2, entriesGranted: 22 } });
    expect(deps.createFlexiPassRecord).toHaveBeenCalledWith(expect.objectContaining({ cardCount: 2, entriesGranted: 22, entriesLeft: 22 }));
  });

  it('skips receipts with no flexi card purchase item without an incident', async () => {
    const deps = createDeps();

    const results = await runAutomation(createReceipt({ line_items: [{ item_id: 'other-item' }] }), deps);

    expect(results[0]).toMatchObject({ status: 'skipped', details: { reason: 'no_matching_item' } });
    expect(results[0].details?.incidentCode).toBeUndefined();
    expect(deps.createFlexiPassRecord).not.toHaveBeenCalled();
  });

  it('fails when customer_id is missing', async () => {
    const deps = createDeps();

    const results = await runAutomation(createReceipt({ customer_id: undefined }), deps);

    expect(results[0]).toMatchObject({
      status: 'failed',
      details: { reason: 'missing_customer', incidentCode: 'FLEXI_PASS_PURCHASE_MISSING_CUSTOMER' }
    });
    expect(deps.createFlexiPassRecord).not.toHaveBeenCalled();
  });

  it('fails when no family matches', async () => {
    const deps = createDeps({ findFamilyByLoyverseCustomerId: vi.fn().mockResolvedValue(null) });

    const results = await runAutomation(createReceipt(), deps);

    expect(results[0]).toMatchObject({
      status: 'failed',
      details: { reason: 'family_not_found', incidentCode: 'FLEXI_PASS_PURCHASE_FAMILY_NOT_FOUND' }
    });
    expect(deps.createFlexiPassRecord).not.toHaveBeenCalled();
  });

  it('skips and flags cancelled receipts before writing Notion records', async () => {
    const deps = createDeps();

    const results = await runAutomation(createReceipt({ cancelled_at: '2026-01-12T10:35:00.000Z' }), deps);

    expect(results[0]).toMatchObject({
      status: 'skipped',
      details: { reason: 'cancelled_receipt', incidentCode: 'FLEXI_PASS_PURCHASE_CANCELLED_SKIPPED' }
    });
    expect(deps.createFlexiPassRecord).not.toHaveBeenCalled();
  });

  it('skips and flags possible corrected receipts when a flexi record already exists', async () => {
    const deps = createDeps({
      findExistingFlexiPassRecord: vi.fn().mockResolvedValue({ id: 'existing-1', name: 'Existing Flexi' })
    });

    const results = await runAutomation(createReceipt(), deps);

    expect(results[0]).toMatchObject({
      status: 'skipped',
      details: { reason: 'already_created_or_corrected_receipt', incidentCode: 'FLEXI_PASS_PURCHASE_CORRECTED_RECEIPT_SKIPPED' }
    });
    expect(deps.createFlexiPassRecord).not.toHaveBeenCalled();
  });

  it('marks matching flexi records refunded for refund receipts', async () => {
    const deps = createDeps({
      findFlexiPassRecordsByReceiptNumber: vi.fn().mockResolvedValue([{ id: 'flexi-1', name: 'Test Family - Flexi - 1 card' }])
    });

    const results = await runAutomation(createReceipt({ receipt_number: 'R-2000', receipt_type: 'REFUND', refund_for: 'R-1000' }), deps);

    expect(results[0]).toMatchObject({
      code: 'FLEXI_PASSES_REFUNDED',
      status: 'completed',
      details: { originalReceiptNumber: 'R-1000', refundReceiptNumber: 'R-2000' }
    });
    expect(deps.findFlexiPassRecordsByReceiptNumber).toHaveBeenCalledWith({ receiptNumber: 'R-1000', itemIds: [residentItemId] });
    expect(deps.markFlexiPassRecordRefunded).toHaveBeenCalledWith(expect.objectContaining({
      recordId: 'flexi-1',
      originalReceiptNumber: 'R-1000',
      refundReceiptNumber: 'R-2000',
      refundReceiptKey: 'merchant-1:R-2000'
    }));
    expect(deps.createFlexiPassRecord).not.toHaveBeenCalled();
  });

  it('extracts all configured flexi purchase lines and normalizes bad quantities to one card', () => {
    const lines = getFlexiPurchaseLines(createReceipt({
      line_items: [
        { item_id: residentItemId, item_name: 'Flexible Resident', quantity: 2.8 },
        { item_id: 'other-item', item_name: 'Other', quantity: 10 },
        { item_id: regularItemId, item_name: 'flexible Regular', quantity: 0 }
      ]
    }), [residentItemId, regularItemId]);

    expect(lines).toEqual([
      expect.objectContaining({ lineIndex: 0, itemId: residentItemId, cards: 2 }),
      expect.objectContaining({ lineIndex: 2, itemId: regularItemId, cards: 1 })
    ]);
  });

  it('keeps status constants aligned with Notion select labels', () => {
    expect(FLEXI_PASS_ACTIVE_STATUS).toBe('Active');
  });

  it('keeps the default automation suite importable with generated flexi SDK files', async () => {
    const module = await import('$lib/server/membership-automation');
    expect(module.createDefaultReceiptAutomationSuite()).toHaveLength(3);
  });
});
