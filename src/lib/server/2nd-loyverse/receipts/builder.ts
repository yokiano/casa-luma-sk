import type { LoyverseReceipt } from '$lib/receipts/types';
import type { CreateLoyverseReceiptPayload } from '$lib/server/loyverse-client';
import { buildTargetOrderMarker } from '../cohort';
import { SecondLoyverseError } from '../errors';
import type { SecondLoyverseClients } from '../clients';
import type { EntityInventories } from '../entities/inventory';
import { resolveDiscountBySourceIdOrName } from '../entities/discounts';
import { resolveOrCreateItemVariant } from '../entities/items';
import { resolveOrCreateModifierOption } from '../entities/modifiers';
import { resolvePaymentTypeByName } from '../entities/payment-types';
import { resolveTaxBySourceIdOrName } from '../entities/taxes';
import { SECOND_LOYVERSE_SOURCE, type ResolvedSaleMapping } from '../types';

const toUtcIso = (value?: string | null): string | undefined => {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new SecondLoyverseError({
      code: 'INVALID_PAYLOAD',
      stage: 'build_payload',
      message: `Invalid receipt_date: ${value}`
    });
  }
  return date.toISOString();
};

const appendMirrorNote = (sourceNote: string | null | undefined, sourceReceiptKey: string): string => {
  const marker = `[Mirrored from ${sourceReceiptKey}]`;
  const base = sourceNote?.trim() ?? '';
  if (!base) return marker;
  if (base.includes(marker)) return base;
  return `${base} ${marker}`;
};

/**
 * Build a writable target sale payload.
 *
 * Intentionally omits customer_id and employee_id: sandbox analytics excludes
 * customer identity and loyalty state. Never send source customer IDs.
 */
