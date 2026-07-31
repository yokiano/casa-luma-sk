# Second Loyverse Decisions

Source: the user’s inline answers in [`questions.md`](./questions.md).

## Resolved

1. **Name:** use `2nd-loyverse` everywhere.
2. **Receipts:** process sales only. Skip refunds and cancelled receipts.
3. **Entity identity:** prefer unique normalized-name matching and in-memory indexes. Do not add a persistent entity-mapping table in v1 unless actual failures justify it.
4. **Customers:** intentionally omit customers entirely. Never send source customer IDs.
5. **Payment types:** manually created with matching names in both accounts. Resolve by unique normalized name.
6. **Webhook isolation:** run mirroring only after existing webhook work. Persist first, await one best-effort attempt, catch all mirror errors, and never change the production webhook result because the sandbox failed.
7. **Telegram:** live webhook mirror failures only. Backfill produces aggregated reports instead.
8. **Storage:** keep transfer/attempt rows lean and reference the existing source receipt data rather than duplicating payloads.
9. **Retries:** no automatic scheduler or separate worker in v1. Manual backfill reruns failures. Ambiguous POSTs must still reconcile before another POST.
10. **Currency/tax:** second account is configured with the same currency and tax setup. Code still verifies name/type/rate compatibility.
11. **Loyalty/tips/surcharges:** ignore loyalty state, tips, and surcharges. Ordinary discounts remain supported. Point-based discounts are unsupported when customer loyalty is required.
12. **Source mutation:** no update/cancellation synchronization. Retain defensive detection and never create a second target receipt for one source key.
13. **Variants/modifiers:** support ordinary variants, modifiers, and modifier options.

## Clarification: composite items

A true Loyverse composite item is not the same as an item with variants or modifiers. It contains component variant IDs and behaves like a bill of materials.

V1 assumption:

- variants: supported;
- modifiers/options: supported;
- true `is_composite=true` items: report as unsupported unless initial inventory inspection proves they must be implemented.

This preserves the requested simple infrastructure without silently copying source-account component IDs.

## API caveats retained despite simplification

- Loyverse has no documented direct item-by-name query. Name matching uses paginated bulk fetch plus local indexing.
- A future refund cannot be known when its sale arrives. The enforceable rule is to skip refund receipts when received, not retroactively remove an already mirrored sale.
- Source receipts expose `updated_at` and `cancelled_at`, so defensive change detection remains useful even if staff never edits receipts.
- Dropping tips, surcharges, loyalty, or point discounts can produce target totals different from source totals. This is intentional and must appear in reports.
