import { env } from '$env/dynamic/private';
import Keyv from 'keyv';
import KeyvPostgres from '@keyv/postgres';
import { getDefaultNotionCacheNamespace } from './notion-cache-keys';

const CONNECTION_ENV_ORDER = [
	'DATABASE_URL',
	'POSTGRES_URL',
	'DATABASE_URL_UNPOOLED',
	'POSTGRES_URL_NON_POOLING'
] as const;

const NOTION_CACHE_TABLE = 'notion_cache';

const getRuntimeEnvValue = (key: (typeof CONNECTION_ENV_ORDER)[number]) =>
	env[key]?.trim() || process.env[key]?.trim() || undefined;

const getSelectedDatabaseEnvKey = () => CONNECTION_ENV_ORDER.find((key) => getRuntimeEnvValue(key)) ?? null;

const getConnectionString = () => {
	const selectedDatabaseEnvKey = getSelectedDatabaseEnvKey();
	const connectionString = selectedDatabaseEnvKey ? getRuntimeEnvValue(selectedDatabaseEnvKey) : undefined;

	if (!connectionString) {
		throw new Error(`Missing Postgres connection string. Set one of: ${CONNECTION_ENV_ORDER.join(', ')}.`);
	}

	if (!connectionString.startsWith('postgres://') && !connectionString.startsWith('postgresql://')) {
		throw new Error(
			`${selectedDatabaseEnvKey} must be a postgres:// or postgresql:// connection string, received: ${connectionString.slice(0, 24)}...`
		);
	}

	return connectionString;
};

export interface NotionCacheStore<Value = unknown> {
	get<T = Value>(key: string): Promise<T | undefined>;
	set(key: string, value: Value, ttl?: number): Promise<unknown>;
	delete?(key: string): Promise<boolean>;
}

interface CachedNotionKeyvClient {
	connectionString: string;
	namespace: string;
	keyv: Keyv;
}

declare global {
	// Keep one cache pool across Vite SSR reloads; Keyv/Postgres uses its own small pg pool.
	// eslint-disable-next-line no-var
	var __casaLumaNotionKeyvClient: CachedNotionKeyvClient | undefined;
}

let cachedClient: CachedNotionKeyvClient | null = null;

const createNotionKeyv = (connectionString: string, namespace: string): CachedNotionKeyvClient => {
	const store = new KeyvPostgres({
		uri: connectionString,
		table: NOTION_CACHE_TABLE,
		schema: 'public',
		max: Number(process.env.NOTION_CACHE_PG_POOL_MAX || 2),
		idleTimeoutMillis: 20_000,
		connectionTimeoutMillis: 10_000
	});

	const keyv = new Keyv({
		store,
		namespace,
		useKeyPrefix: false
	});

	keyv.on('error', (error) => {
		console.warn('[notion-cache]', { outcome: 'error', op: 'keyv', error });
	});

	return { connectionString, namespace, keyv };
};

export const getNotionKeyv = (): Keyv => {
	const connectionString = getConnectionString();
	const namespace = getDefaultNotionCacheNamespace();
	const existing = globalThis.__casaLumaNotionKeyvClient ?? cachedClient ?? undefined;

	if (existing?.connectionString === connectionString && existing.namespace === namespace) {
		cachedClient = existing;
		globalThis.__casaLumaNotionKeyvClient = existing;
		return existing.keyv;
	}

	void existing?.keyv.disconnect?.().catch(() => {
		// Ignore cleanup errors; the replacement cache client below is what future requests need.
	});

	const nextClient = createNotionKeyv(connectionString, namespace);
	cachedClient = nextClient;
	globalThis.__casaLumaNotionKeyvClient = nextClient;
	return nextClient.keyv;
};

export const getNotionCacheTableName = () => NOTION_CACHE_TABLE;
