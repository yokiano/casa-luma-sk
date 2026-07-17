import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';
import { ingestEmailAutomationEvent } from '$lib/server/email-automation';

const MAX_SNIPPET_LENGTH = 500;

const isObject = (value: unknown): value is Record<string, unknown> => {
	return typeof value === 'object' && value !== null;
};

const asString = (value: unknown): string | undefined => {
	return typeof value === 'string' && value.trim().length > 0 ? value : undefined;
};

const asNumber = (value: unknown): number | undefined => {
	return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
};

const escapeHtml = (value: string): string => {
	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
};

const normalizeWhitespace = (value: string): string => {
	return value.replace(/\s+/g, ' ').trim();
};

const getSnippet = (value: unknown): string | undefined => {
	const text = asString(value);
	if (!text) return undefined;
	const normalized = normalizeWhitespace(text);
	return normalized.length > MAX_SNIPPET_LENGTH
		? `${normalized.slice(0, MAX_SNIPPET_LENGTH)}…`
		: normalized;
};

const getMime = (value: unknown) => {
	if (!isObject(value)) return undefined;
	const completeness = asString(value.completeness);
	const completenessState: 'complete' | 'incomplete' | 'unsupported' = completeness === 'complete' || completeness === 'incomplete' || completeness === 'unsupported' ? completeness : 'incomplete';
	return {
		parserVersion: asString(value.parserVersion)?.slice(0, 80),
		mimeType: asString(value.mimeType)?.slice(0, 120),
		completeness: completenessState,
		textTruncated: value.textTruncated === true,
		decodeWarnings: Array.isArray(value.decodeWarnings) ? value.decodeWarnings.filter((warning): warning is string => typeof warning === 'string').slice(0, 5).map((warning) => warning.slice(0, 160)) : [],
		attachmentCount: asNumber(value.attachmentCount) ?? 0
	};
};

const getPayloadMetadata = (payload: Record<string, unknown>) => {
	const attachmentCount = asNumber(payload.attachmentCount) ?? 0;

	return {
		receivedAt: asString(payload.receivedAt) ?? new Date().toISOString(),
		from: asString(payload.from) ?? 'unknown sender',
		to: asString(payload.to) ?? 'unknown recipient',
		subject: asString(payload.subject) ?? '(no subject)',
		messageId: asString(payload.messageId),
		attachmentCount,
		textSnippet: getSnippet(payload.textBody),
		htmlSnippet: getSnippet(payload.htmlBody),
		mime: getMime(payload.mime)
	};
};

export const POST: RequestHandler = async ({ request }) => {
	const secret = env.EMAIL_WEBHOOK_SECRET;
	if (!secret) {
		console.error('[email-webhook] EMAIL_WEBHOOK_SECRET is not configured');
		return json({ error: 'Email webhook is not configured' }, { status: 503 });
	}
	const incomingToken = request.headers.get('x-webhook-token');
	if (incomingToken !== secret) {
		return json({ error: 'Unauthorized webhook request' }, { status: 401 });
	}

	let payload: unknown;
	try {
		payload = await request.json();
	} catch {
		return json({ error: 'Invalid JSON payload' }, { status: 400 });
	}

	if (!isObject(payload)) {
		return json({ error: 'Expected JSON object payload' }, { status: 400 });
	}

	const metadata = getPayloadMetadata(payload);
	let result;
	try {
		result = await ingestEmailAutomationEvent({
			receivedAt: metadata.receivedAt,
			from: metadata.from,
			to: metadata.to,
			subject: metadata.subject,
			messageId: metadata.messageId,
			attachmentCount: metadata.attachmentCount,
			// Classify from the Worker preview (up to 4,000 chars); only compact
			// snippets are retained by the email-automation service.
			textBody: asString(payload.textBody)?.slice(0, 4000),
			htmlBody: asString(payload.htmlBody)?.slice(0, 4000),
			mime: metadata.mime
		});
	} catch (error) {
		console.error('[email-webhook] durable email ingestion failed', error);
		return json({ error: 'Email automation ingestion failed; the sender may retry.' }, { status: 503 });
	}

	return json({
		ok: true,
		duplicate: result.duplicate,
		eventId: result.eventId,
		processingState: result.processingState ?? result.classification?.processingState,
		notificationState: result.notificationState,
		summary: {
			from: escapeHtml(metadata.from),
			to: escapeHtml(metadata.to),
			subject: escapeHtml(metadata.subject),
			attachmentCount: metadata.attachmentCount
		}
	});
};
