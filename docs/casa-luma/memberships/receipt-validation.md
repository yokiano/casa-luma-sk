# Membership and Flexi Receipt Validation

The receipt validation suite is async-capable and uses Neon receipt history as the balance source of truth.

## Membership

`MEMBERSHIP_ENTRY_WITHOUT_VALID_MEMBERSHIP` runs for `Member Valid Visit`, requires a customer, matches the customer to a Family, and requires a membership covering the receipt date.

## Flexi check-in

`FLEXI_CHECKIN_WITHOUT_AVAILABLE_PASS` runs for `Flexi Entrance` and requires:

- an approved `1 kid` through `5 kids` variant
- quantity `1`
- an attached Loyverse customer
- at least one usable Flexi hour remaining, regardless of child count

Entrance records check-in only. It never reduces balance. `FLEXI_CHECKIN_INVALID_VARIANT` is emitted for missing or malformed child-count data.

## Flexi checkout

`FLEXI_CHECKOUT_WITHOUT_AVAILABLE_PASS` runs for `Flexi Checkout` and requires:

- one approved `1 hour` through `8 hours` variant
- quantity exactly `1`
- an attached Loyverse customer
- enough balance for the selected value

The selected value is the total holes punched for this visit only. It is not elapsed time and not the cumulative holes already on the physical card. `FLEXI_CHECKOUT_INVALID_VARIANT` is emitted for unknown/missing variants, quantity other than `1`, multiple Checkout lines, malformed history, or any case where the application cannot safely determine visit punches. It never guesses.

Refunds and cancelled receipts are skipped. Historical usage on retained variant `1ac06b7d-7b94-4f7b-98d3-be0b93a5f930` remains one punch per quantity.

Flexi card purchases (`Flexible Resident` and `flexible Regular`) grant `11` entries each. Usage automation updates `Entries Used` and `Entries Left` in Notion only for valid Checkout receipts. Entrance receipts are ignored by usage automation.

## Incident details and Telegram

New codes:

- `FLEXI_CHECKIN_WITHOUT_AVAILABLE_PASS`
- `FLEXI_CHECKIN_INVALID_VARIANT`
- `FLEXI_CHECKOUT_WITHOUT_AVAILABLE_PASS`
- `FLEXI_CHECKOUT_INVALID_VARIANT`

Stored `FLEXI_ENTRY_WITHOUT_AVAILABLE_PASS` incidents remain renderable for historical compatibility. Incident context includes item/variant identifiers, selected visit punches, reason, and balance before/after the receipt. Generic missing-customer validation excludes Flexi lines so staff do not receive duplicate findings.

## Efficiency

No Neon lookup occurs when the relevant Flexi line is absent. Malformed or ambiguous Checkout data stops before balance or Notion mutation. The separate paid one-hour Open Play item remains governed by its own 60/75-minute rule.

## Cashier workflow

1. Attach the correct customer.
2. Add `Flexi Entrance`, choose the number of kids, and keep the 0-baht ticket open.
3. At departure, punch only the holes earned by this visit.
4. Count those new holes and add `Flexi Checkout` to the same ticket.
5. Choose the matching hours variant, leave quantity at `1`, and close the ticket.

Examples: `1 kid` plus one new hole means `1 hour`; `3 kids` plus two new holes means `2 hours`; four new holes means `4 hours`, even if the card has older holes. Do not create pairing violations or infer sessions from timestamps.
