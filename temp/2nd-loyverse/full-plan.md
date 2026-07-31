# Second Loyverse Receipt Mirroring

Status: implementation plan, updated from the answers in [`questions.md`](./questions.md).

This file is the readable plan index. Detailed work is split into three module plans:

1. [`plans/01-foundation-and-entities.md`](./plans/01-foundation-and-entities.md)
2. [`plans/02-live-webhook-mirroring.md`](./plans/02-live-webhook-mirroring.md)
3. [`plans/03-backfill-and-agent-loop.md`](./plans/03-backfill-and-agent-loop.md)

Resolved choices are summarized in [`decisions.md`](./decisions.md). The original receipt-creator note now points here.

## Goal

Mirror a deterministic 50% sample of eligible production Loyverse sales into the second Loyverse account for business analysis and automation testing.

The system must:

- lazily create missing target entities needed by a receipt;
- create one target sale for one selected source sale;
- persist source-to-target receipt identity and every attempt in Neon;
- never break production webhook processing;
- notify Telegram when a live webhook mirror attempt fails;
- support incremental historical backfill with aggregated failure reports;
- let an agent repeatedly run, inspect, fix, and rerun until all supported selected receipts succeed.

## Simplified v1 scope

### Included

- non-cancelled `SALE` receipts;
- deterministic, approximately 50% cohort selected by a versioned hash;
- items and ordinary variants;
- categories;
- taxes;
- modifiers and modifier options;
- ordinary fixed/variable receipt and line discounts;
- one payment per receipt, using manually configured target payment types matched by name;
- historical `receipt_date`;
- source receipt reference in target `order` and `note`;
- live best-effort mirroring after primary webhook processing;
- manual incremental backfill and reconciliation.

### Intentionally omitted

- customers;
- employees;
- refunds;
- cancelled receipts;
- customer loyalty and points state;
- tips and surcharges, because the create endpoint does not expose them as ordinary writable fields;
- point-based discounts when they depend on customer loyalty;
- automatic scheduled retries or a separate worker in v1;
- continuous full-account synchronization;
- automatic mutation or deletion of existing target entities;
- true composite/BOM items until source inventory proves they are needed.

Dropping customers is an explicit product decision. Target receipts must not send `customer_id`, even when the source receipt has one. Add a concise code comment near this projection because the omission is intentional and non-obvious.

## Architecture at a glance

```text
Production receipt webhook
  -> existing validation/ingestion/automations complete
  -> 2nd-loyverse eligibility + deterministic cohort
  -> persist transfer row
  -> best-effort awaited mirror attempt
       -> bulk-load/cache entity inventories
       -> resolve by unique normalized names
       -> create missing supported entities
       -> build writable target receipt
       -> reconcile target marker
       -> POST target receipt
       -> persist target receipt number
  -> isolate any mirror failure from production webhook response
  -> Telegram only for live failure

Historical Neon receipts
  -> 2nd-loyverse backfill CLI
  -> same eligibility, cohort, resolver, builder, and transfer service
  -> no Telegram
  -> aggregate report
  -> agent fixes grouped failures and reruns failed rows
```

## Dedicated code boundary

All second-account behavior lives under:

```text
src/lib/server/2nd-loyverse/
```

Expected internal areas:

```text
config.ts
clients.ts
types.ts
normalize.ts
entities/
receipts/
transfers/
backfill/
db/
```

Allowed integration points outside the module:

- `src/lib/server/loyverse.ts`: account-neutral client/transport reuse only;
- `src/routes/api/webhooks/receipt/+server.ts`: one narrow post-processing call;
- `src/lib/server/db/schema.ts`: export module-owned Drizzle tables if required;
- `drizzle/*`: generated migration;
- `scripts/2nd-loyverse/backfill.ts`: thin CLI entry;
- `.env.example` and `package.json`: configuration and commands.

No matching, transformation, retry, or second-account policy belongs in integration files.

## Data model

V1 uses two lean tables, not a broad persistent entity-mapping system.

### `second_loyverse_receipt_transfers`

One row per source receipt key:

```text
<source merchant_id>:<source receipt_number>
```

It stores cohort decision, source fingerprint/version, status, attempt count, target marker, target receipt number, safe last error, and timestamps.

### `second_loyverse_receipt_attempts`

Append-only history for actual live, backfill, or reconciliation attempts. It stores references, request fingerprints, stages, bounded safe errors, target identifiers, and result metadata. It does not duplicate full receipt/customer payloads.

Detailed fields are in Plan 01.

## Entity identity strategy

V1 avoids a persistent source-to-target entity mapping table.

For each attempt or backfill batch:

1. Bulk-fetch paginated source and target inventories.
2. Build normalized-name indexes in memory.
3. Resolve each entity within its parent context.
4. Accept exactly one compatible candidate.
5. Create a missing entity when supported.
6. Update the in-memory target index after creation.
7. Fail clearly on duplicate names or incompatible definitions.

This does not make one API call per receipt item. A ten-item receipt uses the cached inventory/index. Backfill defaults to concurrency `1` to keep creation predictable.

If live concurrency or name ambiguity causes recurring problems, a durable entity map/claim table becomes a measured v2 improvement rather than mandatory v1 infrastructure.

## Receipt duplicate prevention

For sales:

```text
source = casa-luma-2nd-loyverse
order  = lv2:<stable digest of source receipt key>
note   = ... [Mirrored from <merchant_id>:<receipt_number>]
```

Before POST, query target receipts by `source` and `order`. Neon remains authoritative because Loyverse does not guarantee `order` uniqueness.

A POST timeout is `ambiguous`, not an ordinary failure. Reconcile by the marker before any manual rerun can POST again.

## Execution stages

### Stage 1: foundation and entities

Implement account-aware client reuse, module types, two tables, cohort logic, normalized-name inventory indexes, and entity resolvers.

### Stage 2: live transfer service

Implement eligibility, sale projection, marker reconciliation, receipt POST, attempt recording, production webhook isolation, and live Telegram failure reporting.

### Stage 3: historical iteration

Implement the backfill CLI, grouped reports, failed-row reruns, and controlled batch expansion until all supported selected receipts succeed.

### Stage 4: activation

1. Deploy schema and code with mirroring disabled.
2. Backfill one simple receipt.
3. Expand through representative complexity groups.
4. Reach zero unexplained failures for a meaningful selected historical window.
5. Enable the live feature flag.
6. Monitor webhook latency and live failure notifications.
7. Add a worker/retry scheduler only if measured failures justify it.

## Feature configuration

```text
LOYVERSE_2_ACCESS_TOKEN=
LOYVERSE_2_STORE_ID=
LOYVERSE_2_MIRROR_ENABLED=false
```

The v1 50% sampling threshold is fixed and versioned in code. Existing cohort decisions never change.

## Definition of success

A selected supported sale succeeds when:

- one transfer row exists;
- all referenced supported entities resolve unambiguously;
- the target payload contains only target-account IDs;
- customer, employee, loyalty, tips, and surcharge data are intentionally omitted;
- exactly one compatible target receipt exists;
- target `order` and `note` identify the source sale;
- target receipt number is stored in Neon;
- every attempt is traceable;
- backfill reports no unexplained failed or ambiguous selected sale.

Refunds, cancellations, true composite items, and other explicitly unsupported cases are reported as skipped/unsupported, not counted as successful transfers.

## Checks

Use focused Vitest tests. Per project instructions, never run `pnpm check`, `svelte check`, or `pnpm build`.
