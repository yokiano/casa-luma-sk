import { defineConfig } from 'drizzle-kit';
import { config } from 'dotenv';

const defaultUrl = 'postgres://app:app@localhost:5432/casa_luma';
config({ path: '.env' });
config({ path: '.env.local', override: true });

const databaseUrl =
  process.env.DATABASE_URL_UNPOOLED ??
  process.env.POSTGRES_URL_NON_POOLING ??
  process.env.DATABASE_URL ??
  process.env.POSTGRES_URL ??
  defaultUrl;

if (!databaseUrl.startsWith('postgres://') && !databaseUrl.startsWith('postgresql://')) {
  throw new Error('DATABASE_URL/POSTGRES_URL must be a postgres:// or postgresql:// connection string');
}

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/lib/server/db/schema.ts',
  out: './drizzle',
  dbCredentials: {
    url: databaseUrl,
    ssl: true,
  }
});
