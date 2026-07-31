import { sql } from 'drizzle-orm';
import {
  bigint,
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  type AnyPgColumn
} from 'drizzle-orm/pg-core';

const sqlNonNull = (column: AnyPgColumn) => sql`${column} is not null`;

export const secondLoyverseReceiptTransfers = pgTable(
  'second_loyverse_receipt_transfers',
  {
    sourceReceiptKey: text('source_receipt_key').primaryKey(),
    sourceMerchantId: text('source_merchant_id').notNull(),
    sourceReceiptNumber: text('source_receipt_number').notNull(),
    sourceEventType: text('source_event_type'),
    sourceEventId: bigint('source_event_id', { mode: 'number' }),
    sourceUpdatedAt: timestamp('source_updated_at', { withTimezone: true }),
    sourceFingerprint: text('source_fingerprint').notNull(),
    cohortAlgorithmVersion: text('cohort_algorithm_version').notNull(),
    cohortBucket: integer('cohort_bucket').notNull(),
    cohortSelected: boolean('cohort_selected').notNull(),
    status: text('status').notNull(),
    attemptCount: integer('attempt_count').notNull().default(0),
    processingToken: text('processing_token'),
    processingStartedAt: timestamp('processing_started_at', { withTimezone: true }),
    targetOrderMarker: text('target_order_marker'),
    targetReceiptNumber: text('target_receipt_number'),
    targetReceiptDate: timestamp('target_receipt_date', { withTimezone: true }),
    lastErrorCode: text('last_error_code'),
    lastErrorStage: text('last_error_stage'),
    lastErrorMessage: text('last_error_message'),
    lastErrorHttpStatus: integer('last_error_http_status'),
    firstSeenAt: timestamp('first_seen_at', { withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).notNull().defaultNow(),
    startedAt: timestamp('started_at', { withTimezone: true }),
    succeededAt: timestamp('succeeded_at', { withTimezone: true }),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    index('second_lv_transfers_selected_status_idx').on(table.cohortSelected, table.status),
    index('second_lv_transfers_source_updated_key_idx').on(table.sourceUpdatedAt, table.sourceReceiptKey),
    index('second_lv_transfers_target_receipt_number_idx').on(table.targetReceiptNumber),
    uniqueIndex('second_lv_transfers_target_receipt_number_uidx')
      .on(table.targetReceiptNumber)
      .where(sqlNonNull(table.targetReceiptNumber)),
    uniqueIndex('second_lv_transfers_target_order_marker_uidx')
      .on(table.targetOrderMarker)
      .where(sqlNonNull(table.targetOrderMarker))
  ]
);

export const secondLoyverseReceiptAttempts = pgTable(
  'second_loyverse_receipt_attempts',
  {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    sourceReceiptKey: text('source_receipt_key').notNull(),
    attemptNumber: integer('attempt_number').notNull(),
    trigger: text('trigger').notNull(),
    stage: text('stage').notNull(),
    outcome: text('outcome').notNull(),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
    finishedAt: timestamp('finished_at', { withTimezone: true }),
    requestFingerprint: text('request_fingerprint'),
    httpStatus: integer('http_status'),
    responseSummary: text('response_summary'),
    errorCode: text('error_code'),
    errorMessage: text('error_message'),
    targetReceiptNumber: text('target_receipt_number'),
    incidentId: bigint('incident_id', { mode: 'number' }),
    notified: boolean('notified').notNull().default(false)
  },
  (table) => [
    uniqueIndex('second_lv_attempts_key_number_uidx').on(table.sourceReceiptKey, table.attemptNumber),
    index('second_lv_attempts_key_started_idx').on(table.sourceReceiptKey, table.startedAt),
    index('second_lv_attempts_outcome_idx').on(table.outcome)
  ]
);
