import type { LoyverseReceipt } from '$lib/receipts/types';
import type { TransferStatus } from '../types';
import type { EntityInventories } from '../entities/inventory';

export interface EligibilityResult {
  eligible: boolean;
  status?: Extract<
    TransferStatus,
    'skipped_refund' | 'skipped_cancelled' | 'unsupported'
  >;
  reason?: string;
}

export const evaluateReceiptEligibility = (
  receipt: LoyverseReceipt,
  sourceInventory?: EntityInventories | null
): EligibilityResult => {
  if (receipt.receipt_type === 'REFUND' || receipt.refund_for) {
    return { eligible: false, status: 'skipped_refund', reason: 'Refund receipts are excluded from v1 mirroring' };
  }

  if (receipt.cancelled_at) {
    return {
      eligible: false,
      status: 'skipped_cancelled',
      reason: 'Cancelled receipts are excluded from v1 mirroring'
    };
  }

  if (receipt.receipt_type && receipt.receipt_type !== 'SALE') {
    return {
      eligible: false,
      status: 'unsupported',
      reason: `Unsupported receipt_type=${receipt.receipt_type}`
    };
  }

  const lineItems = receipt.line_items ?? [];
  for (const line of lineItems) {
    if (!sourceInventory || !line.item_id) continue;
    const item = sourceInventory.items.find((entry) => entry.id === line.item_id);
    if (item?.is_composite) {
      return {
        eligible: false,
        status: 'unsupported',
        reason: `Composite item "${item.item_name}" is unsupported in v1`
      };
    }
  }

  const hasPointsDiscount = (receipt.total_discounts ?? []).some((d) => d.type === 'DISCOUNT_BY_POINTS');
  if (hasPointsDiscount) {
    return {
      eligible: false,
      status: 'unsupported',
      reason: 'Point-based discounts require customer loyalty and are unsupported in v1'
    };
  }

  return { eligible: true };
};
