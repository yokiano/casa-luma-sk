import { parseInboundEmail, WORKER_PARSER_VERSION } from './parser';

interface Env {
	EMAIL_WEBHOOK_URL: string;
	EMAIL_WEBHOOK_SECRET: string;
}

type EmailMessage = {
	from: string;
	to: string;
	headers: Headers;
	raw: ReadableStream<Uint8Array>;
	rawSize?: number;
	setReject: (reason: string) => void;
};

type ExecutionContext = {
	waitUntil: (promise: Promise<unknown>) => void;
};

const getHeader = (headers: Headers, name: string): string | undefined => {
	const value = headers.get(name);
	return value && value.trim().length > 0 ? value : undefined;
};

const postToWebhook = async (message: EmailMessage, env: Env) => {
	console.info('Email automation Worker invoked', { toDomain: message.to.split('@').pop() ?? 'unknown' });
	if (!env.EMAIL_WEBHOOK_URL) throw new Error('EMAIL_WEBHOOK_URL is not configured');
	if (!env.EMAIL_WEBHOOK_SECRET) throw new Error('EMAIL_WEBHOOK_SECRET is not configured');

	// message.raw is a one-shot stream. PostalMime consumes it exactly once, and
	// rawSize avoids reading the stream again just to calculate a diagnostic.
	const parsed = await parseInboundEmail(message.raw);
	const headers = message.headers;
	const attachmentCount = parsed.bodyExtractionMetadata.attachmentCount;
	const extractedBody = parsed.extractedBody;
	const payload = {
		receivedAt: new Date().toISOString(),
		from: parsed.from ?? getHeader(headers, 'from') ?? message.from,
		to: parsed.to ?? getHeader(headers, 'to') ?? message.to,
		subject: parsed.subject ?? getHeader(headers, 'subject') ?? '(no subject)',
		messageId: parsed.messageId ?? getHeader(headers, 'message-id'),
		date: parsed.date ?? getHeader(headers, 'date'),
		envelopeFrom: message.from,
		envelopeTo: message.to,
		attachmentCount,
		// textBody remains populated during rollout for older app code and tools.
		textBody: extractedBody,
		extractedBody,
		extractedBodySource: parsed.extractedBodySource,
		extractedBodyTruncated: parsed.extractedBodyTruncated,
		bodyExtractionMetadata: parsed.bodyExtractionMetadata,
		mime: {
			parserVersion: WORKER_PARSER_VERSION,
			mimeType: parsed.mimeType,
			completeness: parsed.bodyExtractionMetadata.bodyCompleteness,
			textTruncated: parsed.extractedBodyTruncated,
			decodeWarnings: parsed.bodyExtractionMetadata.decodeWarnings,
			attachmentCount
		},
		rawSizeBytes: typeof message.rawSize === 'number' ? message.rawSize : undefined
	};

	const response = await fetch(env.EMAIL_WEBHOOK_URL, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'x-webhook-token': env.EMAIL_WEBHOOK_SECRET
		},
		body: JSON.stringify(payload)
	});

	if (!response.ok) {
		const errorText = await response.text();
		throw new Error(`Email webhook failed (${response.status}): ${errorText.slice(0, 500)}`);
	}
	console.info('Email automation webhook accepted', {
		status: response.status,
		completeness: parsed.bodyExtractionMetadata.bodyCompleteness,
		attachmentCount
	});
};

export { parseInboundEmail } from './parser';
export type { BodyExtractionMetadata, ParsedInboundEmail } from './parser';

export default {
	async email(message: EmailMessage, env: Env, _ctx: ExecutionContext) {
		try {
			await postToWebhook(message, env);
		} catch (error) {
			console.error('Failed to process inbound email', error);
			message.setReject('Email automation webhook failed');
		}
	}
};
