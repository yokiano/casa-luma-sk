# Membership and Flexi Data Model

Receipt validation connects Loyverse receipt data in Neon with Casa Luma customer and membership data in Notion.

## Notion databases

- Families: `👨‍👩‍👧‍👦 Families` (`4dd6c32d9b0244fbbed6e6b41033e598`)
  - Generated SDK: `src/lib/notion-sdk/dbs/families/`
  - `Families.Loyverse Customer ID` maps to Loyverse/Neon `receipts.customer_id`.
- Memberships: `🎫 Memberships` (`4267d8b54c9343b39b0b6941ccf79145`)
  - Generated SDK: `src/lib/notion-sdk/dbs/memberships/`
  - Membership validity is checked with `Family`, `Start Date`, and `End Date` for the receipt date.
- Open Play POS Items: `🎟️ Open Play POS Items` (`6324a9fa968d4e719608c7c1c6a64c93`)
  - Generated SDK: `src/lib/notion-sdk/dbs/open-play-pos-items/`.
  - Sync resolves `LoyverseID` and legacy `ID` explicitly. Conflicting values block sync; the legacy value is preserved.

## Hardcoded Open Play item IDs

These constants live in `src/lib/receipts/open-play-items.ts` and are used by receipt validation:

| Purpose | Item name | Item ID |
| --- | --- | --- |
| Membership entry usage | `Member Valid Visit` | `dd4303a3-0bfb-49ed-95bc-fd65b853d22b` |
| Flexi check-in marker | `Flexi Entrance` | Loyverse ID captured after first sync |
| Flexi card purchase | `Flexible Resident` | `483c66bc-ee06-411c-95b6-f39a7491d09a` |
| Flexi checkout usage | `Flexi Checkout` | `a94027fa-dd55-43d2-a031-b358877f4752` |
| Flexi card purchase | `flexible Regular` | `360020d1-3ecd-43c2-97c8-c6ff4da754d4` |

Each flexi card purchase grants `11` entries (`FLEXI_PASS_ENTRIES_PER_CARD`). `Flexi Entrance` variants `1 kid` through `5 kids` record check-in only and never consume balance. `Flexi Checkout` variants `1 hour` through `8 hours` record the total holes punched for this visit, with quantity exactly `1`, and consume that selected number directly. SKUs are stable pre-sync contracts: `FLEXI-ENTRANCE-KIDS-01` through `05` and `FLEXI-CHECKOUT-HOURS-01` through `08`; final Loyverse item/variant IDs are recorded after sync.

## Notion flexi records

Flexi purchases use a dedicated Notion database: `🎟️ Flexi Passes`.

- Generated SDK: `src/lib/notion-sdk/dbs/flexi-passes/`
- Database ID: `b1e1d005-eaf0-4dc3-9d25-8d7df3404b36`
- Created under the Open Play page.
- The intentionally archived duplicate database `81b2e172-fe5a-4870-8e36-41ed03b1a42f` is listed in `notion-sdk.json` `ignore` so generation stays stable.

Do **not** reuse `Memberships.Number of Kids` for card count. Do **not** store essential structured flexi data only in `Notes`; notes are for human/provenance notes.

Current flexi properties:

| Property | Type | Purpose |
| --- | --- | --- |
| `Name` | title | Human-readable pass/receipt label |
| `Family` | relation to Families | Staff-visible owner |
| `Loyverse Customer ID` | rich text | Receipt/customer lookup and backfill key |
| `Card Count` | number | Number of purchased flexi cards |
| `Entries Granted` | number | Usually `Card Count × 11` |
| `Entries Used` | number | Deducted entries or imported usage count |
| `Entries Left` | formula/number | Remaining usable entries |
| `Valid From` | date | Purchase/activation date |
| `Valid Until` | date | 60-day inclusive expiry date |
| `Source Receipt Number` | rich text | Idempotency and staff lookup |
| `Source Receipt Key` | rich text | Merchant-aware idempotency key |
| `Source Receipt URL` | url | Link back to receipt tools |
| `Source Line Indexes` | rich text | Receipt-line provenance |
| `Source Item IDs` | rich text/multi-select | Flexi item provenance |
| `Automation Status` | select | `Active`, `Refunded`, `Manual Review`, etc. |
| `Refund Receipt Number` | rich text | Refund provenance when applicable |
| `Notes` | rich text | Actual staff notes only |

Automation creates one `Flexi Passes` row per eligible purchase receipt. A receipt quantity of `2` creates one row with `Card Count = 2`, `Entries Granted = 22`, `Entries Used = 0`, and `Entries Left = 22`.

## Neon receipt fields

- `receipts.customer_id` stores the attached Loyverse customer ID.
- `receipt_line_items.item_id`, `variant_id`, `variant_name`, and `sku` are retained for variant-aware matching.
- `receipts.receipt_date` / `receipts.created_at` are used for chronology.
- Refund and cancelled receipts are excluded from balance usage.
- The retained checkout variant ID `1ac06b7d-7b94-4f7b-98d3-be0b93a5f930` keeps historical one-punch-per-quantity interpretation.

## Server helpers

- Membership lookup: `src/lib/server/membership-validation.ts`
- Flexi balance lookup: `src/lib/server/db/flexi-pass-queries.ts`
