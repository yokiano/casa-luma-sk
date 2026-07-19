import PostalMime, { type Address, type RawEmail } from 'postal-mime';

export const WORKER_PARSER_VERSION = 'worker-postal-mime-v2';
export const BODY_PARSER_VERSION = 'latest-body-v1';
export const MAX_EXTRACTED_BODY_CHARS = 64_000;

export type BodySource = 'text' | 'html' | 'html-fallback';
export type BodyCompleteness = 'complete' | 'incomplete' | 'ambiguous';

export type BodyExtractionMetadata = {
	parserVersion: typeof WORKER_PARSER_VERSION;
	bodyParserVersion: typeof BODY_PARSER_VERSION;
	bodySource: BodySource | null;
	bodyCompleteness: BodyCompleteness;
	threadStrippingApplied: boolean;
	threadStrippingMarker?: string;
	originalBodyChars: number;
	extractedBodyChars: number;
	extractedBodyTruncated: boolean;
	attachmentCount: number;
	decodeWarnings: string[];
};

export type ParsedInboundEmail = {
	from?: string;
	to?: string;
	subject?: string;
	messageId?: string;
	date?: string;
	mimeType?: string;
	extractedBody: string;
	extractedBodySource: BodySource | null;
	extractedBodyTruncated: boolean;
	bodyExtractionMetadata: BodyExtractionMetadata;
};

const normalizeVisibleText = (value: string): string => value
	.replace(/\r\n?/g, '\n')
	.split('\n')
	.map((line) => line.replace(/[\t ]+/g, ' ').trim())
	.join('\n')
	.replace(/\n{3,}/g, '\n\n')
	.trim();

const decodeBasicHtmlEntities = (value: string): string => value
	.replace(/&nbsp;/gi, ' ')
	.replace(/&amp;/gi, '&')
	.replace(/&lt;/gi, '<')
	.replace(/&gt;/gi, '>')
	.replace(/&quot;/gi, '"')
	.replace(/&#39;|&#x27;/gi, "'")
	.replace(/&#(\d+);/g, (match, code: string) => {
		const value = Number(code);
		return Number.isSafeInteger(value) && value >= 0 && value <= 0x10ffff ? String.fromCodePoint(value) : match;
	})
	.replace(/&#x([\da-f]+);/gi, (match, code: string) => {
		const value = Number.parseInt(code, 16);
		return Number.isSafeInteger(value) && value >= 0 && value <= 0x10ffff ? String.fromCodePoint(value) : match;
	});

const removeKnownQuoteContainers = (value: string): string => value
	.replace(/<([a-z][\w:-]*)\b[^>]*(?:class\s*=\s*["'][^"']*\bgmail_quote\b[^"']*["']|type\s*=\s*["']cite["'])[^>]*>[\s\S]*?<\/\1>/gi, '')
	.replace(/<blockquote\b[^>]*>[\s\S]*?<\/blockquote>/gi, '');

const htmlToTextFallback = (value: string): string => decodeBasicHtmlEntities(
	removeKnownQuoteContainers(value)
		.replace(/<!--[\s\S]*?-->/g, '')
		.replace(/<\s*(script|style|noscript|template)\b[^>]*>[\s\S]*?<\/\s*\1\s*>/gi, '')
		.replace(/<\s*br\s*\/?>/gi, '\n')
		.replace(/<\s*\/\s*(p|div|section|article|li|tr|h[1-6])\s*>/gi, '\n')
		.replace(/<[^>]+>/g, ' ')
).trim();

type WorkerHTMLRewriter = new () => {
	on: (selector: string, handlers: Record<string, (value: any) => void>) => WorkerHTMLRewriterInstance;
	transform: (input: Response | ReadableStream<Uint8Array>) => Response;
};
type WorkerHTMLRewriterInstance = {
	on: (selector: string, handlers: Record<string, (value: any) => void>) => WorkerHTMLRewriterInstance;
	transform: (input: Response | ReadableStream<Uint8Array>) => Response;
};

