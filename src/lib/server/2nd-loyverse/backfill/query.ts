import { Buffer } from 'node:buffer';
import { and, asc, eq, gt, gte, inArray, isNull, lte, or, sql, type SQL } from 'drizzle-orm';
import type { LoyverseReceipt } from '$lib/receipts/types';
import type { MirrorDatabase } from '../db/types';
import {
  receiptDiscounts,
  receiptLineDiscounts,
  receiptLineItems,
  receiptLineModifiers,
  receiptLineTaxes,
  receiptPayments,
  receipts,
  receiptTaxes
} from '$lib/server/db/schema';
import { secondLoyverseReceiptTransfers } from '../db/schema';

export interface BackfillReceiptRow {
  sourceReceiptKey: string;
  merchantId: string;
  receiptNumber: string;
  receiptDate: string | null;
  receipt: LoyverseReceipt;
  transferStatus?: string | null;
}

interface KeysetCursor {
  receiptDate: string | null;
  sourceReceiptKey: string;
}

const encodeCursor = (payload: KeysetCursor) =>
  Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');

const parseCursor = (cursor?: string | null): KeysetCursor | null => {
  if (!cursor) return null;
  try {
    return JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as KeysetCursor;
  } catch {
    return null;
  }
};

const toIso = (value: Date | null | undefined) => (value ? value.toISOString() : undefined);

const buildReceipt = (args: {
  receiptRow: typeof receipts.$inferSelect;
  lineItems: (typeof receiptLineItems.$inferSelect)[];
  lineModifiers: (typeof receiptLineModifiers.$inferSelect)[];
  lineDiscounts: (typeof receiptLineDiscounts.$inferSelect)[];
  lineTaxes: (typeof receiptLineTaxes.$inferSelect)[];
  discounts: (typeof receiptDiscounts.$inferSelect)[];
  taxes: (typeof receiptTaxes.$inferSelect)[];
  payments: (typeof receiptPayments.$inferSelect)[];
}): LoyverseReceipt => {
  const { receiptRow } = args;
  const modifiersByLine = new Map<number, typeof args.lineModifiers>();
  for (const row of args.lineModifiers) {
    const list = modifiersByLine.get(row.lineIndex) ?? [];
    list.push(row);
    modifiersByLine.set(row.lineIndex, list);
  }
  const discountsByLine = new Map<number, typeof args.lineDiscounts>();
  for (const row of args.lineDiscounts) {
    const list = discountsByLine.get(row.lineIndex) ?? [];
    list.push(row);
    discountsByLine.set(row.lineIndex, list);
  }
  const taxesByLine = new Map<number, typeof args.lineTaxes>();
  for (const row of args.lineTaxes) {
    const list = taxesByLine.get(row.lineIndex) ?? [];
    list.push(row);
    taxesByLine.set(row.lineIndex, list);
  }

  return {
    receipt_number: receiptRow.receiptNumber,
    note: receiptRow.note ?? undefined,
    receipt_type: (receiptRow.receiptType as 'SALE' | 'REFUND' | null) ?? undefined,
    refund_for: receiptRow.refundFor ?? undefined,
    order: receiptRow.order ?? undefined,
    created_at: toIso(receiptRow.createdAt),
    receipt_date: toIso(receiptRow.receiptDate),
    updated_at: toIso(receiptRow.updatedFromEventAt),
    cancelled_at: toIso(receiptRow.cancelledAt),
    source: receiptRow.source ?? undefined,
    total_money: receiptRow.totalMoney ?? undefined,
    total_tax: receiptRow.totalTax ?? undefined,
    total_discount: receiptRow.totalDiscount ?? undefined,
    tip: receiptRow.tip ?? undefined,
    surcharge: receiptRow.surcharge ?? undefined,
    points_earned: receiptRow.pointsEarned ?? undefined,
    points_deducted: receiptRow.pointsDeducted ?? undefined,
    points_balance: receiptRow.pointsBalance ?? undefined,
    customer_id: receiptRow.customerId ?? undefined,
    employee_id: receiptRow.employeeId ?? undefined,
    store_id: receiptRow.storeId ?? undefined,
    pos_device_id: receiptRow.posDeviceId ?? undefined,
    dining_option: receiptRow.diningOption ?? undefined,
    total_discounts: args.discounts
      .sort((a, b) => a.discountIndex - b.discountIndex)
      .map((d) => ({
        id: d.discountId ?? undefined,
        type: d.type ?? undefined,
        name: d.name ?? undefined,
        percentage: d.percentage ?? undefined,
        money_amount: d.moneyAmount ?? undefined
      })),
    total_taxes: args.taxes
      .sort((a, b) => a.taxIndex - b.taxIndex)
      .map((t) => ({
        id: t.taxId ?? undefined,
        type: t.type ?? undefined,
        name: t.name ?? undefined,
        rate: t.rate ?? undefined,
        money_amount: t.moneyAmount ?? undefined
      })),
    line_items: args.lineItems
      .sort((a, b) => a.lineIndex - b.lineIndex)
      .map((line) => ({
        item_id: line.itemId ?? undefined,
        variant_id: line.variantId ?? undefined,
        item_name: line.itemName ?? undefined,
        variant_name: line.variantName ?? undefined,
        sku: line.sku ?? undefined,
        quantity: line.quantity ?? undefined,
        price: line.price ?? undefined,
        gross_total_money: line.grossTotalMoney ?? undefined,
        total_money: line.totalMoney ?? undefined,
        cost: line.cost ?? undefined,
        cost_total: line.costTotal ?? undefined,
        line_note: line.lineNote ?? undefined,
        total_discount: line.totalDiscount ?? undefined,
        line_modifiers: (modifiersByLine.get(line.lineIndex) ?? [])
          .sort((a, b) => a.modifierIndex - b.modifierIndex)
          .map((m) => ({
            id: m.modifierId ?? undefined,
            modifier_option_id: m.modifierOptionId ?? undefined,
            name: m.name ?? undefined,
            option: m.option ?? undefined,
            price: m.price ?? undefined,
            money_amount: m.moneyAmount ?? undefined
          })),
        line_discounts: (discountsByLine.get(line.lineIndex) ?? [])
          .sort((a, b) => a.discountIndex - b.discountIndex)
          .map((d) => ({
            id: d.discountId ?? undefined,
            type: d.type ?? undefined,
            name: d.name ?? undefined,
            percentage: d.percentage ?? undefined,
            money_amount: d.moneyAmount ?? undefined
          })),
        line_taxes: (taxesByLine.get(line.lineIndex) ?? [])
          .sort((a, b) => a.taxIndex - b.taxIndex)
          .map((t) => ({
            id: t.taxId ?? undefined,
            type: t.type ?? undefined,
            name: t.name ?? undefined,
            rate: t.rate ?? undefined,
            money_amount: t.moneyAmount ?? undefined
          }))
      })),
    payments: args.payments
      .sort((a, b) => a.paymentIndex - b.paymentIndex)
      .map((p) => ({
        payment_type_id: p.paymentTypeId ?? undefined,
        name: p.name ?? undefined,
        type: p.type ?? undefined,
        money_amount: p.moneyAmount ?? undefined,
        paid_at: toIso(p.paidAt),
        payment_details: (p.paymentDetails as Record<string, unknown> | null) ?? undefined
      }))
  };
};

