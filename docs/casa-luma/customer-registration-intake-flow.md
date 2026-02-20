# Customer Registration Intake Flow

This document describes the backend flow for customer intake registration and how Notion + Loyverse sync is handled.

## Goals

- Always create the family intake record in Notion first.
- Retry Loyverse customer creation/update on transient failures.
- Do not surface Loyverse sync failures directly to the customer.
- Trigger downstream push notification only after Loyverse customer creation succeeds.

## Current Server Entry Points

- Page actions: `src/routes/customer-intake/+page.server.ts`
  - `submit`: accepts serialized intake payload and calls `submitIntakeForm(...)`.
  - `check`: checks if a customer already exists in Loyverse by phone/email.
- Core orchestration: `src/lib/server/intake-actions.ts`

## Submit Flow (Happy Path)

1. Validate required fields (`familyName`, `mainPhone`).
2. Create family page in Notion (`FamiliesDatabase`).
3. Assign and persist customer code (`assignFamilyCustomerCode`).
4. In parallel:
   - Create family member pages (kids/caregivers) in Notion.
   - Sync customer to Loyverse with retry (`syncFamilyToLoyverseWithRetry`).
5. If Loyverse sync succeeds:
   - Save `loyverseCustomerId` into Notion family page.
   - Call `notifyAfterSuccessfulLoyverseCreation(...)` hook.
6. Update Notion family `members` relation with created member page IDs.
7. Return `{ success: true, customerCode }` to the UI.

## Loyverse Retry Mechanism

Implemented in `src/lib/server/intake-actions.ts` as `syncFamilyToLoyverseWithRetry(...)`.

- Attempts: 6 total.
- Backoff: exponential (`800ms`, `1600ms`, `3200ms`, ...).
- Behavior per attempt:
  - `loyverse.createOrUpdateCustomer(...)` with customer code + identity fields.
  - If returned name does not match expected `[customerCode]` suffix format, immediately run a second upsert by `id` to enforce naming.
- Success result: `{ ok: true, customerId }`.
- Exhausted retries: `{ ok: false, lastError }` (logged server-side).

## Notification Hook Contract

`notifyAfterSuccessfulLoyverseCreation(...)` is intentionally a placeholder hook and is called only when Loyverse sync succeeds.

Payload contract:

- `familyPageId: string`
- `customerCode?: string`
- `loyverseCustomerId: string`

This ensures future push notifications are emitted only after Loyverse is confirmed.

## Failure Semantics

- Notion family/member creation is still the primary persisted source of truth.
- Loyverse sync failure after all retries is logged but not shown to the customer.
- Intake submit response remains successful for customer UX continuity.

## Operational Notes

- Since Loyverse is an external dependency, network and API availability can still fail.
- Retries reduce transient failures but do not eliminate all failure modes.
- To improve recovery further, consider adding a background reconciliation job that retries Notion families missing `Loyverse Customer ID`.
