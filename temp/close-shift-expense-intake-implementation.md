# Close Shift Expense Intake — Full Implementation Plan

## Goal

Add cashier-paid expense intake to `/tools/close-shift` for small cash-register payouts such as ice, nearby shop purchases, or emergency supplies.

The feature should:

- Let staff add one or more cash expenses during close shift.
- Add a top-level **Paid Out** field to the close-shift report for the total paid-out amount shown on the POS/shift report slip.
- Make recurring expenses fast through local presets/autocomplete.
- Auto-populate supplier/category/department from previous entries.
- Allow manual override at any time.
- Save actual accounting rows to the Company Ledger database.
- Keep the End of Shift Report clean, storing only a compact expense summary there.
- Reconcile detailed expense total against the close-shift **Paid Out** field.
- Adjust cash reconciliation so paid-out cash explains drawer differences.

Do **not** build this as another OCR/expense-scan path. This is manual close-shift cash payout intake that reuses the same ledger write semantics.

---

## Existing code and APIs to reuse

### Close shift route

```txt
src/routes/tools/close-shift/+page.svelte
src/routes/tools/close-shift/+page.server.ts
src/routes/tools/close-shift/CloseShiftState.svelte.ts
src/lib/close-shift.remote.ts
src/lib/components/tools/close-shift/sections/
```

Current sections:

```txt
GeneralInfoSection.svelte
CashCountSection.svelte
OtherPaymentsSection.svelte
SummarySection.svelte
```

### Ledger submission API

Existing ledger command:

```ts
// src/lib/expense-submit.remote.ts
submitExpenseSlip({
  title,
  amount,
  date,
  category,
  department,
  supplierId,
  transactionId,
  sourceFileName,
  receiptUrl,
  bankAccount,
  paymentMethod,
  notes
})
```

This command writes to:

```txt
src/lib/notion-sdk/dbs/company-ledger/db.ts
src/lib/notion-sdk/dbs/company-ledger/patch.dto.ts
```

It creates a Notion Company Ledger page with:

```ts
type: 'Expense'
status: { name: 'Paid' }
amountThb: data.amount
date: { start: normalizedDate }
department: data.department
category: data.category
supplier: data.supplierId ? [{ id: data.supplierId }] : undefined
paymentMethod: data.paymentMethod ?? 'Scan'
bankAccount: data.bankAccount
notes: mergedNotes
description: data.title
```

Duplicate behavior:

- If `transactionId` exists, checks duplicate `Reference Number`.
- If `transactionId` is empty, soft-checks same `amount + date + department`.

For close-shift cash expenses, use no transaction/reference number.

### Values and suppliers to load

Expense scan already loads the data needed by a manual expense form:

```ts
// src/routes/tools/expense-scan/+page.server.ts
import { getSuppliersData } from '$lib/server/suppliers';
import { COMPANY_LEDGER_PROP_VALUES } from '$lib/notion-sdk/dbs/company-ledger/constants';

return {
  suppliers,
  categories: COMPANY_LEDGER_PROP_VALUES.category as unknown as string[],
  departments: COMPANY_LEDGER_PROP_VALUES.department as unknown as string[],
  bankAccounts: COMPANY_LEDGER_PROP_VALUES.bankAccount as unknown as string[],
  paymentMethods: COMPANY_LEDGER_PROP_VALUES.paymentMethod as unknown as string[]
};
```

For close shift, only `suppliers`, `categories`, and `departments` are needed for the UI. The submission should force `paymentMethod: 'Cash'` and `bankAccount: 'Cash Register'`.

---

## Product philosophy copied from Expense Scan

Expense Scan does assisted entry:

1. Extract/enter transaction details.
2. Match against saved rule/preset data.
3. Auto-fill category, department, supplier.
4. Let staff correct anything.
5. Save corrected mapping for future speed.
6. Submit clean ledger records.

Close-shift expenses should do the same, but use the name **preset** rather than **rule** because:

