# Flexi Entrance and Checkout Runbook

## Semantics

`Flexi Entrance` is a zero-price check-in marker. Select `1 kid` through `5 kids`, use quantity `1`, attach the Loyverse customer, and keep the ticket open.

`Flexi Checkout` is a zero-price usage marker. At departure, punch the physical card for this visit, count only the new holes, select `1 hour` through `8 hours`, use quantity `1`, and close the same ticket.

Checkout hours are not elapsed time and not the cumulative holes already on the card. Child count is not punch count. No application pairing violation is inferred from timestamps.

Each Flexi card purchase grants 11 entries. Entrance never consumes entries. Valid Checkout usage maps the selected variant directly to the visit punch total and updates Notion Flexi Pass `Entries Used` / `Entries Left` through receipt automation.

## Identity rules

- Item and variant IDs are authoritative. Runtime receipt logic does not match display names.
- Historical Checkout item ID: `a94027fa-dd55-43d2-a031-b358877f4752`.
- Historical optionless variant ID: `1ac06b7d-7b94-4f7b-98d3-be0b93a5f930`. Historical receipts keep their quantity-based punch interpretation.
- Active Checkout item ID: `cf3ea669-d995-4d46-8d31-d2d6e3f91410`.
- Active Entrance item ID: `04f17ebd-9bf1-4bb2-85d1-535872de5622`.
- Their captured variant IDs are mapped in `src/lib/receipts/open-play-items.ts` without removing the historical IDs.
- Checkout SKUs: `FLEXI-CHECKOUT-HOURS-01` through `08`.
- Entrance SKUs: `FLEXI-ENTRANCE-KIDS-01` through `05`.
- Notion source pages: Checkout `31dfc77d-b4f3-80f6-8be0-d8cc4394c606`; Entrance `3aafc77d-b4f3-8151-9a9b-cc20034d2168`.

## Validation and automation

- `FLEXI_CHECKIN_WITHOUT_AVAILABLE_PASS`: missing customer or no usable balance.
- `FLEXI_CHECKIN_INVALID_VARIANT`: unknown/malformed child-count line.
- `FLEXI_CHECKOUT_WITHOUT_AVAILABLE_PASS`: missing customer, no purchase, or insufficient balance.
- `FLEXI_CHECKOUT_INVALID_VARIANT`: unknown/malformed variant, quantity not 1, multiple Checkout lines, or malformed usage history.
- Refunds and cancelled receipts are excluded from balance use.
- Unknown or ambiguous Checkout data never changes Notion counters.
- `FLEXI_ENTRY_WITHOUT_AVAILABLE_PASS` remains only for historical incident rendering.

## Safe creation and cutover

Loyverse API cannot add or delete option slots on an existing item. Do not try to convert the historical optionless item through `/tools/pos-sync`.

1. Keep the historical item and variant. Never delete or recreate either identity.
2. Create a new `Flexi Checkout` item in `Entry`, with option `Hours punched this visit`, values `1 hour` through `8 hours`, fixed price `0`, and the stable Checkout SKUs. A new item may be created through Open Play sync; only in-place option-slot changes are blocked.
3. Create `Flexi Entrance` in `Entry`, with option `Number of kids entering`, values `1 kid` through `5 kids`, fixed price `0`, and the stable Entrance SKUs.
4. Read both new items from Loyverse and record their item IDs and every variant ID. Confirm names, descriptions, category, option names, prices, and SKUs.
5. Set both `ID` and `LoyverseID` on the two Notion rows to the new item IDs. Write the returned variant IDs into `Variants JSON`. The Checkout row must no longer point to the historical item.
6. Add the new item and variant IDs to `src/lib/receipts/open-play-items.ts`. Keep the historical Checkout item and variant constants permanently for receipt replay and balance history.
7. Deploy the compatibility code before cashier cutover. Refresh `/tools/pos-sync`; both new rows must be `SYNCED`.
8. Rename the historical POS item clearly as legacy and disable its availability for sale at the active store if Back Office supports that without deleting it.
9. Run controlled zero-price smoke receipts and reconcile Loyverse, Neon, Notion, and the physical card.

Open Play sync blocks option-slot changes before any Loyverse write. After a failed create response, it re-reads Loyverse before allowing another attempt so an ambiguous `500` cannot be blindly retried into a duplicate.

Do not use category-wide orphan deletion. The Open Play sync never deletes unmatched Loyverse items. The paid one-hour Open Play item `e034b61e-88e0-43bc-a72b-eec3a301a7b2` is unrelated and must retain its existing 60/75-minute behavior.

## Rollback

Before cashier cutover, leave the historical item active and do not use the two new items. After new receipts exist, preserve all old and new item/variant IDs and deploy compatibility logic rather than deleting or recreating POS objects. Reconcile any affected receipts from the cutover timestamp.
