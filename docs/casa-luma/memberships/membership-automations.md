# Membership Automations

Membership automations run after Loyverse receipt-closed webhooks are ingested. Their purpose is to reduce manual Notion work around Casa Luma memberships.

The first planned automation is automatic creation of Notion `🎫 Memberships` rows from eligible membership purchase receipts.

## Current webhook context

Receipt webhooks are handled by `src/routes/api/webhooks/receipt/+server.ts`.

Current flow:

1. Parse receipt webhook payloads.
2. Ingest each receipt into Neon through `src/lib/server/db/ingest-receipt-webhook.ts`.
3. Run receipt validation rules and report violations.

Membership automations should run only for receipts whose ingestion result is `processed`. Duplicate and stale webhook events should not create or update memberships.

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

The first implementation should be conservative:

- Create memberships only for configured membership purchase item IDs.
- Skip refunds.
- Skip cancelled receipts.
- Require a receipt customer.
- Require an existing Notion Family linked to that Loyverse customer ID.
- Check for an existing automated membership for the same receipt before creating a new one.
- Report automation failures or missing Family/customer cases as receipt webhook incidents.

## Idempotency

Receipt ingestion already deduplicates webhook events. Membership automation should add its own Notion-level idempotency check before creating a page, because Notion writes are outside the Neon transaction.

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