/**
 * HTMLRewriter is available in the Worker but not in Node/Vitest. The fallback
 * keeps local EML tests deterministic while the Worker uses the platform parser.
 */
const htmlToVisibleText = async (value: string): Promise<{ text: string; source: 'html' | 'html-fallback' }> => {
	const rewriterConstructor = (globalThis as typeof globalThis & { HTMLRewriter?: WorkerHTMLRewriter }).HTMLRewriter;
	if (typeof rewriterConstructor === 'function') {
		try {
			const chunks: string[] = [];
			const rewriter = new rewriterConstructor()
				.on('script, style, noscript, template, .gmail_quote, blockquote[type="cite"]', {
					element: (element: { remove: () => void }) => element.remove()
				})
				.on('*', {
					text: (text: { text: string }) => chunks.push(text.text)
				});
			await rewriter.transform(new Response(value)).text();
			const text = normalizeVisibleText(chunks.join(' '));
			if (text) return { text, source: 'html' };
		} catch {
			// Fall through to the local-compatible parser and mark its source.
		}
	}
	return { text: normalizeVisibleText(htmlToTextFallback(value)), source: 'html-fallback' };
};

const addressToString = (address: Address | undefined): string | undefined => {
	if (!address) return undefined;
	if ('group' in address) return address.group?.map(addressToString).filter(Boolean).join(', ') || undefined;
	if (!address.address) return address.name || undefined;
	return address.name ? `${address.name} <${address.address}>` : address.address;
};

const addressesToString = (addresses: Address[] | undefined): string | undefined => {
	const value = addresses?.map(addressToString).filter(Boolean).join(', ');
	return value || undefined;
};

const headerValue = (headers: Array<{ key: string; value: string }>, key: string): string | undefined =>
	headers.find((header) => header.key === key)?.value.trim() || undefined;

const isFinancialBody = (value: string) => /reference|amount|transfer|payment|receipt|thb|฿|บาท|หมายเลขอ้างอิง|จำนวนเงิน/i.test(value);

const delimiterForLine = (line: string): string | undefined => {
	if (/^On .{1,300} wrote:\s*$/i.test(line)) return 'On … wrote:';
	if (/^-{2,}\s*Original Message\s*-{2,}$/i.test(line)) return '-----Original Message-----';
	if (/^Begin forwarded message:\s*$/i.test(line)) return 'Begin forwarded message:';
	if (/^-{2,}\s*Forwarded message\s*-{2,}$/i.test(line)) return '---------- Forwarded message ---------';
	return undefined;
};

const hasForwardedHeaderBlock = (lines: string[], index: number): boolean => {
	if (!/^From:\s+\S/i.test(lines[index])) return false;
	const nearby = lines.slice(index, index + 6).join('\n');
	return /^(?:From|Sent|To|Subject):/im.test(nearby) && /^(?:Sent|To|Subject):/im.test(nearby);
};

export type LatestBodyResult = {
	body: string;
	applied: boolean;
	marker?: string;
	ambiguous: boolean;
};

/** Conservative, line-anchored stripping of older reply/forward content. */
export const extractLatestVisibleBody = (value: string): LatestBodyResult => {
	const original = normalizeVisibleText(value);
	if (!original) return { body: '', applied: false, ambiguous: false };
	const lines = original.split('\n');
	let cutIndex: number | undefined;
	let marker: string | undefined;
	let quotedLineCount = 0;

	for (let index = 0; index < lines.length; index += 1) {
		const line = lines[index];
		const delimiter = delimiterForLine(line);
		if (delimiter) {
			cutIndex = index;
			marker = delimiter;
			break;
		}
		if (hasForwardedHeaderBlock(lines, index)) {
			cutIndex = index;
			marker = 'forwarded header block';
			break;
		}
		if (/^>\s?/.test(line)) {
			quotedLineCount += 1;
			if (quotedLineCount >= 2 || (index > 0 && lines[index - 1] === '')) {
				cutIndex = index;
				marker = 'quoted reply lines';
				break;
			}
		} else {
			quotedLineCount = 0;
		}
	}

	if (cutIndex === undefined) return { body: original, applied: false, ambiguous: false };
	const candidate = lines.slice(0, cutIndex).join('\n').trim();
	const removesMostBody = candidate.length < Math.max(32, Math.floor(original.length * 0.2));
	const ambiguous = removesMostBody && isFinancialBody(original);
	return {
		body: ambiguous ? original : candidate,
		applied: true,
		marker,
		ambiguous
	};
};

