import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('$env/dynamic/private', () => ({ env: process.env }));

import { cachedNotionRead, type NotionCacheEvent } from './notion-cache';
import type { NotionCacheStore } from './keyv';

class MemoryStore<T = unknown> implements NotionCacheStore<T> {
	private values = new Map<string, { value: T; expiresAt: number }>();
	public writes = 0;

	async get<V = T>(key: string): Promise<V | undefined> {
		const entry = this.values.get(key);
		if (!entry) return undefined;
		if (entry.expiresAt <= Date.now()) {
			this.values.delete(key);
			return undefined;
		}
		return structuredClone(entry.value) as unknown as V;
	}

	async set(key: string, value: T, ttl = 60_000): Promise<boolean> {
		this.writes += 1;
		this.values.set(key, { value: structuredClone(value), expiresAt: Date.now() + ttl });
		return true;
	}

	async delete(key: string): Promise<boolean> {
		return this.values.delete(key);
	}
}

describe('cachedNotionRead', () => {
	beforeEach(() => {
		vi.useRealTimers();
	});

	it('returns cached values without calling the fetcher on cache hit', async () => {
		const store = new MemoryStore<{ ok: boolean }>();
		await store.set('hit-key', { ok: true }, 1_000);
		const fetcher = vi.fn(async () => ({ ok: false }));

		const value = await cachedNotionRead({ key: 'hit-key', store, enabled: true, fetcher });

		expect(value).toEqual({ ok: true });
		expect(fetcher).not.toHaveBeenCalled();
	});

	it('fetches and stores values on cache miss', async () => {
		const store = new MemoryStore<{ ok: boolean }>();
		const fetcher = vi.fn(async () => ({ ok: true }));

		const value = await cachedNotionRead({ key: 'miss-key', store, enabled: true, ttlMs: 1_000, fetcher });
		const cached = await store.get('miss-key');

		expect(value).toEqual({ ok: true });
		expect(cached).toEqual({ ok: true });
		expect(fetcher).toHaveBeenCalledOnce();
	});

	it('bypasses cache and writes when disabled', async () => {
		const store = new MemoryStore<{ count: number }>();
		const fetcher = vi.fn(async () => ({ count: 1 }));

		await cachedNotionRead({ key: 'disabled-key', store, enabled: false, fetcher });
		await cachedNotionRead({ key: 'disabled-key', store, enabled: false, fetcher });

		expect(fetcher).toHaveBeenCalledTimes(2);
		expect(store.writes).toBe(0);
	});

	it('defaults to disabled when NOTION_CACHE_ENABLED is unset', async () => {
		const oldValue = process.env.NOTION_CACHE_ENABLED;
		delete process.env.NOTION_CACHE_ENABLED;
		const store = new MemoryStore<{ count: number }>();
		const fetcher = vi.fn(async () => ({ count: 1 }));

		try {
			await cachedNotionRead({ key: 'default-disabled-key', store, fetcher });
		} finally {
			if (oldValue === undefined) delete process.env.NOTION_CACHE_ENABLED;
			else process.env.NOTION_CACHE_ENABLED = oldValue;
		}

		expect(fetcher).toHaveBeenCalledOnce();
		expect(store.writes).toBe(0);
	});

	it('fails open when cache reads throw', async () => {
		const store: NotionCacheStore<{ ok: boolean }> = {
			get: vi.fn(async () => {
				throw new Error('read failed');
			}),
			set: vi.fn(async () => true)
		};
		const fetcher = vi.fn(async () => ({ ok: true }));
		const events: NotionCacheEvent[] = [];

		const value = await cachedNotionRead({
			key: 'read-error-key',
			store,
			enabled: true,
			logger: (event) => events.push(event),
			fetcher
		});

		expect(value).toEqual({ ok: true });
		expect(fetcher).toHaveBeenCalledOnce();
		expect(events.some((event) => event.outcome === 'error')).toBe(true);
	});

	it('fails open when cache writes throw', async () => {
		const store: NotionCacheStore<{ ok: boolean }> = {
			get: vi.fn(async () => undefined),
			set: vi.fn(async () => {
				throw new Error('write failed');
			})
		};
		const fetcher = vi.fn(async () => ({ ok: true }));
		const events: NotionCacheEvent[] = [];

		const value = await cachedNotionRead({
			key: 'write-error-key',
			store,
			enabled: true,
			logger: (event) => events.push(event),
			fetcher
		});

		expect(value).toEqual({ ok: true });
		expect(fetcher).toHaveBeenCalledOnce();
		expect(events.some((event) => event.outcome === 'error')).toBe(true);
	});

	it('expires values after TTL', async () => {
		vi.useFakeTimers();
		const store = new MemoryStore<{ count: number }>();
		let count = 0;
		const fetcher = vi.fn(async () => ({ count: ++count }));

		const first = await cachedNotionRead({ key: 'ttl-key', store, enabled: true, ttlMs: 100, fetcher });
		vi.advanceTimersByTime(101);
		const second = await cachedNotionRead({ key: 'ttl-key', store, enabled: true, ttlMs: 100, fetcher });

		expect(first).toEqual({ count: 1 });
		expect(second).toEqual({ count: 2 });
		expect(fetcher).toHaveBeenCalledTimes(2);
	});

	it('coalesces concurrent misses for the same key', async () => {
		const store = new MemoryStore<{ ok: boolean }>();
		const fetcher = vi.fn(async () => {
			await new Promise((resolve) => setTimeout(resolve, 1));
			return { ok: true };
		});

		const [a, b] = await Promise.all([
			cachedNotionRead({ key: 'coalesce-key', store, enabled: true, fetcher }),
			cachedNotionRead({ key: 'coalesce-key', store, enabled: true, fetcher })
		]);

		expect(a).toEqual({ ok: true });
		expect(b).toEqual({ ok: true });
		expect(fetcher).toHaveBeenCalledOnce();
	});

	it('emits debug events through the supplied logger', async () => {
		const store = new MemoryStore<{ ok: boolean }>();
		const events: NotionCacheEvent[] = [];

		await cachedNotionRead({
			key: 'event-key',
			store,
			enabled: true,
			debug: true,
			logger: (event) => events.push(event),
			fetcher: async () => ({ ok: true })
		});

		expect(events.map((event) => event.outcome)).toEqual(['miss', 'stored']);
	});

	it('does not leave failed coalesced reads stuck after fetcher rejection', async () => {
		const store = new MemoryStore<{ ok: boolean }>();
		const failingFetcher = vi.fn(async () => {
			throw new Error('notion failed');
		});

		await expect(
			cachedNotionRead({ key: 'reject-key', store, enabled: true, fetcher: failingFetcher })
		).rejects.toThrow('notion failed');

		const succeedingFetcher = vi.fn(async () => ({ ok: true }));
		await expect(
			cachedNotionRead({ key: 'reject-key', store, enabled: true, fetcher: succeedingFetcher })
		).resolves.toEqual({ ok: true });

		expect(failingFetcher).toHaveBeenCalledOnce();
		expect(succeedingFetcher).toHaveBeenCalledOnce();
	});
});
