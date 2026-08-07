# Balance reconciliation dashboard

Route context:

- Daily overview: `src/routes/mgmt-dashboard/+page.svelte`
- Dedicated detail page: `src/routes/mgmt-dashboard/reconciliation/+page.svelte`

## Purpose

The reconciliation view shows what Casa Luma **should have** according to accepted baselines plus recorded movements, then compares that with observed evidence from KBank and the safe.

The core question is:

- Expected bank + safe cash: how much should exist?
- Actual latest balance: what did KBiz/safe-count evidence last report?
- Difference: is the gap explained, stale, or requiring action?

## Current cash model

Casa Luma does **not** track the cashier/register as a reconciliation account, and there is no petty cash account.

Cash flow is represented as:

1. Customers pay cash during the day.
2. Cash starts in the cashier/register operationally, then moves to the safe at end of day — **no Financial Ledger row for this handoff**.
3. Small cash expenses can be paid from the cashier/register or backup bag during the day.
4. At end of day, those cash expenses are entered in Notion `Financial Ledger`.
5. Remaining daily cash goes to the safe (one bag per day).
6. Safe cash is deposited to KBank weekly; a backup/change bag stays in the safe.
7. Weekly deposit events are documented in `Financial Ledger` with “cash deposit” or “safe deposit” text.

For reconciliation, this is one cash bucket:

- `Safe / Cash on hand` — everything in the safe (daily bags + backup/change bag) after cash sales, cash expenses, and weekly deposits out.

The register is just a daily operating handoff point. It is not a long-lived balance account on the dashboard.

### Scan / card settlement (Casa Luma specific)

Loyverse scan/QR and credit card payments **settle to KBank the same business day**. The dashboard therefore increases **expected KBank** directly from Loyverse receipt payments — not a pending clearing bucket.

This avoids a false bank difference where actual KBank (already including settled scan/card) is compared against expected KBank that still treats those sales as “pending clearing.”

Optional `Scan/QR Clearing` and `Credit Card Clearing` snapshot accounts remain available for manual tracking, but Loyverse does not populate them. If card processing fees reduce the KBiz deposit below gross Loyverse card sales, record the fee as a KBank expense in Financial Ledger.

## Accounting model

Expected balances should not start from zero. They need an anchor, but that anchor can be a snapshot.

```text
expected balance = last accepted snapshot + ledger/receipt movements since that snapshot
```

The first accepted snapshot is the practical opening balance. Later accepted snapshots become new cutoffs. New unaccepted snapshots are actual observations used to expose discrepancies.

Do not automatically use the newest snapshot as the anchor, because that would reset expected balance and hide discrepancies. Snapshots need:

- `Snapshot Role` = `Accepted Baseline` for calculation anchors.
- `Status` = `Accepted` before the dashboard uses the snapshot as a baseline.
- `Snapshot Role` = `Observed` for ordinary current balance evidence.

## Required baseline setup

The MVP requires accepted baseline snapshots for:

- `KBank`
- `Safe / Cash on hand`

If only KBank exists, the dashboard will still show the available snapshot, but the reconciliation status remains `setup required` because the safe bucket has no valid starting point.

### Minimum Notion data to see meaningful results

| Priority | What to add | Blocks |
|---|---|---|
| Required | `Safe / Cash on hand` snapshot with `Snapshot Role = Accepted Baseline`, `Status = Accepted` | Clears `setup_required` |
| Required for comparison | Latest **Observed** snapshots for `KBank` and `Safe / Cash on hand` | “Latest observed” total and difference |
| Optional but useful | One ledger `safe deposit` row after baseline date | Verifies safe→bank transfer mapping |
| Optional | Cash expense rows from close-shift (`Cash` / `Cash Register`) | Moves safe expected balance down |
| Not required for first view | Full historical ledger backfill, clearing baselines, SCB | Accuracy improves, but Loyverse receipts already move expected balances after baseline |

Ledger backfill is **not** blocking for first dashboard use. Once both baselines exist, expected balances already include Loyverse receipt payments after the baseline date even if ledger history is incomplete.

Current Notion `Balance Snapshots.Account` options:

- `KBank`
- `SCB`
- `Safe / Cash on hand`
- `Scan/QR Clearing`
- `Credit Card Clearing`

`Cash Register` and `Petty Cash` should not be used for new snapshots.

## Movement mapping

### Real-world steps → code behavior

| Step | Real-world | Code behavior | Ledger row needed? |
|---|---|---|---|
| 1 | Loyverse sales daily | Loyverse receipt payments after baseline | No |
| 2 | Scan/card settle to KBank EOD | Non-cash payments → expected **KBank** | No |
| 3 | Daily cash → safe bag | Cash payments → expected **Safe / Cash on hand** | **No** (register→safe is implicit) |
| 4 | Cash expenses from day’s bag | Financial Ledger expense, Cash payment method | Yes |
| 5 | Weekly safe → bank deposit | `Type = Bank Deposit Income` → transfer | Yes (weekly) |
| 6 | Scan/QR vendor expenses | Financial Ledger expense, Scan/Wire, KBank | Yes |
| 7 | Backup cash used | Same as cash expense | Yes |

### Loyverse receipts

