import { and, eq, inArray, isNull, lte, ne, or } from 'drizzle-orm';
import {
  FLEXI_CARD_ITEM_IDS,
  FLEXI_PASS_ENTRIES_PER_CARD,
  FLEXI_SINGLE_ENTRANCE_ITEM_ID
} from '$lib/receipts/open-play-items';
import { db } from './client';
import { receiptLineItems, receipts } from './schema';

export type FlexiPassBalance = {
  customerId: string;
  passEntriesPerCard: number;
  cardsPurchased: number;
  entriesPurchased: number;
  entriesUsedIncludingCurrent: number;
  currentReceiptEntries: number;
  remainingBeforeCurrentReceipt: number;
  remainingAfterCurrentReceipt: number;
  firstPurchaseAt: string | null;
  lastPurchaseAt: string | null;
};

const asFiniteQuantity = (value: number | null | undefined): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : 0;

const toIso = (value: Date | null | undefined): string | null => value?.toISOString() ?? null;

const getRowDate = (row: { receiptDate: Date | null; createdAt: Date | null }): Date | null =>
  row.receiptDate ?? row.createdAt ?? null;

export const queryFlexiPassBalanceForCustomer = async ({
  customerId,
  merchantId,
  at,
  currentReceiptKey,
  currentReceiptEntries
}: {
  customerId: string;
  merchantId?: string;
  at: string;
  currentReceiptKey?: string;
  currentReceiptEntries: number;
}): Promise<FlexiPassBalance> => {
  const atDate = new Date(at);
  if (Number.isNaN(atDate.getTime())) {
    throw new Error(`Invalid flexi balance cutoff date: ${at}`);
  }

  const conditions = [
    eq(receipts.customerId, customerId),
    or(isNull(receipts.receiptType), ne(receipts.receiptType, 'REFUND'))!,
    or(lte(receipts.receiptDate, atDate), lte(receipts.createdAt, atDate))!,
    inArray(receiptLineItems.itemId, [...FLEXI_CARD_ITEM_IDS, FLEXI_SINGLE_ENTRANCE_ITEM_ID])
  ];
  if (merchantId) conditions.push(eq(receipts.merchantId, merchantId));

  const rows = await db
    .select({
      receiptKey: receipts.receiptKey,
      createdAt: receipts.createdAt,
      receiptDate: receipts.receiptDate,
      itemId: receiptLineItems.itemId,
      quantity: receiptLineItems.quantity
    })
    .from(receiptLineItems)
    .innerJoin(receipts, eq(receiptLineItems.receiptKey, receipts.receiptKey))
    .where(and(...conditions));

  let cardsPurchased = 0;
  let entriesUsedIncludingCurrent = 0;
  let firstPurchaseAt: Date | null = null;
  let lastPurchaseAt: Date | null = null;

  for (const row of rows) {
    const quantity = asFiniteQuantity(row.quantity);
    if (FLEXI_CARD_ITEM_IDS.includes(row.itemId as (typeof FLEXI_CARD_ITEM_IDS)[number])) {
      cardsPurchased += quantity;
      const purchaseAt = getRowDate(row);
      if (purchaseAt && (!firstPurchaseAt || purchaseAt < firstPurchaseAt)) firstPurchaseAt = purchaseAt;
      if (purchaseAt && (!lastPurchaseAt || purchaseAt > lastPurchaseAt)) lastPurchaseAt = purchaseAt;
    } else if (row.itemId === FLEXI_SINGLE_ENTRANCE_ITEM_ID) {
      entriesUsedIncludingCurrent += quantity;
    }
  }

  // If receipt_date was missing in Neon for the current receipt, the query above can miss the
  // just-ingested usage. The validation rule passes the receipt quantity so balance-before remains correct.
  if (currentReceiptKey && !rows.some((row) => row.receiptKey === currentReceiptKey && row.itemId === FLEXI_SINGLE_ENTRANCE_ITEM_ID)) {
    entriesUsedIncludingCurrent += currentReceiptEntries;
  }

  const entriesPurchased = cardsPurchased * FLEXI_PASS_ENTRIES_PER_CARD;
  const remainingAfterCurrentReceipt = entriesPurchased - entriesUsedIncludingCurrent;
  const remainingBeforeCurrentReceipt = remainingAfterCurrentReceipt + currentReceiptEntries;

  return {
    customerId,
    passEntriesPerCard: FLEXI_PASS_ENTRIES_PER_CARD,
    cardsPurchased,
    entriesPurchased,
    entriesUsedIncludingCurrent,
    currentReceiptEntries,
    remainingBeforeCurrentReceipt,
    remainingAfterCurrentReceipt,
    firstPurchaseAt: toIso(firstPurchaseAt),
    lastPurchaseAt: toIso(lastPurchaseAt)
  };
};
