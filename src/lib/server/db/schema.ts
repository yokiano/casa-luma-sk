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

/**
 * Email automations are operational intake records, deliberately separate from
 * reported_errors (which is reserved for application/validation incidents).
 */
export const emailEvents = pgTable(
  'email_events',
  {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    receivedAt: timestamp('received_at', { withTimezone: true }).notNull(),
    messageId: text('message_id'),
    emailHash: text('email_hash').notNull(),
    fromAddress: text('from_address').notNull(),
    toAddress: text('to_address').notNull(),
    subject: text('subject').notNull(),
    attachmentCount: integer('attachment_count').notNull().default(0),
    classification: text('classification').notNull(),
    subtype: text('subtype').notNull(),
    processingState: text('processing_state').notNull(),
    externalRef: text('external_ref'),
    amountMinor: bigint('amount_minor', { mode: 'number' }),
    currency: text('currency'),
    counterparty: text('counterparty'),
    reviewReason: text('review_reason'),
    notionPageId: text('notion_page_id'),
    notificationState: text('notification_state').notNull().default('not_needed'),
    attemptCount: integer('attempt_count').notNull().default(0),
    lastError: text('last_error'),
    processedAt: timestamp('processed_at', { withTimezone: true }),
    metadata: jsonb('metadata').notNull().default({}),
    authenticityVerdict: text('authenticity_verdict').notNull().default('unverified'),
    parserVersion: text('parser_version'),
    mimeCompleteness: text('mime_completeness').notNull().default('incomplete'),
    decisionSnapshot: jsonb('decision_snapshot').notNull().default({}),
    actionId: bigint('action_id', { mode: 'number' })
  },
  (table) => [
    uniqueIndex('email_events_email_hash_uidx').on(table.emailHash),
    index('email_events_received_at_idx').on(table.receivedAt),
    index('email_events_state_received_idx').on(table.processingState, table.receivedAt),
    index('email_events_external_ref_idx').on(table.externalRef)
  ]
);

/**
 * Human attention records are intentionally separate from external-action and
 * Telegram work queues. Completing a review cannot claim or mutate either queue.
 */
export const emailAttentionReviews = pgTable(
  'email_attention_reviews',
  {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    eventId: bigint('event_id', { mode: 'number' }).notNull(),
    status: text('status').notNull().default('waiting'),
    reasonCode: text('reason_code').notNull(),
    reason: text('reason').notNull(),
    evidenceSnapshot: jsonb('evidence_snapshot').notNull().default({}),
    classifierDiagnostics: jsonb('classifier_diagnostics').notNull().default({}),
    analysis: text('analysis'),
    summary: text('summary'),
    analysisProvenance: jsonb('analysis_provenance').notNull().default({}),
    lastActor: text('last_actor'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    startedAt: timestamp('started_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true })
  },
  (table) => [
    uniqueIndex('email_attention_reviews_event_uidx').on(table.eventId),
    index('email_attention_reviews_status_created_idx').on(table.status, table.createdAt),
    index('email_attention_reviews_updated_idx').on(table.updatedAt)
  ]
);

export const emailAutomationSettings = pgTable('email_automation_settings', {
  id: integer('id').primaryKey().default(1),
  automationEnabled: boolean('automation_enabled').notNull().default(true),
  ledgerEnabled: boolean('ledger_enabled').notNull().default(false),
  notificationsEnabled: boolean('notifications_enabled').notNull().default(true),
  settings: jsonb('settings').notNull().default({}),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
});

export const emailClassificationRules = pgTable(
  'email_classification_rules',
  {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    enabled: boolean('enabled').notNull().default(true),
    priority: integer('priority').notNull().default(100),
    name: text('name').notNull(),
    classification: text('classification').notNull(),
    subtype: text('subtype').notNull(),
    senderPattern: text('sender_pattern'),
    subjectPattern: text('subject_pattern'),
    bodyPatterns: jsonb('body_patterns').notNull().default([]),
    handlerKey: text('handler_key').notNull(),
    ledgerDefaults: jsonb('ledger_defaults').notNull().default({}),
    notifyPolicy: text('notify_policy').notNull().default('review_and_success'),
    /** Sample email input used for dashboard previews and "Send test". Nullable; null means no preview is available. */
    dummyInput: jsonb('dummy_input'),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    revision: integer('revision').notNull().default(1),
    configHash: text('config_hash')
  },
  (table) => [
    index('email_classification_rules_enabled_priority_idx').on(table.enabled, table.priority)
  ]
);

export const emailAutomationActions = pgTable(
  'email_automation_actions',
  {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    eventId: bigint('event_id', { mode: 'number' }).notNull(),
    handlerKey: text('handler_key').notNull(),
    handlerVersion: text('handler_version').notNull(),
    idempotencyKey: text('idempotency_key').notNull(),
    status: text('status').notNull().default('pending'),
    payloadSnapshot: jsonb('payload_snapshot').notNull(),
    outcome: jsonb('outcome').notNull().default({}),
    externalObjectId: text('external_object_id'),
    attemptCount: integer('attempt_count').notNull().default(0),
    nextAttemptAt: timestamp('next_attempt_at', { withTimezone: true }).notNull().defaultNow(),
    leaseToken: text('lease_token'),
    leaseExpiresAt: timestamp('lease_expires_at', { withTimezone: true }),
    lastError: text('last_error'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp('completed_at', { withTimezone: true })
  },
  (table) => [
    uniqueIndex('email_automation_actions_handler_idempotency_uidx').on(table.handlerKey, table.idempotencyKey),
    index('email_automation_actions_due_idx').on(table.status, table.nextAttemptAt),
    index('email_automation_actions_event_idx').on(table.eventId)
  ]
);

export const emailAutomationAttempts = pgTable(
  'email_automation_attempts',
  {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    actionId: bigint('action_id', { mode: 'number' }).notNull(),
    kind: text('kind').notNull(),
    status: text('status').notNull(),
    actor: text('actor').notNull().default('system'),
    detail: jsonb('detail').notNull().default({}),
    error: text('error'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [index('email_automation_attempts_action_idx').on(table.actionId, table.createdAt)]
);

export const emailNotificationOutbox = pgTable(
  'email_notification_outbox',
  {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    eventId: bigint('event_id', { mode: 'number' }).notNull(),
    idempotencyKey: text('idempotency_key').notNull(),
    status: text('status').notNull().default('pending'),
    payloadSnapshot: jsonb('payload_snapshot').notNull(),
    attemptCount: integer('attempt_count').notNull().default(0),
    nextAttemptAt: timestamp('next_attempt_at', { withTimezone: true }).notNull().defaultNow(),
    leaseToken: text('lease_token'),
    leaseExpiresAt: timestamp('lease_expires_at', { withTimezone: true }),
    lastError: text('last_error'),
    sentAt: timestamp('sent_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    uniqueIndex('email_notification_outbox_idempotency_uidx').on(table.idempotencyKey),
    index('email_notification_outbox_due_idx').on(table.status, table.nextAttemptAt)
  ]
);

export const emailAutomationAuditLog = pgTable(
  'email_automation_audit_log',
  {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    eventId: bigint('event_id', { mode: 'number' }),
    actionId: bigint('action_id', { mode: 'number' }),
    actor: text('actor').notNull().default('manager'),
    action: text('action').notNull(),
    reason: text('reason'),
    before: jsonb('before').notNull().default({}),
    after: jsonb('after').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [index('email_automation_audit_log_event_idx').on(table.eventId, table.createdAt)]
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
