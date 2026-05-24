import { submitCloseShift } from '$lib/close-shift.remote';
import { submitCloseShiftExpense } from '$lib/close-shift-expenses/submit.remote';
import type { ShiftExpenseDraft } from '$lib/close-shift-expenses/types';
import { SvelteDate } from 'svelte/reactivity';

type Denomination = '1000' | '500' | '100' | '50' | '20' | '10' | '5' | '2' | '1';
type BillCounts = Record<Denomination, number | undefined>;
type PaymentMethods = {
  scan: number | undefined;
  card: number | undefined;
};

type SubmitValidationOptions = {
  categories?: string[];
  departments?: string[];
};

const DEFAULT_BILL_COUNTS: BillCounts = {
  '1000': 0,
  '500': 0,
  '100': 0,
  '50': 0,
  '20': 0,
  '10': 0,
  '5': 0,
  '2': 0,
  '1': 0
};

const DENOMINATION_LABELS: Record<Denomination, string> = {
  '1000': '1000 baht bill',
  '500': '500 baht bill',
  '100': '100 baht bill',
  '50': '50 baht bill',
  '20': '20 baht bill',
  '10': '10 baht coin',
  '5': '5 baht coin',
  '2': '2 baht coin',
  '1': '1 baht coin'
};

function numberOrZero(value: number | null | undefined) {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

export class CloseShiftState {
  // State
  expectedCash = $state<number | undefined>(0);
  billCounts = $state<BillCounts>({ ...DEFAULT_BILL_COUNTS });
  paymentMethods = $state<PaymentMethods>({
    scan: 0,
    card: 0
  });
  closerId = $state('');
  closerPersonId = $state<string | undefined>(undefined);
  closerName = $state('');
  notes = $state('');
  cashIn = $state<number | undefined>(0);
  paidOut = $state<number | undefined>(0);
  expenses = $state<ShiftExpenseDraft[]>([]);
  
  isSubmitting = $state(false);
  error = $state<string | null>(null);
  success = $state(false);

  // Derived
  actualCash = $derived.by(() => {
    let total = 0;
    total += numberOrZero(this.billCounts['1000']) * 1000;
    total += numberOrZero(this.billCounts['500']) * 500;
    total += numberOrZero(this.billCounts['100']) * 100;
    total += numberOrZero(this.billCounts['50']) * 50;
    total += numberOrZero(this.billCounts['20']) * 20;
    total += numberOrZero(this.billCounts['10']) * 10;
    total += numberOrZero(this.billCounts['5']) * 5;
    total += numberOrZero(this.billCounts['2']) * 2;
    total += numberOrZero(this.billCounts['1']) * 1;
    return total;
  });

  expensesTotal = $derived.by(() =>
    this.expenses.reduce((sum, expense) => sum + numberOrZero(expense.amount), 0)
  );

  paidOutDifference = $derived(numberOrZero(this.paidOut) - this.expensesTotal);

  adjustedExpectedCash = $derived(numberOrZero(this.expectedCash) - numberOrZero(this.paidOut));

  difference = $derived(this.actualCash - this.adjustedExpectedCash);

  // Methods
  normalizeExpectedCash() {
    this.expectedCash = numberOrZero(this.expectedCash);
  }

  normalizeBillCount(denom: string) {
    if (denom in this.billCounts) {
      const key = denom as Denomination;
      this.billCounts[key] = numberOrZero(this.billCounts[key]);
    }
  }

  normalizePaymentMethod(method: keyof PaymentMethods) {
    this.paymentMethods[method] = numberOrZero(this.paymentMethods[method]);
  }

  normalizeCashIn() {
    this.cashIn = numberOrZero(this.cashIn);
  }

  normalizePaidOut() {
    this.paidOut = numberOrZero(this.paidOut);
  }

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

  normalizeExpenseAmount(id: string) {
    const expense = this.expenses.find((item) => item.id === id);
    if (!expense) return;
    expense.amount = numberOrZero(expense.amount);
  }

  sanitizeForSubmit() {
    this.normalizeExpectedCash();
    (Object.keys(this.billCounts) as Denomination[]).forEach((denom) => this.normalizeBillCount(denom));
    this.normalizePaymentMethod('scan');
    this.normalizePaymentMethod('card');
    this.normalizeCashIn();
    this.normalizePaidOut();
  }

  getValidationError(options: SubmitValidationOptions = {}) {
    if (!this.closerName.trim()) return 'Closer name is required.';
    if (numberOrZero(this.expectedCash) < 0) return 'Expected cash cannot be negative.';
    if (numberOrZero(this.paymentMethods.scan) < 0) return 'Scan / transfer total cannot be negative.';
    if (numberOrZero(this.paymentMethods.card) < 0) return 'Credit card total cannot be negative.';
    if (numberOrZero(this.cashIn) < 0) return 'Cash In cannot be negative.';
    if (numberOrZero(this.paidOut) < 0) return 'Paid Out cannot be negative.';

    const validCategories = new Set(options.categories ?? []);
    const validDepartments = new Set(options.departments ?? []);

    for (const expense of this.expenses) {
      const title = expense.title.trim();
      const amount = numberOrZero(expense.amount);
      const hasAnyField =
        title ||
        amount > 0 ||
        expense.category ||
        expense.department ||
        expense.supplierId ||
        expense.notes.trim();

      if (!hasAnyField) continue;

      if (!title) return 'Each shift expense needs a description.';
      if (amount <= 0) return `Expense "${title}" needs an amount greater than zero.`;
      if (!expense.category) return `Expense "${title}" needs a category.`;
      if (!expense.department) return `Expense "${title}" needs a department.`;
      if (validCategories.size > 0 && !validCategories.has(expense.category)) {
        return `Expense "${title}" uses an old or invalid category. Please choose a current category.`;
      }
      if (validDepartments.size > 0 && !validDepartments.has(expense.department)) {
        return `Expense "${title}" uses an old or invalid department. Please choose a current department.`;
      }
    }

    if (this.expensesTotal > 0 && numberOrZero(this.paidOut) <= 0) {
      return 'Paid Out from the POS shift report is required when shift expenses are entered.';
    }

    if (this.expensesTotal > 0 && this.paidOutDifference !== 0 && !this.notes.trim()) {
      return 'Please explain the Paid Out difference in Notes before submitting.';
    }

    for (const denom of Object.keys(this.billCounts) as Denomination[]) {
      const count = numberOrZero(this.billCounts[denom]);
      const label = DENOMINATION_LABELS[denom];
      if (count < 0) return `${label} count cannot be negative.`;
      if (!Number.isInteger(count)) return `${label} count must be a whole number.`;
    }

    return null;
  }

  setBillCount(denom: Denomination, value: number | undefined) {
    this.billCounts[denom] = value;
  }

  clearBillCounts() {
    this.billCounts = { ...DEFAULT_BILL_COUNTS };
  }

  async submit(options: SubmitValidationOptions = {}) {
    this.isSubmitting = true;
    this.error = null;
    this.sanitizeForSubmit();
    const validationError = this.getValidationError(options);
    if (validationError) {
      this.error = validationError;
      this.isSubmitting = false;
      return;
    }
    
    try {
      const shiftDate = new SvelteDate().toISOString();
      const expenseLines = this.expenses.filter((expense) => numberOrZero(expense.amount) > 0);
      const expenseSummary = expenseLines.length || numberOrZero(this.paidOut) > 0
        ? `\n\nPaid Out from shift report: ฿${numberOrZero(this.paidOut).toLocaleString()}\nDetailed cash expenses: ${expenseLines.length} item(s), total ฿${this.expensesTotal.toLocaleString()}\nPaid Out difference: ฿${this.paidOutDifference.toLocaleString()}`
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

      for (const expense of expenseLines) {
        try {
          await submitCloseShiftExpense({
            id: expense.id,
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
      console.error(e);
      this.error = e?.body?.message || e?.message || 'Failed to submit report';
    } finally {
      this.isSubmitting = false;
    }
  }

  reset() {
    this.expectedCash = 0;
    this.billCounts = { ...DEFAULT_BILL_COUNTS };
    this.paymentMethods = {
      scan: 0,
      card: 0
    };
    this.closerId = '';
    this.closerPersonId = undefined;
    this.closerName = '';
    this.notes = '';
    this.cashIn = 0;
    this.paidOut = 0;
    this.expenses = [];
    this.error = null;
    this.success = false;
    this.isSubmitting = false;
  }
}
