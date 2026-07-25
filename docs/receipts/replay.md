# Receipt webhook replay

Receipt replay is a manager-only recovery tool for stored receipt webhook envelopes. It never accepts an operator-supplied receipt payload.

## Sources

A replay must select one or more stored source IDs:

- `webhook_event`: reads `webhook_events.payload`.
- `processing_incident`: reads `reported_errors.payload` only when the row has `source = 'receipt-webhook'` and code `RECEIPT_WEBHOOK_PROCESSING_FAILED`.

The second source supports processing failures that happened before the initial `webhook_events` insert. The stored incident payload must still validate as the original Loyverse envelope. Validation incidents and arbitrary JSON payloads are rejected.

## Endpoint

The manager-protected endpoint is:

```text
POST /api/tools/receipt-replays
GET  /api/tools/receipt-replays?runId=<run-id>
```

This is intentionally an API-only troubleshooting tool. There is no replay page or normal operator workflow. Manager pages show a reminder near receipt and incident data, while this document is the operating procedure for agents.

The request must include the signed `casa_luma_tools_auth` manager session cookie. The route verifies the cookie again at the API boundary; a page-layout guard is not sufficient.

Every authenticated request with a valid replay selection sends one lightweight Telegram control alert and stores a `RECEIPT_WEBHOOK_REPLAY_REQUESTED` info incident. The alert includes the mode, selected source IDs, stages, and whether replay-generated alerts were requested. It never includes the stored receipt payload. This confirms that a replay request was accepted, not that the replay succeeded. Unauthenticated, invalid, or payload-bearing requests do not send this control alert.

### Default dry-run

This request reads event/receipt state and runs validation, but does not write receipt tables, Notion records, incidents, or Telegram messages:

```json
{
  "eventId": 123
}
```

The default is equivalent to:

```json
{
  "eventIds": [123],
  "mode": "dry_run",
  "notify": false,
  "targets": ["ingestion", "automations", "validation"]
}
```

Dry-run results include ingestion analysis such as `wouldCreateReceipt`, `wouldUpdateReceipt`, stale protection, duplicate status, and whether an unprocessed event is retryable. Automations report a limitation instead of running because they can create or update Notion records. Validation runs read-only checks and returns finding codes and severities. The audit row in `webhook_replay_runs` is the only replay write.

For an old failed insert incident, use its incident ID instead:

```json
{
  "incidentId": 456
}
```

A batch can use `eventIds` and/or `incidentIds`, with at most 10 selected sources. Processing is sequential and external-call concurrency is therefore bounded.

### Live replay

Live replay is disabled unless the deployment has:

```text
RECEIPT_REPLAY_ENABLED=1
```

It also requires a manager session and the explicit confirmation value `REPLAY`:

```json
{
  "eventId": 123,
  "mode": "live",
  "confirmation": "REPLAY",
  "notify": false
}
```

Live replay may ingest the stored envelope and run receipt automations and validation. It preserves the normal stale-event check and existing automation provenance/idempotency checks. A processed event remains a duplicate, an unprocessed event can be retried, and there is no force-overwrite option.

Live incidents are persisted by default. Telegram remains suppressed unless `notify: true` is explicitly requested in the same manager-confirmed live request. Replaying a processed event does not repeat post-ingestion automation or validation by default.

Targets can be narrowed to:

```json
{
  "eventId": 123,
  "mode": "live",
  "confirmation": "REPLAY",
  "targets": ["validation"],
  "notify": false
}
```

Allowed targets are `ingestion`, `automations`, and `validation`.

## Audit trail

Every selected source gets a row in `webhook_replay_runs` with:

- source type and source ID
- mode, selected stages, and notification flag
- pending/running/completed/failed status
- bounded stage/result summary
- sanitized error summary when applicable
- created, started, and completed timestamps

Use the returned `runId` with the GET endpoint to inspect the result. Result responses do not include raw webhook or incident payloads. The Telegram control alert is not a completion alert; always inspect the run rows and their stage summaries before reporting the outcome.

## Operational sequence

1. Apply the migration with `pnpm db:migrate:neon` against the approved Neon database.
2. Deploy the app with `RECEIPT_REPLAY_ENABLED` absent or `0`.
3. Confirm the endpoint is reachable and manager authorization works.
4. Run a dry-run for each existing processing incident candidate.
5. Review the audit result and stale/idempotency outcome.
6. Enable `RECEIPT_REPLAY_ENABLED=1` only when live recovery is needed.
7. Run the confirmed live replay with `notify: false` unless a Telegram alert is deliberately required.
8. Disable the flag again after recovery if live replay is not an ongoing operational capability.

Never paste a raw payload into the endpoint and never use a force-overwrite workaround for stale receipts.
