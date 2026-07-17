ALTER TABLE "email_events"
  ADD COLUMN IF NOT EXISTS "authenticity_verdict" text NOT NULL DEFAULT 'unverified',
  ADD COLUMN IF NOT EXISTS "parser_version" text,
  ADD COLUMN IF NOT EXISTS "mime_completeness" text NOT NULL DEFAULT 'incomplete',
  ADD COLUMN IF NOT EXISTS "decision_snapshot" jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS "action_id" bigint;
--> statement-breakpoint
ALTER TABLE "email_classification_rules"
  ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS "revision" integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "config_hash" text;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "email_automation_actions" (
  "id" bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  "event_id" bigint NOT NULL,
  "handler_key" text NOT NULL,
  "handler_version" text NOT NULL,
  "idempotency_key" text NOT NULL,
  "status" text NOT NULL DEFAULT 'pending',
  "payload_snapshot" jsonb NOT NULL,
  "outcome" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "external_object_id" text,
  "attempt_count" integer NOT NULL DEFAULT 0,
  "next_attempt_at" timestamp with time zone NOT NULL DEFAULT now(),
  "lease_token" text,
  "lease_expires_at" timestamp with time zone,
  "last_error" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  "completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "email_automation_actions_handler_idempotency_uidx" ON "email_automation_actions" ("handler_key", "idempotency_key");
CREATE INDEX IF NOT EXISTS "email_automation_actions_due_idx" ON "email_automation_actions" ("status", "next_attempt_at");
CREATE INDEX IF NOT EXISTS "email_automation_actions_event_idx" ON "email_automation_actions" ("event_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "email_automation_attempts" (
  "id" bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  "action_id" bigint NOT NULL,
  "kind" text NOT NULL,
  "status" text NOT NULL,
  "actor" text NOT NULL DEFAULT 'system',
  "detail" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "error" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "email_automation_attempts_action_idx" ON "email_automation_attempts" ("action_id", "created_at");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "email_notification_outbox" (
  "id" bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  "event_id" bigint NOT NULL,
  "idempotency_key" text NOT NULL,
  "status" text NOT NULL DEFAULT 'pending',
  "payload_snapshot" jsonb NOT NULL,
  "attempt_count" integer NOT NULL DEFAULT 0,
  "next_attempt_at" timestamp with time zone NOT NULL DEFAULT now(),
  "lease_token" text,
  "lease_expires_at" timestamp with time zone,
  "last_error" text,
  "sent_at" timestamp with time zone,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "email_notification_outbox_idempotency_uidx" ON "email_notification_outbox" ("idempotency_key");
CREATE INDEX IF NOT EXISTS "email_notification_outbox_due_idx" ON "email_notification_outbox" ("status", "next_attempt_at");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "email_automation_audit_log" (
  "id" bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  "event_id" bigint,
  "action_id" bigint,
  "actor" text NOT NULL DEFAULT 'manager',
  "action" text NOT NULL,
  "reason" text,
  "before" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "after" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "email_automation_audit_log_event_idx" ON "email_automation_audit_log" ("event_id", "created_at");
--> statement-breakpoint
-- Foreign keys preserve durable history. Event -> action is intentionally
-- SET NULL because an event remains the source record if an action is removed.
DO $$ BEGIN
  ALTER TABLE "email_automation_actions" ADD CONSTRAINT "email_automation_actions_event_fk" FOREIGN KEY ("event_id") REFERENCES "email_events"("id") ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "email_automation_attempts" ADD CONSTRAINT "email_automation_attempts_action_fk" FOREIGN KEY ("action_id") REFERENCES "email_automation_actions"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "email_notification_outbox" ADD CONSTRAINT "email_notification_outbox_event_fk" FOREIGN KEY ("event_id") REFERENCES "email_events"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "email_events" ADD CONSTRAINT "email_events_action_fk" FOREIGN KEY ("action_id") REFERENCES "email_automation_actions"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "email_automation_audit_log" ADD CONSTRAINT "email_automation_audit_event_fk" FOREIGN KEY ("event_id") REFERENCES "email_events"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "email_automation_audit_log" ADD CONSTRAINT "email_automation_audit_action_fk" FOREIGN KEY ("action_id") REFERENCES "email_automation_actions"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
ALTER TABLE "email_automation_actions" ADD CONSTRAINT "email_automation_actions_status_check" CHECK ("status" IN ('pending','claimed','succeeded','retry_scheduled','failed','cancelled','reconciled')) NOT VALID;
ALTER TABLE "email_notification_outbox" ADD CONSTRAINT "email_notification_outbox_status_check" CHECK ("status" IN ('pending','claimed','sent','retry_scheduled','failed','cancelled')) NOT VALID;
ALTER TABLE "email_events" ADD CONSTRAINT "email_events_processing_state_check" CHECK ("processing_state" IN ('ready','review','ignored','received','queued','linked_existing_action','action_succeeded','retry_scheduled','failed','cancelled','reconciled','ledger_created','retry_pending')) NOT VALID;
ALTER TABLE "email_events" ADD CONSTRAINT "email_events_notification_state_check" CHECK ("notification_state" IN ('not_needed','pending','claimed','sent','retry_scheduled','failed','cancelled','retry_pending','not_sent','not_configured')) NOT VALID;
ALTER TABLE "email_events" ADD CONSTRAINT "email_events_authenticity_check" CHECK ("authenticity_verdict" IN ('unverified','passed','failed','indeterminate')) NOT VALID;
ALTER TABLE "email_events" ADD CONSTRAINT "email_events_mime_check" CHECK ("mime_completeness" IN ('complete','incomplete','unsupported')) NOT VALID;
