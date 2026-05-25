import { describe, expect, it, vi } from 'vitest';
import type { LoyverseReceipt } from '$lib/receipts/types';
import { createMembershipFromReceiptAutomation, type MembershipAutomationDeps } from './membership-creation';
import type { MembershipPurchaseItemConfig } from './membership-items';

const weeklyItem: MembershipPurchaseItemConfig = {
  itemId: 'weekly-1',
  type: 'Weekly',
  durationDays: 7,
  label: 'Weekly membership'
};

const monthlyItem: MembershipPurchaseItemConfig = {
  itemId: 'monthly-1',
  type: 'Monthly',
  durationDays: 30,
  label: 'Monthly membership'
};

const createReceipt = (overrides: Partial<LoyverseReceipt> = {}): LoyverseReceipt => ({
  receipt_number: 'R-1000',
  receipt_type: 'SALE',
  customer_id: ' cust-1 ',
  receipt_date: '2026-01-12T10:30:00.000Z',
  line_items: [{ item_id: weeklyItem.itemId, item_name: weeklyItem.label, quantity: 1 }],
  ...overrides
});

const createDeps = (overrides: Partial<MembershipAutomationDeps> = {}): MembershipAutomationDeps => ({
  findFamilyByLoyverseCustomerId: vi.fn().mockResolvedValue({
    id: 'family-1',
    name: 'Test Family',
    loyverseCustomerId: 'cust-1'
  }),
  findExistingAutomatedMembership: vi.fn().mockResolvedValue(null),
  findAutomatedMembershipsByReceiptNumber: vi.fn().mockResolvedValue([]),
  markMembershipRefunded: vi.fn().mockResolvedValue({ id: 'membership-1', name: 'Test Family - Weekly - 1 kid' }),
  createMembership: vi.fn().mockResolvedValue({ id: 'membership-1', name: 'Test Family - Weekly - 1 kid' }),
  ...overrides
});

const runAutomation = async (receipt: LoyverseReceipt, deps = createDeps(), itemConfig = [weeklyItem]) => {
  const automation = createMembershipFromReceiptAutomation({ itemConfig, deps });
  const result = await automation.run({
    receipt,
    context: {
      merchantId: 'merchant-1',
      receiptKey: 'merchant-1:R-1000',
      eventType: 'receipts.closed',
      eventCreatedAt: '2026-01-12T10:31:00.000Z',
      receiptUrl: 'https://example.com/tools/receipts/R-1000'
    }
  });
  return Array.isArray(result) ? result : [result];
};

