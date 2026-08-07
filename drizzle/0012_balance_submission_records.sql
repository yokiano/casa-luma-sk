CREATE TABLE IF NOT EXISTS "balance_submission_records" (
  "id" bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  "submission_key" text NOT NULL,
  "observed_at" timestamp with time zone NOT NULL,
  "kbank_balance" double precision NOT NULL,
  "safe_balance" double precision NOT NULL,
  "notes" text,
  "status" text NOT NULL DEFAULT 'pending',
  "kbank_notion_page_id" text,
  "safe_notion_page_id" text,
  "last_error" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "balance_submission_records_key_uidx"
  ON "balance_submission_records" ("submission_key");
CREATE INDEX IF NOT EXISTS "balance_submission_records_status_updated_idx"
  ON "balance_submission_records" ("status", "updated_at");
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "balance_submission_records"
    ADD CONSTRAINT "balance_submission_records_status_check"
    CHECK ("status" IN ('pending', 'processing', 'partial', 'failed', 'succeeded')) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
