import { describe, expect, it } from 'vitest';
import { buildNotionCacheKey, stableJsonStringify } from './notion-cache-keys';

describe('notion-cache-keys', () => {
	it('builds stable keys for the same logical query', () => {
		const a = buildNotionCacheKey({
			namespace: 'test:notion:v1',
			operation: 'query',
			id: 'database-a',
			params: { filter: { status: 'Active', nested: { b: 2, a: 1 } }, page_size: 100 }
		});
		const b = buildNotionCacheKey({
			namespace: 'test:notion:v1',
			operation: 'query',
			id: 'database-a',
			params: { page_size: 100, filter: { nested: { a: 1, b: 2 }, status: 'Active' } }
		});

		expect(a).toBe(b);
	});

	it('normalizes object key ordering in stable JSON', () => {
		expect(stableJsonStringify({ z: 1, a: { c: true, b: false } })).toBe(
			stableJsonStringify({ a: { b: false, c: true }, z: 1 })
		);
	});

	it('separates namespaces', () => {
		const params = { filter: { status: 'Active' } };
		const a = buildNotionCacheKey({ namespace: 'namespace:a', operation: 'query', id: 'db', params });
		const b = buildNotionCacheKey({ namespace: 'namespace:b', operation: 'query', id: 'db', params });

		expect(a).not.toBe(b);
	});

	it('separates operations for the same id and params', () => {
		const params = { page_size: 100 };
		const query = buildNotionCacheKey({ namespace: 'test', operation: 'query', id: 'same-id', params });
		const getPage = buildNotionCacheKey({ namespace: 'test', operation: 'getPage', id: 'same-id', params });

		expect(query).not.toBe(getPage);
	});
});
