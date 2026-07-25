import { createHash } from 'node:crypto';
import { and, eq, isNull, lt, or } from 'drizzle-orm';
import type {
  LoyverseReceipt,
  LoyverseReceiptDiscount,
  LoyverseReceiptLineItem,
  LoyverseReceiptPayment,
  LoyverseReceiptTax
} from '$lib/receipts/types';
import {
  receiptDiscounts,
  receiptLineDiscounts,
  receiptLineItems,
  receiptLineModifiers,
  receiptLineTaxes,
  receiptPayments,
  receiptTaxes,
  receipts,
  webhookEvents
} from './schema';
import { formatSafeErrorSummary } from '$lib/server/errors/safe-error';

export interface LoyverseReceiptWebhookPayload {
  merchant_id: string;
  type: string;
  created_at: string;
  items: LoyverseReceipt;
}

export type ReceiptWebhookIngestionResult = {
  status: 'processed' | 'duplicate' | 'stale' | 'in_progress';
  receiptKey: string;
  eventId: number;
};

const CLAIM_TIMEOUT_MS = 10 * 60 * 1_000;

const toDate = (value?: string | null): Date | null => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const getReceiptKey = (merchantId: string, receiptNumber: string) => `${merchantId}:${receiptNumber}`;

export const createReceiptWebhookDedupeKey = (payload: LoyverseReceiptWebhookPayload) => {
  const base = [
    payload.merchant_id,
    payload.type,
    payload.created_at,
    payload.items.receipt_number,
    payload.items.updated_at ?? '',
    payload.items.total_money ?? ''
  ].join('|');

  return createHash('sha256').update(base).digest('hex');
};

const insertReceiptTaxes = async (
  executor: any,
  receiptKey: string,
  taxes: LoyverseReceiptTax[] | undefined
) => {
  if (!taxes?.length) return;
  await executor.insert(receiptTaxes).values(
    taxes.map((tax, taxIndex) => ({
      receiptKey,
      taxIndex,
      taxId: tax.id ?? null,
      type: tax.type ?? null,
      name: tax.name ?? null,
      rate: tax.rate ?? null,
      moneyAmount: tax.money_amount ?? null
    }))
  );
};

const insertReceiptDiscounts = async (
  executor: any,
  receiptKey: string,
  discounts: LoyverseReceiptDiscount[] | undefined
) => {
  if (!discounts?.length) return;
  await executor.insert(receiptDiscounts).values(
    discounts.map((discount, discountIndex) => ({
      receiptKey,
      discountIndex,
      discountId: discount.id ?? null,
      type: discount.type ?? null,
      name: discount.name ?? null,
      percentage: discount.percentage ?? null,
      moneyAmount: discount.money_amount ?? null
    }))
  );
};

const insertReceiptPayments = async (
  executor: any,
  receiptKey: string,
  payments: LoyverseReceiptPayment[] | undefined
) => {
  if (!payments?.length) return;
  await executor.insert(receiptPayments).values(
    payments.map((payment, paymentIndex) => ({
      receiptKey,
      paymentIndex,
      paymentTypeId: payment.payment_type_id ?? null,
      paidAt: toDate(payment.paid_at),
      name: payment.name ?? null,
      type: payment.type ?? null,
      moneyAmount: payment.money_amount ?? null,
      paymentDetails: payment.payment_details ?? null
    }))
  );
};

const insertReceiptLineData = async (
  executor: any,
  receiptKey: string,
  lineItems: LoyverseReceiptLineItem[] | undefined
) => {
  if (!lineItems?.length) return;

  await executor.insert(receiptLineItems).values(
    lineItems.map((lineItem, lineIndex) => ({
      receiptKey,
      lineIndex,
      itemId: lineItem.item_id ?? null,
      variantId: lineItem.variant_id ?? null,
      itemName: lineItem.item_name ?? null,
      variantName: lineItem.variant_name ?? null,
      sku: lineItem.sku ?? null,
      quantity: lineItem.quantity ?? null,
      price: lineItem.price ?? null,
      grossTotalMoney: lineItem.gross_total_money ?? null,
      totalMoney: lineItem.total_money ?? null,
      cost: lineItem.cost ?? null,
      costTotal: lineItem.cost_total ?? null,
      lineNote: lineItem.line_note ?? null,
      totalDiscount: lineItem.total_discount ?? null
    }))
  );

  const lineTaxes = lineItems.flatMap((lineItem, lineIndex) =>
    (lineItem.line_taxes ?? []).map((tax, taxIndex) => ({
      receiptKey,
      lineIndex,
      taxIndex,
      taxId: tax.id ?? null,
      type: tax.type ?? null,
      name: tax.name ?? null,
      rate: tax.rate ?? null,
      moneyAmount: tax.money_amount ?? null
    }))
  );

  if (lineTaxes.length) await executor.insert(receiptLineTaxes).values(lineTaxes);

  const lineDiscountRows = lineItems.flatMap((lineItem, lineIndex) =>
    (lineItem.line_discounts ?? []).map((discount, discountIndex) => ({
      receiptKey,
      lineIndex,
      discountIndex,
      discountId: discount.id ?? null,
      type: discount.type ?? null,
      name: discount.name ?? null,
      percentage: discount.percentage ?? null,
      moneyAmount: discount.money_amount ?? null
    }))
  );

  if (lineDiscountRows.length) await executor.insert(receiptLineDiscounts).values(lineDiscountRows);

  const lineModifierRows = lineItems.flatMap((lineItem, lineIndex) =>
    (lineItem.line_modifiers ?? []).map((modifier, modifierIndex) => ({
      receiptKey,
      lineIndex,
      modifierIndex,
      modifierId: modifier.id ?? null,
      modifierOptionId: modifier.modifier_option_id ?? null,
      name: modifier.name ?? null,
      option: modifier.option ?? null,
      price: modifier.price ?? null,
      moneyAmount: modifier.money_amount ?? null
    }))
  );

  if (lineModifierRows.length) await executor.insert(receiptLineModifiers).values(lineModifierRows);
};

