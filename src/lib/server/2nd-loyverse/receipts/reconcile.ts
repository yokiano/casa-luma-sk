import type { LoyverseReceipt } from '$lib/receipts/types';
import type { LoyverseClient } from '$lib/server/loyverse-client';
import { SECOND_LOYVERSE_SOURCE } from '../types';
import { SecondLoyverseError } from '../errors';

export interface MarkerReconcileResult {
  action: 'proceed' | 'already_exists' | 'duplicate';
  receipt?: LoyverseReceipt;
  receipts: LoyverseReceipt[];
}

export const reconcileTargetMarker = async (args: {
  targetClient: LoyverseClient;
  orderMarker: string;
}): Promise<MarkerReconcileResult> => {
  const response = await args.targetClient.getReceipts({
    source: SECOND_LOYVERSE_SOURCE,
    order: args.orderMarker,
    limit: 50
  });

  const matches = (response.receipts ?? []).filter(
    (receipt) =>
      receipt.source === SECOND_LOYVERSE_SOURCE &&
      receipt.order === args.orderMarker &&
      !receipt.cancelled_at
  );

  if (matches.length === 0) {
    return { action: 'proceed', receipts: [] };
  }
  if (matches.length === 1) {
    return { action: 'already_exists', receipt: matches[0], receipts: matches };
  }

  return { action: 'duplicate', receipts: matches };
};

export const assertCompatibleExistingReceipt = (receipt: LoyverseReceipt, orderMarker: string) => {
  if (receipt.order !== orderMarker || receipt.source !== SECOND_LOYVERSE_SOURCE) {
    throw new SecondLoyverseError({
      code: 'DUPLICATE_TARGET_MARKER',
      stage: 'reconcile_marker',
      message: 'Existing target receipt marker mismatch'
    });
  }
};
