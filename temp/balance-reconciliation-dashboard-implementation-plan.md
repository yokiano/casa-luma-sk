# Balance reconciliation dashboard implementation plan

Source concept: `temp/balance-reconciliation-plan.html`

Target routes:

- Daily overview: `src/routes/mgmt-dashboard/+page.svelte`
- Detail page: `src/routes/mgmt-dashboard/reconciliation/+page.svelte`

Persistent docs companion: `docs/casa-luma/tools/mgmt-dashboard/balance-reconciliation.md`

## Implementation status (2026-05-27)

Implemented in working tree:

- `src/lib/server/balance-reconciliation.ts` — read model from Notion snapshots + Company Ledger + Loyverse payments
- `getBalanceReconciliationDashboard()` in `src/lib/mgmt-dashboard.remote.ts`
- `src/lib/components/mgmt-dashboard/BalanceReconciliationPanel.svelte` — overview + detail variants
- Sidebar nav link and `/mgmt-dashboard/reconciliation` detail page
- Notion `Balance Snapshots` SDK under `src/lib/notion-sdk/dbs/balance-snapshots/**` (`pnpm notion:generate` run)
- Cash model revised: single bucket `Safe / Cash on hand`; Loyverse scan/card map to KBank (same-day settlement, not clearing buckets)
- Pure calculation helpers + unit tests in `src/lib/server/balance-reconciliation.logic.ts`

Still manual / not built yet:

- Notion setup: accepted baseline for `Safe / Cash on hand` (KBank baseline exists)
- Observed snapshots for ongoing comparison
- Internal admin form for snapshots (use Notion directly for now)
- Reconciliation explanations, bank import
- Company Ledger historical backfill (accuracy, not blocking first view)

## Goal

Add a balance reconciliation section to the management dashboard that answers one operational question:

> How much money should Casa Luma have right now, and how does that compare with what the bank/cash/POS evidence says actually exists?

The dashboard should not become a full accounting app at first. It should expose the expected balances, the latest observed balances, timing differences, and unexplained gaps that need action.


## Design revision from follow-up discussion

Use a **snapshot-first model** for MVP. A separate `financial_account_opening_balances` table is not strictly necessary if snapshots can be marked as accepted reconciliation anchors.

The important concept is not a special opening-balance table. The important concept is an **anchor**:

```text
expected balance now = last accepted snapshot balance + ledger movements after that snapshot
```

The first accepted snapshot is the opening balance. Later accepted snapshots become new reconciliation cutoffs. New unaccepted snapshots remain observations used to detect differences.

Do **not** automatically use the latest snapshot as the anchor, because that would hide discrepancies by resetting expected balance to reality every time. Instead, distinguish:

- `observed` snapshot — current bank/cash evidence to compare against expected.
- `accepted_baseline` / `reconciled` snapshot — a reviewed cutoff that the system may use as the next calculation anchor.

This can be implemented with one snapshots table or one Notion database, as long as each row has a status/role field.


## Key clarification: how to handle the initial bank balance

The expected balance cannot start from zero unless the real account started from zero. Normal reconciliation systems solve this with an **opening balance / cutover point**:

1. Choose a cutover timestamp, ideally end-of-day in Bangkok time, for example `2026-06-01 00:00 Asia/Bangkok` or the end of the previous bank statement day.
2. Record each real account balance at that cutover:
   - KBank / KBiz bank balance from the bank statement.
   - Safe / Cash on hand from a physical safe cash count.
   - Optional clearing balances for card/QR/scan if known, otherwise start them at zero and expect early timing differences.
3. Treat those numbers as **opening balances**, not sales and not expenses.
4. From that point forward, expected balance is:

```text
expected balance = opening balance + ledger movements since cutover
```

### Should we occasionally input the bank balance?

Yes, but not as ledger transactions. Periodic bank/cash balance reports are **actual observations** used for reconciliation. They should live in a separate table/database, because they do not describe business activity. They describe evidence.

