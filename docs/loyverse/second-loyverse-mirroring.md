# Second Loyverse receipt mirroring

The second Loyverse account is a sandbox for analysis and automation testing. The primary account remains the source of truth.

## Selection rules

For eligible non-cancelled `SALE` receipts, selection uses the primary payment type, which is also the payment used when building the target receipt:

- `Scan` and `Credit Card`: 100% selected.
- `Cash`: deterministic 30% cohort based on the source receipt key.
- Other or missing payment types: not selected.

Refunds, cancelled receipts, unsupported receipt types, composite items, and points discounts remain excluded.

The selection algorithm is `v2-payment-aware-sha256-cash-30pct`. Decisions are persisted in `second_loyverse_receipt_transfers` for idempotency. Existing succeeded or ambiguous rows retain their stored decision. Non-terminal rows are reclassified when they are seen under the new algorithm version.

## Configuration

```text
LOYVERSE_2_ACCESS_TOKEN=
LOYVERSE_2_STORE_ID=
LOYVERSE_2_MIRROR_ENABLED=false
```

Live webhook mirroring requires `LOYVERSE_2_MIRROR_ENABLED=true`. Backfill can process explicitly with `--process` while the live flag remains off.

## Backfill

Discover the selection without writing to the target account:

```bash
pnpm 2nd-loyverse:backfill -- --discover-only --date-from <iso> --date-to <iso>
```

Process selected receipts:

```bash
pnpm 2nd-loyverse:backfill -- --process --date-from <iso> --date-to <iso>
```

Use a small date window and `--limit` first. Reports are written under `temp/2nd-loyverse/runs/`.
