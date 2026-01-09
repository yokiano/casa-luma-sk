import { submitCloseShift } from '$lib/close-shift.remote';

export class CloseShiftState {
  // State
  expectedCash = $state(0);
  billCounts = $state({
    '1000': 0,
    '500': 0,
    '100': 0,
    '50': 0,
    '20': 0,
    '10': 0,
    '5': 0,
    '2': 0,
    '1': 0
  });
  paymentMethods = $state({
    scan: 0,
    card: 0
  });
  closerId = $state('');
  closerPersonId = $state<string | undefined>(undefined);
  closerName = $state('');
  notes = $state('');
  
  isSubmitting = $state(false);
  error = $state<string | null>(null);
  success = $state(false);

  // Derived
  actualCash = $derived.by(() => {
    let total = 0;
    total += this.billCounts['1000'] * 1000;
    total += this.billCounts['500'] * 500;
    total += this.billCounts['100'] * 100;
    total += this.billCounts['50'] * 50;
    total += this.billCounts['20'] * 20;
    total += this.billCounts['10'] * 10;
    total += this.billCounts['5'] * 5;
    total += this.billCounts['2'] * 2;
    total += this.billCounts['1'] * 1;
    return total;
  });

  difference = $derived(this.actualCash - this.expectedCash);

  // Methods
  setBillCount(denom: keyof typeof this.billCounts, value: number) {
    this.billCounts[denom] = value;
  }

  clearBillCounts() {
    this.billCounts = {
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
  }

  async submit() {
    this.isSubmitting = true;
    this.error = null;
    
    try {
      if (!this.closerId) {
        throw new Error('Please select a manager');
      }

      const result = await submitCloseShift({
        expectedCash: this.expectedCash,
        billCounts: this.billCounts,
        paymentMethods: this.paymentMethods,
        closerId: this.closerId,
        closerPersonId: this.closerPersonId,
        closerName: this.closerName,
        notes: this.notes,
        shiftDate: new Date().toISOString()
      });
      
      this.success = true;
      return result;
    } catch (e: any) {
      console.error(e);
      this.error = e.message || 'Failed to submit report';
    } finally {
      this.isSubmitting = false;
    }
  }

  reset() {
    this.expectedCash = 0;
    this.billCounts = {
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
    this.paymentMethods = {
      scan: 0,
      card: 0
    };
    this.closerId = '';
    this.closerPersonId = undefined;
    this.closerName = '';
    this.notes = '';
    this.error = null;
    this.success = false;
    this.isSubmitting = false;
  }
}