Recommended split:

- **Ledger records**: business events that change expected balances — sales, expenses, deposits, fees, salary, owner contribution/draw, transfers.
- **Balance snapshots**: actual observed balances — KBiz current balance, statement closing balance, cash count, settlement report amount.
- **Reconciliation results**: comparisons between expected and actual — matched, explained timing difference, unresolved discrepancy, task needed.

This is exactly how reconciliation normally works: the ledger predicts what should exist, the bank/cash/POS sources report what does exist, and differences become explanations or corrections.

### Recommended operating rhythm

- Cash: count daily at close shift.
- Bank: import statement transactions when available; if not, manually enter KBiz current balance daily/weekly.
- Card/QR/scan clearing: check settlement reports or bank deposits weekly, with aging alerts for old pending money.
- Month end: lock/mark a reconciliation period as reviewed once all differences are explained.

Manual current-balance snapshots are useful even before bank import exists, because they force reality checks and expose discrepancies early.

## Product requirements

### Dashboard placement

Add a dedicated section in the management dashboard overview, ideally after the current `Expenses / Company Ledger` card and before `Events`, because it is directly related to daily money review.

Suggested section title:

- `Balance reconciliation`
- Subtitle: `What the books say should exist vs latest bank/cash evidence.`

### Required visible content

1. **Expected / “should be” headline**
   - Total expected cash + bank balance.
   - Expected per account: KBank, SCB if active, Safe / Cash on hand.
   - Pending clearing: Scan/QR clearing and Credit Card clearing.

2. **Actual latest observations**
   - Latest KBiz/KBank reported balance and observation age.
   - Latest cash count(s) and observation age.
   - Latest settlement report amount if available.
   - Missing/stale snapshot warning.

3. **Difference cards**
   - Total difference = actual observed - expected ledger balance for comparable accounts.
   - Explained timing differences.
   - Unexplained difference requiring action.

4. **Useful operational data**
   - Pending card/QR/scan settlement aging buckets: today, 1-2 days, 3-7 days, 8+ days.
   - Recent unreconciled bank/cash ledger records.
   - Old pending clearing items that should have arrived already.
   - Last reconciliation review date and reviewer, when available.

5. **Short instructions in a closed collapsible pane**
   - Use native `<details>` or the project’s disclosure component if one exists.
   - Closed by default.
   - Keep it short. It should explain only the daily mental model, not the full HTML plan.

Suggested closed summary:

```text
How this reconciliation works
```

Suggested content:

```text
The ledger predicts what should be in each money account from the opening balance plus recorded sales, expenses, deposits, fees, and owner movements. Bank/cash snapshots are actual observations. If expected and actual do not match, classify the gap as timing, missing record, fee, transfer, cash difference, or unknown.
```

### Empty/error states

- If no opening balance exists: show a blocking setup card, not `0 THB` as if it is valid.
- If snapshots are stale: show the expected balance but mark actual comparison as stale.
- If Notion or Neon data fails: preserve the rest of the dashboard and show a warning, matching the current `mgmt-dashboard` style.

## Data model

The current app stores:

- Loyverse receipt facts in Neon (`receipts`, `receipt_payments`, `receipt_line_items`, etc.).
- Company Ledger in Notion, accessed through generated SDK files under `src/lib/notion-sdk/dbs/company-ledger/**`.
- Current `Company Ledger` fields include type, amount, date, status, payment method, bank account, category, department, reference number, notes, and receipt files.

### Why a new Neon model is needed

Balance snapshots and reconciliation runs are operational/accounting state, not ordinary sales or expenses. Storing them in Notion ledger would mix evidence with business transactions and make the ledger misleading.

MVP recommendation: create a **Notion `Balance Snapshots` database first** for ease of input, then move to Neon later if querying/performance/constraints become painful. Keep Notion ledger as the current transaction source for manually entered expenses/owner movements unless/until the app moves the whole ledger to Neon.

