import {
  bigint,
  boolean,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex
} from 'drizzle-orm/pg-core';

export const webhookEvents = pgTable(
  'webhook_events',
  {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    receivedAt: timestamp('received_at', { withTimezone: true }).notNull().defaultNow(),
    merchantId: text('merchant_id').notNull(),
    eventType: text('event_type').notNull(),
    eventCreatedAt: timestamp('event_created_at', { withTimezone: true }).notNull(),
    dedupeKey: text('dedupe_key').notNull(),
    payload: jsonb('payload').notNull(),
    processed: boolean('processed').notNull().default(false),
    processedAt: timestamp('processed_at', { withTimezone: true }),
    errorMessage: text('error_message')
  },
  (table) => [
    uniqueIndex('webhook_events_dedupe_key_uidx').on(table.dedupeKey),
    index('webhook_events_merchant_event_created_idx').on(table.merchantId, table.eventCreatedAt)
  ]
);

export const reportedErrors = pgTable(
  'reported_errors',
  {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    source: text('source').notNull(),
    code: text('code').notNull(),
    severity: text('severity').notNull(),
    message: text('message').notNull(),
    merchantId: text('merchant_id'),
    receiptKey: text('receipt_key'),
    webhookEventId: bigint('webhook_event_id', { mode: 'number' }),
    context: jsonb('context'),
    payload: jsonb('payload'),
    errorName: text('error_name'),
    errorMessage: text('error_message'),
    errorStack: text('error_stack'),
    notified: boolean('notified').notNull().default(false),
    notifiedAt: timestamp('notified_at', { withTimezone: true }),
    notifyError: text('notify_error')
  },
  (table) => [
    index('reported_errors_created_idx').on(table.createdAt),
    index('reported_errors_source_created_idx').on(table.source, table.createdAt),
    index('reported_errors_code_idx').on(table.code),
    index('reported_errors_merchant_created_idx').on(table.merchantId, table.createdAt),
    index('reported_errors_receipt_key_idx').on(table.receiptKey)
  ]
);