type ExistingWebhookEvent = {
  id: number;
  processed: boolean;
  processingStartedAt: Date | null;
};

const findWebhookEvent = async (database: any, dedupeKey: string): Promise<ExistingWebhookEvent | null> => {
  const rows = await database
    .select({
      id: webhookEvents.id,
      processed: webhookEvents.processed,
      processingStartedAt: webhookEvents.processingStartedAt
    })
    .from(webhookEvents)
    .where(eq(webhookEvents.dedupeKey, dedupeKey))
    .limit(1);
  return rows[0] ?? null;
};

const claimWebhookEvent = async (database: any, id: number): Promise<boolean> => {
  const now = new Date();
  const staleClaimBefore = new Date(now.getTime() - CLAIM_TIMEOUT_MS);
  const claimed = await database
    .update(webhookEvents)
    .set({ processingStartedAt: now, errorMessage: null })
    .where(
      and(
        eq(webhookEvents.id, id),
        eq(webhookEvents.processed, false),
        or(isNull(webhookEvents.processingStartedAt), lt(webhookEvents.processingStartedAt, staleClaimBefore))
      )
    )
    .returning({ id: webhookEvents.id });
  return claimed.length > 0;
};

export const recordWebhookProcessingError = async (database: any, eventId: number, error: unknown) => {
  try {
    await database
      .update(webhookEvents)
      .set({
        processingStartedAt: null,
        errorMessage: formatSafeErrorSummary(error)
      })
      .where(eq(webhookEvents.id, eventId));
  } catch (updateError) {
    // Keep the original processing error as the caller's failure. The cleanup
    // update is diagnostic and must never mask a database or Notion failure.
    console.error('[receipt-webhook] failed to record processing error', formatSafeErrorSummary(updateError));
  }
};

const markWebhookEventProcessed = async (database: any, eventId: number) => {
  await database
    .update(webhookEvents)
    .set({ processed: true, processedAt: new Date(), processingStartedAt: null, errorMessage: null })
    .where(eq(webhookEvents.id, eventId));
};