A Neon table is still technically cleaner, but Notion is acceptable for MVP because the expected row count is low and manual input is important.

### Proposed MVP data model

#### Notion database: `Balance Snapshots`

Properties:

- `Name` / title — e.g. `KBank snapshot 2026-06-01 21:00`.
- `Account` select — `KBank`, `SCB`, `Safe / Cash on hand`, `Scan/QR Clearing`, `Credit Card Clearing`.
- `Observed At` date.
- `Balance THB` number.
- `Snapshot Role` select — `Observed`, `Accepted Baseline`.
- `Status` status/select — `Draft`, `Needs Review`, `Accepted`, `Superseded`.
- `Source` select — `KBiz Manual`, `Bank Statement`, `Cash Count`, `Settlement Report`, `Manual`.
- `Proof` files/url.
- `Notes` rich text.
- Optional `Reviewed By`, `Reviewed At` if useful.

Calculation rule:

- Latest accepted baseline per account is the anchor.
- Latest observed snapshot per account is the actual value for comparison.
- The first accepted baseline is the practical opening balance.

If this database is added to the generated Notion SDK, run `pnpm notion:generate` after creating/changing properties.

### Possible later Neon tables

#### `financial_accounts`

Represents accounts that can have an expected and/or actual balance.

Columns:

- `id` identity primary key.
- `key` text unique — e.g. `kbank`, `scb`, `safe_cash`, `scan_qr_clearing`, `credit_card_clearing`.
- `name` text.
- `kind` text — `bank`, `cash`, `clearing`.
- `currency` text default `THB`.
- `active` boolean default true.
- `display_order` integer.
- `created_at`, `updated_at` timestamps.

Seed required accounts:

- `kbank` — bank.
- `safe_cash` — cash in the safe after daily close and before weekly deposit.
- `scan_qr_clearing` — clearing.
- `credit_card_clearing` — clearing.

Optional later:

- `scb` — bank, if the business actively uses it.

#### Optional later: `financial_account_opening_balances`

A normalized Neon version of accepted baseline snapshots. Not required for MVP if the `Balance Snapshots` database has a role/status field.

Columns:

- `id` identity primary key.
- `account_id` references `financial_accounts`.
- `cutover_at` timestamp with time zone.
- `amount_thb` double precision or numeric.
- `source` text — `bank_statement`, `cash_count`, `manual`, `migration`.
- `proof_url` text nullable.
- `notes` text nullable.
- `created_by` text nullable.
- `created_at` timestamp.

Constraint:

- Unique on `(account_id, cutover_at)`.

MVP can choose the latest opening balance per account before the dashboard `asOf` time.

#### `balance_snapshots`

Actual observed balances. This is the answer to “should we occasionally input the bank balance?” Yes — store it here.

Columns:

- `id` identity primary key.
- `account_id` references `financial_accounts`.
- `observed_at` timestamp with time zone.
- `balance_thb` double precision or numeric.
- `source` text — `kbiz_manual`, `bank_statement`, `cash_count`, `settlement_report`, `manual`.
- `source_reference` text nullable — statement id, slip id, close-shift id, etc.
- `proof_url` text nullable.
- `notes` text nullable.
- `created_by` text nullable.
- `created_at` timestamp.

Indexes:

- `(account_id, observed_at desc)`.
- `(observed_at desc)`.

Do not create ledger entries from snapshots automatically.

#### `reconciliation_runs`

Stores review state for a period/as-of time.

Columns:

- `id` identity primary key.
- `period_start` timestamp with time zone nullable.
- `period_end` timestamp with time zone.
- `status` text — `draft`, `reviewed`, `locked`.
- `expected_total_thb` double precision.
- `actual_total_thb` double precision nullable.
- `difference_total_thb` double precision nullable.
- `explained_difference_thb` double precision default 0.
- `unexplained_difference_thb` double precision nullable.
- `reviewed_by` text nullable.
- `reviewed_at` timestamp nullable.
- `notes` text nullable.
- `created_at`, `updated_at` timestamps.

