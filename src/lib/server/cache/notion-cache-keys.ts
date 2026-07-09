import { createHash } from 'node:crypto';

const DEFAULT_NOTION_CACHE_NAMESPACE = 'casa-luma:notion:v1';

export type NotionCacheKeyPart =
	| string
	| number
	| boolean
	| null
	| undefined
	| NotionCacheKeyPayload
	| NotionCacheKeyPart[]
	| readonly NotionCacheKeyPart[];
export type NotionCacheKeyPayload = { [key: string]: NotionCacheKeyPart };

export interface BuildNotionCacheKeyOptions {
	operation: string;
	id?: string;
	params?: NotionCacheKeyPayload;
	namespace?: string;
}

export const getDefaultNotionCacheNamespace = () =>
	process.env.NOTION_CACHE_NAMESPACE?.trim() || DEFAULT_NOTION_CACHE_NAMESPACE;

const normalizeForStableJson = (value: NotionCacheKeyPart): unknown => {
	if (value === undefined) return null;
	if (value === null || typeof value !== 'object') return value;
	if (Array.isArray(value)) return value.map((entry) => normalizeForStableJson(entry));

	const payload = value as NotionCacheKeyPayload;
	return Object.keys(payload)
		.sort()
		.reduce<Record<string, unknown>>((normalized, key) => {
			const entry = payload[key];
			if (entry !== undefined) {
				normalized[key] = normalizeForStableJson(entry);
			}
			return normalized;
		}, {});
};

export const stableJsonStringify = (value: NotionCacheKeyPart) =>
	JSON.stringify(normalizeForStableJson(value));

export const hashNotionCachePayload = (payload: NotionCacheKeyPart) =>
	createHash('sha256').update(stableJsonStringify(payload)).digest('hex');

const normalizeKeySegment = (segment: string) => segment.trim().replace(/\s+/g, '-').replace(/[^a-zA-Z0-9:_-]/g, '_');

export const buildNotionCacheKey = ({
	operation,
	id = 'none',
	params = {},
	namespace = getDefaultNotionCacheNamespace()
}: BuildNotionCacheKeyOptions) => {
	const safeNamespace = normalizeKeySegment(namespace || DEFAULT_NOTION_CACHE_NAMESPACE);
	const safeOperation = normalizeKeySegment(operation || 'unknown');
	const safeId = normalizeKeySegment(id || 'none');
	const hash = hashNotionCachePayload(params);

	return `${safeNamespace}:${safeOperation}:${safeId}:${hash}`;
};
