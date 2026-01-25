import * as mindee from 'mindee';
import { MINDEE_API_KEY } from '$env/static/private';

export interface OCRScanResult {
	title: string | null;
	date: string | null;
	amount: number | null;
	recipientName: string | null;
	transactionId: string | null;
	rawResponse?: any; // For debugging
}

export interface OCRProvider {
	scanExpenseSlip(dataUrl: string, fileName?: string): Promise<OCRScanResult>;
}

class MindeeProvider implements OCRProvider {
	private client: mindee.ClientV2;
	private modelId = '9e7c3703-d378-4a01-a43c-03beb6f8da11';

	constructor(apiKey: string) {
		this.client = new mindee.ClientV2({ apiKey });
	}

	private extractBase64(dataUrl: string) {
		const base64Index = dataUrl.indexOf('base64,');
		if (base64Index === -1) return dataUrl;
		return dataUrl.slice(base64Index + 'base64,'.length);
	}

	async scanExpenseSlip(dataUrl: string, fileName?: string): Promise<OCRScanResult> {
		const inputSource = new mindee.Base64Input({
			inputString: this.extractBase64(dataUrl),
			filename: fileName ?? 'slip.jpg'
		});

		const response = await this.client.enqueueAndGetInference(inputSource, {
			modelId: this.modelId
		});

		// The Mindee SDK v4 object mapping for custom models seems unreliable in this environment.
		// We'll use the rawHttp response which we've verified contains the data.
		const rawInference = (response as any).rawHttp?.inference;
		const fields = rawInference?.result?.fields ?? (response as any).inference?.result?.fields ?? {};

		console.log(`--- Mindee OCR Service [${fileName ?? 'unknown'}] ---`);
		const fieldKeys = Object.keys(fields).filter(k => !k.startsWith('_'));
		console.log('Fields keys found:', fieldKeys);
		
		return {
			title: fields.title?.value ?? null,
			date: fields.time_date?.value ?? null,
			amount: fields.total_amount?.value !== undefined && fields.total_amount?.value !== null 
				? parseFloat(String(fields.total_amount.value)) 
				: null,
			recipientName: fields.recipient_name?.value ?? null,
			transactionId: fields.transaction_id?.value ?? null,
			rawResponse: fields
		};
	}
}

// Factory to get the current provider
export const ocrService: OCRProvider = new MindeeProvider(MINDEE_API_KEY);