MVP can compute run data live and add persistence in phase 2 if faster.

#### `reconciliation_explanations`

Classifies differences without mutating the ledger.

Columns:

- `id` identity primary key.
- `reconciliation_run_id` references `reconciliation_runs`.
- `account_id` references `financial_accounts` nullable.
- `amount_thb` double precision.
- `category` text — `timing`, `missing_ledger_record`, `bank_fee`, `cash_difference`, `transfer_in_transit`, `pending_settlement`, `mistake`, `unknown`.
- `description` text.
- `status` text — `open`, `resolved`, `accepted`.
- `linked_notion_page_id` text nullable.
- `linked_receipt_key` text nullable.
- `created_at`, `updated_at` timestamps.

MVP can omit this table and show only computed buckets; add once users start reviewing differences.

## Expected-balance calculation

### Account movement model

Implement a server-side normalizer that turns current sources into account movements:

```ts
type MoneyMovement = {
  occurredAt: string;
  accountKey: string;
  amountThb: number; // positive increases account, negative decreases account
  source: 'opening_balance' | 'company_ledger' | 'loyverse_receipt' | 'settlement' | 'manual_adjustment';
  sourceId: string;
  description: string;
  status?: string;
};
```

Expected balance per account:

```text
opening balance
+ sum(movements for account after cutover and <= asOf)
```

### Existing source mapping

#### Company Ledger Notion records

Use `CompanyLedgerDatabase` in `src/lib/mgmt-dashboard.remote.ts` or a dedicated `$lib/server/balance-reconciliation.ts` module.

Suggested mappings:

- `type = Expense`: subtract `amountThb` from selected `bankAccount` / payment source.
- `type = Income`: add `amountThb` to selected account unless it comes from Loyverse receipt import already counted. Avoid double-counting POS sales.
- `type = Owner Contribution`: add to selected account.
- `type = Owner Draw` / `Dividend`: subtract from selected account.
- `paymentMethod = Cash`: account `safe_cash` (Company Ledger may still say `Cash Register`; code aliases that to the safe bucket).
- `paymentMethod = Scan` / `Wire Transfer`: account `kbank` unless `bankAccount` says otherwise.
- `paymentMethod = Credit Card`: normally clearing first, then bank on settlement. If the Company Ledger row represents a bank-only expense paid by card, map to selected bank/card account based on fields.

Important: distinguish cash deposit as a **transfer**, not income. If current Company Ledger cannot express transfers cleanly, define a convention in notes/reference or add a future `Type = Transfer` Notion option. If adding/changing Notion properties or options used by `src/lib/notion-sdk/**`, run `pnpm notion:generate` afterward.

#### Loyverse receipts

Use Neon `receipts` and `receipt_payments`.

- Cash payment: increases `safe_cash` on receipt date.
- Scan/QR payment: increases `scan_qr_clearing` on receipt date until matched to a bank deposit.
- Credit card payment: increases `credit_card_clearing` on receipt date until settled.
- Refund: reverse the original payment account/method.

For MVP, payment method matching can use `receipt_payments.type` and `receipt_payments.name`, with a mapping config:

```ts
const PAYMENT_ACCOUNT_MAP = {
  CASH: 'safe_cash',
  CARD: 'credit_card_clearing',
  QR: 'scan_qr_clearing',
  // fallback by normalized payment name if Loyverse type is not enough
};
```

#### Bank deposits / settlement

If no bank statement import exists yet, settlement matching is limited. Use manual ledger records or balance snapshots to expose differences.

Later, add a bank transaction import table:

- `bank_transactions` with posted_at, amount, description, bank reference, account_id, matched source.
- Expected bank balance can then be driven by imported bank transactions and ledger corrections instead of manual snapshots.

