import { migrate } from 'drizzle-orm/neon-serverless/migrator';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

const connectionString =
  process.env.DATABASE_URL_UNPOOLED ??
  process.env.POSTGRES_URL_NON_POOLING ??
  process.env.DATABASE_URL ??
  process.env.POSTGRES_URL;

if (!connectionString) {
  throw new Error('Missing DATABASE_URL/DATABASE_URL_UNPOOLED/POSTGRES_URL env var');
}

if (!connectionString.startsWith('postgres://') && !connectionString.startsWith('postgresql://')) {
  throw new Error('Database URL must use postgres:// or postgresql://');
}

neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString });
const db = drizzle(pool);

await migrate(db, { migrationsFolder: 'drizzle' });
await pool.end();

console.log('Neon migrations applied successfully');
