import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const CONNECTION_ENV_ORDER = [
  'DATABASE_URL',
  'POSTGRES_URL',
  'DATABASE_URL_UNPOOLED',
  'POSTGRES_URL_NON_POOLING'
] as const;

const getSelectedDatabaseEnvKey = () => CONNECTION_ENV_ORDER.find((key) => process.env[key]?.trim()) ?? null;

export const getDatabaseEnvKey = () => getSelectedDatabaseEnvKey();

const getConnectionString = () => {
  const selectedDatabaseEnvKey = getSelectedDatabaseEnvKey();
  const connectionString = selectedDatabaseEnvKey ? process.env[selectedDatabaseEnvKey]?.trim() : undefined;

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

let cachedDb: ReturnType<typeof drizzle<typeof schema>> | null = null;

const createDb = () => {
  const sql = postgres(getConnectionString(), {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false
  });

  return drizzle(sql, { schema });
};

const getDb = () => {
  cachedDb ??= createDb();
  return cachedDb;
};

export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(_target, property, receiver) {
    return Reflect.get(getDb(), property, receiver);
  }
});

export type Database = ReturnType<typeof drizzle<typeof schema>>;
