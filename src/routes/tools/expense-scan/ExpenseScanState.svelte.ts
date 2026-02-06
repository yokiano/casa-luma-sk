import { scanExpenseSlipClient } from '$lib/expense-scan/ocr';
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
  category: string;
  department: string;
  supplierId: string;
  ruleApplied?: boolean;
  error?: string | null;
  notionId?: string | null;
};

export type ScanRule = {
  match: string;
  category: string;
  department: string;
  supplierId?: string;
};

export type SortField = 'recipient' | 'amount' | 'date' | 'ruleMatch';

export class ExpenseScanState {
  slips = $state<ScannedSlip[]>([]);
  rules = $state<ScanRule[]>([]);
  isScanning = $state(false);
  isSubmittingAll = $state(false);
  
  sortBy = $state<SortField | null>(null);
  sortOrder = $state<'asc' | 'desc'>('desc');

  sortedSlips = $derived.by(() => {
    if (!this.sortBy) return this.slips;

    return [...this.slips].sort((a, b) => {
      let valA: any;
      let valB: any;

      switch (this.sortBy) {
        case 'recipient':
          valA = (a.parsedRecipientName || '').toLowerCase();
          valB = (b.parsedRecipientName || '').toLowerCase();
          break;
        case 'amount':
          valA = a.parsedAmount || 0;
          valB = b.parsedAmount || 0;
          break;
        case 'date':
          valA = this.parseDate(a.parsedDate);
          valB = this.parseDate(b.parsedDate);
          break;
        case 'ruleMatch':
          // Sort not matched first: false (0) then true (1)
          valA = a.ruleApplied ? 1 : 0;
          valB = b.ruleApplied ? 1 : 0;
          break;
        default:
          return 0;
      }

      if (valA < valB) return this.sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return this.sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  });

  private parseDate(dateStr?: string | null): number {
    if (!dateStr) return 0;
    try {
      // Format: DD/MM/YYYY HH:mm or DD/MM/YYYY
      const parts = dateStr.split(' ');
      const dmy = parts[0];
      const [d, m, y] = dmy.split('/').map(Number);
      
      const date = new Date(y, m - 1, d);
      if (parts[1]) {
        const [h, min] = parts[1].split(':').map(Number);
        date.setHours(h, min);
      }
      return date.getTime();
    } catch {
      return 0;
    }
  }

  addItems(items: DropItem[]) {
    const newSlips = items.map((item) => ({
      id: item.id,
      imageDataUrl: item.dataUrl,
      fileName: item.fileName,
      status: 'pending' as const,
      category: '',
      department: '',
      supplierId: ''
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
      const parsed = await scanExpenseSlipClient(slip.imageDataUrl, slip.fileName);

      // Match rules locally
      let ruleSuggestion: Partial<ScannedSlip> | null = null;
      if (parsed.recipientName && (this.rules?.length ?? 0) > 0) {
        const normalizedRecipient = parsed.recipientName.toLowerCase().replace(/\s+/g, '');
        for (const rule of this.rules || []) {
          const matchPattern = rule.match?.toLowerCase().replace(/\s+/g, '');
          if (matchPattern && normalizedRecipient.includes(matchPattern)) {
            ruleSuggestion = {
              category: rule.category || undefined,
              department: rule.department || undefined,
              supplierId: rule.supplierId || '',
              ruleApplied: true
            };
            break;
          }
        }
      }

      this.updateSlip(id, {
        status: 'scanned',
        parsedTitle: parsed.title ?? null,
        parsedAmount: parsed.amount ?? null,
        parsedDate: parsed.date ?? null,
        parsedRecipientName: parsed.recipientName ?? null,
        parsedTransactionId: parsed.transactionId ?? null,
        rawText: parsed.rawText ?? null,
        // Apply rule suggestions if available
        category: ruleSuggestion?.category || slip.category,
        department: ruleSuggestion?.department || slip.department,
        supplierId: ruleSuggestion?.supplierId || slip.supplierId,
        ruleApplied: ruleSuggestion?.ruleApplied ?? false
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
    
    // Batch processing to avoid rate limits (concurrently scan 3 slips at a time)
    const BATCH_SIZE = 3;
    for (let i = 0; i < targets.length; i += BATCH_SIZE) {
      const batch = targets.slice(i, i + BATCH_SIZE);
      await Promise.all(batch.map((slip) => this.scanSlip(slip.id)));
    }
    
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
    
    // Batch processing for submission (concurrently submit 5 slips at a time)
    const BATCH_SIZE = 5;
    let succeeded = 0;
    let failed = 0;

    for (let i = 0; i < targets.length; i += BATCH_SIZE) {
      const batch = targets.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(batch.map((slip) => this.submitSlip(slip.id, true)));
      
      succeeded += results.filter((r) => r.status === 'fulfilled').length;
      failed += results.filter((r) => r.status === 'rejected').length;
    }

    if (succeeded > 0) {
      toast.success(`Submitted ${succeeded} slip${succeeded > 1 ? 's' : ''} to Notion`);
    }
    if (failed > 0) {
      toast.error(`Failed to submit ${failed} slip${failed > 1 ? 's' : ''}`);
    }

    this.isSubmittingAll = false;
  }
}
