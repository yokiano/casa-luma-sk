# Close Shift Expenses

Close Shift Expenses are small cash payouts made by the cashier during a shift, such as ice, small shop purchases, or emergency supplies.

The feature belongs in `/tools/close-shift` (`src/routes/tools/close-shift`), but the accounting records should be saved to the **Company Ledger**, not stored only inside the end-of-shift report.

## How it should work

1. Staff adds one or more expenses during close shift.
2. Each expense has description, amount, category, department, optional supplier, and optional note.
3. The UI offers “Choose previous expense” presets for recurring payouts.
4. Selecting a preset auto-fills category, department, and supplier.
5. Staff can manually override any auto-filled value.
6. Updated entries are saved back as local presets for faster future entry.
7. On submit, each expense is written as a paid `Expense` row in the Company Ledger.
8. The end-of-shift report stores only a compact summary, such as count and total paid out.

## Ledger mapping

Close-shift expense rows should reuse the existing expense submission path:

```txt
src/lib/expense-submit.remote.ts
submitExpenseSlip(...)
```

Recommended fixed values:

| Field | Value |
| --- | --- |
| Type | `Expense` |
| Status | `Paid` |
| Payment Method | `Cash` |
| Bank Account | `Cash Register` |
| Notes | Include `source: close-shift` and closer/report context |

The Company Ledger remains the source of truth for the expense details. The UI code lives under `src/lib/close-shift-expenses/` and `src/lib/components/tools/close-shift/sections/ShiftExpensesSection.svelte`.

## Presets

Presets are local browser convenience data, not accounting records.

Use localStorage key:

```txt
casa-luma.close-shift-expense-presets.v1
```

A preset stores reusable entry metadata:

- description/title
- category
- department
- supplier id
- usage metadata

## Paid-out reconciliation

The close-shift report needs a separate **Paid Out** field. This is the total paid-out amount shown on the POS/shift report slip: cash removed from the register for expenses.

The new expense UI creates the detailed expense lines. Their total should match the POS/report **Paid Out** number:

```txt
Paid Out from shift report slip
- Total detailed shift expenses
= Paid Out Difference
```

This is a second balance check, similar to counted cash vs expected cash. If the paid-out difference is not zero, staff should explain it in notes.

## Cash reconciliation

Paid-out cash should also reduce expected drawer cash:

```txt
Expected cash from POS
- Paid Out from shift report slip
= Adjusted expected cash
Actual cash count
Difference = Actual cash - Adjusted expected cash
```

Use the report slip's Paid Out value for drawer reconciliation, and use the detailed expense total to verify/explain that Paid Out number.

## Implementation detail

Full implementation notes are in:

```txt
temp/close-shift-expense-intake-implementation.md
```
