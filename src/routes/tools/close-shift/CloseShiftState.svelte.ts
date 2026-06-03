import { submitCloseShift } from '$lib/close-shift.remote';
import { submitCloseShiftExpense } from '$lib/close-shift-expenses/submit.remote';
import type { ShiftExpenseDraft } from '$lib/close-shift-expenses/types';
import type { SubmitValidationIssue } from '$lib/close-shift/validation';
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

  // Loyverse expected cash already accounts for paid-out cash removals.
  // Keep Paid Out only for reconciling detailed shift expenses, not for cash variance.
  difference = $derived(this.actualCash - numberOrZero(this.expectedCash));

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

  getValidationIssues(options: SubmitValidationOptions = {}): SubmitValidationIssue[] {
    const issues: SubmitValidationIssue[] = [];

    if (!this.closerName.trim()) issues.push({ fieldId: 'closerName', message: 'Closer name is required.' });
    if (numberOrZero(this.expectedCash) < 0) issues.push({ fieldId: 'expectedCash', message: 'Expected cash cannot be negative.' });
    if (numberOrZero(this.paymentMethods.scan) < 0) issues.push({ fieldId: 'scanPayments', message: 'Scan / transfer total cannot be negative.' });
    if (numberOrZero(this.paymentMethods.card) < 0) issues.push({ fieldId: 'cardPayments', message: 'Credit card total cannot be negative.' });
    if (numberOrZero(this.cashIn) < 0) issues.push({ fieldId: 'cashIn', message: 'Cash In cannot be negative.' });
    if (numberOrZero(this.paidOut) < 0) issues.push({ fieldId: 'paidOut', message: 'Paid Out cannot be negative.' });

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

      if (!title) {
        issues.push({ fieldId: `expense-title-${expense.id}`, message: 'Add a title for this expense.' });
      }
      if (amount <= 0) {
        issues.push({ fieldId: `expense-amount-${expense.id}`, message: 'Enter an amount greater than zero.' });
      }
      if (expense.category && validCategories.size > 0 && !validCategories.has(expense.category)) {
        issues.push({ fieldId: `expense-category-${expense.id}`, message: 'Choose a current category, or leave it blank.' });
      }
      if (expense.department && validDepartments.size > 0 && !validDepartments.has(expense.department)) {
        issues.push({ fieldId: `expense-department-${expense.id}`, message: 'Choose a current department, or leave it blank.' });
      }
    }

    for (const denom of Object.keys(this.billCounts) as Denomination[]) {
      const count = numberOrZero(this.billCounts[denom]);
      const label = DENOMINATION_LABELS[denom];
      if (count < 0) issues.push({ fieldId: `denom-${denom}`, message: `${label} count cannot be negative.` });
      if (!Number.isInteger(count)) issues.push({ fieldId: `denom-${denom}`, message: `${label} count must be a whole number.` });
    }

    return issues;
  }

  getValidationError(options: SubmitValidationOptions = {}) {
    return this.getValidationIssues(options)[0]?.message ?? null;
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
            category: expense.category || undefined,
            department: expense.department || undefined,
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
