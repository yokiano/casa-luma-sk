import { Buffer } from 'node:buffer';
import { and, desc, eq, gte, inArray, lt, lte, or, type SQL } from 'drizzle-orm';
import type { LoyverseReceipt } from '$lib/receipts/types';
import { db } from './client';
import {
  receiptDiscounts,
  receiptLineDiscounts,
  receiptLineItems,
  receiptLineModifiers,
  receiptLineTaxes,
  receiptPayments,
  receipts,
  receiptTaxes
} from './schema';

const MAX_LIMIT = 250;

interface ReceiptDbQueryInput {
  dateFrom?: string;
  dateTo?: string;
  storeId?: string;
  limit?: number;
  cursor?: string;
}

interface CursorPayload {
  updatedAt: string;
  receiptKey: string;
}

const toDate = (value?: string): Date | null => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const toIsoString = (value: Date | null) => {
  if (!value) return undefined;
  return value.toISOString();
};

const serializeQueryError = (error: unknown, depth = 0): unknown => {
  if (depth > 4) return '[max-depth]';

  if (error instanceof Error) {
    const maybePostgresError = error as Error & {
      code?: unknown;
      detail?: unknown;
      hint?: unknown;
      severity?: unknown;
      cause?: unknown;
    };

    return {
      name: error.name,
      message: error.message,
      code: maybePostgresError.code,
      severity: maybePostgresError.severity,
      detail: maybePostgresError.detail,
      hint: maybePostgresError.hint,
      cause: maybePostgresError.cause ? serializeQueryError(maybePostgresError.cause, depth + 1) : undefined
    };
  }

  return error;
};

const parseCursor = (cursor?: string): CursorPayload | null => {
  if (!cursor) return null;
  try {
    const payload = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as CursorPayload;
    if (!payload.updatedAt || !payload.receiptKey) return null;
    const parsedDate = new Date(payload.updatedAt);
    if (Number.isNaN(parsedDate.getTime())) return null;
    return payload;
  } catch {
    return null;
  }
};

const encodeCursor = (payload: CursorPayload) => {
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
};

const buildReceiptShape = (args: {
  receiptRow: (typeof receipts.$inferSelect);
  lineItems: (typeof receiptLineItems.$inferSelect)[];
  lineModifiersByLine: Map<number, (typeof receiptLineModifiers.$inferSelect)[]>;
  lineDiscountsByLine: Map<number, (typeof receiptLineDiscounts.$inferSelect)[]>;
  lineTaxesByLine: Map<number, (typeof receiptLineTaxes.$inferSelect)[]>;
  discounts: (typeof receiptDiscounts.$inferSelect)[];
  taxes: (typeof receiptTaxes.$inferSelect)[];
  payments: (typeof receiptPayments.$inferSelect)[];
}): LoyverseReceipt => {
  const {
    receiptRow,
    lineItems,
    lineModifiersByLine,
    lineDiscountsByLine,
    lineTaxesByLine,
    discounts,
    taxes,
    payments
  } = args;

  return {
    receipt_number: receiptRow.receiptNumber,
    note: receiptRow.note ?? undefined,
    receipt_type: (receiptRow.receiptType as 'SALE' | 'REFUND' | null) ?? undefined,
    refund_for: receiptRow.refundFor ?? undefined,
    order: receiptRow.order ?? undefined,
    created_at: toIsoString(receiptRow.createdAt),
    receipt_date: toIsoString(receiptRow.receiptDate),
    updated_at: toIsoString(receiptRow.updatedFromEventAt),
    cancelled_at: toIsoString(receiptRow.cancelledAt),
    source: receiptRow.source ?? undefined,
    total_money: receiptRow.totalMoney ?? undefined,
    total_tax: receiptRow.totalTax ?? undefined,
    points_earned: receiptRow.pointsEarned ?? undefined,
    points_deducted: receiptRow.pointsDeducted ?? undefined,
    points_balance: receiptRow.pointsBalance ?? undefined,
    customer_id: receiptRow.customerId ?? undefined,
    total_discount: receiptRow.totalDiscount ?? undefined,
    employee_id: receiptRow.employeeId ?? undefined,
    store_id: receiptRow.storeId ?? undefined,
    pos_device_id: receiptRow.posDeviceId ?? undefined,
    dining_option: receiptRow.diningOption ?? undefined,
    tip: receiptRow.tip ?? undefined,
    surcharge: receiptRow.surcharge ?? undefined,
    total_discounts: discounts
      .sort((a, b) => a.discountIndex - b.discountIndex)
      .map((discount) => ({
        id: discount.discountId ?? undefined,
        type: discount.type ?? undefined,
        name: discount.name ?? undefined,
        percentage: discount.percentage ?? undefined,
        money_amount: discount.moneyAmount ?? undefined
      })),
    total_taxes: taxes.sort((a, b) => a.taxIndex - b.taxIndex).map((tax) => ({
      id: tax.taxId ?? undefined,
      type: tax.type ?? undefined,
      name: tax.name ?? undefined,
      rate: tax.rate ?? undefined,
      money_amount: tax.moneyAmount ?? undefined
    })),
    line_items: lineItems.sort((a, b) => a.lineIndex - b.lineIndex).map((line) => ({
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
      line_modifiers: (lineModifiersByLine.get(line.lineIndex) ?? [])
        .sort((a, b) => a.modifierIndex - b.modifierIndex)
        .map((modifier) => ({
          id: modifier.modifierId ?? undefined,
          modifier_option_id: modifier.modifierOptionId ?? undefined,
          name: modifier.name ?? undefined,
          option: modifier.option ?? undefined,
          price: modifier.price ?? undefined,
          money_amount: modifier.moneyAmount ?? undefined
        })),
      line_discounts: (lineDiscountsByLine.get(line.lineIndex) ?? [])
        .sort((a, b) => a.discountIndex - b.discountIndex)
        .map((discount) => ({
          id: discount.discountId ?? undefined,
          type: discount.type ?? undefined,
          name: discount.name ?? undefined,
          percentage: discount.percentage ?? undefined,
          money_amount: discount.moneyAmount ?? undefined
        })),
      line_taxes: (lineTaxesByLine.get(line.lineIndex) ?? [])
        .sort((a, b) => a.taxIndex - b.taxIndex)
        .map((tax) => ({
          id: tax.taxId ?? undefined,
          type: tax.type ?? undefined,
          name: tax.name ?? undefined,
          rate: tax.rate ?? undefined,
          money_amount: tax.moneyAmount ?? undefined
        }))
    })),
    payments: payments.sort((a, b) => a.paymentIndex - b.paymentIndex).map((payment) => ({
      payment_type_id: payment.paymentTypeId ?? undefined,
      name: payment.name ?? undefined,
      type: payment.type ?? undefined,
      money_amount: payment.moneyAmount ?? undefined,
      paid_at: toIsoString(payment.paidAt),
      payment_details: (payment.paymentDetails as Record<string, unknown> | null) ?? undefined
    }))
  };
};

