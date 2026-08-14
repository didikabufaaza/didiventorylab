import dotenv from 'dotenv';
dotenv.config();

import { IDatabaseAdapter, DBStatusResponse } from './types.js';
import { PostgresAdapter } from './PostgresAdapter.js';

let currentAdapter: IDatabaseAdapter | null = null;
let adapterPromise: Promise<IDatabaseAdapter> | null = null;

const DEFAULT_INSFORGE_URL = 'postgresql://postgres:66723a2a799f0727a5bd40b80e41d4b1@i972hmnk.ap-southeast.database.insforge.app:5432/insforge?sslmode=require';

export function resolveDatabaseUrl(): string {
  return (
    process.env.DATABASE_URL ||
    process.env.NEON_DATABASE_URL ||
    process.env.SUPABASE_DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.INSFORGE_DATABASE_URL ||
    DEFAULT_INSFORGE_URL
  );
}

export async function getDatabaseAdapter(): Promise<IDatabaseAdapter> {
  if (currentAdapter) return currentAdapter;
  if (adapterPromise) return adapterPromise;

  adapterPromise = (async () => {
    const dbUrl = resolveDatabaseUrl();
    try {
      console.log(`[DB Manager] Initializing PostgreSQL adapter for InsForge...`);
      const postgresAdapter = new PostgresAdapter(dbUrl);
      await postgresAdapter.init();
      currentAdapter = postgresAdapter;
      return currentAdapter;
    } catch (err: any) {
      console.error(`[DB Manager] Error initializing InsForge PostgreSQL adapter: ${err.message}. Re-trying default...`);
      const postgresAdapter = new PostgresAdapter(DEFAULT_INSFORGE_URL);
      await postgresAdapter.init();
      currentAdapter = postgresAdapter;
      return currentAdapter;
    }
  })();

  return adapterPromise;
}

export async function setDatabaseAdapter(adapter: IDatabaseAdapter): Promise<void> {
  currentAdapter = adapter;
  adapterPromise = Promise.resolve(adapter);
}
