CREATE INDEX IF NOT EXISTS "receipts_created_at_idx" ON "receipts" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "receipts_store_created_at_idx" ON "receipts" USING btree ("store_id", "created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "receipts_updated_receipt_key_idx" ON "receipts" USING btree ("updated_from_event_at", "receipt_key");