export const queryReceiptsFromDb = async ({
  dateFrom,
  dateTo,
  storeId,
  limit,
  cursor
}: ReceiptDbQueryInput): Promise<{ receipts: LoyverseReceipt[]; cursor: string | null; hasMore: boolean }> => {
  const pageSize = Math.min(Math.max(limit ?? 50, 1), MAX_LIMIT);
  const filters: SQL[] = [];

  const dateFromValue = toDate(dateFrom);
  if (dateFromValue) {
    filters.push(gte(receipts.createdAt, dateFromValue));
  }

  const dateToValue = toDate(dateTo);
  if (dateToValue) {
    filters.push(lte(receipts.createdAt, dateToValue));
  }

  if (storeId) {
    filters.push(eq(receipts.storeId, storeId));
  }

  const cursorPayload = parseCursor(cursor);
  if (cursorPayload) {
    const cursorDate = new Date(cursorPayload.updatedAt);
    filters.push(
      or(
        lt(receipts.updatedFromEventAt, cursorDate),
        and(eq(receipts.updatedFromEventAt, cursorDate), lt(receipts.receiptKey, cursorPayload.receiptKey))
      ) as SQL
    );
  }

  const whereClause = filters.length ? and(...filters) : undefined;

  let rows: (typeof receipts.$inferSelect)[];

  try {
    rows = await db
      .select()
      .from(receipts)
      .where(whereClause)
      .orderBy(desc(receipts.updatedFromEventAt), desc(receipts.receiptKey))
      .limit(pageSize + 1);
  } catch (error) {
    console.error('[receipts] failed to query receipts', {
      dateFrom,
      dateTo,
      storeId: storeId ?? null,
      limit: pageSize,
      cursorPresent: Boolean(cursor),
      error: serializeQueryError(error)
    });

    throw new Error('Receipt database query failed. Check the server logs for the underlying Postgres connection/query error.', {
      cause: error
    });
  }

  const hasMore = rows.length > pageSize;
  const selectedRows = hasMore ? rows.slice(0, pageSize) : rows;
  const receiptKeys = selectedRows.map((row) => row.receiptKey);

  if (!receiptKeys.length) {
    return { receipts: [], cursor: null, hasMore: false };
  }

  const [lineItems, lineModifiers, lineDiscountRows, lineTaxRows, discountRows, taxRows, paymentRows] =
    await Promise.all([
      db.select().from(receiptLineItems).where(inArray(receiptLineItems.receiptKey, receiptKeys)),
      db.select().from(receiptLineModifiers).where(inArray(receiptLineModifiers.receiptKey, receiptKeys)),
      db.select().from(receiptLineDiscounts).where(inArray(receiptLineDiscounts.receiptKey, receiptKeys)),
      db.select().from(receiptLineTaxes).where(inArray(receiptLineTaxes.receiptKey, receiptKeys)),
      db.select().from(receiptDiscounts).where(inArray(receiptDiscounts.receiptKey, receiptKeys)),
      db.select().from(receiptTaxes).where(inArray(receiptTaxes.receiptKey, receiptKeys)),
      db.select().from(receiptPayments).where(inArray(receiptPayments.receiptKey, receiptKeys))
    ]);

  const lineItemsByReceipt = new Map<string, typeof lineItems>();
  for (const row of lineItems) {
    const list = lineItemsByReceipt.get(row.receiptKey) ?? [];
    list.push(row);
    lineItemsByReceipt.set(row.receiptKey, list);
  }

  const lineModifiersByReceiptLine = new Map<string, (typeof lineModifiers)[number][]>();
  for (const row of lineModifiers) {
    const key = `${row.receiptKey}:${row.lineIndex}`;
    const list = lineModifiersByReceiptLine.get(key) ?? [];
    list.push(row);
    lineModifiersByReceiptLine.set(key, list);
  }

  const lineDiscountsByReceiptLine = new Map<string, (typeof lineDiscountRows)[number][]>();
  for (const row of lineDiscountRows) {
    const key = `${row.receiptKey}:${row.lineIndex}`;
    const list = lineDiscountsByReceiptLine.get(key) ?? [];
    list.push(row);
    lineDiscountsByReceiptLine.set(key, list);
  }

  const lineTaxesByReceiptLine = new Map<string, (typeof lineTaxRows)[number][]>();
  for (const row of lineTaxRows) {
    const key = `${row.receiptKey}:${row.lineIndex}`;
    const list = lineTaxesByReceiptLine.get(key) ?? [];
    list.push(row);
    lineTaxesByReceiptLine.set(key, list);
  }

  const discountsByReceipt = new Map<string, typeof discountRows>();
  for (const row of discountRows) {
    const list = discountsByReceipt.get(row.receiptKey) ?? [];
    list.push(row);
    discountsByReceipt.set(row.receiptKey, list);
  }

  const taxesByReceipt = new Map<string, typeof taxRows>();
  for (const row of taxRows) {
    const list = taxesByReceipt.get(row.receiptKey) ?? [];
    list.push(row);
    taxesByReceipt.set(row.receiptKey, list);
  }

  const paymentsByReceipt = new Map<string, typeof paymentRows>();
  for (const row of paymentRows) {
    const list = paymentsByReceipt.get(row.receiptKey) ?? [];
    list.push(row);
    paymentsByReceipt.set(row.receiptKey, list);
  }

  const shapedReceipts = selectedRows.map((receiptRow) => {
    const rowLineItems = lineItemsByReceipt.get(receiptRow.receiptKey) ?? [];

    const lineModifiersByLine = new Map<number, (typeof lineModifiers)[number][]>();
    const lineDiscountsByLine = new Map<number, (typeof lineDiscountRows)[number][]>();
    const lineTaxesByLine = new Map<number, (typeof lineTaxRows)[number][]>();

    for (const lineItem of rowLineItems) {
      lineModifiersByLine.set(
        lineItem.lineIndex,
        lineModifiersByReceiptLine.get(`${receiptRow.receiptKey}:${lineItem.lineIndex}`) ?? []
      );
      lineDiscountsByLine.set(
        lineItem.lineIndex,
        lineDiscountsByReceiptLine.get(`${receiptRow.receiptKey}:${lineItem.lineIndex}`) ?? []
      );
      lineTaxesByLine.set(
        lineItem.lineIndex,
        lineTaxesByReceiptLine.get(`${receiptRow.receiptKey}:${lineItem.lineIndex}`) ?? []
      );
    }

    return buildReceiptShape({
      receiptRow,
      lineItems: rowLineItems,
      lineModifiersByLine,
      lineDiscountsByLine,
      lineTaxesByLine,
      discounts: discountsByReceipt.get(receiptRow.receiptKey) ?? [],
      taxes: taxesByReceipt.get(receiptRow.receiptKey) ?? [],
      payments: paymentsByReceipt.get(receiptRow.receiptKey) ?? []
    });
  });

  const nextCursor = hasMore
    ? encodeCursor({
        updatedAt: selectedRows[selectedRows.length - 1].updatedFromEventAt.toISOString(),
        receiptKey: selectedRows[selectedRows.length - 1].receiptKey
      })
    : null;

  return {
    receipts: shapedReceipts,
    cursor: nextCursor,
    hasMore
  };
};