## Remote/server implementation

Create a dedicated server module for the calculation so `mgmt-dashboard.remote.ts` stays readable:

- `src/lib/server/balance-reconciliation.ts` (implemented as a single module for MVP)

Add a new query exported from `src/lib/mgmt-dashboard.remote.ts`:

```ts
export const getBalanceReconciliationDashboard = query(async () => {
  return getBalanceReconciliationSummary({ asOf: new Date() });
});
```

Suggested response shape:

```ts
type BalanceReconciliationDashboard = {
  asOf: string;
  setup: {
    hasOpeningBalances: boolean;
    missingOpeningAccounts: string[];
  };
  expected: {
    totalCashAndBankThb: number;
    accounts: Array<{
      key: string;
      name: string;
      kind: 'bank' | 'cash' | 'clearing';
      expectedThb: number;
      openingBalanceThb: number;
      movementTotalThb: number;
    }>;
    clearingTotalThb: number;
  };
  actual: {
    comparableTotalThb: number | null;
    snapshots: Array<{
      accountKey: string;
      accountName: string;
      balanceThb: number;
      observedAt: string;
      ageHours: number;
      source: string;
      stale: boolean;
    }>;
    missingAccounts: string[];
  };
  difference: {
    totalThb: number | null;
    explainedThb: number;
    unexplainedThb: number | null;
    status: 'ok' | 'stale' | 'attention' | 'setup_required';
  };
  pending: {
    scanQrThb: number;
    creditCardThb: number;
    agingBuckets: Array<{ label: string; amountThb: number; count: number }>;
  };
  recent: {
    unreconciledLedgerItems: Array<{ title: string; date: string; amountThb: number; url: string }>;
  };
  error?: string | null;
};
```

## Dashboard UI implementation

Implemented via `BalanceReconciliationPanel.svelte`:

- Overview variant on `src/routes/mgmt-dashboard/+page.svelte` (loads independently of daily meeting data)
- Detail variant on `src/routes/mgmt-dashboard/reconciliation/+page.svelte`
- Closed `<details>` instructions on the detail page only

Original plan notes:

1. Import new query:

```ts
import { getBalanceReconciliationDashboard, ... } from '$lib/mgmt-dashboard.remote';
const reconciliation = getBalanceReconciliationDashboard();
```

2. Add section after expenses:

```svelte
<section class="rounded-3xl border border-[#dfd2c5] bg-white p-6 shadow-sm" id="balance-reconciliation">
  ...
</section>
```

3. Use cards consistent with current dashboard style:

- Main expected card: `Expected cash + bank`.
- Actual card: `Latest observed`.
- Difference card: color states:
  - green-ish if within tolerance, e.g. `abs(diff) <= 20` THB.
  - amber for stale snapshot or moderate diff.
  - red for missing opening balance or unexplained large diff.
- Pending clearing card.

4. Add closed collapsible instructions:

```svelte
<details class="mt-5 rounded-2xl border border-[#eadfd3] bg-[#fffaf4] p-4">
  <summary class="cursor-pointer text-sm font-bold text-[#2c2925]">How this reconciliation works</summary>
  <p class="mt-3 text-sm text-[#7a6550]">...</p>
</details>
```

Do not set `open`; it should be closed by default.

5. Keep the full conceptual explanation in docs, not in the dashboard.

## Setup/admin UI

The dashboard needs a way to input initial and current balances. Options:

### MVP option: admin-only route under management dashboard

Add:

- `src/routes/mgmt-dashboard/balance/+page.svelte`
- `src/routes/mgmt-dashboard/balance/+page.server.ts` or remote commands

Capabilities:

- Create opening balance for an account.
- Add balance snapshot.
- Show snapshot history.

### Simpler MVP option: seed script + manual DB inserts

Use this only if the first implementation needs to be fast. It is less user-friendly and more error-prone.

