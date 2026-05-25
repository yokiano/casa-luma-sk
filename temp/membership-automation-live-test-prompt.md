# New session prompt: live test membership automation

Task: Run a safe live test of automatic Notion Membership creation from a fabricated Loyverse receipt webhook.

Read first:
- `temp/membership-automations-implementation-plan.md`
- `docs/casa-luma/memberships/membership-automations.md`
- `docs/casa-luma/memberships/data-model.md`
- `src/lib/receipts/automations/membership-items.ts`
- `src/lib/receipts/automations/membership-creation.ts`
- `src/routes/api/webhooks/receipt/+server.ts`

Important current behavior:
- Production membership purchase item IDs are now hardcoded from Notion `🎟️ Open Play POS Items` using the Notion `ID` field because `LoyverseID` was blank:
  - Weekly `1 Week`: `fc7b05a3-8898-4bcb-bf7e-3769ee67ba3c`
  - Monthly `1 Month`: `4dec5920-72ee-498e-bc41-482724bedcbc`
- Each receipt creates one Membership per membership item type/duration group.
- Multiple matching lines/quantity are aggregated into `Number of Kids`.
  - Example: three weekly membership lines => one Weekly Membership with `Number of Kids = 3`.
- Dates are fixed inclusive:
  - Weekly: 7 days, start + 6 days.
  - Monthly: 30 days, start + 29 days.
- Refund/cancelled receipts skip and notify.
- Existing automated membership for same receipt provenance skips and notifies for manual review.
- Every `MEMBERSHIP_CREATED` success and membership automation warning/failure should notify through the incident/Telegram pipeline.

Constraints:
- Do not run `pnpm check`, `svelte check`, or `pnpm build`.
- Use targeted Vitest only if needed.
- Do not overwrite unrelated modified/untracked files.
- Before starting a dev server, inspect tmux panes for an existing dev server and prefer using it.

Suggested test plan:
1. Run targeted tests first:
   ```bash
   pnpm exec vitest run src/lib/receipts/automations/automation-suite.test.ts src/lib/receipts/automations/membership-creation.test.ts src/lib/server/incidents/telegram.test.ts --reporter=dot
   ```
2. Choose a real Notion Family for the live test:
   - Find or ask the user for a test Family whose `Families.Loyverse Customer ID` is populated.
   - Do not fabricate a customer id unless a matching Notion Family exists, because automation requires exact normalized Family match.
3. Use a unique receipt number, e.g. `PI-MEM-AUTO-TEST-<timestamp>`.
4. Send a fabricated `receipts.closed` webhook payload to the local dev server route `/api/webhooks/receipt`.
   - Include `x-webhook-token` only if `LOYVERSE_WEBHOOK_SECRET` is configured.
   - Use the selected real `customer_id`.
   - Use one or more membership line items, for example three Weekly lines to verify aggregation into `Number of Kids = 3`.
   - Minimal payload shape:
     ```json
     {
       "merchant_id": "pi-live-test",
       "type": "receipts.closed",
       "created_at": "<ISO timestamp>",
       "items": {
         "receipt_number": "PI-MEM-AUTO-TEST-<timestamp>",
         "receipt_type": "SALE",
         "created_at": "<ISO timestamp>",
         "receipt_date": "<ISO timestamp>",
         "customer_id": "<REAL_LOYVERSE_CUSTOMER_ID_FROM_NOTION_FAMILY>",
         "total_money": 4500,
         "line_items": [
           { "item_id": "fc7b05a3-8898-4bcb-bf7e-3769ee67ba3c", "item_name": "1 Week", "quantity": 1, "price": 1500, "total_money": 1500 },
           { "item_id": "fc7b05a3-8898-4bcb-bf7e-3769ee67ba3c", "item_name": "1 Week", "quantity": 1, "price": 1500, "total_money": 1500 },
           { "item_id": "fc7b05a3-8898-4bcb-bf7e-3769ee67ba3c", "item_name": "1 Week", "quantity": 1, "price": 1500, "total_money": 1500 }
         ],
         "payments": []
       }
     }
     ```
5. Verify:
   - Webhook returns `status: processed` and `automationStatusCounts.completed >= 1`.
   - A Notion `🎫 Memberships` row was created for the selected Family.
   - Name resembles `<Family Name> - Weekly - 3 kids`.
   - `Start Date` is receipt date; `End Date` is start + 6 days.
   - `Notes` include `Created automatically from Loyverse receipt`, `Receipt Number`, `Receipt Key`, and membership item ID.
   - Telegram receives the success alert.
6. Test idempotency by sending the same payload again:
   - Expected ingestion status should likely be `duplicate`; automation should not run.
   - If a non-duplicate corrected event is sent with same receipt number but different `created_at`, automation should skip existing provenance and notify for review.
7. Report changed files, test command results, fabricated receipt number, Notion membership page id/name, and Telegram alert result.
