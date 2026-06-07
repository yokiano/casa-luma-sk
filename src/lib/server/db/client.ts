import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from '$env/dynamic/private';
import * as schema from './schema';

const CONNECTION_ENV_ORDER = [
  'DATABASE_URL',
  'POSTGRES_URL',
  'DATABASE_URL_UNPOOLED',
  'POSTGRES_URL_NON_POOLING'
] as const;

const getRuntimeEnvValue = (key: (typeof CONNECTION_ENV_ORDER)[number]) =>
  env[key]?.trim() || process.env[key]?.trim() || undefined;

const getSelectedDatabaseEnvKey = () => CONNECTION_ENV_ORDER.find((key) => getRuntimeEnvValue(key)) ?? null;

export const getDatabaseEnvKey = () => getSelectedDatabaseEnvKey();

const getConnectionString = () => {
  const selectedDatabaseEnvKey = getSelectedDatabaseEnvKey();
  const connectionString = selectedDatabaseEnvKey ? getRuntimeEnvValue(selectedDatabaseEnvKey) : undefined;

  if (!connectionString) {
    throw new Error(
      `Missing Postgres connection string. Set one of: ${CONNECTION_ENV_ORDER.join(', ')}.`
    );
  }

  if (!connectionString.startsWith('postgres://') && !connectionString.startsWith('postgresql://')) {
    throw new Error(
      `${selectedDatabaseEnvKey} must be a postgres:// or postgresql:// connection string, received: ${connectionString.slice(0, 24)}...`
    );
  }

  return connectionString;
};

type DrizzleDatabase = ReturnType<typeof drizzle<typeof schema>>;
type PostgresClient = ReturnType<typeof postgres>;

interface CachedDatabaseClient {
  connectionString: string;
  sql: PostgresClient;
  db: DrizzleDatabase;
}

declare global {
  // Keep a single Postgres pool across Vite SSR module reloads. Without this,
  // every HMR edit can leave another pool alive until its idle timeout, which
  // can exhaust Neon/Postgres connections and make even simple receipt queries fail.
  // eslint-disable-next-line no-var
  var __casaLumaDatabaseClient: CachedDatabaseClient | undefined;
}

let cachedClient: CachedDatabaseClient | null = null;

const createClient = (connectionString: string): CachedDatabaseClient => {
  const sql = postgres(connectionString, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false
  });

  return {
    connectionString,
    sql,
    db: drizzle(sql, { schema })
  };
};

const getClient = () => {
  const connectionString = getConnectionString();
  const existing = globalThis.__casaLumaDatabaseClient ?? cachedClient;
  if (existing?.connectionString === connectionString) {
    cachedClient = existing;
    globalThis.__casaLumaDatabaseClient = existing;
    return existing;
  }

  if (existing) {
    void existing.sql.end({ timeout: 5 }).catch(() => {
      // Ignore cleanup errors; the replacement client below is what the request needs.
    });
  }

  const nextClient = createClient(connectionString);
  cachedClient = nextClient;
  globalThis.__casaLumaDatabaseClient = nextClient;
  return nextClient;
};

const getDb = () => getClient().db;

export const db = new Proxy({} as DrizzleDatabase, {
  get(_target, property, receiver) {
    return Reflect.get(getDb(), property, receiver);
  }
});

export type Database = ReturnType<typeof drizzle<typeof schema>>;