export const buildWritableSalePayload = async (args: {
  sourceReceiptKey: string;
  receipt: LoyverseReceipt;
  clients: SecondLoyverseClients;
  sourceInventory: EntityInventories;
  targetInventory: EntityInventories;
}): Promise<ResolvedSaleMapping> => {
  const fidelityNotes: string[] = [
    'customer_id omitted by design',
    'employee_id omitted by design',
    'tips/surcharges omitted (not writable on create)'
  ];

  if ((args.receipt.tip ?? 0) > 0 || (args.receipt.surcharge ?? 0) > 0) {
    fidelityNotes.push('source tip/surcharge ignored; target totals may differ');
  }

  const payments = args.receipt.payments ?? [];
  if (payments.length === 0) {
    throw new SecondLoyverseError({
      code: 'INVALID_PAYLOAD',
      stage: 'build_payload',
      message: 'Source receipt has no payments'
    });
  }
  if (payments.length > 1) {
    fidelityNotes.push('multiple source payments collapsed to first payment type (API allows one)');
  }

  const primaryPayment = payments[0];
  const targetPaymentType = resolvePaymentTypeByName(primaryPayment.name, args.targetInventory);

  const totalDiscounts: CreateLoyverseReceiptPayload['total_discounts'] = [];
  const discountIdBySourceKey = new Map<string, string>();

  for (const discount of args.receipt.total_discounts ?? []) {
    if (!discount.id && !discount.name) continue;
    if (discount.type === 'DISCOUNT_BY_POINTS') {
      throw new SecondLoyverseError({
        code: 'UNSUPPORTED_POINTS_DISCOUNT',
        stage: 'build_payload',
        message: `Points discount "${discount.name}" unsupported`,
        entityType: 'discount',
        entityName: discount.name
      });
    }

    const resolved = await resolveDiscountBySourceIdOrName({
      sourceDiscountId: discount.id,
      sourceDiscountName: discount.name,
      sourceDiscountType: discount.type,
      sourceDiscountPercent: discount.percentage,
      sourceDiscountAmount: discount.money_amount,
      sourceInventory: args.sourceInventory,
      targetInventory: args.targetInventory,
      targetClient: args.clients.target,
      targetStoreId: args.clients.config.storeId
    });

    const sourceKey = discount.id ?? discount.name ?? resolved.id;
    discountIdBySourceKey.set(sourceKey, resolved.id);

    const scope: 'RECEIPT' | 'LINE_ITEM' = 'RECEIPT';
    const entry: NonNullable<CreateLoyverseReceiptPayload['total_discounts']>[number] = {
      id: resolved.id,
      scope
    };

    if (resolved.type === 'VARIABLE_PERCENT' && discount.percentage != null) {
      entry.percentage = discount.percentage;
    }
    if (resolved.type === 'VARIABLE_AMOUNT' && discount.money_amount != null) {
      entry.money_amount = discount.money_amount;
    }

    totalDiscounts.push(entry);
  }

  // Promote line-only discounts into total_discounts with LINE_ITEM scope.
  for (const line of args.receipt.line_items ?? []) {
    for (const discount of line.line_discounts ?? []) {
      if (!discount.id && !discount.name) continue;
      if (discount.type === 'DISCOUNT_BY_POINTS') {
        throw new SecondLoyverseError({
          code: 'UNSUPPORTED_POINTS_DISCOUNT',
          stage: 'build_payload',
          message: `Points line discount "${discount.name}" unsupported`,
          entityType: 'discount',
          entityName: discount.name
        });
      }
      const sourceKey = discount.id ?? discount.name ?? '';
      if (discountIdBySourceKey.has(sourceKey)) continue;

      const resolved = await resolveDiscountBySourceIdOrName({
        sourceDiscountId: discount.id,
        sourceDiscountName: discount.name,
        sourceDiscountType: discount.type,
        sourceDiscountPercent: discount.percentage,
        sourceDiscountAmount: discount.money_amount,
        sourceInventory: args.sourceInventory,
        targetInventory: args.targetInventory,
        targetClient: args.clients.target,
        targetStoreId: args.clients.config.storeId
      });
      discountIdBySourceKey.set(sourceKey, resolved.id);
      const entry: NonNullable<CreateLoyverseReceiptPayload['total_discounts']>[number] = {
        id: resolved.id,
        scope: 'LINE_ITEM'
      };
      if (resolved.type === 'VARIABLE_PERCENT' && discount.percentage != null) {
        entry.percentage = discount.percentage;
      }
      if (resolved.type === 'VARIABLE_AMOUNT' && discount.money_amount != null) {
        entry.money_amount = discount.money_amount;
      }
      totalDiscounts.push(entry);
    }
  }

  const lineItems: CreateLoyverseReceiptPayload['line_items'] = [];

  for (const line of args.receipt.line_items ?? []) {
    if (!line.quantity || line.quantity === 0) {
      throw new SecondLoyverseError({
        code: 'INVALID_PAYLOAD',
        stage: 'build_payload',
        message: `Line item missing quantity for ${line.item_name ?? line.variant_id}`
      });
    }

    const { variant } = await resolveOrCreateItemVariant({
      sourceItemId: line.item_id,
      sourceVariantId: line.variant_id,
      itemName: line.item_name,
      variantName: line.variant_name,
      sku: line.sku,
      price: line.price,
      cost: line.cost,
      sourceInventory: args.sourceInventory,
      targetInventory: args.targetInventory,
      targetClient: args.clients.target,
      targetStoreId: args.clients.config.storeId
    });

    const lineTaxes: Array<{ id: string }> = [];
    for (const tax of line.line_taxes ?? []) {
      const resolved = await resolveTaxBySourceIdOrName({
        sourceTaxId: tax.id,
        sourceTaxName: tax.name,
        sourceInventory: args.sourceInventory,
        targetInventory: args.targetInventory,
        targetClient: args.clients.target,
        targetStoreId: args.clients.config.storeId
      });
      if (resolved) lineTaxes.push({ id: resolved.id });
    }

    const lineDiscounts: Array<{ id: string }> = [];
    for (const discount of line.line_discounts ?? []) {
      const sourceKey = discount.id ?? discount.name ?? '';
      let targetId = discountIdBySourceKey.get(sourceKey);
      if (!targetId) {
        const resolved = await resolveDiscountBySourceIdOrName({
          sourceDiscountId: discount.id,
          sourceDiscountName: discount.name,
          sourceDiscountType: discount.type,
          sourceDiscountPercent: discount.percentage,
          sourceDiscountAmount: discount.money_amount,
          sourceInventory: args.sourceInventory,
          targetInventory: args.targetInventory,
          targetClient: args.clients.target,
          targetStoreId: args.clients.config.storeId
        });
        targetId = resolved.id;
        discountIdBySourceKey.set(sourceKey, targetId);
      }
      lineDiscounts.push({ id: targetId });
    }

    const lineModifiers: Array<{ modifier_option_id: string; price?: number }> = [];
    for (const modifier of line.line_modifiers ?? []) {
      const resolved = await resolveOrCreateModifierOption({
        sourceModifierOptionId: modifier.modifier_option_id ?? modifier.id,
        sourceModifierName: modifier.name,
        sourceOptionName: modifier.option,
        sourceOptionPrice: modifier.price,
        sourceInventory: args.sourceInventory,
        targetInventory: args.targetInventory,
        targetClient: args.clients.target,
        targetStoreId: args.clients.config.storeId
      });
      lineModifiers.push({
        modifier_option_id: resolved.optionId,
        price: modifier.price
      });
    }

    lineItems.push({
      variant_id: variant.variant_id,
      quantity: line.quantity,
      price: line.price,
      cost: line.cost,
      line_note: line.line_note ?? undefined,
      line_taxes: lineTaxes.length ? lineTaxes : undefined,
      line_discounts: lineDiscounts.length ? lineDiscounts : undefined,
      line_modifiers: lineModifiers.length ? lineModifiers : undefined
    });
  }

  if (!lineItems.length) {
    throw new SecondLoyverseError({
      code: 'INVALID_PAYLOAD',
      stage: 'build_payload',
      message: 'Source receipt has no line items'
    });
  }

  const targetOrderMarker = buildTargetOrderMarker(args.sourceReceiptKey);
  const moneyAmount = primaryPayment.money_amount ?? args.receipt.total_money;
  if (moneyAmount == null) {
    throw new SecondLoyverseError({
      code: 'INVALID_PAYLOAD',
      stage: 'build_payload',
      message: 'Unable to determine payment money_amount'
    });
  }

  const payload: CreateLoyverseReceiptPayload = {
    store_id: args.clients.config.storeId,
    receipt_date: toUtcIso(args.receipt.receipt_date ?? args.receipt.created_at),
    source: SECOND_LOYVERSE_SOURCE,
    order: targetOrderMarker,
    note: appendMirrorNote(args.receipt.note, args.sourceReceiptKey),
    line_items: lineItems,
    payments: [
      {
        payment_type_id: targetPaymentType.id,
        money_amount: moneyAmount,
        paid_at: toUtcIso(primaryPayment.paid_at ?? args.receipt.receipt_date ?? args.receipt.created_at)
      }
    ],
    total_discounts: totalDiscounts.length ? totalDiscounts : undefined
  };

  return { payload, targetOrderMarker, fidelityNotes };
};
