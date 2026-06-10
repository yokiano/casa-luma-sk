import { env } from '$env/dynamic/private';
import { getNotionKeyv, type NotionCacheStore } from './keyv';

// Read-through Notion JSON cache. Ops/runbook: docs/notion/notion-cache-runbook.md
// Planned next (not implemented): long TTL + Notion webhook invalidation — see runbook "Planned next".

export type NotionCacheOutcome = 'hit' | 'miss' | 'disabled' | 'error' | 'coalesced' | 'stored';

export interface NotionCacheEvent {
	source: 'notion-cache';
	outcome: NotionCacheOutcome;
	key: string;
	op?: string;
	ttlMs?: number;
	error?: unknown;
}

export interface CachedNotionReadOptions<T> {
	key: string;
	ttlMs?: number;
	op?: string;
	fetcher: () => Promise<T>;
	store?: NotionCacheStore<T>;
	enabled?: boolean;
	debug?: boolean;
	logger?: (event: NotionCacheEvent) => void;
	coalesce?: boolean;
}

const DEFAULT_NOTION_CACHE_TTL_MS = 5 * 60 * 1000;
const pendingReads = new Map<string, Promise<unknown>>();

const readEnvFlag = (value: string | undefined, defaultValue: boolean) => {
	if (value === undefined || value.trim() === '') return defaultValue;
	const normalized = value.trim().toLowerCase();
	if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
	if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
	return defaultValue;
};

const readEnvNumber = (value: string | undefined, defaultValue: number) => {
	const parsed = Number(value);
	return Number.isFinite(parsed) && parsed > 0 ? parsed : defaultValue;
};

export const isNotionCacheEnabled = () =>
	readEnvFlag(env.NOTION_CACHE_ENABLED ?? process.env.NOTION_CACHE_ENABLED, false);

export const isNotionCacheDebugEnabled = () =>
	readEnvFlag(env.NOTION_CACHE_DEBUG ?? process.env.NOTION_CACHE_DEBUG, false);

export const getDefaultNotionCacheTtlMs = () =>
	readEnvNumber(env.NOTION_CACHE_DEFAULT_TTL_SECONDS ?? process.env.NOTION_CACHE_DEFAULT_TTL_SECONDS, 300) * 1000;

const emitCacheEvent = (event: NotionCacheEvent, debug: boolean, logger?: (event: NotionCacheEvent) => void) => {
	if (logger) {
		logger(event);
		return;
	}

	if (event.outcome === 'error') {
		console.warn('[notion-cache]', event);
		return;
	}

	if (debug) {
		console.info('[notion-cache]', event);
	}
};

const resolveCacheStore = <T>(store?: NotionCacheStore<T>) => store ?? (getNotionKeyv() as NotionCacheStore<T>);

export async function cachedNotionRead<T>({
	key,
	ttlMs = getDefaultNotionCacheTtlMs() || DEFAULT_NOTION_CACHE_TTL_MS,
	op,
	fetcher,
	store,
	enabled = isNotionCacheEnabled(),
	debug = isNotionCacheDebugEnabled(),
	logger,
	coalesce = true
}: CachedNotionReadOptions<T>): Promise<T> {
	if (!enabled) {
		emitCacheEvent({ source: 'notion-cache', outcome: 'disabled', key, op, ttlMs }, debug, logger);
		return fetcher();
	}

	if (coalesce) {
		const pending = pendingReads.get(key) as Promise<T> | undefined;
		if (pending) {
			emitCacheEvent({ source: 'notion-cache', outcome: 'coalesced', key, op, ttlMs }, debug, logger);
			return pending;
		}
	}

	const readPromise = (async () => {
		let cache: NotionCacheStore<T>;
		try {
			cache = resolveCacheStore(store);
		} catch (error) {
			emitCacheEvent({ source: 'notion-cache', outcome: 'error', key, op, ttlMs, error }, debug, logger);
			return fetcher();
		}

		try {
			const cached = await cache.get<T>(key);
			if (cached !== undefined) {
				emitCacheEvent({ source: 'notion-cache', outcome: 'hit', key, op, ttlMs }, debug, logger);
				return cached;
			}
			emitCacheEvent({ source: 'notion-cache', outcome: 'miss', key, op, ttlMs }, debug, logger);
		} catch (error) {
			emitCacheEvent({ source: 'notion-cache', outcome: 'error', key, op, ttlMs, error }, debug, logger);
		}

		const fresh = await fetcher();

		try {
			await cache.set(key, fresh, ttlMs);
			emitCacheEvent({ source: 'notion-cache', outcome: 'stored', key, op, ttlMs }, debug, logger);
		} catch (error) {
			emitCacheEvent({ source: 'notion-cache', outcome: 'error', key, op, ttlMs, error }, debug, logger);
		}

		return fresh;
	})();

	if (coalesce) {
		pendingReads.set(key, readPromise);
		void readPromise
			.finally(() => {
				if (pendingReads.get(key) === readPromise) {
					pendingReads.delete(key);
				}
			})
			.catch(() => {
				// The caller receives the original rejection from readPromise. This catch only prevents
				// the cleanup promise created by finally() from becoming an unhandled rejection.
			});
	}

	return readPromise;
}

export const invalidateNotionCacheKey = async (key: string, store: NotionCacheStore = getNotionKeyv() as NotionCacheStore) => {
	if (!store.delete) return false;
	return store.delete(key);
};
