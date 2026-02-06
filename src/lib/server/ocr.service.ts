import { createWorker } from 'tesseract.js';
import { expenseScanParser } from './expense-scan/parser';
import { tmpdir } from 'os';
import { join } from 'path';

export interface OCRScanResult {
	title: string | null;
	date: string | null;
	amount: number | null;
	recipientName: string | null;
	transactionId: string | null;
	rawText?: string; // Full text from Tesseract
	rawResponse?: any; // For debugging
}

export interface OCRProvider {
	scanExpenseSlip(dataUrl: string, fileName?: string): Promise<OCRScanResult>;
}

class TesseractProvider implements OCRProvider {
	private async getWorker() {
		// Use CDN paths for Vercel/Serverless environment where local WASM files might be missing
		// Also specify cachePath to use the system temp directory, which is writable in serverless environments
		const worker = await createWorker(['eng', 'tha'], 1, {
			workerPath: 'https://cdn.jsdelivr.net/npm/tesseract.js@7.0.0/dist/worker.min.js',
			corePath: 'https://cdn.jsdelivr.net/npm/tesseract.js-core@7.0.0/tesseract-core.wasm.js',
			cachePath: join(tmpdir(), 'tesseract-cache')
		});
		return worker;
	}

	private extractBuffer(dataUrl: string): Buffer {
		const base64Index = dataUrl.indexOf('base64,');
		const base64 = base64Index === -1 ? dataUrl : dataUrl.slice(base64Index + 'base64,'.length);
		return Buffer.from(base64, 'base64');
	}

	async scanExpenseSlip(dataUrl: string, fileName?: string): Promise<OCRScanResult> {
		console.log(`--- Tesseract OCR Service [${fileName ?? 'unknown'}] ---`);
		const worker = await this.getWorker();
		const buffer = this.extractBuffer(dataUrl);
		
		const { data: { text, blocks } } = await worker.recognize(buffer);
		await worker.terminate();

		const parsed = expenseScanParser.parse(text);
		
		return {
			title: parsed.memo ?? null,
			date: parsed.date ?? null,
			amount: parsed.amount ?? null,
			recipientName: parsed.recipientName ?? null,
			transactionId: parsed.transactionId ?? null,
			rawText: text,
			rawResponse: blocks
		};
	}
}

// Factory to get the current provider
export const ocrService: OCRProvider = new TesseractProvider();