export const ingestReceiptWebhookWithDb = async (
  database: any,
  payload: LoyverseReceiptWebhookPayload
): Promise<ReceiptWebhookIngestionResult> => {
  if (!payload?.merchant_id || !payload?.type || !payload?.created_at || !payload?.items?.receipt_number) {
    throw new Error('Missing required receipt webhook fields');
  }

  const dedupeKey = createReceiptWebhookDedupeKey(payload);
  const eventCreatedAt = toDate(payload.created_at);
  if (!eventCreatedAt) throw new Error('Invalid payload.created_at timestamp');

  const receipt = payload.items;
  const receiptKey = getReceiptKey(payload.merchant_id, receipt.receipt_number);
  let eventId: number | null = null;

  try {
    const insertedEvent = await database
      .insert(webhookEvents)
      .values({
        merchantId: payload.merchant_id,
        eventType: payload.type,
        eventCreatedAt,
        dedupeKey,
        payload,
        processingStartedAt: null
      })
      .onConflictDoNothing({ target: webhookEvents.dedupeKey })
      .returning({ id: webhookEvents.id });

    if (insertedEvent.length) {
      eventId = insertedEvent[0].id;
    } else {
      const existingEvent = await findWebhookEvent(database, dedupeKey);
      if (!existingEvent) {
        const retryable = new Error('Webhook event conflict could not be read back for retry.');
        (retryable as Error & { retryable?: boolean }).retryable = true;
        throw retryable;
      }

      if (existingEvent.processed) {
        return { status: 'duplicate', receiptKey, eventId: existingEvent.id };
      }

      eventId = existingEvent.id;
    }

    if (!eventId) {
      const retryable = new Error('Webhook event was not assigned an id and cannot be claimed.');
      (retryable as Error & { retryable?: boolean }).retryable = true;
      throw retryable;
    }

    if (!(await claimWebhookEvent(database, eventId))) {
      const currentEvent = await findWebhookEvent(database, dedupeKey);
      if (currentEvent?.processed) return { status: 'duplicate', receiptKey, eventId };
      return { status: 'in_progress', receiptKey, eventId };
    }

    const existing = await database.query.receipts.findFirst({
      where: and(eq(receipts.receiptKey, receiptKey), eq(receipts.merchantId, payload.merchant_id)),
      columns: { updatedFromEventAt: true }
    });

    if (existing?.updatedFromEventAt && existing.updatedFromEventAt > eventCreatedAt) {
      await markWebhookEventProcessed(database, eventId);
      return { status: 'stale', receiptKey, eventId };
    }

    await database.transaction(async (tx: any) => {
      await tx
        .insert(receipts)
        .values({
          receiptKey,
          merchantId: payload.merchant_id,
          receiptNumber: receipt.receipt_number,
          receiptType: receipt.receipt_type ?? null,
          source: receipt.source ?? null,
          note: receipt.note ?? null,
          order: receipt.order ?? null,
          refundFor: receipt.refund_for ?? null,
          customerId: receipt.customer_id ?? null,
          employeeId: receipt.employee_id ?? null,
          storeId: receipt.store_id ?? null,
          posDeviceId: receipt.pos_device_id ?? null,
          diningOption: receipt.dining_option ?? null,
          createdAt: toDate(receipt.created_at),
          receiptDate: toDate(receipt.receipt_date),
          cancelledAt: toDate(receipt.cancelled_at),
          totalMoney: receipt.total_money ?? null,
          totalTax: receipt.total_tax ?? null,
          totalDiscount: receipt.total_discount ?? null,
          tip: receipt.tip ?? null,
          surcharge: receipt.surcharge ?? null,
          pointsEarned: receipt.points_earned ?? null,
          pointsDeducted: receipt.points_deducted ?? null,
          pointsBalance: receipt.points_balance ?? null,
          updatedFromEventAt: eventCreatedAt,
          syncedAt: new Date()
        })
        .onConflictDoUpdate({
          target: receipts.receiptKey,
          set: {
            receiptType: receipt.receipt_type ?? null,
            source: receipt.source ?? null,
            note: receipt.note ?? null,
            order: receipt.order ?? null,
            refundFor: receipt.refund_for ?? null,
            customerId: receipt.customer_id ?? null,
            employeeId: receipt.employee_id ?? null,
            storeId: receipt.store_id ?? null,
            posDeviceId: receipt.pos_device_id ?? null,
            diningOption: receipt.dining_option ?? null,
            createdAt: toDate(receipt.created_at),
            receiptDate: toDate(receipt.receipt_date),
            cancelledAt: toDate(receipt.cancelled_at),
            totalMoney: receipt.total_money ?? null,
            totalTax: receipt.total_tax ?? null,
            totalDiscount: receipt.total_discount ?? null,
            tip: receipt.tip ?? null,
            surcharge: receipt.surcharge ?? null,
            pointsEarned: receipt.points_earned ?? null,
            pointsDeducted: receipt.points_deducted ?? null,
            pointsBalance: receipt.points_balance ?? null,
            updatedFromEventAt: eventCreatedAt,
            syncedAt: new Date()
          }
        });

      await tx.delete(receiptLineItems).where(eq(receiptLineItems.receiptKey, receiptKey));
      await tx.delete(receiptLineModifiers).where(eq(receiptLineModifiers.receiptKey, receiptKey));
      await tx.delete(receiptDiscounts).where(eq(receiptDiscounts.receiptKey, receiptKey));
      await tx.delete(receiptLineDiscounts).where(eq(receiptLineDiscounts.receiptKey, receiptKey));
      await tx.delete(receiptTaxes).where(eq(receiptTaxes.receiptKey, receiptKey));
      await tx.delete(receiptLineTaxes).where(eq(receiptLineTaxes.receiptKey, receiptKey));
      await tx.delete(receiptPayments).where(eq(receiptPayments.receiptKey, receiptKey));

      await insertReceiptTaxes(tx, receiptKey, receipt.total_taxes);
      await insertReceiptDiscounts(tx, receiptKey, receipt.total_discounts);
      await insertReceiptPayments(tx, receiptKey, receipt.payments);
      await insertReceiptLineData(tx, receiptKey, receipt.line_items);
    });

    await markWebhookEventProcessed(database, eventId);
    return { status: 'processed', receiptKey, eventId };
  } catch (error) {
    if (eventId !== null) await recordWebhookProcessingError(database, eventId, error);
    throw error;
  }
};
