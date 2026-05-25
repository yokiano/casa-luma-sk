# Close Shift Expense Intake Design

The close-shift route is `src/routes/tools/close-shift`. It currently submits only the end-of-shift report to the Notion **End of Shift Reports** database through `src/lib/close-shift.remote.ts`.

This document defines the intended design for adding cashier-paid expense intake without dumping raw expense details into the close-shift report.

## Existing ledger write path

Use the existing company-ledger write path instead of creating a second Notion mapping:

- Remote command: `src/lib/expense-submit.remote.ts` → `submitExpenseSlip`
- Notion DB: `CompanyLedgerDatabase`
- Patch DTO: `CompanyLedgerPatchDTO`

Ledger fields used by the existing expense tool:

| Input | Company Ledger property | Recommended close-shift value |
| --- | --- | --- |
| `title` | `Description` | Human-readable expense name, e.g. `Ice`, `Shop supplies` |
| `amount` | `Amount (THB)` | Cash paid from the drawer |
| `date` | `Date` | Current shift date/time |
| `category` | `Category` | Selected/remembered category |
| `department` | `Department` | Selected/remembered department, usually `Cafe`/`General` |
| `supplierId` | `Supplier` relation | Optional remembered supplier |
| `transactionId` | `Reference Number` | Leave empty for cash drawer expenses |
| `bankAccount` | `Bank Account` | `Cash Register` |
| `paymentMethod` | `Payment Method` | `Cash` |
| `notes` | `Notes` | Include `source: close-shift`, closer name, and optional staff note |

`submitExpenseSlip` already creates a paid `Expense` row, normalizes dates, and performs duplicate checks. Reuse it for close-shift expense rows.

## Existing expense-scan philosophy to copy

The expense-scan tool is designed around assisted entry, not fully automated accounting:

1. Extract or enter the transaction details.
2. Match against saved rules/options to reduce typing.
3. Auto-fill category, department, and supplier.
4. Let staff override the auto-filled fields before submission.
5. Save the corrected mapping so future entries are faster.
6. Submit a clean row to the Company Ledger.

Close-shift expenses should follow the same philosophy, except the transaction source is manual petty-cash/cash-register payout rather than OCR slips.

## Definite implementation recommendation

Create a modular close-shift expense intake package, not logic embedded directly inside the close-shift page:

```txt
src/lib/close-shift-expenses/
  types.ts
  presets.ts
  storage.ts
  matcher.ts
  submit.ts
src/lib/components/tools/close-shift/sections/ShiftExpensesSection.svelte
```

### Data model

Use one row per paid-out expense:

```ts
export type ShiftExpenseDraft = {
  id: string;
  title: string;
  amount: number | undefined;
  category: string;
  department: string;
  supplierId: string;
  notes: string;
};

export type ShiftExpensePreset = {
  id: string;
  key: string;
  title: string;
  category: string;
  department: string;
  supplierId?: string;
  useCount: number;
  lastUsedAt: string;
  updatedAt: string;
};
```

The preset key should be derived from normalized `title + supplierId/category/department` initially. Matching by normalized title is enough for staff UX; supplier/category/department are saved as the auto-fill payload.

### Persistence

Start with browser `localStorage` for presets:

- Key: `casa-luma.close-shift-expense-presets.v1`
- Store only presets, not submitted historical expenses.
- Keep the most recent/frequent 30 presets.
- This is acceptable because these are convenience shortcuts, not accounting records.

The accounting source of truth remains the Company Ledger. If cross-device sharing becomes important later, replace only `storage.ts` with a Notion-backed presets DB or reuse/extend the Expense Scan Rules DB pattern.

### UI behavior

Add `ShiftExpensesSection.svelte` between **Other Payments** and **Summary**:

- Button: `Add expense` creates an empty draft.
- Top control: `Choose previous expense` lists presets sorted by `lastUsedAt`/`useCount`.
- Selecting a preset creates or fills a draft with title/category/department/supplier.
- Draft fields remain editable; manual changes are authoritative.
- On draft add/update, if title + category + department are present, save/update a preset in localStorage.
- Each expense row requires `title`, `amount > 0`, `category`, and `department`.
- Supplier stays optional.

### Submission behavior

Do not put the expense list into the end-of-shift report as the primary record.

On close-shift submit:

1. Validate cash count/report fields.
2. Validate expense drafts.
3. Submit each shift expense to Company Ledger using `submitExpenseSlip` with:
   - `paymentMethod: 'Cash'`
   - `bankAccount: 'Cash Register'`
   - `notes` containing `source: close-shift`, closer name, and the close-shift report id if available.
4. Submit the end-of-shift report.
5. Add only a compact summary to the report notes, e.g. total paid-out expenses and count.

Preferred order: create the end-of-shift report first, then create ledger expenses with its returned report id in notes. If any ledger expense fails after the report succeeds, show a clear error with which expense failed so a manager can re-submit/fix it; do not silently hide partial failure.

### Paid-out and cash reconciliation

Add a top-level **Paid Out** field to the close-shift report. This is the total paid-out amount copied from the POS/shift report slip: cash removed from the register for expenses.

The detailed expense rows from the new UI should reconcile against this control number:

```txt
Paid Out from shift report slip
- Total detailed shift expenses
= Paid Out Difference
```

This is a second balance check, like counted cash vs expected cash. If the paid-out difference is not zero, staff should explain it in notes.

Paid-out cash also reduces the physical cash expected in the drawer. Use the report-slip **Paid Out** value for drawer reconciliation:

```txt
Expected cash from POS
- Paid Out from shift report slip
= Adjusted expected cash
Actual cash count
Difference = Actual cash - Adjusted expected cash
```

Keep original expected cash, paid out, detailed expense total, adjusted expected cash, and actual counted cash visible so managers can verify both the drawer balance and whether the detailed expense rows explain the POS paid-out amount.

## Files that need changes

1. `src/routes/tools/close-shift/+page.server.ts`
   - Load suppliers and Company Ledger select values (`categories`, `departments`) like expense-scan does.

2. `src/routes/tools/close-shift/CloseShiftState.svelte.ts`
   - Add `paidOut: number | undefined` for the POS/shift report slip paid-out total.
   - Add `expenses: ShiftExpenseDraft[]` state.
   - Add derived `expensesTotal`, `paidOutDifference`, and `adjustedExpectedCash`.
   - Add validation for required expense fields.
   - Include paidOut and expenses in submit flow.

3. `src/lib/close-shift.remote.ts`
   - Either extend `submitCloseShift` to accept expenses and create ledger rows server-side, or create a separate `submitCloseShiftExpense` command in `src/lib/close-shift-expenses/submit.ts`.
   - Recommended: keep `submitCloseShift` focused on the report and add a dedicated expense submission helper/command that reuses `submitExpenseSlip` semantics.

4. `src/lib/components/tools/close-shift/sections/ShiftExpensesSection.svelte`
   - New isolated UI section for the whole expense intake.

5. `src/routes/tools/close-shift/+page.svelte`
   - Pass loaded categories/departments/suppliers into the new section.
   - Place the section before Summary.

6. `src/lib/components/tools/close-shift/sections/SummarySection.svelte`
   - Display expense total and adjusted expected cash.

## Naming

Use “Shift Expenses” in code/UI, not “expense scan”, because this is manual cash payout intake at close shift.

Use “preset” for local convenience entries, not “rule”, to avoid confusion with OCR recipient matching rules in the expense-scan tool.
