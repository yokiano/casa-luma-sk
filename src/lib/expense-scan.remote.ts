import { command } from '$app/server';
import * as v from 'valibot';
import { ocrService } from '$lib/server/ocr.service';

const ScanSchema = v.object({
  dataUrl: v.string(),
  fileName: v.optional(v.string())
});

export const scanExpenseSlip = command(ScanSchema, async ({ dataUrl, fileName }) => {
  try {
    const result = await ocrService.scanExpenseSlip(dataUrl, fileName);
    
    // Server-side logging for verification
    console.log(`[Remote] Scan complete for ${fileName ?? 'unknown'}:`, {
      amount: result.amount,
      date: result.date,
      title: result.title
    });

    return {
      title: result.title,
      date: result.date,
      amount: result.amount,
      recipientName: result.recipientName,
      transactionId: result.transactionId
    };
  } catch (error: any) {
    console.error('[Remote] OCR Scan failed:', error);
    throw error;
  }
});