Preferred UX for phase 2: a small internal form. MVP uses Notion `Balance Snapshots` directly.

Fields for opening balance form:

- Account.
- Cutover date/time.
- Amount THB.
- Source.
- Optional proof URL / notes.

Fields for current balance snapshot form:

- Account.
- Observed date/time.
- Balance THB.
- Source.
- Optional proof URL / notes.

## Implementation phases

### Phase 1 — foundation and dashboard read model (mostly done)

1. Use Notion `Balance Snapshots` with `Snapshot Role` / `Status` (no Neon tables yet).
2. Implement balance calculation module in `src/lib/server/balance-reconciliation.ts`.
3. Add `getBalanceReconciliationDashboard()` query.
4. Add overview + detail dashboard UI with setup-required empty state.
5. Add unit tests for pure calculation functions with opening balances and movements.

Do not run `pnpm check`, `svelte check`, or `pnpm build` in this project.

### Phase 2 — manual actual-balance input

1. Add internal form for opening balances and balance snapshots.
2. Add remote commands with validation.
3. Add snapshot history table.
4. Add stale snapshot warning thresholds:
   - Cash: stale after 36 hours.
   - Bank: stale after 7 days, or 36 hours if using it for daily cash control.
   - Clearing: stale after 7 days.

### Phase 3 — reconciliation explanations

1. Add `reconciliation_runs` and `reconciliation_explanations`.
2. Let users classify differences.
3. Show explained vs unexplained amounts on dashboard.
4. Link explanations to Notion ledger pages or receipt keys.

### Phase 4 — bank statement / settlement import

1. Add `bank_transactions` table.
2. Import KBiz CSV or statements.
3. Match bank deposits to scan/card clearing.
4. Match bank withdrawals to Company Ledger expense records.
5. Add unmatched bank transaction list to dashboard.

### Phase 5 — mature accounting improvements

1. Add transfer support explicitly.
2. Consider moving operational ledger from Notion to Neon if transactional reporting becomes heavy.
3. Add month-end close/lock workflow.
4. Add export for accountant.

## Test plan

Use targeted tests only; avoid noisy project-wide checks.

Suggested unit tests:

- Opening balance plus expense produces lower expected balance.
- Opening balance plus cash sale produces higher cash expected balance.
- QR/card sales increase clearing, not bank, before settlement.
- Cash deposit transfers cash to bank without changing total cash+bank.
- Missing opening balance returns `setup_required`.
- Stale snapshot returns `stale` status even if difference is small.
- Actual minus expected difference is signed correctly.

Commands to use:

- `pnpm test:unit -- <specific-test-file> --run`

Avoid:

- `pnpm check`
- `svelte check`
- `pnpm build`

## Open implementation decisions

1. Exact cutover date and opening balances for KBank, Safe / Cash on hand, and any active clearing accounts.
2. Whether `SCB` is active enough to include in phase 1.
3. Payment method mapping for Loyverse names/types in real data.
4. Whether cash deposits are currently recorded in Company Ledger and how to identify them as transfers.
5. Whether owner movements should remain in Notion ledger or move to a more formal double-entry model later.
6. Tolerance for “OK” difference, e.g. 20 THB for cash rounding vs 0 THB for bank statement periods.

## Recommended MVP scope

Implement this first:

- Notion `Balance Snapshots` database with `Snapshot Role` / `Status`.
- Use the latest accepted baseline snapshot as the anchor; this replaces a separate opening-balance table for MVP.
- Expected balance from anchor snapshot + Company Ledger expenses/owner movements + Loyverse payment-method totals since anchor.
- Dashboard section with expected, actual latest snapshot, difference, pending settlement/clearing, and closed instructions.
- Optional internal form that writes snapshots to Notion; otherwise use Notion directly for input at first.

Do not implement full bank import, automated matching, or locked reconciliation periods in the first pass unless the business workflow is ready for it.
