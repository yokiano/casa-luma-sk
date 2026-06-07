# Membership and Flexi Receipt Validation

The receipt validation suite is async-capable, so rules can await Notion and Neon lookups while existing synchronous rules continue to work.

## Rules

### `MEMBERSHIP_ENTRY_WITHOUT_VALID_MEMBERSHIP`

Triggers only when the receipt contains `Member Valid Visit`.

Validation steps:

1. Skip refunds.
2. Require `receipt.customer_id`.
3. Query Notion Families where `Loyverse Customer ID` contains the customer ID, then confirm an exact normalized match.
4. Query Notion Memberships related to the Family.
5. Require at least one membership whose `Start Date` is on/before the receipt date and whose `End Date` is on/after the receipt date.

Finding reasons:

- `missing_customer`
- `family_not_found`
- `no_active_membership`

### `FLEXI_ENTRY_WITHOUT_AVAILABLE_PASS`

Triggers only when the receipt contains `Flexi Single Entrance`.

Validation steps:

1. Skip refunds.
2. Require `receipt.customer_id`.
3. Query Neon receipt history for that customer and merchant up to the current receipt time.
4. Count flexi card purchases (`Flexible Resident`, `flexible Regular`) as `11` passes each.
5. Count flexi single entrance line quantities as used passes.
6. Because webhook validation runs after ingestion, compute balance before the current receipt by adding the current receipt's flexi quantity back to the aggregate after-current balance.
7. Alert when the balance before the current receipt is lower than the current receipt's flexi entry quantity.

Note: flexi card purchase automation writes structured rows to the dedicated `🎟️ Flexi Passes` database, and flexi usage automation synchronizes each active pass row's `Entries Used` / `Entries Left` counters after usage receipts are ingested. This validation rule still uses Neon receipt-history balance as the source of truth so alerts remain idempotent and independent from Notion counter drift. A future validation pass may use `Flexi Passes` as primary and receipt history as fallback/reconciliation.

Finding reasons:

- `missing_customer`
- `no_flexi_purchase`
- `insufficient_remaining_entries`

### `RECEIPT_CLOSED_WITHOUT_CUSTOMER`

Triggers when a non-refund, non-cancelled receipt has no `customer_id`.

This rule is intentionally global at first: it is not limited to Open Play item IDs. If Telegram noise is too high, add an `openPlayOnly` option later and scope it to membership/flexi/open-play items.

## Dashboard triage

Membership and flexi validation findings appear in `/mgmt-dashboard/violations`, grouped by their underlying validation codes (`MEMBERSHIP_ENTRY_WITHOUT_VALID_MEMBERSHIP` and `FLEXI_ENTRY_WITHOUT_AVAILABLE_PASS`). Use the linked incident detail pages there for day-to-day triage; `/tools/incidents` is now a legacy/debug incident list.

## Telegram alerts

Telegram messages start with human labels:

- `Receipt Violation — Membership Entry Without Valid Membership`
- `Receipt Violation — Flexi Entry Without Available Pass`
- `Receipt Alert — Closed Without Customer`

The webhook stores full details in the incident payload, but passes compact context fields for Telegram: reason, customer ID, Family, checked date, entry quantities, and flexi balance counts.

## Efficiency

Notion and Neon helpers are only called after the relevant receipt line appears:

- no `Member Valid Visit` -> no Notion lookup
- no `Flexi Single Entrance` -> no flexi history query
- missing customer for those items -> immediate finding, no external lookup

## Operational SOP (Check-In Workflow)

Because receipt validations are post-facto (running after a ticket or receipt is closed on Loyverse), they cannot block register transactions before payment. To prevent validation alerts from arriving too late (e.g., after the customer has stayed, eaten, and left), the venue enforces the following standard operating procedure (SOP):

1. **Immediate 0-Baht Receipts:** When a customer checks in under a weekly/monthly membership or a flexi pass, the staff must immediately add the check-in item (`Member Valid Visit` or `Flexi Single Entrance`) on the Loyverse POS.
2. **Immediate Ticket Closure:** Staff must **immediately close and pay** this check-in ticket (generating a 0-Baht receipt) right as the family walks in, *before* letting them enter and *before* opening any ongoing open tab for food, drinks, or other retail items.
3. **Prompt Alerting:** This triggers the webhook and runs validations instantly on arrival. If the customer has an expired membership or insufficient flexi pass balance, staff will receive a Telegram alert within seconds, allowing them to handle the overspent pass with the parent immediately while they are still at the front desk or taking off their shoes.

