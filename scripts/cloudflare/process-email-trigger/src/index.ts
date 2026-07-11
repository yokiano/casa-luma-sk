interface Env {
	EMAIL_WEBHOOK_URL: string;
	EMAIL_WEBHOOK_SECRET: string;
}

type EmailMessage = {
	from: string;
	to: string;
	headers: Headers;
	raw: ReadableStream<Uint8Array>;
	setReject: (reason: string) => void;
};

type ExecutionContext = {
	waitUntil: (promise: Promise<unknown>) => void;
};

const MAX_BODY_CHARS = 4000;

const getHeader = (headers: Headers, name: string): string | undefined => {
	const value = headers.get(name);
	return value && value.trim().length > 0 ? value : undefined;
};

const decodeBase64Utf8 = (value: string): string => {
	try {
		const binary = atob(value.replace(/\s/g, ''));
		const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
		return new TextDecoder('utf-8').decode(bytes);
	} catch {
		return value;
	}
};

const decodeQuotedPrintable = (value: string): string => value
	.replace(/=\r?\n/g, '')
	.replace(/=([A-F\d]{2})/gi, (_match, hex: string) => String.fromCharCode(Number.parseInt(hex, 16)));

const htmlToText = (value: string): string => value
	.replace(/<\s*br\s*\/?>/gi, '\n')
	.replace(/<\/p\s*>/gi, '\n')
	.replace(/<[^>]+>/g, ' ')
	.replace(/&nbsp;/gi, ' ')
	.replace(/&amp;/gi, '&')
	.replace(/&lt;/gi, '<')
	.replace(/&gt;/gi, '>')
	.replace(/\n\s+/g, '\n')
	.trim();

/** Extracts a readable preview from common single-part bank emails. */
const getBodyPreview = (rawEmail: string): string => {
	const separator = rawEmail.search(/\r?\n\r?\n/);
	if (separator < 0) return rawEmail.slice(0, MAX_BODY_CHARS);
	const headers = rawEmail.slice(0, separator);
	const body = rawEmail.slice(separator).replace(/^\r?\n\r?\n/, '');
	const decoded = /content-transfer-encoding:\s*base64/i.test(headers)
		? decodeBase64Utf8(body)
		: /content-transfer-encoding:\s*quoted-printable/i.test(headers)
			? decodeQuotedPrintable(body)
			: body;
	const text = /content-type:\s*text\/html/i.test(headers) ? htmlToText(decoded) : decoded.trim();
	return text.length > MAX_BODY_CHARS ? `${text.slice(0, MAX_BODY_CHARS)}…` : text;
};

const postToWebhook = async (message: EmailMessage, env: Env) => {
	if (!env.EMAIL_WEBHOOK_URL) {
		throw new Error('EMAIL_WEBHOOK_URL is not configured');
	}
	if (!env.EMAIL_WEBHOOK_SECRET) {
		throw new Error('EMAIL_WEBHOOK_SECRET is not configured');
	}

	const rawEmail = await new Response(message.raw).text();
	const headers = message.headers;

	const payload = {
		receivedAt: new Date().toISOString(),
		from: getHeader(headers, 'from') ?? message.from,
		to: getHeader(headers, 'to') ?? message.to,
		subject: getHeader(headers, 'subject') ?? '(no subject)',
		messageId: getHeader(headers, 'message-id'),
		date: getHeader(headers, 'date'),
		envelopeFrom: message.from,
		envelopeTo: message.to,
		attachmentCount: 0,
		textBody: getBodyPreview(rawEmail),
		rawSizeBytes: new TextEncoder().encode(rawEmail).length
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
};

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
