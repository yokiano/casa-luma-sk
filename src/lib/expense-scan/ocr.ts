import { createWorker } from 'tesseract.js';
import { expenseScanParser } from './parser';

export interface OCRScanResult {
	title: string | null;
	date: string | null;
	amount: number | null;
	recipientName: string | null;
	transactionId: string | null;
	rawText?: string;
}

/**
 * Runs Tesseract OCR in the browser (Web Worker + WASM).
 * Takes an image data URL, returns parsed expense data.
 */
export async function scanExpenseSlipClient(
	dataUrl: string,
	fileName?: string
): Promise<OCRScanResult> {
	console.log(`--- Client OCR [${fileName ?? 'unknown'}] ---`);

	const worker = await createWorker(['eng', 'tha']);
	const { data: { text } } = await worker.recognize(dataUrl);
	await worker.terminate();

	const parsed = expenseScanParser.parse(text);

	return {
		title: parsed.memo ?? null,
		date: parsed.date ?? null,
		amount: parsed.amount ?? null,
		recipientName: parsed.recipientName ?? null,
		transactionId: parsed.transactionId ?? null,
		rawText: text
	};
}
