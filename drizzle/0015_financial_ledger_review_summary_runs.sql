CREATE TABLE IF NOT EXISTS "financial_ledger_review_summary_runs" (
  "id" bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  "local_date" text NOT NULL,
  "status" text NOT NULL DEFAULT 'pending',
  "attempt_count" integer NOT NULL DEFAULT 0,
  "summary_snapshot" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "last_error" text,
  "lease_token" text,
  "lease_expires_at" timestamp with time zone,
  "sent_at" timestamp with time zone,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "financial_ledger_review_summary_runs_date_uidx"
  ON "financial_ledger_review_summary_runs" ("local_date");
CREATE INDEX IF NOT EXISTS "financial_ledger_review_summary_runs_status_updated_idx"
  ON "financial_ledger_review_summary_runs" ("status", "updated_at");
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "financial_ledger_review_summary_runs"
    ADD CONSTRAINT "financial_ledger_review_summary_runs_status_check"
    CHECK ("status" IN ('pending', 'processing', 'sent', 'failed')) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
