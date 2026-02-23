CREATE TABLE "reported_errors" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "reported_errors_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"source" text NOT NULL,
	"code" text NOT NULL,
	"severity" text NOT NULL,
	"message" text NOT NULL,
	"merchant_id" text,
	"receipt_key" text,
	"webhook_event_id" bigint,
	"context" jsonb,
	"payload" jsonb,
	"error_name" text,
	"error_message" text,
	"error_stack" text,
	"notified" boolean DEFAULT false NOT NULL,
	"notified_at" timestamp with time zone,
	"notify_error" text
);
--> statement-breakpoint
CREATE INDEX "reported_errors_created_idx" ON "reported_errors" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "reported_errors_source_created_idx" ON "reported_errors" USING btree ("source","created_at");--> statement-breakpoint
CREATE INDEX "reported_errors_code_idx" ON "reported_errors" USING btree ("code");--> statement-breakpoint
CREATE INDEX "reported_errors_merchant_created_idx" ON "reported_errors" USING btree ("merchant_id","created_at");--> statement-breakpoint
CREATE INDEX "reported_errors_receipt_key_idx" ON "reported_errors" USING btree ("receipt_key");