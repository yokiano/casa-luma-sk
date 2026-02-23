import { defineConfig } from 'drizzle-kit';

const defaultUrl = 'postgres://app:app@localhost:5432/casa_luma';

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/lib/server/db/schema.ts',
  out: './drizzle',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? defaultUrl
  }
});
