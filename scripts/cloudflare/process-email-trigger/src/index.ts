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

const getBodyPreview = (rawEmail: string): string => {
	const [, ...bodyParts] = rawEmail.split(/\r?\n\r?\n/);
	const body = bodyParts.join('\n\n').trim();
	return body.length > MAX_BODY_CHARS ? `${body.slice(0, MAX_BODY_CHARS)}…` : body;
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
