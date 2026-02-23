CREATE TABLE "receipt_discounts" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "receipt_discounts_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"receipt_key" text NOT NULL,
	"discount_index" integer NOT NULL,
	"discount_id" text,
	"type" text,
	"name" text,
	"percentage" double precision,
	"money_amount" double precision
);
--> statement-breakpoint
CREATE TABLE "receipt_line_discounts" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "receipt_line_discounts_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"receipt_key" text NOT NULL,
	"line_index" integer NOT NULL,
	"discount_index" integer NOT NULL,
	"discount_id" text,
	"type" text,
	"name" text,
	"percentage" double precision,
	"money_amount" double precision
);
--> statement-breakpoint
CREATE TABLE "receipt_line_items" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "receipt_line_items_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"receipt_key" text NOT NULL,
	"line_index" integer NOT NULL,
	"item_id" text,
	"variant_id" text,
	"item_name" text,
	"variant_name" text,
	"sku" text,
	"quantity" double precision,
	"price" double precision,
	"gross_total_money" double precision,
	"total_money" double precision,
	"cost" double precision,
	"cost_total" double precision,
	"line_note" text,
	"total_discount" double precision
);
--> statement-breakpoint
CREATE TABLE "receipt_line_modifiers" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "receipt_line_modifiers_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"receipt_key" text NOT NULL,
	"line_index" integer NOT NULL,
	"modifier_index" integer NOT NULL,
	"modifier_id" text,
	"modifier_option_id" text,
	"name" text,
	"option" text,
	"price" double precision,
	"money_amount" double precision
);
--> statement-breakpoint
CREATE TABLE "receipt_line_taxes" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "receipt_line_taxes_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"receipt_key" text NOT NULL,
	"line_index" integer NOT NULL,
	"tax_index" integer NOT NULL,
	"tax_id" text,
	"type" text,
	"name" text,
	"rate" double precision,
	"money_amount" double precision
);
--> statement-breakpoint
CREATE TABLE "receipt_payments" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "receipt_payments_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"receipt_key" text NOT NULL,
	"payment_index" integer NOT NULL,
	"payment_type_id" text,
	"name" text,
	"type" text,
	"money_amount" double precision,
	"paid_at" timestamp with time zone,
	"payment_details" jsonb
);
--> statement-breakpoint
CREATE TABLE "receipt_taxes" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "receipt_taxes_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"receipt_key" text NOT NULL,
	"tax_index" integer NOT NULL,
	"tax_id" text,
	"type" text,
	"name" text,
	"rate" double precision,
	"money_amount" double precision
);
--> statement-breakpoint
CREATE TABLE "receipts" (
	"receipt_key" text PRIMARY KEY NOT NULL,
	"merchant_id" text NOT NULL,
	"receipt_number" text NOT NULL,
	"receipt_type" text,
	"source" text,
	"note" text,
	"order" text,
	"refund_for" text,
	"customer_id" text,
	"employee_id" text,
	"store_id" text,
	"pos_device_id" text,
	"dining_option" text,
	"created_at" timestamp with time zone,
	"receipt_date" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"total_money" double precision,
	"total_tax" double precision,
	"total_discount" double precision,
	"tip" double precision,
	"surcharge" double precision,
	"points_earned" double precision,
	"points_deducted" double precision,
	"points_balance" double precision,
	"updated_from_event_at" timestamp with time zone NOT NULL,
	"synced_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "webhook_events" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "webhook_events_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"merchant_id" text NOT NULL,
	"event_type" text NOT NULL,
	"event_created_at" timestamp with time zone NOT NULL,
	"dedupe_key" text NOT NULL,
	"payload" jsonb NOT NULL,
	"processed" boolean DEFAULT false NOT NULL,
	"processed_at" timestamp with time zone,
	"error_message" text
);
--> statement-breakpoint
CREATE UNIQUE INDEX "receipt_discounts_receipt_idx_uidx" ON "receipt_discounts" USING btree ("receipt_key","discount_index");--> statement-breakpoint
CREATE UNIQUE INDEX "receipt_line_discounts_receipt_line_discount_uidx" ON "receipt_line_discounts" USING btree ("receipt_key","line_index","discount_index");--> statement-breakpoint
CREATE UNIQUE INDEX "receipt_line_items_receipt_line_uidx" ON "receipt_line_items" USING btree ("receipt_key","line_index");--> statement-breakpoint
CREATE INDEX "receipt_line_items_item_id_idx" ON "receipt_line_items" USING btree ("item_id");--> statement-breakpoint
CREATE UNIQUE INDEX "receipt_line_modifiers_receipt_line_modifier_uidx" ON "receipt_line_modifiers" USING btree ("receipt_key","line_index","modifier_index");--> statement-breakpoint
CREATE UNIQUE INDEX "receipt_line_taxes_receipt_line_tax_uidx" ON "receipt_line_taxes" USING btree ("receipt_key","line_index","tax_index");--> statement-breakpoint
CREATE UNIQUE INDEX "receipt_payments_receipt_payment_uidx" ON "receipt_payments" USING btree ("receipt_key","payment_index");--> statement-breakpoint
CREATE INDEX "receipt_payments_type_idx" ON "receipt_payments" USING btree ("type");--> statement-breakpoint
CREATE UNIQUE INDEX "receipt_taxes_receipt_tax_uidx" ON "receipt_taxes" USING btree ("receipt_key","tax_index");--> statement-breakpoint
CREATE UNIQUE INDEX "receipts_merchant_receipt_uidx" ON "receipts" USING btree ("merchant_id","receipt_number");--> statement-breakpoint
CREATE INDEX "receipts_receipt_date_idx" ON "receipts" USING btree ("receipt_date");--> statement-breakpoint
CREATE INDEX "receipts_store_id_idx" ON "receipts" USING btree ("store_id");--> statement-breakpoint
CREATE UNIQUE INDEX "webhook_events_dedupe_key_uidx" ON "webhook_events" USING btree ("dedupe_key");--> statement-breakpoint
CREATE INDEX "webhook_events_merchant_event_created_idx" ON "webhook_events" USING btree ("merchant_id","event_created_at");