CREATE TABLE "second_loyverse_receipt_transfers" (
	"source_receipt_key" text PRIMARY KEY NOT NULL,
	"source_merchant_id" text NOT NULL,
	"source_receipt_number" text NOT NULL,
	"source_event_type" text,
	"source_event_id" bigint,
	"source_updated_at" timestamp with time zone,
	"source_fingerprint" text NOT NULL,
	"cohort_algorithm_version" text NOT NULL,
	"cohort_bucket" integer NOT NULL,
	"cohort_selected" boolean NOT NULL,
	"status" text NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"processing_token" text,
	"processing_started_at" timestamp with time zone,
	"target_order_marker" text,
	"target_receipt_number" text,
	"target_receipt_date" timestamp with time zone,
	"last_error_code" text,
	"last_error_stage" text,
	"last_error_message" text,
	"last_error_http_status" integer,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"started_at" timestamp with time zone,
	"succeeded_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "second_loyverse_receipt_attempts" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "second_loyverse_receipt_attempts_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"source_receipt_key" text NOT NULL,
	"attempt_number" integer NOT NULL,
	"trigger" text NOT NULL,
	"stage" text NOT NULL,
	"outcome" text NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"request_fingerprint" text,
	"http_status" integer,
	"response_summary" text,
	"error_code" text,
	"error_message" text,
	"target_receipt_number" text,
	"incident_id" bigint,
	"notified" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE INDEX "second_lv_transfers_selected_status_idx" ON "second_loyverse_receipt_transfers" USING btree ("cohort_selected","status");
--> statement-breakpoint
CREATE INDEX "second_lv_transfers_source_updated_key_idx" ON "second_loyverse_receipt_transfers" USING btree ("source_updated_at","source_receipt_key");
--> statement-breakpoint
CREATE INDEX "second_lv_transfers_target_receipt_number_idx" ON "second_loyverse_receipt_transfers" USING btree ("target_receipt_number");
--> statement-breakpoint
CREATE UNIQUE INDEX "second_lv_transfers_target_receipt_number_uidx" ON "second_loyverse_receipt_transfers" USING btree ("target_receipt_number") WHERE "second_loyverse_receipt_transfers"."target_receipt_number" is not null;
--> statement-breakpoint
CREATE UNIQUE INDEX "second_lv_transfers_target_order_marker_uidx" ON "second_loyverse_receipt_transfers" USING btree ("target_order_marker") WHERE "second_loyverse_receipt_transfers"."target_order_marker" is not null;
--> statement-breakpoint
CREATE UNIQUE INDEX "second_lv_attempts_key_number_uidx" ON "second_loyverse_receipt_attempts" USING btree ("source_receipt_key","attempt_number");
--> statement-breakpoint
CREATE INDEX "second_lv_attempts_key_started_idx" ON "second_loyverse_receipt_attempts" USING btree ("source_receipt_key","started_at");
--> statement-breakpoint
CREATE INDEX "second_lv_attempts_outcome_idx" ON "second_loyverse_receipt_attempts" USING btree ("outcome");
