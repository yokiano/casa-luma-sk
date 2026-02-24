import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from '$env/dynamic/private';
import * as schema from './schema';

const connectionString =
  env.DATABASE_URL ??
  env.POSTGRES_URL ??
  env.DATABASE_URL_UNPOOLED ??
  env.POSTGRES_URL_NON_POOLING ??
  'postgres://app:app@localhost:5432/casa_luma';

if (!connectionString.startsWith('postgres://') && !connectionString.startsWith('postgresql://')) {
  throw new Error('DATABASE_URL/POSTGRES_URL must be a postgres:// or postgresql:// connection string');
}

const sql = postgres(connectionString, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
  prepare: false
});

export const db = drizzle(sql, { schema });

export type Database = typeof db;
