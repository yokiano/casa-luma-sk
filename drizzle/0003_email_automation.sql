CREATE TABLE "email_events" (
  "id" bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "received_at" timestamp with time zone NOT NULL,
  "message_id" text,
  "email_hash" text NOT NULL,
  "from_address" text NOT NULL,
  "to_address" text NOT NULL,
  "subject" text NOT NULL,
  "attachment_count" integer DEFAULT 0 NOT NULL,
  "classification" text NOT NULL,
  "subtype" text NOT NULL,
  "processing_state" text NOT NULL,
  "external_ref" text,
  "amount_minor" bigint,
  "currency" text,
  "counterparty" text,
  "review_reason" text,
  "notion_page_id" text,
  "notification_state" text DEFAULT 'not_needed' NOT NULL,
  "attempt_count" integer DEFAULT 0 NOT NULL,
  "last_error" text,
  "processed_at" timestamp with time zone,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_classification_rules" (
  "id" bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "enabled" boolean DEFAULT true NOT NULL,
  "priority" integer DEFAULT 100 NOT NULL,
  "name" text NOT NULL,
  "classification" text NOT NULL,
  "subtype" text NOT NULL,
  "sender_pattern" text,
  "subject_pattern" text,
  "body_patterns" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "handler_key" text NOT NULL,
  "ledger_defaults" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "notify_policy" text DEFAULT 'review_and_success' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "email_events_email_hash_uidx" ON "email_events" USING btree ("email_hash");
--> statement-breakpoint
CREATE INDEX "email_events_received_at_idx" ON "email_events" USING btree ("received_at");
--> statement-breakpoint
CREATE INDEX "email_events_state_received_idx" ON "email_events" USING btree ("processing_state", "received_at");
--> statement-breakpoint
CREATE INDEX "email_events_external_ref_idx" ON "email_events" USING btree ("external_ref");
--> statement-breakpoint
CREATE INDEX "email_classification_rules_enabled_priority_idx" ON "email_classification_rules" USING btree ("enabled", "priority");
