import { REPLICATE_API_KEY } from '$env/static/private';

const REPLICATE_API_URL = 'https://api.replicate.com/v1';
const MODEL_VERSION = 'google/imagen-4-fast';

type PredictionStatus = 'starting' | 'processing' | 'succeeded' | 'failed' | 'canceled';

type CreatePredictionResponse = {
	id: string;
	status: PredictionStatus;
	urls: {
		get: string;
		cancel: string;
	};
	output?: unknown;
	error?: string;
};

type PredictionResult = CreatePredictionResponse;

type GenerateImageOptions = {
	prompt: string;
	aspectRatio?: string;
	negativePrompt?: string;
	guidanceScale?: number;
	seed?: number;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const getHeaders = () => {
	const apiKey = REPLICATE_API_KEY;
	if (!apiKey) {
		throw new Error('REPLICATE_API_KEY is not configured');
	}
	return {
		Authorization: `Token ${apiKey}`,
		'Content-Type': 'application/json'
	};
};

async function createPrediction(options: GenerateImageOptions): Promise<CreatePredictionResponse> {
	// Using model name format (owner/name:version or owner/name for latest)
	const requestBody = {
		version: MODEL_VERSION,
		input: {
			prompt: options.prompt,
			aspect_ratio: options.aspectRatio ?? '16:9',
			...(options.negativePrompt && { negative_prompt: options.negativePrompt }),
			...(options.guidanceScale && { guidance_scale: options.guidanceScale }),
			...(options.seed && { seed: options.seed })
		}
	};

	console.log('[Replicate] Creating prediction with:', JSON.stringify(requestBody, null, 2));

	const response = await fetch(`${REPLICATE_API_URL}/predictions`, {
		method: 'POST',
		headers: getHeaders(),
		body: JSON.stringify(requestBody)
	});

	if (!response.ok) {
		const error = await response.text();
		console.error('[Replicate] Prediction creation failed:', error);
		throw new Error(`Replicate prediction failed: ${error}`);
	}

	const result = (await response.json()) as CreatePredictionResponse;
	console.log('[Replicate] Prediction created:', result.id, 'status:', result.status);
	return result;
}

async function getPrediction(url: string): Promise<PredictionResult> {
	const response = await fetch(url, {
		headers: getHeaders()
	});

	if (!response.ok) {
		const error = await response.text();
		throw new Error(`Replicate polling failed: ${error}`);
	}

	return (await response.json()) as PredictionResult;
}

export async function generateImagen4Fast(options: GenerateImageOptions) {
	const prediction = await createPrediction(options);

	let current = prediction;
	const maxAttempts = 20;
	let attempt = 0;

	while (
		(current.status === 'starting' || current.status === 'processing') &&
		attempt < maxAttempts
	) {
		attempt += 1;
		await sleep(1500);
		current = await getPrediction(current.urls.get);
	}

	if (current.status !== 'succeeded') {
		const errorMessage = current.error || `Prediction ${current.status}`;
		throw new Error(errorMessage);
	}

	const output = current.output;
	let imageUrl: string | undefined;

	console.log('[Replicate] Output type:', typeof output);
	console.log('[Replicate] Output value:', JSON.stringify(output, null, 2));

	if (Array.isArray(output)) {
		imageUrl = typeof output[0] === 'string' ? output[0] : undefined;
	} else if (typeof output === 'string') {
		imageUrl = output;
	} else if (output && typeof output === 'object') {
		// Some models return an object with a `content` array
		const maybeContent = (output as any).content;
		if (Array.isArray(maybeContent) && maybeContent.length > 0) {
			const first = maybeContent[0];
			if (typeof first === 'string') {
				imageUrl = first;
			} else if (first && typeof first === 'object') {
				imageUrl = typeof first.url === 'string' ? first.url : undefined;
			}
		}
	}

	if (!imageUrl) {
		console.error('[Replicate] Failed to extract image URL from output');
		throw new Error(`Replicate returned no image output. Output was: ${JSON.stringify(output)}`);
	}

	console.log('[Replicate] Extracted image URL:', imageUrl);

	return {
		imageUrl,
		predictionId: current.id,
		attempts: attempt,
		output
	};
}


