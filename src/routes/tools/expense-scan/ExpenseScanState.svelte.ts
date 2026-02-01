import { scanExpenseSlip } from '$lib/expense-scan.remote';
import { submitExpenseSlip } from '$lib/expense-submit.remote';
import { toast } from 'svelte-sonner';

export type DropItem = {
  id: string;
  dataUrl: string;
  fileName: string;
  fileSize: number;
  fileType: string;
};

export type ScannedSlipStatus = 'pending' | 'scanning' | 'scanned' | 'submitting' | 'submitted' | 'error';

export type ScannedSlip = {
  id: string;
  imageDataUrl: string;
  fileName: string;
  status: ScannedSlipStatus;
  parsedTitle?: string | null;
  parsedAmount?: number | null;
  parsedDate?: string | null;
  parsedRecipientName?: string | null;
  parsedTransactionId?: string | null;
  rawText?: string | null;
  category?: string;
  department?: string;
  supplierId?: string;
  error?: string | null;
  notionId?: string | null;
};

export class ExpenseScanState {
  slips = $state<ScannedSlip[]>([]);
  isScanning = $state(false);
  isSubmittingAll = $state(false);

  addItems(items: DropItem[]) {
    const newSlips = items.map((item) => ({
      id: item.id,
      imageDataUrl: item.dataUrl,
      fileName: item.fileName,
      status: 'pending' as const
    }));

    this.slips = [...this.slips, ...newSlips];
  }

  removeSlip(id: string) {
    this.slips = this.slips.filter((slip) => slip.id !== id);
  }

  updateSlip(id: string, patch: Partial<ScannedSlip>) {
    const slip = this.slips.find((item) => item.id === id);
    if (!slip) return;
    Object.assign(slip, patch);
  }

  async scanSlip(id: string) {
    const slip = this.slips.find((item) => item.id === id);
    if (!slip) return;

    this.updateSlip(id, { 
      status: 'scanning', 
      error: null,
      parsedTitle: null,
      parsedAmount: null,
      parsedDate: null,
      parsedRecipientName: null,
      parsedTransactionId: null,
      rawText: null
    });

    try {
      const parsed = await scanExpenseSlip({
        dataUrl: slip.imageDataUrl,
        fileName: slip.fileName
      });

      this.updateSlip(id, {
        status: 'scanned',
        parsedTitle: parsed.title ?? null,
        parsedAmount: parsed.amount ?? null,
        parsedDate: parsed.date ?? null,
        parsedRecipientName: parsed.recipientName ?? null,
        parsedTransactionId: parsed.transactionId ?? null,
        rawText: parsed.rawText ?? null
      });
    } catch (e: any) {
      this.updateSlip(id, {
        status: 'error',
        error: e?.message ?? 'Failed to scan slip'
      });
    }
  }

  async scanAll() {
    this.isScanning = true;
    const targets = this.slips.filter((slip) => slip.status === 'pending');
    await Promise.all(targets.map((slip) => this.scanSlip(slip.id)));
    this.isScanning = false;
  }

  async submitSlip(id: string, silent = false) {
    const slip = this.slips.find((item) => item.id === id);
    if (!slip) return;

    if (!slip.parsedTitle || !slip.parsedAmount || !slip.parsedDate) {
      this.updateSlip(id, { status: 'error', error: 'Missing scanned data' });
      return;
    }

    if (!slip.category || !slip.department) {
      this.updateSlip(id, { status: 'error', error: 'Fill category and department' });
      return;
    }

    this.updateSlip(id, { status: 'submitting', error: null });

    try {
      const result = await submitExpenseSlip({
        title: slip.parsedTitle,
        amount: slip.parsedAmount,
        date: slip.parsedDate,
        category: slip.category,
        department: slip.department,
        supplierId: slip.supplierId,
        transactionId: slip.parsedTransactionId ?? undefined
      });

      this.updateSlip(id, {
        status: 'submitted',
        notionId: result.id
      });

      if (!silent) {
        toast.success('Submitted to Notion', {
          description: `${slip.parsedTitle} - ${slip.parsedAmount} THB`
        });
      }
    } catch (e: any) {
      const errorMessage = e?.body?.message || e?.message || 'Failed to submit slip';
      this.updateSlip(id, {
        status: 'error',
        error: errorMessage
      });
      if (!silent) {
        toast.error('Submission failed', {
          description: errorMessage
        });
      }
      throw e; // Rethrow so submitAll can track failures
    }
  }

  async submitAll() {
    this.isSubmittingAll = true;
    const targets = this.slips.filter((slip) => slip.status === 'scanned');
    const results = await Promise.allSettled(targets.map((slip) => this.submitSlip(slip.id, true)));
    
    const succeeded = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    if (succeeded > 0) {
      toast.success(`Submitted ${succeeded} slip${succeeded > 1 ? 's' : ''} to Notion`);
    }
    if (failed > 0) {
      toast.error(`Failed to submit ${failed} slip${failed > 1 ? 's' : ''}`);
    }

    this.isSubmittingAll = false;
  }
}
