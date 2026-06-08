import { describe, expect, it, vi } from 'vitest';
import type { LoyverseReceipt } from '$lib/receipts/types';
import { FLEXI_SINGLE_ENTRANCE_ITEM_ID } from '$lib/receipts/open-play-items';
import {
  allocateFlexiUsage,
  createFlexiPassUsageAutomation,
  type FlexiPassUsageAutomationDeps,
  type FlexiPassUsageRecord
} from './flexi-pass-usage';

const createRecord = (overrides: Partial<FlexiPassUsageRecord> = {}): FlexiPassUsageRecord => ({
  id: 'flexi-1',
  name: 'Test Family - Flexi - 1 card',
  entriesGranted: 11,
  entriesUsed: 0,
  entriesLeft: 11,
  validFrom: '2026-01-01',
  validUntil: '2026-03-01',
  createdTime: '2026-01-01T00:00:00.000Z',
  ...overrides
});

const createReceipt = (overrides: Partial<LoyverseReceipt> = {}): LoyverseReceipt => ({
  receipt_number: 'R-USE-1',
  receipt_type: 'SALE',
  customer_id: ' cust-1 ',
  receipt_date: '2026-01-12T10:30:00.000Z',
  line_items: [{ item_id: FLEXI_SINGLE_ENTRANCE_ITEM_ID, item_name: 'Flexi Single Entrance', quantity: 1 }],
  ...overrides
});

const createDeps = (overrides: Partial<FlexiPassUsageAutomationDeps> = {}): FlexiPassUsageAutomationDeps => ({
  lookupFlexiBalance: vi.fn().mockResolvedValue({
    customerId: 'cust-1',
    passEntriesPerCard: 11,
    cardsPurchased: 1,
    entriesPurchased: 11,
    entriesUsedIncludingCurrent: 3,
    currentReceiptEntries: 1,
    remainingBeforeCurrentReceipt: 9,
    remainingAfterCurrentReceipt: 8,
    firstPurchaseAt: '2026-01-01T00:00:00.000Z',
    lastPurchaseAt: '2026-01-01T00:00:00.000Z'
  }),
  findFlexiPassRecordsForUsage: vi.fn().mockResolvedValue([createRecord()]),
  updateFlexiPassUsage: vi.fn().mockImplementation(async (input) => createRecord({
    entriesUsed: input.entriesUsed,
    entriesLeft: input.entriesLeft
  })),
  ...overrides
});

const runAutomation = async (receipt: LoyverseReceipt, deps = createDeps()) => {
  const automation = createFlexiPassUsageAutomation({ deps });
  const result = await automation.run({
    receipt,
    context: {
      merchantId: 'merchant-1',
      receiptKey: `merchant-1:${receipt.receipt_number}`,
      eventCreatedAt: '2026-01-12T10:31:00.000Z'
    }
  });
  return Array.isArray(result) ? result : [result];
};

describe('flexi pass usage automation', () => {
  it('allocates cumulative usage across passes oldest first', () => {
    const [first, second] = allocateFlexiUsage([
      createRecord({ id: 'newer', validFrom: '2026-02-01', entriesGranted: 11 }),
      createRecord({ id: 'older', validFrom: '2026-01-01', entriesGranted: 11 })
    ], 13);

    expect(first).toMatchObject({ id: 'older', nextEntriesUsed: 11, nextEntriesLeft: 0 });
    expect(second).toMatchObject({ id: 'newer', nextEntriesUsed: 2, nextEntriesLeft: 9 });
  });

  it('updates Notion counters from Neon receipt balance for flexi usage receipts', async () => {
    const deps = createDeps();

    const results = await runAutomation(createReceipt(), deps);

    expect(results[0]).toMatchObject({
      code: 'FLEXI_PASS_USAGE_UPDATED',
      status: 'completed',
      details: { recordsUpdated: 1, entriesUsedIncludingCurrent: 3, remainingAfterCurrentReceipt: 8 }
    });
    expect(deps.lookupFlexiBalance).toHaveBeenCalledWith(expect.objectContaining({
      customerId: 'cust-1',
      currentReceiptEntries: 1,
      currentReceiptKey: 'merchant-1:R-USE-1'
    }));
    expect(deps.updateFlexiPassUsage).toHaveBeenCalledWith(expect.objectContaining({
      recordId: 'flexi-1',
      entriesUsed: 3,
      entriesLeft: 8,
      receiptNumber: 'R-USE-1'
    }));
  });

  it('does not write when counters are already current', async () => {
    const deps = createDeps({ findFlexiPassRecordsForUsage: vi.fn().mockResolvedValue([createRecord({ entriesUsed: 3, entriesLeft: 8 })]) });

    const results = await runAutomation(createReceipt(), deps);

    expect(results[0]).toMatchObject({ status: 'completed', details: { recordsUpdated: 0 } });
    expect(deps.updateFlexiPassUsage).not.toHaveBeenCalled();
  });

  it('flags missing Notion flexi records when Neon shows purchased entries', async () => {
    const deps = createDeps({ findFlexiPassRecordsForUsage: vi.fn().mockResolvedValue([]) });

    const results = await runAutomation(createReceipt(), deps);

    expect(results[0]).toMatchObject({
      status: 'skipped',
      details: {
        reason: 'no_flexi_pass_records',
        incidentCode: 'FLEXI_PASS_USAGE_NO_NOTION_RECORDS',
        entriesPurchased: 11,
        entriesUsedIncludingCurrent: 3
      }
    });
    expect(deps.updateFlexiPassUsage).not.toHaveBeenCalled();
  });

  it('skips missing Notion flexi records quietly when Neon shows no purchased entries', async () => {
    const deps = createDeps({
      lookupFlexiBalance: vi.fn().mockResolvedValue({
        customerId: 'cust-1',
        passEntriesPerCard: 11,
        cardsPurchased: 0,
        entriesPurchased: 0,
        entriesUsedIncludingCurrent: 1,
        currentReceiptEntries: 1,
        remainingBeforeCurrentReceipt: 0,
        remainingAfterCurrentReceipt: -1,
        firstPurchaseAt: null,
        lastPurchaseAt: null
      }),
      findFlexiPassRecordsForUsage: vi.fn().mockResolvedValue([])
    });

    const results = await runAutomation(createReceipt(), deps);

    expect(results[0]).toMatchObject({
      status: 'skipped',
      details: {
        reason: 'no_flexi_pass_records',
        entriesPurchased: 0
      }
    });
    expect(results[0].details?.incidentCode).toBeUndefined();
    expect(deps.updateFlexiPassUsage).not.toHaveBeenCalled();
  });

  it('skips non-usage receipts', async () => {
    const deps = createDeps();

    const results = await runAutomation(createReceipt({ line_items: [{ item_id: 'other-item', quantity: 1 }] }), deps);

    expect(results[0]).toMatchObject({ status: 'skipped', details: { reason: 'no_matching_item' } });
    expect(deps.lookupFlexiBalance).not.toHaveBeenCalled();
  });
});