describe('membership creation automation', () => {
  it('creates a weekly membership for a matching receipt line', async () => {
    const deps = createDeps();

    const results = await runAutomation(createReceipt(), deps);

    expect(results[0]).toMatchObject({ code: 'MEMBERSHIP_CREATED', status: 'completed' });
    expect(deps.findFamilyByLoyverseCustomerId).toHaveBeenCalledWith({ loyverseCustomerId: 'cust-1' });
    expect(deps.findExistingAutomatedMembership).toHaveBeenCalledWith(
      expect.objectContaining({
        familyId: 'family-1',
        type: 'Weekly',
        numberOfKids: 1,
        startDate: '2026-01-12',
        endDate: '2026-01-18',
        receiptKey: 'merchant-1:R-1000',
        receiptNumber: 'R-1000',
        itemId: weeklyItem.itemId
      })
    );
    expect(deps.createMembership).toHaveBeenCalledWith(
      expect.objectContaining({
        familyId: 'family-1',
        familyName: 'Test Family',
        type: 'Weekly',
        numberOfKids: 1,
        startDate: '2026-01-12',
        endDate: '2026-01-18',
        notes: expect.stringContaining('Receipt Key: merchant-1:R-1000'),
        receiptUrl: 'https://example.com/tools/receipts/R-1000'
      })
    );
    const notes = (deps.createMembership as ReturnType<typeof vi.fn>).mock.calls[0][0].notes;
    expect(notes).toContain(`Loyverse Item ID: ${weeklyItem.itemId}`);
    expect(notes).toContain('Receipt Line Indexes: 0');
  });

  it('creates a monthly membership with fixed 30-day inclusive dates', async () => {
    const deps = createDeps({
      createMembership: vi.fn().mockResolvedValue({ id: 'membership-2', name: 'Test Family - Monthly - 1 kid' })
    });
    const receipt = createReceipt({
      line_items: [{ item_id: monthlyItem.itemId, item_name: monthlyItem.label, quantity: 1 }]
    });

    const results = await runAutomation(receipt, deps, [monthlyItem]);

    expect(results[0]).toMatchObject({ code: 'MEMBERSHIP_CREATED', status: 'completed' });
    expect(deps.createMembership).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'Monthly', numberOfKids: 1, startDate: '2026-01-12', endDate: '2026-02-10' })
    );
  });

  it('aggregates multiple lines of the same membership item into one membership with X kids', async () => {
    const deps = createDeps();
    const receipt = createReceipt({
      line_items: [
        { item_id: weeklyItem.itemId, item_name: weeklyItem.label, quantity: 1 },
        { item_id: weeklyItem.itemId, item_name: weeklyItem.label, quantity: 1 },
        { item_id: weeklyItem.itemId, item_name: weeklyItem.label, quantity: 1 }
      ]
    });

    const results = await runAutomation(receipt, deps);

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({ status: 'completed', details: { numberOfKids: 3, lineIndexes: [0, 1, 2] } });
    expect(deps.createMembership).toHaveBeenCalledTimes(1);
    expect(deps.createMembership).toHaveBeenCalledWith(expect.objectContaining({ numberOfKids: 3 }));
  });

  it('counts quantity greater than 1 as multiple kids on the same membership', async () => {
    const deps = createDeps();
    const receipt = createReceipt({
      line_items: [{ item_id: weeklyItem.itemId, item_name: weeklyItem.label, quantity: 2 }]
    });

    const results = await runAutomation(receipt, deps);

    expect(results[0]).toMatchObject({ status: 'completed', details: { numberOfKids: 2 } });
    expect(deps.createMembership).toHaveBeenCalledWith(expect.objectContaining({ numberOfKids: 2 }));
  });

  it('creates separate memberships for different membership item types in one receipt', async () => {
    const deps = createDeps();
    const receipt = createReceipt({
      line_items: [
        { item_id: weeklyItem.itemId, item_name: weeklyItem.label, quantity: 1 },
        { item_id: monthlyItem.itemId, item_name: monthlyItem.label, quantity: 1 }
      ]
    });

    const results = await runAutomation(receipt, deps, [weeklyItem, monthlyItem]);

    expect(results.map((result) => result.status)).toEqual(['completed', 'completed']);
    expect(deps.createMembership).toHaveBeenCalledTimes(2);
    expect((deps.createMembership as ReturnType<typeof vi.fn>).mock.calls[0][0]).toMatchObject({ type: 'Weekly', numberOfKids: 1 });
    expect((deps.createMembership as ReturnType<typeof vi.fn>).mock.calls[1][0]).toMatchObject({ type: 'Monthly', numberOfKids: 1 });
  });

  it('skips receipts with no membership purchase item', async () => {
    const deps = createDeps();

    const results = await runAutomation(createReceipt({ line_items: [{ item_id: 'other-item' }] }), deps);

    expect(results[0]).toMatchObject({ status: 'skipped', details: { reason: 'no_matching_item' } });
    expect(deps.createMembership).not.toHaveBeenCalled();
  });

  it('marks the matching automated membership as refunded for refund receipts', async () => {
    const deps = createDeps({
      findAutomatedMembershipsByReceiptNumber: vi.fn().mockResolvedValue([
        { id: 'membership-1', name: 'Test Family - Weekly - 1 kid' }
      ])
    });

    const results = await runAutomation(
      createReceipt({ receipt_number: 'R-2000', receipt_type: 'REFUND', refund_for: 'R-1000' }),
      deps
    );

    expect(results[0]).toMatchObject({
      code: 'MEMBERSHIP_REFUNDED',
      status: 'completed',
      details: { originalReceiptNumber: 'R-1000', refundReceiptNumber: 'R-2000' }
    });
    expect(deps.findAutomatedMembershipsByReceiptNumber).toHaveBeenCalledWith({
      receiptNumber: 'R-1000',
      itemIds: [weeklyItem.itemId]
    });
    expect(deps.markMembershipRefunded).toHaveBeenCalledWith(
      expect.objectContaining({
        membershipId: 'membership-1',
        originalReceiptNumber: 'R-1000',
        refundReceiptNumber: 'R-2000'
      })
    );
    expect(deps.findFamilyByLoyverseCustomerId).not.toHaveBeenCalled();
    expect(deps.createMembership).not.toHaveBeenCalled();
  });

  it('skips refund receipts when no automated membership matches the original receipt', async () => {
    const deps = createDeps();

    const results = await runAutomation(createReceipt({ receipt_type: 'REFUND', refund_for: 'R-9999' }), deps);

    expect(results[0]).toMatchObject({
      status: 'skipped',
      details: { reason: 'refunded_membership_not_found', incidentCode: 'MEMBERSHIP_REFUND_MEMBERSHIP_NOT_FOUND' }
    });
    expect(deps.findFamilyByLoyverseCustomerId).not.toHaveBeenCalled();
    expect(deps.createMembership).not.toHaveBeenCalled();
  });

  it('skips and flags cancelled receipts before calling Notion deps', async () => {
    const deps = createDeps();

    const results = await runAutomation(createReceipt({ cancelled_at: '2026-01-12T10:35:00.000Z' }), deps);

    expect(results[0]).toMatchObject({
      status: 'skipped',
      details: { reason: 'cancelled_receipt', incidentCode: 'MEMBERSHIP_CREATION_CANCELLED_SKIPPED' }
    });
    expect(deps.findFamilyByLoyverseCustomerId).not.toHaveBeenCalled();
  });

  it('fails with a clear result when customer_id is missing', async () => {
    const deps = createDeps();

    const results = await runAutomation(createReceipt({ customer_id: undefined }), deps);

    expect(results[0]).toMatchObject({
      status: 'failed',
      details: { reason: 'missing_customer', incidentCode: 'MEMBERSHIP_CREATION_MISSING_CUSTOMER' }
    });
    expect(deps.findFamilyByLoyverseCustomerId).not.toHaveBeenCalled();
  });

  it('fails with a clear result when family is not found', async () => {
    const deps = createDeps({ findFamilyByLoyverseCustomerId: vi.fn().mockResolvedValue(null) });

    const results = await runAutomation(createReceipt(), deps);

    expect(results[0]).toMatchObject({
      status: 'failed',
      details: { reason: 'family_not_found', incidentCode: 'MEMBERSHIP_CREATION_FAMILY_NOT_FOUND' }
    });
    expect(deps.createMembership).not.toHaveBeenCalled();
  });

  it('skips and flags when an existing automated membership already exists for the receipt key', async () => {
    const deps = createDeps({
      findExistingAutomatedMembership: vi.fn().mockResolvedValue({ id: 'existing-1', name: 'Existing' })
    });

    const results = await runAutomation(createReceipt(), deps);

    expect(results[0]).toMatchObject({
      status: 'skipped',
      details: { reason: 'already_created_or_corrected_receipt', incidentCode: 'MEMBERSHIP_CREATION_CORRECTED_RECEIPT_SKIPPED' }
    });
    expect(deps.createMembership).not.toHaveBeenCalled();
  });

  it('converts Notion create errors to failed results', async () => {
    const deps = createDeps({ createMembership: vi.fn().mockRejectedValue(new Error('Notion unavailable')) });

    const results = await runAutomation(createReceipt(), deps);

    expect(results[0]).toMatchObject({
      status: 'failed',
      details: { reason: 'notion_create_failed', errorMessage: 'Notion unavailable' }
    });
  });
});
