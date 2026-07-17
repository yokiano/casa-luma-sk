CREATE TABLE IF NOT EXISTS "email_attention_reviews" (
  "id" bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  "event_id" bigint NOT NULL,
  "status" text NOT NULL DEFAULT 'waiting',
  "reason_code" text NOT NULL,
  "reason" text NOT NULL,
  "evidence_snapshot" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "classifier_diagnostics" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "analysis" text,
  "summary" text,
  "analysis_provenance" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "last_actor" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  "started_at" timestamp with time zone,
  "completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "email_attention_reviews_event_uidx" ON "email_attention_reviews" ("event_id");
CREATE INDEX IF NOT EXISTS "email_attention_reviews_status_created_idx" ON "email_attention_reviews" ("status", "created_at");
CREATE INDEX IF NOT EXISTS "email_attention_reviews_updated_idx" ON "email_attention_reviews" ("updated_at");
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "email_attention_reviews" ADD CONSTRAINT "email_attention_reviews_event_fk" FOREIGN KEY ("event_id") REFERENCES "email_events"("id") ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "email_attention_reviews" ADD CONSTRAINT "email_attention_reviews_status_check" CHECK ("status" IN ('waiting','in_progress','done')) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
-- Preserve existing attention-required events without creating action or Telegram work.
INSERT INTO "email_attention_reviews" (
  "event_id", "status", "reason_code", "reason", "evidence_snapshot", "classifier_diagnostics", "created_at", "updated_at"
)
SELECT
  e."id",
  'waiting',
  CASE WHEN e."processing_state" = 'failed' THEN 'action_failed' ELSE 'historical_review' END,
  left(COALESCE(e."review_reason", CASE WHEN e."processing_state" = 'failed' THEN 'The durable external action failed and needs manager attention.' ELSE 'This event was already waiting for manager review.' END), 500),
  jsonb_build_object(
    'receivedAt', e."received_at",
    'from', left(e."from_address", 240),
    'to', left(e."to_address", 240),
    'subject', left(e."subject", 500),
    'messageId', left(e."message_id", 240),
    'attachmentCount', e."attachment_count",
    'textPreview', left(COALESCE(e."metadata"->>'textSnippet', ''), 700),
    'htmlPreview', left(COALESCE(e."metadata"->>'htmlSnippet', ''), 700),
    'mime', jsonb_build_object(
      'parserVersion', left(e."parser_version", 80),
      'completeness', CASE WHEN e."mime_completeness" IN ('complete', 'incomplete', 'unsupported') THEN e."mime_completeness" ELSE 'incomplete' END,
      'attachmentCount', greatest(e."attachment_count", 0)
    ),
    'classification', jsonb_build_object(
      'classification', e."classification",
      'subtype', e."subtype",
      'processingState', e."processing_state",
      'externalRef', left(e."external_ref", 160),
      'amountMinor', e."amount_minor",
      'currency', left(e."currency", 12),
      'counterparty', left(e."counterparty", 240),
      'reviewReason', left(e."review_reason", 500),
      'handlerKey', left(e."metadata"->>'handlerKey', 120)
    )
  ),
  jsonb_build_object(
    'classifierVersion', left(COALESCE(e."decision_snapshot"->>'classifierVersion', 'unknown'), 40),
    'selectedSource', CASE WHEN e."decision_snapshot"->>'matchedRuleName' IS NULL THEN 'historical_event_snapshot' ELSE 'database_rule' END,
    'selectedRuleName', left(e."decision_snapshot"->>'matchedRuleName', 200),
    'selectedRuleId', NULL::integer,
    'evaluatedRules', '[]'::jsonb,
    'final', jsonb_build_object(
      'classification', left(e."classification", 40),
      'subtype', left(e."subtype", 120),
      'processingState', left(e."processing_state", 40),
      'reviewReason', left(e."review_reason", 500)
    ),
    'note', 'Historical review created from the stored event snapshot. Original rule evaluation details were not retained in the migration backfill.'
  ),
  COALESCE(e."created_at", e."received_at"),
  COALESCE(e."created_at", e."received_at")
FROM "email_events" e
WHERE e."processing_state" IN ('review', 'failed')
ON CONFLICT ("event_id") DO NOTHING;
