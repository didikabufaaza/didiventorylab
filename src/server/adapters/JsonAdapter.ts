import fs from 'fs';
import path from 'path';
import { IDatabaseAdapter, DBProviderType, DBStatusResponse } from './types.js';
import { TenantInfo, User, PendingUser, DBData } from '../../types.js';
import { seedTenantData, DEFAULT_ACCOUNTS, DEFAULT_TENANTS } from '../db.js';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const TENANTS_DIR = path.join(DATA_DIR, 'tenants');
const ACCOUNTS_FILE = path.join(DATA_DIR, 'accounts.json');
const TENANTS_FILE = path.join(DATA_DIR, 'tenants.json');

function ensureDir(dir: string) {
  try {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  } catch (err) {
    // Read-only filesystem on serverless platforms (e.g. Vercel)
  }
}

function readJson<T>(filePath: string, fallback: T): T {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }
  } catch (err) {
    console.error(`Error reading JSON file ${filePath}:`, err);
  }
  return fallback;
}

function writeJson<T>(filePath: string, data: T) {
  try {
    const dir = path.dirname(filePath);
    ensureDir(dir);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    // Read-only filesystem catch
  }
}

export class JsonAdapter implements IDatabaseAdapter {
  public providerName: DBProviderType = 'json';
  public providerLabel = 'Local JSON Storage';

  async init(): Promise<void> {
    try {
      ensureDir(DATA_DIR);
      ensureDir(TENANTS_DIR);
      if (!fs.existsSync(TENANTS_FILE)) {
        writeJson(TENANTS_FILE, { tenants: DEFAULT_TENANTS });
      }
      if (!fs.existsSync(ACCOUNTS_FILE)) {
        writeJson(ACCOUNTS_FILE, { accounts: DEFAULT_ACCOUNTS, pendingUsers: [] });
      }
    } catch (err) {
      console.warn('[JsonAdapter] Handled read-only filesystem init warning:', (err as any).message);
    }
  }

  async getTenants(): Promise<TenantInfo[]> {
    const state = readJson<{ tenants: TenantInfo[] }>(TENANTS_FILE, { tenants: DEFAULT_TENANTS });
    return state.tenants || DEFAULT_TENANTS;
  }

  async saveTenants(tenants: TenantInfo[]): Promise<void> {
    writeJson(TENANTS_FILE, { tenants });
  }

  async getAccounts(): Promise<{ accounts: User[]; pendingUsers: PendingUser[] }> {
    const state = readJson<{ accounts: User[]; pendingUsers: PendingUser[] }>(ACCOUNTS_FILE, {
      accounts: DEFAULT_ACCOUNTS,
      pendingUsers: [],
    });
    return {
      accounts: state.accounts || DEFAULT_ACCOUNTS,
      pendingUsers: state.pendingUsers || [],
    };
  }

  async saveAccounts(state: { accounts: User[]; pendingUsers: PendingUser[] }): Promise<void> {
    writeJson(ACCOUNTS_FILE, state);
  }

  async getTenantData(tenantId: string): Promise<DBData> {
    const filePath = path.join(TENANTS_DIR, tenantId, 'db.json');
    if (!fs.existsSync(filePath)) {
      const initial = seedTenantData();
      writeJson(filePath, initial);
      return initial;
    }
    return readJson<DBData>(filePath, seedTenantData());
  }

  async saveTenantData(tenantId: string, data: DBData): Promise<void> {
    const filePath = path.join(TENANTS_DIR, tenantId, 'db.json');
    writeJson(filePath, data);
  }

  async healthCheck(): Promise<DBStatusResponse> {
    const start = Date.now();
    const tenants = await this.getTenants();
    const accountsState = await this.getAccounts();
    return {
      ok: true,
      provider: 'json',
      providerLabel: 'Local JSON Storage (File Persistence)',
      connectionStringMasked: 'File: ./data/*.json',
      latencyMs: Date.now() - start,
      tenantCount: tenants.length,
      accountCount: accountsState.accounts.length,
      details: 'Penyimpanan lokal JSON file backend terhubung & aktif.',
    };
  }
}
