import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type * as appSchema from '$lib/server/db/schema';

/** Drizzle DB handle without importing the SvelteKit db client (avoids $env in CLI). */
export type MirrorDatabase = PostgresJsDatabase<typeof appSchema>;
