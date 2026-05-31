# Membership Automations

Membership automations run after Loyverse receipt-closed webhooks are ingested. Their purpose is to reduce manual tracking work around Casa Luma memberships and flexi passes.

Current automations:

- Create Notion `🎫 Memberships` rows from eligible weekly/monthly membership purchase receipts.
- Create structured Notion `🎟️ Flexi Passes` rows from eligible `Flexible Resident` / `flexible Regular` flexi purchase receipts.

## Current webhook context

Receipt webhooks are handled by `src/routes/api/webhooks/receipt/+server.ts`.

Current flow:

1. Parse receipt webhook payloads.
2. Ingest each receipt into Neon through `src/lib/server/db/ingest-receipt-webhook.ts`.
3. Run receipt automations: membership creation first, then flexi pass purchase creation.
4. Run receipt validation rules and report violations.

Receipt automations should run only for receipts whose ingestion result is `processed`. Duplicate and stale webhook events should not create or update memberships or flexi pass records.

## Data mapping

- Loyverse receipt customer: `receipt.customer_id`.
- Notion Family match: `Families.Loyverse Customer ID` exact normalized match.
- Created Notion Membership fields:
  - `Family`: matched Family relation.
  - `Type`: `Weekly` or `Monthly`, based on the Loyverse membership purchase item.
  - `Number of Kids`: based on the purchase item/configuration.
  - `Start Date`: derived from the receipt date.
  - `End Date`: derived from the membership type/duration policy.
  - `Name`: same format as manual membership creation, e.g. `Family Name - Monthly - 2 kids`.
  - `Notes`: automation provenance including receipt number/key and item id.

## Initial behavior

Membership creation is conservative:

- Create memberships only for configured membership purchase item IDs.
- Skip cancelled receipts.
- Require a receipt customer.
- Require an existing Notion Family linked to that Loyverse customer ID.
- Check for an existing automated membership for the same receipt before creating a new one.
- Report automation failures or missing Family/customer cases as receipt webhook incidents.

Flexi pass purchase automation writes to the dedicated `🎟️ Flexi Passes` database:

- Creates one row per eligible purchase receipt.
- A receipt line with quantity `2` creates one row representing 2 cards / 22 entries.
- Writes structured fields for family, Loyverse customer ID, card count, entries granted/used/left, valid dates, receipt key/number/URL, item IDs, line indexes, and automation status.
- Keeps `Notes` as human/provenance notes only; structured data is not stored only in notes.
- Does not overload `Memberships.Number of Kids`.
- Successful Flexi Pass creation records an `FLEXI_PASSES_CREATED` info incident and sends a Telegram success notification by default.
- Missing customer or missing Family fails and alerts, matching weekly/monthly membership behavior.
- Cancelled receipts are skipped and alerted for review.
- Refund receipts mark matching flexi pass rows as `Refunded`, set `Entries Left = 0`, and store refund receipt metadata.
- Usage allocation, validation replacement, UI display refinements, and backfill/import are later milestones.

## Idempotency

Receipt ingestion already deduplicates webhook events. Membership and flexi automations should add their own Notion-level idempotency checks before creating a page, because Notion writes are outside the Neon transaction.

Recommended provenance token in `Notes`:

```text
Created automatically from Loyverse receipt.
Receipt Number: <receipt_number>
Receipt Key: <merchant_id>:<receipt_number>
Loyverse Item ID: <item_id>
Webhook Event Created At: <created_at>
```

Before creating, query Memberships for the same Family and compare the intended dates/type/kid count plus the receipt provenance token.

## Automation module shape

Use a generic receipt automation runner, with membership creation as one automation:

```text
src/lib/receipts/automations/
  types.ts
  index.ts
  membership-items.ts
  membership-creation.ts
```

This keeps the webhook route from becoming membership-specific and leaves room for later automations, such as membership renewal, extension, refund handling, or reminder tasks.

## Information still needed

Before enabling in production, confirm:

1. Loyverse item IDs for Weekly membership purchases.
2. Loyverse item IDs for Monthly membership purchases.
3. How `Number of Kids` is encoded in the receipt.
4. Exact start/end date rules for weekly and monthly memberships.
5. What should happen if a corrected receipt update arrives after a membership was created.
6. Whether receipt refunds should archive/reverse memberships later, or only alert staff.

Detailed local implementation plan: `temp/membership-automations-implementation-plan.md`.