const emptyResult = (warning: string): ParsedInboundEmail => ({
	extractedBody: '',
	extractedBodySource: null,
	extractedBodyTruncated: false,
	bodyExtractionMetadata: {
		parserVersion: WORKER_PARSER_VERSION,
		bodyParserVersion: BODY_PARSER_VERSION,
		bodySource: null,
		bodyCompleteness: 'incomplete',
		threadStrippingApplied: false,
		originalBodyChars: 0,
		extractedBodyChars: 0,
		extractedBodyTruncated: false,
		attachmentCount: 0,
		decodeWarnings: [warning]
	}
});

export const parseInboundEmail = async (raw: RawEmail): Promise<ParsedInboundEmail> => {
	let email;
	try {
		email = await PostalMime.parse(raw, { maxNestingDepth: 10, maxHeadersSize: 256 * 1024 });
	} catch {
		return emptyResult('PostalMime parsing failed.');
	}

	const mimeType = headerValue(email.headers, 'content-type')?.split(';', 1)[0]?.toLowerCase();
	const attachmentCount = Array.isArray(email.attachments) ? email.attachments.length : 0;
	let body = '';
	let bodySource: BodySource | null = null;
	const decodeWarnings: string[] = [];

	if (typeof email.text === 'string' && email.text.trim()) {
		body = email.text;
		bodySource = 'text';
	} else if (typeof email.html === 'string' && email.html.trim()) {
		const htmlResult = await htmlToVisibleText(email.html);
		body = htmlResult.text;
		bodySource = htmlResult.source;
	} else {
		decodeWarnings.push('No readable text/plain or text/html body was found.');
	}

	const originalBodyChars = normalizeVisibleText(body).length;
	const latest = extractLatestVisibleBody(body);
	let extractedBody = latest.body;
	let extractedBodyTruncated = false;
	if (extractedBody.length > MAX_EXTRACTED_BODY_CHARS) {
		extractedBody = extractedBody.slice(0, MAX_EXTRACTED_BODY_CHARS);
		extractedBodyTruncated = true;
		decodeWarnings.push('Extracted body exceeded the storage safety cap.');
	}
	if (latest.ambiguous) decodeWarnings.push('Thread stripping was ambiguous because it would remove most financial-looking body content.');
	if (attachmentCount > 0) decodeWarnings.push('Attachment metadata was recorded, but attachment content was not retained.');
	if (!extractedBody) decodeWarnings.push('The extracted visible body was empty.');

	const bodyCompleteness: BodyCompleteness = extractedBodyTruncated || attachmentCount > 0 || latest.ambiguous || !extractedBody
		? latest.ambiguous ? 'ambiguous' : 'incomplete'
		: 'complete';

	return {
		from: addressToString(email.from),
		to: addressesToString(email.to),
		subject: email.subject?.trim() || undefined,
		messageId: email.messageId?.trim() || undefined,
		date: email.date?.trim() || undefined,
		mimeType,
		extractedBody,
		extractedBodySource: bodySource,
		extractedBodyTruncated,
		bodyExtractionMetadata: {
			parserVersion: WORKER_PARSER_VERSION,
			bodyParserVersion: BODY_PARSER_VERSION,
			bodySource,
			bodyCompleteness,
			threadStrippingApplied: latest.applied,
			...(latest.marker ? { threadStrippingMarker: latest.marker } : {}),
			originalBodyChars,
			extractedBodyChars: extractedBody.length,
			extractedBodyTruncated,
			attachmentCount,
			decodeWarnings
		}
	};
};
