# Flexi Entrance and Checkout Runbook

## Semantics

`Flexi Entrance` is a zero-price check-in marker. Select `1 kid` through `5 kids`, use quantity `1`, attach the Loyverse customer, and keep the ticket open.

`Flexi Checkout` is a zero-price usage marker. It retains Loyverse item ID `a94027fa-dd55-43d2-a031-b358877f4752`. At departure, punch the physical card for this visit, count only the new holes, select `1 hour` through `8 hours`, use quantity `1`, and close the same ticket.

Checkout hours are not elapsed time and not the cumulative holes already on the card. Child count is not punch count. No application pairing violation is inferred from timestamps.

Each Flexi card purchase grants 11 entries. Entrance never consumes entries. Valid Checkout usage maps the selected variant directly to the visit punch total and updates Notion Flexi Pass `Entries Used` / `Entries Left` through receipt automation.

## Identity rules

- Item and variant IDs are authoritative. Runtime receipt logic does not match display names.
- Checkout item ID: `a94027fa-dd55-43d2-a031-b358877f4752`.
- Historical Checkout 1-hour variant ID: `1ac06b7d-7b94-4f7b-98d3-be0b93a5f930`. Historical receipts keep one punch per quantity interpretation.
- Checkout SKUs: `FLEXI-CHECKOUT-HOURS-01` through `08`.
- Entrance SKUs: `FLEXI-ENTRANCE-KIDS-01` through `05`.
- The new Entrance item and its variant IDs must be captured after the first Loyverse sync and added to `src/lib/receipts/open-play-items.ts`.
- Notion source pages: Checkout `31dfc77d-b4f3-80f6-8be0-d8cc4394c606`; Entrance `3aafc77d-b4f3-8151-9a9b-cc20034d2168`.

## Validation and automation

- `FLEXI_CHECKIN_WITHOUT_AVAILABLE_PASS`: missing customer or no usable balance.
- `FLEXI_CHECKIN_INVALID_VARIANT`: unknown/malformed child-count line.
- `FLEXI_CHECKOUT_WITHOUT_AVAILABLE_PASS`: missing customer, no purchase, or insufficient balance.
- `FLEXI_CHECKOUT_INVALID_VARIANT`: unknown/malformed variant, quantity not 1, multiple Checkout lines, or malformed usage history.
- Refunds and cancelled receipts are excluded from balance use.
- Unknown or ambiguous Checkout data never changes Notion counters.
- `FLEXI_ENTRY_WITHOUT_AVAILABLE_PASS` remains only for historical incident rendering.

## Safe sync procedure

1. Confirm the two Notion rows contain bilingual descriptions, `Has variants`, option names, valid `Variants JSON`, zero prices, stable SKUs, and the retained Checkout 1-hour variant ID.
2. Open `/tools/pos-sync` and use Open Play POS Items status. Review only the two Flexi rows.
3. Confirm ID-first matching for Checkout and no unexpected duplicate target name. Keep orphan deletion disabled. The Open Play sync never deletes unmatched Loyverse items.
4. Sync the Entrance row first and record its returned item ID and all five returned variant IDs.
5. Sync the Checkout row and confirm the retained 1-hour variant ID remains unchanged and all eight variants are present.
6. Refresh status. Both rows must be `SYNCED`; descriptions, option name, prices, SKUs, and variant IDs must match.
7. Update runtime constants with the captured Entrance item/variant IDs, then deploy before cashier cutover.
8. Run controlled zero-price smoke receipts and reconcile Loyverse, Neon, Notion, and the physical card.

Do not use category-wide orphan deletion. Do not delete or recreate the retained Checkout item or variants after receipts exist. The paid one-hour Open Play item `e034b61e-88e0-43bc-a72b-eec3a301a7b2` is unrelated and must retain its existing 60/75-minute behavior.

## Rollback

Before cashier cutover, restore the Notion snapshot and resync only the retained Checkout item without deleting it. After new receipts exist, preserve all item and variant IDs and deploy compatibility logic rather than deleting or recreating POS objects. Reconcile any affected receipts from the cutover timestamp.