export const receipts = pgTable(
  'receipts',
  {
    receiptKey: text('receipt_key').primaryKey(),
    merchantId: text('merchant_id').notNull(),
    receiptNumber: text('receipt_number').notNull(),
    receiptType: text('receipt_type'),
    source: text('source'),
    note: text('note'),
    order: text('order'),
    refundFor: text('refund_for'),
    customerId: text('customer_id'),
    employeeId: text('employee_id'),
    storeId: text('store_id'),
    posDeviceId: text('pos_device_id'),
    diningOption: text('dining_option'),
    createdAt: timestamp('created_at', { withTimezone: true }),
    receiptDate: timestamp('receipt_date', { withTimezone: true }),
    cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
    totalMoney: doublePrecision('total_money'),
    totalTax: doublePrecision('total_tax'),
    totalDiscount: doublePrecision('total_discount'),
    tip: doublePrecision('tip'),
    surcharge: doublePrecision('surcharge'),
    pointsEarned: doublePrecision('points_earned'),
    pointsDeducted: doublePrecision('points_deducted'),
    pointsBalance: doublePrecision('points_balance'),
    updatedFromEventAt: timestamp('updated_from_event_at', { withTimezone: true }).notNull(),
    syncedAt: timestamp('synced_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    uniqueIndex('receipts_merchant_receipt_uidx').on(table.merchantId, table.receiptNumber),
    index('receipts_receipt_date_idx').on(table.receiptDate),
    index('receipts_created_at_idx').on(table.createdAt),
    index('receipts_store_created_at_idx').on(table.storeId, table.createdAt),
    index('receipts_updated_receipt_key_idx').on(table.updatedFromEventAt, table.receiptKey),
    index('receipts_store_id_idx').on(table.storeId)
  ]
);

export const receiptLineItems = pgTable(
  'receipt_line_items',
  {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    receiptKey: text('receipt_key').notNull(),
    lineIndex: integer('line_index').notNull(),
    itemId: text('item_id'),
    variantId: text('variant_id'),
    itemName: text('item_name'),
    variantName: text('variant_name'),
    sku: text('sku'),
    quantity: doublePrecision('quantity'),
    price: doublePrecision('price'),
    grossTotalMoney: doublePrecision('gross_total_money'),
    totalMoney: doublePrecision('total_money'),
    cost: doublePrecision('cost'),
    costTotal: doublePrecision('cost_total'),
    lineNote: text('line_note'),
    totalDiscount: doublePrecision('total_discount')
  },
  (table) => [
    uniqueIndex('receipt_line_items_receipt_line_uidx').on(table.receiptKey, table.lineIndex),
    index('receipt_line_items_item_id_idx').on(table.itemId)
  ]
);

export const receiptLineModifiers = pgTable(
  'receipt_line_modifiers',
  {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    receiptKey: text('receipt_key').notNull(),
    lineIndex: integer('line_index').notNull(),
    modifierIndex: integer('modifier_index').notNull(),
    modifierId: text('modifier_id'),
    modifierOptionId: text('modifier_option_id'),
    name: text('name'),
    option: text('option'),
    price: doublePrecision('price'),
    moneyAmount: doublePrecision('money_amount')
  },
  (table) => [
    uniqueIndex('receipt_line_modifiers_receipt_line_modifier_uidx').on(
      table.receiptKey,
      table.lineIndex,
      table.modifierIndex
    )
  ]
);

export const receiptDiscounts = pgTable(
  'receipt_discounts',
  {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    receiptKey: text('receipt_key').notNull(),
    discountIndex: integer('discount_index').notNull(),
    discountId: text('discount_id'),
    type: text('type'),
    name: text('name'),
    percentage: doublePrecision('percentage'),
    moneyAmount: doublePrecision('money_amount')
  },
  (table) => [uniqueIndex('receipt_discounts_receipt_idx_uidx').on(table.receiptKey, table.discountIndex)]
);

export const receiptLineDiscounts = pgTable(
  'receipt_line_discounts',
  {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    receiptKey: text('receipt_key').notNull(),
    lineIndex: integer('line_index').notNull(),
    discountIndex: integer('discount_index').notNull(),
    discountId: text('discount_id'),
    type: text('type'),
    name: text('name'),
    percentage: doublePrecision('percentage'),
    moneyAmount: doublePrecision('money_amount')
  },
  (table) => [
    uniqueIndex('receipt_line_discounts_receipt_line_discount_uidx').on(
      table.receiptKey,
      table.lineIndex,
      table.discountIndex
    )
  ]
);

export const receiptTaxes = pgTable(
  'receipt_taxes',
  {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    receiptKey: text('receipt_key').notNull(),
    taxIndex: integer('tax_index').notNull(),
    taxId: text('tax_id'),
    type: text('type'),
    name: text('name'),
    rate: doublePrecision('rate'),
    moneyAmount: doublePrecision('money_amount')
  },
  (table) => [uniqueIndex('receipt_taxes_receipt_tax_uidx').on(table.receiptKey, table.taxIndex)]
);

export const receiptLineTaxes = pgTable(
  'receipt_line_taxes',
  {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    receiptKey: text('receipt_key').notNull(),
    lineIndex: integer('line_index').notNull(),
    taxIndex: integer('tax_index').notNull(),
    taxId: text('tax_id'),
    type: text('type'),
    name: text('name'),
    rate: doublePrecision('rate'),
    moneyAmount: doublePrecision('money_amount')
  },
  (table) => [
    uniqueIndex('receipt_line_taxes_receipt_line_tax_uidx').on(
      table.receiptKey,
      table.lineIndex,
      table.taxIndex
    )
  ]
);

export const receiptPayments = pgTable(
  'receipt_payments',
  {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    receiptKey: text('receipt_key').notNull(),
    paymentIndex: integer('payment_index').notNull(),
    paymentTypeId: text('payment_type_id'),
    name: text('name'),
    type: text('type'),
    moneyAmount: doublePrecision('money_amount'),
    paidAt: timestamp('paid_at', { withTimezone: true }),
    paymentDetails: jsonb('payment_details')
  },
  (table) => [
    uniqueIndex('receipt_payments_receipt_payment_uidx').on(table.receiptKey, table.paymentIndex),
    index('receipt_payments_type_idx').on(table.type)
  ]
);