- Expense Scan rules match OCR recipient names.
- Close-shift presets are local convenience shortcuts for manual cash expenses.

---

## Recommended architecture

Create a small client-side module for drafts/presets and a server-side submission helper for ledger writes.

```txt
src/lib/close-shift-expenses/
  types.ts
  normalize.ts
  storage.ts
  presets.ts
  submit.remote.ts

src/lib/components/tools/close-shift/sections/
  ShiftExpensesSection.svelte
```

Why this split:

- `types.ts`: shared data contracts.
- `normalize.ts`: deterministic key/title normalization.
- `storage.ts`: localStorage wrapper only.
- `presets.ts`: pure preset business logic.
- `submit.remote.ts`: server command for one expense, keeping ledger write details outside the UI.
- `ShiftExpensesSection.svelte`: isolated UI section.

---

## Data model

### `src/lib/close-shift-expenses/types.ts`

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

export type ShiftExpenseSubmitInput = {
  id: string;
  title: string;
  amount: number;
  category: string;
  department: string;
  supplierId?: string;
  notes?: string;
  shiftDate: string;
  closerName?: string;
  closeShiftReportId?: string;
};
```

Notes:

- `id` can use `crypto.randomUUID()` in the browser.
- `supplierId` is an empty string in drafts for easier binding.
- `supplierId` is optional for presets/submission.

---

## Normalization and preset keys

### `src/lib/close-shift-expenses/normalize.ts`

```ts
export function normalizeExpenseText(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

export function getShiftExpensePresetKey(input: {
  title: string;
  supplierId?: string;
  category?: string;
  department?: string;
}) {
  const title = normalizeExpenseText(input.title);
  const supplier = input.supplierId?.trim() || 'no-supplier';
  const category = normalizeExpenseText(input.category || '');
  const department = normalizeExpenseText(input.department || '');

  // Include category/department so staff can intentionally keep two presets for the same label.
  return [title, supplier, category, department].filter(Boolean).join('|');
}

export function getShiftExpenseTitleMatchKey(title: string) {
  return normalizeExpenseText(title);
}
```

Matching strategy:

- Exact-ish normalized title match for choosing previous expense.
- Preset key includes title + supplier/category/department so corrected variants can exist.
- UI should show preset labels clearly enough to distinguish variants.

---

## LocalStorage persistence

### Storage constraints

Use localStorage because presets are only UX shortcuts.

- Source of truth for accounting: Company Ledger.
- Source of truth for shift: End of Shift Reports + Company Ledger rows.
- Presets can be device-local without accounting risk.

### `src/lib/close-shift-expenses/storage.ts`

```ts
import type { ShiftExpensePreset } from './types';

export const SHIFT_EXPENSE_PRESETS_STORAGE_KEY = 'casa-luma.close-shift-expense-presets.v1';
export const MAX_SHIFT_EXPENSE_PRESETS = 30;

export function loadShiftExpensePresets(): ShiftExpensePreset[] {
  if (typeof localStorage === 'undefined') return [];

  try {
    const raw = localStorage.getItem(SHIFT_EXPENSE_PRESETS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidPreset);
  } catch {
    return [];
  }
}

export function saveShiftExpensePresets(presets: ShiftExpensePreset[]) {
  if (typeof localStorage === 'undefined') return;

  const trimmed = [...presets]
    .sort((a, b) => {
      const usageDiff = (b.useCount || 0) - (a.useCount || 0);
      if (usageDiff !== 0) return usageDiff;
      return (b.lastUsedAt || '').localeCompare(a.lastUsedAt || '');
    })
    .slice(0, MAX_SHIFT_EXPENSE_PRESETS);

  try {
    localStorage.setItem(SHIFT_EXPENSE_PRESETS_STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // Ignore storage failures. Presets are convenience only.
  }
}

function isValidPreset(value: unknown): value is ShiftExpensePreset {
  if (!value || typeof value !== 'object') return false;
  const preset = value as Partial<ShiftExpensePreset>;
  return Boolean(
    preset.id &&
    preset.key &&
    preset.title &&
    preset.category &&
    preset.department
  );
}
```

---

## Preset operations

### `src/lib/close-shift-expenses/presets.ts`

```ts
import type { ShiftExpenseDraft, ShiftExpensePreset } from './types';
import { getShiftExpensePresetKey, getShiftExpenseTitleMatchKey } from './normalize';

export function presetToDraft(preset: ShiftExpensePreset): ShiftExpenseDraft {
  return {
    id: crypto.randomUUID(),
    title: preset.title,
    amount: undefined,
    category: preset.category,
    department: preset.department,
    supplierId: preset.supplierId || '',
    notes: ''
  };
}

export function upsertPresetFromDraft(
  presets: ShiftExpensePreset[],
  draft: ShiftExpenseDraft
): ShiftExpensePreset[] {
  if (!draft.title.trim() || !draft.category || !draft.department) return presets;

  const now = new Date().toISOString();
  const key = getShiftExpensePresetKey({
    title: draft.title,
    supplierId: draft.supplierId,
    category: draft.category,
    department: draft.department
  });

  const existing = presets.find((preset) => preset.key === key);
  if (existing) {
    return presets.map((preset) =>
      preset.key === key
        ? {
            ...preset,
            title: draft.title.trim(),
            category: draft.category,
            department: draft.department,
            supplierId: draft.supplierId || undefined,
            useCount: (preset.useCount || 0) + 1,
            lastUsedAt: now,
            updatedAt: now
          }
        : preset
    );
  }

  return [
    {
      id: crypto.randomUUID(),
      key,
      title: draft.title.trim(),
      category: draft.category,
      department: draft.department,
      supplierId: draft.supplierId || undefined,
      useCount: 1,
      lastUsedAt: now,
      updatedAt: now
    },
    ...presets
  ];
}

export function findPresetForTitle(presets: ShiftExpensePreset[], title: string) {
  const matchKey = getShiftExpenseTitleMatchKey(title);
  if (!matchKey) return undefined;

  return presets
    .filter((preset) => getShiftExpenseTitleMatchKey(preset.title) === matchKey)
    .sort((a, b) => {
      const usageDiff = (b.useCount || 0) - (a.useCount || 0);
      if (usageDiff !== 0) return usageDiff;
      return (b.lastUsedAt || '').localeCompare(a.lastUsedAt || '');
    })[0];
}

export function sortPresetsForPicker(presets: ShiftExpensePreset[]) {
  return [...presets].sort((a, b) => {
    const recent = (b.lastUsedAt || '').localeCompare(a.lastUsedAt || '');
    if (recent !== 0) return recent;
    return (b.useCount || 0) - (a.useCount || 0);
  });
}
```

---

## Server command for shift expenses

### Recommended: create a dedicated command

Do not call `submitExpenseSlip` directly from `CloseShiftState` unless you intentionally want the UI to know all ledger mapping details.

Create:

```txt
src/lib/close-shift-expenses/submit.remote.ts
```

Implementation:

```ts
import { command } from '$app/server';
import * as v from 'valibot';
import { submitExpenseSlip } from '$lib/expense-submit.remote';

const moneyField = v.pipe(
  v.number('Amount must be a number.'),
  v.finite('Amount must be a valid number.'),
  v.minValue(0.01, 'Amount must be greater than zero.')
);

const SubmitCloseShiftExpenseSchema = v.object({
  title: v.string(),
  amount: moneyField,
  category: v.string(),
  department: v.string(),
  supplierId: v.optional(v.string()),
  notes: v.optional(v.string()),
  shiftDate: v.string(),
  closerName: v.optional(v.string()),
  closeShiftReportId: v.optional(v.string())
});

export const submitCloseShiftExpense = command(SubmitCloseShiftExpenseSchema, async (data) => {
  const notes = [
    'source: close-shift',
    data.closeShiftReportId ? `close shift report: ${data.closeShiftReportId}` : undefined,
    data.closerName ? `closed by: ${data.closerName}` : undefined,
    data.notes?.trim() ? `staff note: ${data.notes.trim()}` : undefined
  ]
    .filter(Boolean)
    .join('\n');

  return submitExpenseSlip({
    title: data.title.trim(),
    amount: data.amount,
    date: data.shiftDate,
    category: data.category,
    department: data.department,
    supplierId: data.supplierId || undefined,
    bankAccount: 'Cash Register',
    paymentMethod: 'Cash',
    notes
  });
});
```

Important: `submitExpenseSlip` is itself a remote command. If SvelteKit remote commands cannot be safely called from another command in this codebase, extract the shared ledger-writing logic from `expense-submit.remote.ts` into a plain server helper:

```txt
src/lib/server/ledger-expenses.ts
```

Then both remote commands call the helper:

```ts
createCompanyLedgerExpense(data)
```

This is cleaner long-term, but the first implementation can attempt direct reuse if supported.

---

## Paid Out field in End of Shift Report

Add a top-level `paidOut` money field to the close-shift state and submission schema. This represents the **Paid Out** total copied from the POS/shift report slip. It is not the detailed expense total; it is the report-slip control number that the detailed expense rows must match.

If the Notion End of Shift Reports database does not yet have a property for this, add a number property such as `Paid Out` and regenerate/update the generated SDK mapping so `EndOfShiftReportsPatchDTO` can write it. Then update `src/lib/close-shift.remote.ts`:

- Add `paidOut: moneyField('Paid Out')` to `CloseShiftSchema`.
- Write `paidOut: data.paidOut` in `EndOfShiftReportsPatchDTO`.
- Include the compact paid-out reconciliation summary in notes.

The UI should show two balances:

```txt
Paid Out from shift report slip
- Total detailed shift expenses
= Paid Out Difference

Expected cash from POS
- Paid Out from shift report slip
= Adjusted expected cash
Actual cash count
Difference = Actual cash - Adjusted expected cash
```

`Paid Out Difference` should ideally be zero. If it is not zero, allow submission but make the mismatch visible and require/encourage explanation in notes.

---

## CloseShiftState changes

### Imports

```ts
import type { ShiftExpenseDraft, ShiftExpensePreset } from '$lib/close-shift-expenses/types';
import { submitCloseShiftExpense } from '$lib/close-shift-expenses/submit.remote';
```

### State fields

Add:

```ts
paidOut = $state<number | undefined>(0);
expenses = $state<ShiftExpenseDraft[]>([]);
```

### Derived values

Current:

```ts
difference = $derived(this.actualCash - numberOrZero(this.expectedCash));
```

Change to:

```ts
expensesTotal = $derived.by(() =>
  this.expenses.reduce((sum, expense) => sum + numberOrZero(expense.amount), 0)
);

paidOutDifference = $derived(numberOrZero(this.paidOut) - this.expensesTotal);

adjustedExpectedCash = $derived(
  numberOrZero(this.expectedCash) - numberOrZero(this.paidOut)
);

difference = $derived(this.actualCash - this.adjustedExpectedCash);
```

Keep original expected cash visible in summary. Use `paidOut` from the POS/shift report slip for cash reconciliation. Use `expensesTotal` to verify that the detailed expense rows explain the paid-out total.

### Methods

Add:

```ts
addExpense(expense?: Partial<ShiftExpenseDraft>) {
  this.expenses = [
    ...this.expenses,
    {
      id: crypto.randomUUID(),
      title: '',
      amount: undefined,
      category: '',
      department: '',
      supplierId: '',
      notes: '',
      ...expense
    }
  ];
}

updateExpense(id: string, patch: Partial<ShiftExpenseDraft>) {
  const expense = this.expenses.find((item) => item.id === id);
  if (!expense) return;
  Object.assign(expense, patch);
}

removeExpense(id: string) {
  this.expenses = this.expenses.filter((expense) => expense.id !== id);
}

normalizePaidOut() {
  this.paidOut = numberOrZero(this.paidOut);
}

normalizeExpenseAmount(id: string) {
  const expense = this.expenses.find((item) => item.id === id);
  if (!expense) return;
  expense.amount = numberOrZero(expense.amount);
}
```

### Validation

Extend `getValidationError()`:

```ts
for (const expense of this.expenses) {
  const hasAnyField =
    expense.title.trim() ||
    numberOrZero(expense.amount) > 0 ||
    expense.category ||
    expense.department ||
    expense.supplierId ||
    expense.notes.trim();

  if (!hasAnyField) continue;

  if (!expense.title.trim()) return 'Each shift expense needs a description.';
  if (numberOrZero(expense.amount) <= 0) return `Expense "${expense.title}" needs an amount greater than zero.`;
  if (!expense.category) return `Expense "${expense.title}" needs a category.`;
  if (!expense.department) return `Expense "${expense.title}" needs a department.`;
}
```

### Submit flow

Preferred robust sequence:

1. Submit close-shift report.
2. If report succeeds, submit ledger expenses with `closeShiftReportId` in notes.
3. If an expense fails, show a specific error and keep the state so staff/manager can retry.

Pseudo-code:

```ts
async submit() {
  this.isSubmitting = true;
  this.error = null;
  this.sanitizeForSubmit();

  const validationError = this.getValidationError();
  if (validationError) {
    this.error = validationError;
    this.isSubmitting = false;
    return;
  }

  try {
    const shiftDate = new SvelteDate().toISOString();
    const expenseSummary = this.expenses.length || numberOrZero(this.paidOut) > 0
      ? `\n\nPaid Out from shift report: ฿${numberOrZero(this.paidOut)}\nDetailed cash expenses: ${this.expenses.length} item(s), total ฿${this.expensesTotal}\nPaid Out difference: ฿${this.paidOutDifference}`
      : '';

    const result = await submitCloseShift({
      expectedCash: numberOrZero(this.expectedCash),
      billCounts: this.billCounts,
      paymentMethods: this.paymentMethods,
      cashIn: numberOrZero(this.cashIn),
      paidOut: numberOrZero(this.paidOut),
      closerId: this.closerId,
      closerPersonId: this.closerPersonId,
      closerName: this.closerName,
      notes: `${this.notes}${expenseSummary}`,
      shiftDate
    });

    for (const expense of this.expenses.filter((e) => numberOrZero(e.amount) > 0)) {
      try {
        await submitCloseShiftExpense({
          title: expense.title,
          amount: numberOrZero(expense.amount),
          category: expense.category,
          department: expense.department,
          supplierId: expense.supplierId || undefined,
          notes: expense.notes || undefined,
          shiftDate,
          closerName: this.closerName,
          closeShiftReportId: result.id
        });
      } catch (e: any) {
        throw new Error(
          `Shift report was saved, but expense "${expense.title}" failed to save to the ledger. ${e?.body?.message || e?.message || ''}`
        );
      }
    }

    this.success = true;
    return result;
  } catch (e: any) {
    this.error = e?.body?.message || e?.message || 'Failed to submit report';
  } finally {
    this.isSubmitting = false;
  }
}
```

### Reset

Add to `reset()`:

```ts
this.expenses = [];
```

---

## GeneralInfoSection changes

Add a **Paid Out** money input near `Expected Cash` / `Cash In`:

- Label: `Paid Out (from POS shift report)`.
- Helper: `Total cash removed from register for expenses according to the shift report slip.`
- Bind to `shiftState.paidOut`.
- Call `shiftState.normalizePaidOut()` on blur.

Update the local `CloseShiftStateLike` type for `GeneralInfoSection.svelte` to include:

```ts
paidOut: number | undefined;
normalizePaidOut(): void;
```

---

## `+page.server.ts` changes

Current file only loads managers.

Add suppliers/categories/departments:

```ts
import { getManagers, type ManagerDetails } from '$lib/employees.remote';
import { getSuppliersData } from '$lib/server/suppliers';
import { COMPANY_LEDGER_PROP_VALUES } from '$lib/notion-sdk/dbs/company-ledger/constants';

export const load = async () => {
  let managers: ManagerDetails[] = [];
  let suppliers: { id: string; name: string }[] = [];

  try {
    managers = await getManagers();
  } catch (e) {
    console.error('close-shift: failed to load managers', e);
  }

  try {
    suppliers = await getSuppliersData();
  } catch (e) {
    console.error('close-shift: failed to load suppliers', e);
  }

  return {
    managers,
    suppliers,
    categories: COMPANY_LEDGER_PROP_VALUES.category as unknown as string[],
    departments: COMPANY_LEDGER_PROP_VALUES.department as unknown as string[]
  };
};
```

---

## UI component: ShiftExpensesSection

### Props

```ts
type SupplierOption = { id: string; name: string };

type CloseShiftStateLike = {
  expenses: ShiftExpenseDraft[];
  expensesTotal: number;
  addExpense(expense?: Partial<ShiftExpenseDraft>): void;
  updateExpense(id: string, patch: Partial<ShiftExpenseDraft>): void;
  removeExpense(id: string): void;
  normalizeExpenseAmount(id: string): void;
};

type Props = {
  shiftState: CloseShiftStateLike;
  categories: string[];
  departments: string[];
  suppliers: SupplierOption[];
  onSupplierCreated?: (supplier: SupplierOption) => void;
};
```

### Behavior

On mount:

```ts
let presets = $state<ShiftExpensePreset[]>([]);

onMount(() => {
  presets = loadShiftExpensePresets();
});
```

When draft becomes valid enough:

```ts
function saveDraftAsPreset(draft: ShiftExpenseDraft) {
  const next = upsertPresetFromDraft(presets, draft);
  presets = next;
  saveShiftExpensePresets(next);
}
```

Call on:

- category change
- department change
- supplier change
- title blur
- row submit? There is no row submit, so after field changes is fine.

When selecting preset:

```ts
function handlePresetSelected(presetId: string) {
  const preset = presets.find((item) => item.id === presetId);
  if (!preset) return;
  shiftState.addExpense(presetToDraft(preset));
}
```

If there is an existing blank row, you may fill that row instead, but the simplest first version is to add a new row.

### Suggested UI structure

```svelte
<section class="space-y-4 bg-white p-6 rounded-2xl border border-[#e6e1db] shadow-sm">
  <div class="flex items-start justify-between gap-3">
    <div>
      <h2>4 Shift Expenses</h2>
      <p>Cash paid from the drawer during this shift.</p>
    </div>
    <div class="flex gap-2">
      <select onchange={...}>
        <option value="">Choose previous expense...</option>
      </select>
      <button onclick={() => shiftState.addExpense()}>Add expense</button>
    </div>
  </div>

  {#if shiftState.expenses.length === 0}
    <div>No cash expenses paid out this shift.</div>
  {:else}
    {#each shiftState.expenses as expense (expense.id)}
      <!-- row fields -->
    {/each}
  {/if}

  {#if shiftState.expensesTotal > 0}
    <div>Total paid out: ฿{shiftState.expensesTotal.toLocaleString()}</div>
  {/if}
</section>
```

Use existing `SupplierSelector`:

```svelte
import SupplierSelector from '$lib/components/suppliers/SupplierSelector.svelte';
```

Fields per row:

- Description/title text input.
- Amount numeric input.
- Category select.
- Department select.
- Supplier selector.
- Notes input.
- Remove button.

---

## `+page.svelte` changes

Import:

```ts
import ShiftExpensesSection from '$lib/components/tools/close-shift/sections/ShiftExpensesSection.svelte';
```

Track mutable suppliers like expense scan:

```ts
let suppliers = $state(data.suppliers);
```

Insert after Other Payments:

```svelte
<OtherPaymentsSection shiftState={shiftState} />

<ShiftExpensesSection
  shiftState={shiftState}
  categories={data.categories}
  departments={data.departments}
  {suppliers}
  onSupplierCreated={(s) => suppliers = [...suppliers, s].sort((a, b) => a.name.localeCompare(b.name))}
/>
```

Because this adds another section, consider changing the grid width/layout if the left column becomes too long. Do not over-optimize on first pass.

---

## SummarySection changes

Current summary shows:

- Expected Cash
- Actual Cash Count
- Difference

Add:

- Paid Out from shift report slip
- Detailed Shift Expenses Total
- Paid Out Difference
- Adjusted Expected Cash

Update `CloseShiftStateLike` type:

```ts
type CloseShiftStateLike = {
  expectedCash: number | undefined;
  paidOut: number | undefined;
  expensesTotal: number;
  paidOutDifference: number;
  adjustedExpectedCash: number;
  actualCash: number;
  difference: number;
  notes: string;
  isSubmitting: boolean;
  error: string | null;
  closerId: string;
};
```

Display:

```svelte
<div class="flex justify-between items-center text-sm">
  <span>Expected Cash</span>
  <span>฿{formatCurrency(shiftState.expectedCash)}</span>
</div>

{#if (shiftState.paidOut ?? 0) > 0 || shiftState.expensesTotal > 0}
  <div class="flex justify-between items-center text-sm">
    <span>Paid Out from Shift Report</span>
    <span>-฿{formatCurrency(shiftState.paidOut)}</span>
  </div>
  <div class="flex justify-between items-center text-sm">
    <span>Detailed Shift Expenses</span>
    <span>฿{formatCurrency(shiftState.expensesTotal)}</span>
  </div>
  <div class="flex justify-between items-center text-sm {shiftState.paidOutDifference === 0 ? 'text-green-600' : 'text-red-500'}">
    <span>Paid Out Difference</span>
    <span>฿{formatCurrency(shiftState.paidOutDifference)}</span>
  </div>
  <div class="flex justify-between items-center text-sm font-semibold">
    <span>Adjusted Expected Cash</span>
    <span>฿{formatCurrency(shiftState.adjustedExpectedCash)}</span>
  </div>
{/if}
```

`difference` should already use adjusted expected cash from state.

---

## Close-shift report notes

Do not store full expense line items as the main record in the report.

Append compact summary only:

```txt
Paid Out from shift report: ฿120
Detailed cash expenses: 2 item(s), total ฿120
Paid Out difference: ฿0
```

Optionally include titles if desired, but keep it short:

```txt
Paid Out from shift report: ฿120
Detailed cash expenses: 2 item(s), total ฿120
Paid Out difference: ฿0
- Ice: ฿80
- Shop supplies: ฿40
```

The detailed ledger rows are the source of truth.

---

## Validation rules

For shift report:

- Existing validation stays.

For each non-empty expense row:

- `title.trim()` required.
- `amount > 0` required.
- `category` required.
- `department` required.
- `supplierId` optional.
- `notes` optional.

Empty rows can either be ignored or rejected. Recommended first version: ignore fully empty rows, reject partially filled rows.

---

## Error handling

Cases:

1. Close-shift report fails:
   - No ledger expenses should be submitted.
   - Show existing report error.

2. Report succeeds, one ledger expense fails:
   - Show: `Shift report was saved, but expense "Ice" failed to save to the ledger...`
   - Keep UI state and do not reset.
   - Staff/manager can retry or manually add in Expense Scan manual entry if needed.

3. Preset localStorage fails:
   - Ignore silently or show no more than a console warning.
   - Never block shift close.

---

## Potential issue: duplicate checks for cash expenses

`submitExpenseSlip` soft duplicate check uses same amount + date + department when no `transactionId` exists.

Because `shiftDate` includes timestamp, multiple expenses on the same shift should usually have same exact timestamp if submitted in the same loop. If two cash expenses have same amount and department, the second could trigger a duplicate.

Recommended fix if this happens:

- Add an optional `duplicateScope`/`skipSoftDuplicateCheck` to the shared ledger helper, not necessarily to public UI.
- Or generate a close-shift reference number per line, e.g. `close-shift:<reportId>:<draftId>`, and pass as `transactionId`.

Best first implementation:

Pass `transactionId: closeShiftReportId ? `close-shift:${closeShiftReportId}:${expenseDraftId}` : undefined` if you extend `ShiftExpenseSubmitInput` to include draft id.

However, `Reference Number` may be visible in Notion. If that is acceptable, it gives strong duplicate protection. If not, keep it empty and handle duplicate errors.

Recommended clean implementation:

Update `ShiftExpenseSubmitInput`:

```ts
id: string;
```

Pass:

```ts
transactionId: data.closeShiftReportId
  ? `close-shift:${data.closeShiftReportId}:${data.id}`
  : undefined
```

This avoids false duplicate errors and prevents accidental re-submit duplicates.

---

## Suggested final server command with id/reference

```ts
const SubmitCloseShiftExpenseSchema = v.object({
  id: v.string(),
  title: v.string(),
  amount: moneyField,
  category: v.string(),
  department: v.string(),
  supplierId: v.optional(v.string()),
  notes: v.optional(v.string()),
  shiftDate: v.string(),
  closerName: v.optional(v.string()),
  closeShiftReportId: v.optional(v.string())
});

export const submitCloseShiftExpense = command(SubmitCloseShiftExpenseSchema, async (data) => {
  const notes = [...].filter(Boolean).join('\n');

  return submitExpenseSlip({
    title: data.title.trim(),
    amount: data.amount,
    date: data.shiftDate,
    category: data.category,
    department: data.department,
    supplierId: data.supplierId || undefined,
    transactionId: data.closeShiftReportId ? `close-shift:${data.closeShiftReportId}:${data.id}` : undefined,
    bankAccount: 'Cash Register',
    paymentMethod: 'Cash',
    notes
  });
});
```

---

## Testing checklist

Do not run `pnpm check`, `svelte check`, or `pnpm build` in this project.

Manual/local browser testing:

1. Open `/tools/close-shift`.
2. Confirm page loads managers, suppliers, categories, departments.
3. Add no expenses and submit works as before.
4. Add one expense:
   - title: `Ice`
   - amount: `80`
   - category: `Food & Groceries` or preferred category
   - department: `Cafe`
   - supplier optional
5. Enter Paid Out from the POS/shift report slip as `80`.
6. Confirm summary shows:
   - Expected Cash
   - Paid Out from Shift Report: `-฿80`
   - Detailed Shift Expenses: `฿80`
   - Paid Out Difference: `฿0`
   - Adjusted Expected Cash
   - Difference based on adjusted expected cash
7. Change Paid Out to `100` and confirm Paid Out Difference becomes `฿20` / mismatch styling.
8. Change Paid Out back to `80`.
9. Submit.
10. Confirm End of Shift report exists and includes the Paid Out value/summary.
11. Confirm Company Ledger row exists:
   - Type: Expense
   - Status: Paid
   - Payment Method: Cash
   - Bank Account: Cash Register
   - Category/Department correct
   - Supplier relation if selected
   - Notes include `source: close-shift`
12. Start new report/add expense again.
13. Confirm `Choose previous expense` includes `Ice` and auto-fills category/department/supplier.
14. Change category/department manually and confirm preset updates.
15. Confirm localStorage key exists:
   - `casa-luma.close-shift-expense-presets.v1`

---

## Documentation

High-level persistent docs should live at:

```txt
docs/casa-luma/tools/close-shift-expenses.md
```

Implementation details should stay in this temp file:

```txt
temp/close-shift-expense-intake-implementation.md
```
