CREATE TABLE IF NOT EXISTS "email_receipt_upload_sessions" (
  "id" bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  "event_id" bigint NOT NULL,
  "action_id" bigint NOT NULL,
  "notion_page_id" text NOT NULL,
  "callback_query_id" text NOT NULL,
  "telegram_user_id" bigint NOT NULL,
  "telegram_chat_id" bigint NOT NULL,
  "telegram_thread_id" bigint,
  "source_message_id" bigint NOT NULL,
  "prompt_message_id" bigint,
  "status" text NOT NULL DEFAULT 'awaiting_prompt',
  "expires_at" timestamp with time zone NOT NULL,
  "file_name" text,
  "mime_type" text,
  "size_bytes" bigint,
  "notion_file_upload_id" text,
  "telegram_file_unique_id" text,
  "last_error" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  "consumed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "email_receipt_upload_sessions_callback_uidx"
  ON "email_receipt_upload_sessions" ("callback_query_id");
CREATE UNIQUE INDEX IF NOT EXISTS "email_receipt_upload_sessions_prompt_uidx"
  ON "email_receipt_upload_sessions" ("telegram_chat_id", "prompt_message_id");
CREATE UNIQUE INDEX IF NOT EXISTS "email_receipt_upload_sessions_active_uidx"
  ON "email_receipt_upload_sessions" ("event_id", "telegram_user_id", "telegram_chat_id")
  WHERE "status" IN ('awaiting_prompt', 'awaiting_photo', 'processing');
CREATE INDEX IF NOT EXISTS "email_receipt_upload_sessions_event_idx"
  ON "email_receipt_upload_sessions" ("event_id", "created_at");
CREATE INDEX IF NOT EXISTS "email_receipt_upload_sessions_expiry_idx"
  ON "email_receipt_upload_sessions" ("status", "expires_at");
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "email_receipt_upload_sessions"
    ADD CONSTRAINT "email_receipt_upload_sessions_status_check"
    CHECK ("status" IN ('awaiting_prompt', 'awaiting_photo', 'processing', 'succeeded', 'failed', 'cancelled')) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
