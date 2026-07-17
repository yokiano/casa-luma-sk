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

const decodeBase64Utf8 = (value: string): { value: string; ok: boolean } => {
	const compact = value.replace(/\s/g, '');
	// atob accepts some malformed input in some runtimes, so validate first.
	if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(compact)) return { value: '', ok: false };
	try {
		const binary = atob(compact);
		const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
		return { value: new TextDecoder('utf-8', { fatal: true }).decode(bytes), ok: true };
	} catch {
		return { value: '', ok: false };
	}
};

const decodeQuotedPrintable = (value: string): { value: string; ok: boolean } => {
	const withoutSoftBreaks = value.replace(/=\r?\n/g, '');
	if (/=(?![A-F\d]{2})/i.test(withoutSoftBreaks)) return { value: '', ok: false };

	// Quoted-printable escapes bytes, not Unicode code points. Decoding each
	// escape with String.fromCharCode corrupts UTF-8 Thai K BIZ content before
	// the classifier can read its memo/reference labels.
	const bytes: number[] = [];
	for (let index = 0; index < withoutSoftBreaks.length; index += 1) {
		if (withoutSoftBreaks[index] === '=') {
			bytes.push(Number.parseInt(withoutSoftBreaks.slice(index + 1, index + 3), 16));
			index += 2;
			continue;
		}
		bytes.push(...new TextEncoder().encode(withoutSoftBreaks[index]));
	}

	try {
		return { value: new TextDecoder('utf-8', { fatal: true }).decode(new Uint8Array(bytes)), ok: true };
	} catch {
		return { value: '', ok: false };
	}
};

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

/** Extracts a readable preview only when the whole single-part MIME contract is understood. */
export const getBodyPreview = (rawEmail: string): { text: string; completeness: 'complete' | 'incomplete'; mimeType?: string; textTruncated: boolean; decodeWarnings: string[] } => {
	const separator = rawEmail.search(/\r?\n\r?\n/);
	if (separator < 0) return { text: rawEmail.slice(0, MAX_BODY_CHARS), completeness: 'incomplete', textTruncated: rawEmail.length > MAX_BODY_CHARS, decodeWarnings: ['Header/body boundary was not found.'] };
	const headers = rawEmail.slice(0, separator);
	const body = rawEmail.slice(separator).replace(/^\r?\n\r?\n/, '');
	const contentTypeHeader = headers.match(/^content-type:\s*([^\r\n]*)/im)?.[1]?.trim();
	const mimeType = contentTypeHeader?.split(';', 1)[0]?.toLowerCase();
	const incomplete = (warning: string) => ({ text: '', completeness: 'incomplete' as const, mimeType, textTruncated: false, decodeWarnings: [warning] });
	if (!mimeType) return incomplete('A valid Content-Type header was not found.');
	if (/^multipart\//i.test(mimeType)) return incomplete('Multipart email parsing is not implemented by this Worker.');
	if (mimeType !== 'text/plain' && mimeType !== 'text/html') return incomplete(`Unsupported non-text Content-Type: ${mimeType}.`);
	const transferEncoding = headers.match(/^content-transfer-encoding:\s*([^\r\n;\s]+)/im)?.[1]?.toLowerCase() ?? '7bit';
	let decoded = body;
	if (transferEncoding === 'base64') {
		const result = decodeBase64Utf8(body);
		if (!result.ok) return incomplete('Base64 body decoding failed.');
		decoded = result.value;
	} else if (transferEncoding === 'quoted-printable') {
		const result = decodeQuotedPrintable(body);
		if (!result.ok) return incomplete('Quoted-printable body decoding failed.');
		decoded = result.value;
	} else if (transferEncoding !== '7bit' && transferEncoding !== '8bit') {
		return incomplete(`Unsupported Content-Transfer-Encoding: ${transferEncoding}.`);
	}
	const text = mimeType === 'text/html' ? htmlToText(decoded) : decoded.trim();
	const textTruncated = text.length > MAX_BODY_CHARS;
	return { text: textTruncated ? `${text.slice(0, MAX_BODY_CHARS)}…` : text, completeness: textTruncated ? 'incomplete' : 'complete', mimeType, textTruncated, decodeWarnings: textTruncated ? ['Body preview was truncated.'] : [] };
};

const postToWebhook = async (message: EmailMessage, env: Env) => {
	console.info('Email automation Worker invoked', { toDomain: message.to.split('@').pop() ?? 'unknown' });
	if (!env.EMAIL_WEBHOOK_URL) {
		throw new Error('EMAIL_WEBHOOK_URL is not configured');
	}
	if (!env.EMAIL_WEBHOOK_SECRET) {
		throw new Error('EMAIL_WEBHOOK_SECRET is not configured');
	}

	const rawEmail = await new Response(message.raw).text();
	const headers = message.headers;

	const preview = getBodyPreview(rawEmail);
	const payload = {
		receivedAt: new Date().toISOString(),
		from: getHeader(headers, 'from') ?? message.from,
		to: getHeader(headers, 'to') ?? message.to,
		subject: getHeader(headers, 'subject') ?? '(no subject)',
		messageId: getHeader(headers, 'message-id'),
		date: getHeader(headers, 'date'),
		envelopeFrom: message.from,
		envelopeTo: message.to,
		attachmentCount: /content-disposition:\s*attachment/i.test(rawEmail) ? 1 : 0,
		textBody: preview.text,
		mime: { parserVersion: 'worker-preview-v1', mimeType: preview.mimeType, completeness: preview.completeness, textTruncated: preview.textTruncated, decodeWarnings: preview.decodeWarnings, attachmentCount: /content-disposition:\s*attachment/i.test(rawEmail) ? 1 : 0 },
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
	console.info('Email automation webhook accepted', { status: response.status, completeness: preview.completeness });
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
