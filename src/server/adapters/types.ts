import { TenantInfo, User, PendingUser, DBData } from '../../types.js';

export type DBProviderType = 'neon' | 'supabase' | 'postgres' | 'json';

export interface DBStatusResponse {
  ok: boolean;
  provider: DBProviderType;
  providerLabel: string;
  connectionStringMasked: string;
  latencyMs: number;
  tenantCount: number;
  accountCount: number;
  details?: string;
}

export interface IDatabaseAdapter {
  providerName: DBProviderType;
  providerLabel: string;
  init(): Promise<void>;
  getTenants(): Promise<TenantInfo[]>;
  saveTenants(tenants: TenantInfo[]): Promise<void>;
  getAccounts(): Promise<{ accounts: User[]; pendingUsers: PendingUser[] }>;
  saveAccounts(state: { accounts: User[]; pendingUsers: PendingUser[] }): Promise<void>;
  getTenantData(tenantId: string): Promise<DBData>;
  saveTenantData(tenantId: string, data: DBData): Promise<void>;
  healthCheck(): Promise<DBStatusResponse>;
}