export const queryBackfillReceiptPage = async (
  db: MirrorDatabase,
  input: {
    dateFrom?: string;
    dateTo?: string;
    receiptNumber?: string;
    merchantId?: string;
    limit?: number;
    cursor?: string | null;
    transferStatuses?: string[];
    failedOnly?: boolean;
    ambiguousOnly?: boolean;
    selectedOnly?: boolean;
  }
): Promise<{ rows: BackfillReceiptRow[]; cursor: string | null; hasMore: boolean }> => {
  const pageSize = Math.min(Math.max(input.limit ?? 25, 1), 100);
  const filters: SQL[] = [];

  if (input.receiptNumber) {
    filters.push(eq(receipts.receiptNumber, input.receiptNumber));
  }
  if (input.merchantId) {
    filters.push(eq(receipts.merchantId, input.merchantId));
  }
  if (input.dateFrom) {
    filters.push(gte(receipts.receiptDate, new Date(input.dateFrom)));
  }
  if (input.dateTo) {
    filters.push(lte(receipts.receiptDate, new Date(input.dateTo)));
  }

  const cursorPayload = parseCursor(input.cursor);
  if (cursorPayload) {
    if (cursorPayload.receiptDate) {
      filters.push(
        or(
          gt(receipts.receiptDate, new Date(cursorPayload.receiptDate)),
          and(
            eq(receipts.receiptDate, new Date(cursorPayload.receiptDate)),
            gt(receipts.receiptKey, cursorPayload.sourceReceiptKey)
          )
        )!
      );
    } else {
      filters.push(
        or(
          isNull(receipts.receiptDate),
          and(isNull(receipts.receiptDate), gt(receipts.receiptKey, cursorPayload.sourceReceiptKey))
        )!
      );
    }
  }

  const joinTransfer =
    input.failedOnly || input.ambiguousOnly || input.selectedOnly || (input.transferStatuses?.length ?? 0) > 0;

  const baseQuery = db
    .select({
      receipt: receipts,
      transferStatus: secondLoyverseReceiptTransfers.status,
      cohortSelected: secondLoyverseReceiptTransfers.cohortSelected
    })
    .from(receipts)
    .leftJoin(
      secondLoyverseReceiptTransfers,
      eq(secondLoyverseReceiptTransfers.sourceReceiptKey, receipts.receiptKey)
    )
    .orderBy(asc(receipts.receiptDate), asc(receipts.receiptKey))
    .limit(pageSize + 1);

  if (joinTransfer) {
    if (input.failedOnly) filters.push(eq(secondLoyverseReceiptTransfers.status, 'failed'));
    if (input.ambiguousOnly) filters.push(eq(secondLoyverseReceiptTransfers.status, 'ambiguous'));
    if (input.selectedOnly) filters.push(eq(secondLoyverseReceiptTransfers.cohortSelected, true));
    if (input.transferStatuses?.length) {
      filters.push(inArray(secondLoyverseReceiptTransfers.status, input.transferStatuses));
    }
  }

  const selected = await (filters.length ? baseQuery.where(and(...filters)) : baseQuery);
  const page = selected.slice(0, pageSize);
  const hasMore = selected.length > pageSize;

  if (!page.length) {
    return { rows: [], cursor: null, hasMore: false };
  }

  const keys = page.map((row) => row.receipt.receiptKey);
  const [lineItems, lineModifiers, lineDiscounts, lineTaxes, discounts, taxes, payments] = await Promise.all([
    db.select().from(receiptLineItems).where(inArray(receiptLineItems.receiptKey, keys)),
    db.select().from(receiptLineModifiers).where(inArray(receiptLineModifiers.receiptKey, keys)),
    db.select().from(receiptLineDiscounts).where(inArray(receiptLineDiscounts.receiptKey, keys)),
    db.select().from(receiptLineTaxes).where(inArray(receiptLineTaxes.receiptKey, keys)),
    db.select().from(receiptDiscounts).where(inArray(receiptDiscounts.receiptKey, keys)),
    db.select().from(receiptTaxes).where(inArray(receiptTaxes.receiptKey, keys)),
    db.select().from(receiptPayments).where(inArray(receiptPayments.receiptKey, keys))
  ]);

  const groupByKey = <T extends { receiptKey: string }>(rows: T[]) => {
    const map = new Map<string, T[]>();
    for (const row of rows) {
      const list = map.get(row.receiptKey) ?? [];
      list.push(row);
      map.set(row.receiptKey, list);
    }
    return map;
  };

  const lineItemsByKey = groupByKey(lineItems);
  const lineModifiersByKey = groupByKey(lineModifiers);
  const lineDiscountsByKey = groupByKey(lineDiscounts);
  const lineTaxesByKey = groupByKey(lineTaxes);
  const discountsByKey = groupByKey(discounts);
  const taxesByKey = groupByKey(taxes);
  const paymentsByKey = groupByKey(payments);

  const rows: BackfillReceiptRow[] = page.map((entry) => {
    const receiptRow = entry.receipt;
    const receipt = buildReceipt({
      receiptRow,
      lineItems: lineItemsByKey.get(receiptRow.receiptKey) ?? [],
      lineModifiers: lineModifiersByKey.get(receiptRow.receiptKey) ?? [],
      lineDiscounts: lineDiscountsByKey.get(receiptRow.receiptKey) ?? [],
      lineTaxes: lineTaxesByKey.get(receiptRow.receiptKey) ?? [],
      discounts: discountsByKey.get(receiptRow.receiptKey) ?? [],
      taxes: taxesByKey.get(receiptRow.receiptKey) ?? [],
      payments: paymentsByKey.get(receiptRow.receiptKey) ?? []
    });
    return {
      sourceReceiptKey: receiptRow.receiptKey,
      merchantId: receiptRow.merchantId,
      receiptNumber: receiptRow.receiptNumber,
      receiptDate: toIso(receiptRow.receiptDate) ?? null,
      receipt,
      transferStatus: entry.transferStatus
    };
  });

  const last = rows[rows.length - 1];
  return {
    rows,
    cursor: hasMore
      ? encodeCursor({ receiptDate: last.receiptDate, sourceReceiptKey: last.sourceReceiptKey })
      : null,
    hasMore
  };
};

export const countTransfersByStatus = async (db: MirrorDatabase) => {
  const rows = await db
    .select({
      status: secondLoyverseReceiptTransfers.status,
      count: sql<number>`count(*)::int`
    })
    .from(secondLoyverseReceiptTransfers)
    .groupBy(secondLoyverseReceiptTransfers.status);
  return Object.fromEntries(rows.map((row) => [row.status, row.count]));
};
