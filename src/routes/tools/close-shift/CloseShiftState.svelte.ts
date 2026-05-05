import { submitCloseShift } from '$lib/close-shift.remote';
import { SvelteDate } from 'svelte/reactivity';

type Denomination = '1000' | '500' | '100' | '50' | '20' | '10' | '5' | '2' | '1';
type BillCounts = Record<Denomination, number | undefined>;
type PaymentMethods = {
  scan: number | undefined;
  card: number | undefined;
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

  sanitizeForSubmit() {
    this.normalizeExpectedCash();
    (Object.keys(this.billCounts) as Denomination[]).forEach((denom) => this.normalizeBillCount(denom));
    this.normalizePaymentMethod('scan');
    this.normalizePaymentMethod('card');
    this.normalizeCashIn();
  }

  getValidationError() {
    if (numberOrZero(this.expectedCash) < 0) return 'Expected cash cannot be negative.';
    if (numberOrZero(this.paymentMethods.scan) < 0) return 'Scan / transfer total cannot be negative.';
    if (numberOrZero(this.paymentMethods.card) < 0) return 'Credit card total cannot be negative.';
    if (numberOrZero(this.cashIn) < 0) return 'Cash In cannot be negative.';

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
      const result = await submitCloseShift({
        expectedCash: numberOrZero(this.expectedCash),
        billCounts: this.billCounts,
        paymentMethods: this.paymentMethods,
        cashIn: numberOrZero(this.cashIn),
        closerId: this.closerId,
        closerPersonId: this.closerPersonId,
        closerName: this.closerName,
        notes: this.notes,
        shiftDate: new SvelteDate().toISOString()
      });
      
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
    this.error = null;
    this.success = false;
    this.isSubmitting = false;
  }
}
