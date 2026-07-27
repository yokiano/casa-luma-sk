import { and, eq, inArray, isNull, lte, ne, or } from 'drizzle-orm';
import type { LoyverseReceiptLineItem } from '$lib/receipts/types';
import {
  FLEXI_CARD_ITEM_IDS,
  FLEXI_CHECKOUT_ITEM_ID,
  FLEXI_PASS_ENTRIES_PER_CARD
} from '$lib/receipts/open-play-items';
import { classifyFlexiLineItem } from '$lib/receipts/flexi-line-items';
import { db } from './client';
import { receiptLineItems, receipts } from './schema';

export type FlexiPassBalance = {
  customerId: string;
  passEntriesPerCard: number;
  cardsPurchased: number;
  entriesPurchased: number;
  entriesUsedIncludingCurrent: number;
  currentVisitPunches: number;
  /** Compatibility alias for callers and stored incident payloads. */
  currentReceiptEntries: number;
  remainingBeforeCurrentReceipt: number;
  remainingAfterCurrentReceipt: number;
  unknownVariantDiagnostics: string[];
  firstPurchaseAt: string | null;
  lastPurchaseAt: string | null;
};

export type FlexiBalanceRow = {
  receiptKey: string;
  createdAt: Date | null;
  receiptDate: Date | null;
  itemId: string | null;
  variantId: string | null;
  variantName: string | null;
  sku: string | null;
  quantity: number | null;
};

const asFiniteQuantity = (value: number | null | undefined): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : 0;

const toIso = (value: Date | null | undefined): string | null => value?.toISOString() ?? null;

const getRowDate = (row: { receiptDate: Date | null; createdAt: Date | null }): Date | null =>
  row.receiptDate ?? row.createdAt ?? null;

const toLineItem = (row: FlexiBalanceRow): LoyverseReceiptLineItem => ({
  item_id: row.itemId ?? undefined,
  variant_id: row.variantId ?? undefined,
  variant_name: row.variantName ?? undefined,
  sku: row.sku ?? undefined,
  quantity: row.quantity ?? undefined
});

export const calculateFlexiPassBalance = ({
  customerId,
  rows,
  currentReceiptKey,
  currentVisitPunches,
  excludeCurrentReceiptUsage,
  /** @deprecated Use currentVisitPunches. */
  currentReceiptEntries
}: {
  customerId: string;
  rows: FlexiBalanceRow[];
  currentReceiptKey?: string;
  currentVisitPunches?: number;
  /** Check-in validation must inspect balance before Checkout on the same open ticket. */
  excludeCurrentReceiptUsage?: boolean;
  currentReceiptEntries?: number;
}): FlexiPassBalance => {
  const selectedVisitPunches = currentVisitPunches ?? currentReceiptEntries ?? 0;
  let cardsPurchased = 0;
  let entriesUsedIncludingCurrent = 0;
  const unknownVariantDiagnostics: string[] = [];
  let firstPurchaseAt: Date | null = null;
  let lastPurchaseAt: Date | null = null;
  const checkoutRowsByReceipt = new Map<string, FlexiBalanceRow[]>();

  for (const row of rows) {
    const quantity = asFiniteQuantity(row.quantity);
    if (FLEXI_CARD_ITEM_IDS.includes(row.itemId as (typeof FLEXI_CARD_ITEM_IDS)[number])) {
      cardsPurchased += quantity;
      const purchaseAt = getRowDate(row);
      if (purchaseAt && (!firstPurchaseAt || purchaseAt < firstPurchaseAt)) firstPurchaseAt = purchaseAt;
      if (purchaseAt && (!lastPurchaseAt || purchaseAt > lastPurchaseAt)) lastPurchaseAt = purchaseAt;
      continue;
    }

    if (row.itemId !== FLEXI_CHECKOUT_ITEM_ID) continue;
    if (excludeCurrentReceiptUsage && currentReceiptKey === row.receiptKey) continue;
    const receiptRows = checkoutRowsByReceipt.get(row.receiptKey) ?? [];
    receiptRows.push(row);
    checkoutRowsByReceipt.set(row.receiptKey, receiptRows);
  }

  for (const [receiptKey, receiptRows] of checkoutRowsByReceipt) {
    const classifications = receiptRows.map((row) => ({
      row,
      classification: classifyFlexiLineItem(toLineItem(row))
    }));
    const valid = classifications.flatMap((entry) =>
      entry.classification.kind === 'checkout' ? [entry.classification] : []
    );
    const invalid = classifications.flatMap((entry) =>
      entry.classification.kind === 'invalid-checkout' ? [entry.classification] : []
    );
    if (valid.length === 1 && invalid.length === 0) {
      entriesUsedIncludingCurrent += valid[0].hours;
      continue;
    }
    if (valid.length > 1) {
      unknownVariantDiagnostics.push(`${receiptKey}: a receipt may contain only one Flexi Checkout line.`);
    }
    for (const entry of invalid) {
      unknownVariantDiagnostics.push(`${receiptKey}: ${entry.reason}`);
    }
  }

  // A just-ingested receipt can briefly lack receipt_date. Apply its selected
  // Checkout punches once only when no matching stored Checkout line exists.
  const currentStoredCheckout = currentReceiptKey
    ? rows.some((row) => row.receiptKey === currentReceiptKey && row.itemId === FLEXI_CHECKOUT_ITEM_ID)
    : false;
  if (currentReceiptKey && selectedVisitPunches > 0 && !currentStoredCheckout) {
    entriesUsedIncludingCurrent += selectedVisitPunches;
  }

  const entriesPurchased = cardsPurchased * FLEXI_PASS_ENTRIES_PER_CARD;
  const remainingAfterCurrentReceipt = entriesPurchased - entriesUsedIncludingCurrent;
  const remainingBeforeCurrentReceipt = remainingAfterCurrentReceipt + selectedVisitPunches;

  return {
    customerId,
    passEntriesPerCard: FLEXI_PASS_ENTRIES_PER_CARD,
    cardsPurchased,
    entriesPurchased,
    entriesUsedIncludingCurrent,
    currentVisitPunches: selectedVisitPunches,
    currentReceiptEntries: selectedVisitPunches,
    remainingBeforeCurrentReceipt,
    remainingAfterCurrentReceipt,
    unknownVariantDiagnostics,
    firstPurchaseAt: toIso(firstPurchaseAt),
    lastPurchaseAt: toIso(lastPurchaseAt)
  };
};