- Cash payment: increases `Safe / Cash on hand`.
- Scan/QR payment: increases `KBank` (same-day settlement at Casa Luma).
- Credit card payment: increases `KBank` (same-day settlement at Casa Luma).
- Refund: reverses the original payment direction.

### Financial Ledger

Use **positive numbers** in `Amount (THB)` for every row. The dashboard applies direction from `Type`, payment method, and special transfer text — do not enter negative amounts unless you intentionally want to override a convention (deposits still use `Math.abs` internally).

- `Register Expense`: decreases `Safe / Cash on hand`.
- `Scan Expense`: decreases `KBank` unless a specific bank account is set.
- `Type = Refund`: decreases the selected account (manual non-POS refund).
- Vendor/supplier money **received back**: use `Owner Contribution` or a legacy `Income` row with non-Revenue category.
- `Owner draw` / `Dividend`: decrease the selected account.

### Weekly safe → bank deposit

Use **`Type = Bank Deposit Income`** in Financial Ledger:

- `Amount (THB)`: positive deposit amount
- `Payment Method`: `Wire Transfer` or `Scan`
- `Bank Account`: `KBank`
- `Description`: e.g. `Weekly bank deposit`

This moves expected balance from **Safe / Cash on hand** to **KBank** without changing bank + safe total.

Legacy rows with `cash deposit`, `safe deposit`, or `bank deposit` in description/notes still work.

### Scan / card settlement visibility

`Scan Income` and `Credit Card Income` are valid **ledger labels for audit**, but the dashboard **ignores them in expected-balance math** because Loyverse receipt payments already credit **KBank** for same-day scan/card sales. Do not enter both a Loyverse sale total and a matching Scan Income row for the same money.

### Financial Ledger types (current)

- `Register Expense` — cash paid from the day’s cash / backup bag (decreases safe)
- `Scan Expense` — scan/QR paid to vendor from bank (decreases KBank)
- `Expense from Backup`: cash paid from the safe backup bag (decreases safe)
- `Bank Transfer Expense`: bank transfer paid to a vendor (decreases the selected bank)
- `Bank Deposit Income` — safe → bank transfer
- `Scan Income` / `Credit Card Income` — audit trail only in reconciliation
- `Refund` — manual refund outflow (non-POS)
- `Owner Contribution` / `Owner Draw` / `Dividend`

Use **positive** `Amount (THB)` always. The dashboard applies direction from `Type`.

## Dashboard UX

The daily meeting page keeps a minimal reconciliation overview:

- Expected bank + safe total.
- Latest observed comparable total.
- Difference and status.
- KBank & safe table: expected vs latest snapshot per account.

The dedicated `Reconciliation` page adds:

- A manager CTA to submit current KBank and safe balances.
- A “Next action” panel for missing/stale evidence, setup, or variance review.
- Per-account time-aligned variance: actual snapshot balance minus expected balance at that snapshot's `Observed At` time. This avoids comparing an old cash count with movements that happened later.
- Baseline and movement columns in the same table.
- Notion links on each snapshot row.
- Settlement model notes (same-day scan/card → KBank).
- Recent ledger movements.
- Staff instructions: what to enter in Snapshots vs Ledger, setup_required, weekly rhythm.

## Daily Telegram reminder

The protected endpoint `/api/cron/financial-balance-reminder` is scheduled in `vercel.json` for `12:30 UTC` (`19:30 Asia/Bangkok`). It requires `Authorization: Bearer <CRON_SECRET>` and records one durable run per Bangkok calendar date in Neon, so duplicate invocations do not send twice after a successful run.

The reminder uses the dedicated `EMAIL_AUTOMATION_FINANCIAL_TELEGRAM_CHAT_ID` destination and optional `EMAIL_AUTOMATION_FINANCIAL_TELEGRAM_MESSAGE_THREAD_ID`. The dry-run and delivery test is:

```bash
pnpm telegram:financial-test
pnpm telegram:financial-test -- --send
```

Before deployment, configure a strong `CRON_SECRET` in Vercel. The app returns `503` rather than exposing an unprotected cron endpoint when it is missing.

## Data ownership

- Ledger records: business activity that changes expected balances.
- Balance snapshots: observed reality from KBiz, safe counts, or settlement reports.
- Reconciliation explanations: future human classification of differences.

Do not put balance snapshots into the Financial Ledger as normal records.

## Implementation notes

MVP storage is the Notion `Balance Snapshots` database under Finance (`bb838f91-3dee-433c-92a9-b239ae86709c`).

Snapshot properties:

- `Account`
- `Observed At`
- `Balance THB`
- `Snapshot Role`: `Observed` or `Accepted Baseline`
- `Status`: `Draft`, `Needs Review`, `Accepted`, `Superseded`
- `Source`
- `Proof`
- `Notes`

Manager submissions create exactly two pages with fixed server-side values:

- `Account`: KBank and `Safe / Cash on hand`
- `Snapshot Role`: `Observed`
- `Status`: `Needs Review`
- `Source`: `Manual`
- One shared Bangkok observation timestamp

The submitted observations are evidence for review. They are not verified baselines, and the May 2026 baseline authenticity remains unconfirmed.

If Notion database properties/options used by `src/lib/notion-sdk/**` change, run:

```bash
pnpm notion:generate
```

Project constraint: do not run `pnpm check`, `svelte check`, or `pnpm build`.
