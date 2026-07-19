ALTER TABLE "email_events"
  ADD COLUMN IF NOT EXISTS "extracted_body" text,
  ADD COLUMN IF NOT EXISTS "extracted_body_source" text,
  ADD COLUMN IF NOT EXISTS "extracted_body_truncated" boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "extracted_body_parser_version" text,
  ADD COLUMN IF NOT EXISTS "extracted_body_hash" text,
  ADD COLUMN IF NOT EXISTS "body_extraction_metadata" jsonb NOT NULL DEFAULT '{}'::jsonb;
