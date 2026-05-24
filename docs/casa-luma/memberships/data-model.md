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
  - Current receipt matching uses the Notion item `ID` / `userDefined:ID` value because the relevant `LoyverseID` field is blank.

## Hardcoded Open Play item IDs

These constants live in `src/lib/receipts/open-play-items.ts` and are used by receipt validation:

| Purpose | Item name | Item ID |
| --- | --- | --- |
| Membership entry usage | `Member Valid Visit` | `dd4303a3-0bfb-49ed-95bc-fd65b853d22b` |
| Flexi entry usage | `Flexi Single Entrance` | `a94027fa-dd55-43d2-a031-b358877f4752` |
| Flexi card purchase | `Flexible Resident` | `483c66bc-ee06-411c-95b6-f39a7491d09a` |
| Flexi card purchase | `flexible Regular` | `360020d1-3ecd-43c2-97c8-c6ff4da754d4` |

Each flexi card purchase currently grants `11` entrances (`FLEXI_PASS_ENTRIES_PER_CARD`).

## Neon receipt fields

- `receipts.customer_id` stores the attached Loyverse customer ID.
- `receipt_line_items.item_id` stores the item ID used for matching Open Play POS items.
- `receipts.receipt_date` / `receipts.created_at` are used for chronology.
- `receipts.receipt_type = 'REFUND'` is skipped by the membership/flexi/customer validation rules.

## Server helpers

- Membership lookup: `src/lib/server/membership-validation.ts`
- Flexi balance lookup: `src/lib/server/db/flexi-pass-queries.ts`
