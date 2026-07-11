CREATE TABLE IF NOT EXISTS "email_automation_settings" (
  "id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
  "automation_enabled" boolean DEFAULT true NOT NULL,
  "ledger_enabled" boolean DEFAULT false NOT NULL,
  "notifications_enabled" boolean DEFAULT true NOT NULL,
  "settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "email_automation_settings_singleton" CHECK ("id" = 1)
);
--> statement-breakpoint
INSERT INTO "email_automation_settings" ("id", "automation_enabled", "ledger_enabled", "notifications_enabled", "settings")
VALUES (1, true, false, true, '{}'::jsonb)
ON CONFLICT ("id") DO NOTHING;
