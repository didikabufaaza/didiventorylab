import dotenv from 'dotenv';
dotenv.config();

import { IDatabaseAdapter, DBStatusResponse } from './types.js';
import { JsonAdapter } from './JsonAdapter.js';
import { PostgresAdapter } from './PostgresAdapter.js';

let currentAdapter: IDatabaseAdapter | null = null;

export function resolveDatabaseUrl(): string | null {
  return (
    process.env.DATABASE_URL ||
    process.env.NEON_DATABASE_URL ||
    process.env.SUPABASE_DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.INSFORGE_DATABASE_URL ||
    null
  );
}

export async function getDatabaseAdapter(): Promise<IDatabaseAdapter> {
  if (currentAdapter) return currentAdapter;

  const dbUrl = resolveDatabaseUrl();
  const providerConfig = (process.env.DB_PROVIDER || 'auto').toLowerCase();

  if (dbUrl && providerConfig !== 'json') {
    try {
      console.log(`[DB Manager] Initializing PostgreSQL adapter (${dbUrl.includes('neon.tech') ? 'Neon DB' : dbUrl.includes('supabase') ? 'Supabase' : 'PostgreSQL'})...`);
      const postgresAdapter = new PostgresAdapter(dbUrl);
      await postgresAdapter.init();
      const status = await postgresAdapter.healthCheck();
      if (status.ok) {
        console.log(`[DB Manager] Successfully connected to ${status.providerLabel}! (${status.latencyMs}ms)`);
        currentAdapter = postgresAdapter;
        return currentAdapter;
      } else {
        console.warn(`[DB Manager] Health check failed for PostgreSQL adapter: ${status.details}. Falling back to Local JSON Storage...`);
      }
    } catch (err: any) {
      console.error(`[DB Manager] Error initializing PostgreSQL adapter: ${err.message}. Falling back to Local JSON Storage...`);
    }
  }

  console.log('[DB Manager] Using Local JSON Storage adapter (data/*.json).');
  const jsonAdapter = new JsonAdapter();
  await jsonAdapter.init();
  currentAdapter = jsonAdapter;
  return currentAdapter;
}

export async function setDatabaseAdapter(adapter: IDatabaseAdapter): Promise<void> {
  currentAdapter = adapter;
}
