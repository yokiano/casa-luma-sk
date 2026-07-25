ALTER TABLE "webhook_events"
  ADD COLUMN IF NOT EXISTS "processing_started_at" timestamp with time zone;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "webhook_replay_runs" (
  "id" bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "started_at" timestamp with time zone,
  "completed_at" timestamp with time zone,
  "source_type" text NOT NULL,
  "source_id" bigint NOT NULL,
  "mode" text NOT NULL,
  "status" text NOT NULL DEFAULT 'pending',
  "selected_stages" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "notify" boolean NOT NULL DEFAULT false,
  "result_summary" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "error_summary" text
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "webhook_replay_runs_source_idx"
  ON "webhook_replay_runs" ("source_type", "source_id");
CREATE INDEX IF NOT EXISTS "webhook_replay_runs_created_idx"
  ON "webhook_replay_runs" ("created_at");
CREATE INDEX IF NOT EXISTS "webhook_replay_runs_status_idx"
  ON "webhook_replay_runs" ("status");
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "webhook_replay_runs"
    ADD CONSTRAINT "webhook_replay_runs_source_type_check"
    CHECK ("source_type" IN ('webhook_event', 'processing_incident')) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "webhook_replay_runs"
    ADD CONSTRAINT "webhook_replay_runs_mode_check"
    CHECK ("mode" IN ('dry_run', 'live')) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "webhook_replay_runs"
    ADD CONSTRAINT "webhook_replay_runs_status_check"
    CHECK ("status" IN ('pending', 'running', 'completed', 'failed')) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