export const queryFlexiPassBalanceForCustomer = async ({
  customerId,
  merchantId,
  at,
  currentReceiptKey,
  currentVisitPunches,
  excludeCurrentReceiptUsage,
  /** @deprecated Use currentVisitPunches. Kept for replay/caller compatibility. */
  currentReceiptEntries
}: {
  customerId: string;
  merchantId?: string;
  at: string;
  currentReceiptKey?: string;
  currentVisitPunches?: number;
  excludeCurrentReceiptUsage?: boolean;
  currentReceiptEntries?: number;
}): Promise<FlexiPassBalance> => {
  const atDate = new Date(at);
  if (Number.isNaN(atDate.getTime())) {
    throw new Error(`Invalid flexi balance cutoff date: ${at}`);
  }
  const normalizedMerchantId = merchantId?.trim();
  if (!normalizedMerchantId) {
    throw new Error('Merchant ID is required for an isolated Flexi balance query.');
  }

  const conditions = [
    eq(receipts.customerId, customerId),
    or(isNull(receipts.receiptType), ne(receipts.receiptType, 'REFUND'))!,
    isNull(receipts.cancelledAt),
    or(lte(receipts.receiptDate, atDate), lte(receipts.createdAt, atDate))!,
    inArray(receiptLineItems.itemId, [...FLEXI_CARD_ITEM_IDS, FLEXI_CHECKOUT_ITEM_ID]),
    eq(receipts.merchantId, normalizedMerchantId)
  ];

  const rows = await db
    .select({
      receiptKey: receipts.receiptKey,
      createdAt: receipts.createdAt,
      receiptDate: receipts.receiptDate,
      itemId: receiptLineItems.itemId,
      variantId: receiptLineItems.variantId,
      variantName: receiptLineItems.variantName,
      sku: receiptLineItems.sku,
      quantity: receiptLineItems.quantity
    })
    .from(receiptLineItems)
    .innerJoin(receipts, eq(receiptLineItems.receiptKey, receipts.receiptKey))
    .where(and(...conditions));

  return calculateFlexiPassBalance({
    customerId,
    rows,
    currentReceiptKey,
    currentVisitPunches,
    excludeCurrentReceiptUsage,
    currentReceiptEntries
  });
};
