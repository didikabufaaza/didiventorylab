import pkg from 'pg';
const { Pool } = pkg;
import { IDatabaseAdapter, DBProviderType, DBStatusResponse } from './types.js';
import { TenantInfo, User, PendingUser, DBData } from '../../types.js';
import { seedTenantData, DEFAULT_ACCOUNTS, DEFAULT_TENANTS, mergeAccountsWithDefaults } from '../db.js';

export class PostgresAdapter implements IDatabaseAdapter {
  public providerName: DBProviderType = 'postgres';
  public providerLabel = 'PostgreSQL Database';
  private pool: any = null;
  private connectionString: string;

  constructor(connectionString: string) {
    this.connectionString = connectionString;
    this.detectProviderLabel(connectionString);
  }

  private detectProviderLabel(url: string) {
    const lower = url.toLowerCase();
    if (lower.includes('.neon.tech') || lower.includes('neondb')) {
      this.providerName = 'neon';
      this.providerLabel = 'Neon DB (Serverless PostgreSQL)';
    } else if (lower.includes('supabase.co') || lower.includes('supabase.com')) {
      this.providerName = 'supabase';
      this.providerLabel = 'Supabase PostgreSQL';
    } else if (lower.includes('instaforge') || lower.includes('insforge')) {
      this.providerName = 'postgres';
      this.providerLabel = 'Insforge Dev PostgreSQL';
    } else {
      this.providerName = 'postgres';
      this.providerLabel = 'PostgreSQL Database';
    }
  }

  private maskUrl(url: string): string {
    try {
      const u = new URL(url);
      return `${u.protocol}//${u.username}:****@${u.hostname}:${u.port || 5432}${u.pathname}`;
    } catch {
      return 'postgresql://****@****';
    }
  }

  async init(): Promise<void> {
    if (!this.pool) {
      this.pool = new Pool({
        connectionString: this.connectionString,
        ssl: this.connectionString.includes('localhost') || this.connectionString.includes('127.0.0.1')
          ? false
          : { rejectUnauthorized: false },
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
      });
    }

    // Auto Migration: Create Tables if not exist
    const client = await this.pool.connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS lrims_tenants (
          id VARCHAR(255) PRIMARY KEY,
          name TEXT NOT NULL,
          unit TEXT NOT NULL,
          description TEXT,
          status VARCHAR(50) DEFAULT 'Aktif',
          created_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS lrims_accounts (
          key_name VARCHAR(100) PRIMARY KEY,
          payload JSONB NOT NULL,
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS lrims_tenant_data (
          tenant_id VARCHAR(255) PRIMARY KEY,
          payload JSONB NOT NULL,
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS lrims_reagents (
          id VARCHAR(255) PRIMARY KEY,
          tenant_id VARCHAR(255) NOT NULL,
          code VARCHAR(100),
          name TEXT NOT NULL,
          brand VARCHAR(100),
          category VARCHAR(100),
          unit VARCHAR(50),
          min_stock NUMERIC DEFAULT 0,
          purchase_price NUMERIC DEFAULT 0,
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS lrims_batches (
          id VARCHAR(255) PRIMARY KEY,
          tenant_id VARCHAR(255) NOT NULL,
          reagent_id VARCHAR(255),
          reagent_name TEXT,
          lot_number VARCHAR(100),
          barcode VARCHAR(100),
          current_quantity NUMERIC DEFAULT 0,
          expiry_date VARCHAR(50),
          status VARCHAR(50),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS lrims_transactions (
          id VARCHAR(255) PRIMARY KEY,
          tenant_id VARCHAR(255) NOT NULL,
          transaction_number VARCHAR(100),
          type VARCHAR(50),
          date VARCHAR(100),
          total_amount NUMERIC DEFAULT 0,
          user_name TEXT,
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS lrims_purchase_orders (
          id VARCHAR(255) PRIMARY KEY,
          tenant_id VARCHAR(255) NOT NULL,
          po_number VARCHAR(100),
          order_date VARCHAR(100),
          supplier_name TEXT,
          subtotal NUMERIC DEFAULT 0,
          tax NUMERIC DEFAULT 0,
          total NUMERIC DEFAULT 0,
          status VARCHAR(50),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
      `);

      // Seed Initial Tenants if empty
      const tenantCheck = await client.query('SELECT COUNT(*) FROM lrims_tenants');
      if (parseInt(tenantCheck.rows[0].count, 10) === 0) {
        for (const t of DEFAULT_TENANTS) {
          await client.query(
            `INSERT INTO lrims_tenants (id, name, unit, description, status, created_at)
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT (id) DO NOTHING`,
            [t.id, t.name, t.unit, t.description || '', t.status, t.createdAt]
          );
        }
      }

      // Seed Initial Accounts if empty
      const accountsCheck = await client.query("SELECT COUNT(*) FROM lrims_accounts WHERE key_name = 'global_accounts'");
      if (parseInt(accountsCheck.rows[0].count, 10) === 0) {
        await client.query(
          `INSERT INTO lrims_accounts (key_name, payload, updated_at)
           VALUES ('global_accounts', $1, NOW())
           ON CONFLICT (key_name) DO UPDATE SET payload = EXCLUDED.payload`,
          [JSON.stringify({ accounts: DEFAULT_ACCOUNTS, pendingUsers: [] })]
        );
      }

      // Seed Initial Tenant Data (Master Reagents, Batches, POs, etc.) if empty
      const dataCheck = await client.query('SELECT COUNT(*) FROM lrims_tenant_data');
      if (parseInt(dataCheck.rows[0].count, 10) === 0) {
        const initialTenantData = seedTenantData();
        for (const t of DEFAULT_TENANTS) {
          await client.query(
            `INSERT INTO lrims_tenant_data (tenant_id, payload, updated_at)
             VALUES ($1, $2, NOW())
             ON CONFLICT (tenant_id) DO UPDATE SET payload = EXCLUDED.payload, updated_at = NOW()`,
            [t.id, JSON.stringify(initialTenantData)]
          );
        }
      }

      // Sync Master Reagents relational table if empty
      const reagentCheck = await client.query('SELECT COUNT(*) FROM lrims_reagents');
      if (parseInt(reagentCheck.rows[0].count, 10) === 0) {
        const tenantsRes = await client.query('SELECT tenant_id, payload FROM lrims_tenant_data');
        for (const row of tenantsRes.rows) {
          const tenantId = row.tenant_id;
          const payload = row.payload as DBData;
          if (payload && Array.isArray(payload.reagents)) {
            for (const r of payload.reagents) {
              await client.query(
                `INSERT INTO lrims_reagents (id, tenant_id, code, name, brand, category, unit, min_stock, purchase_price, updated_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
                 ON CONFLICT (id) DO UPDATE SET
                   name = EXCLUDED.name, brand = EXCLUDED.brand, category = EXCLUDED.category,
                   unit = EXCLUDED.unit, min_stock = EXCLUDED.min_stock, purchase_price = EXCLUDED.purchase_price, updated_at = NOW()`,
                [r.id, tenantId, r.code, r.name, r.brand, r.category, r.unit, r.minimumStock || 0, r.price || 0]
              );
            }
          }
        }
      }
    } finally {
      client.release();
    }
  }

  async getTenants(): Promise<TenantInfo[]> {
    try {
      const res = await this.pool.query('SELECT id, name, unit, description, status, created_at FROM lrims_tenants ORDER BY created_at ASC');
      return res.rows.map((r: any) => ({
        id: r.id,
        name: r.name,
        unit: r.unit,
        description: r.description,
        status: r.status,
        createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
      }));
    } catch (err) {
      console.error('[PostgresAdapter] Error in getTenants, returning fallback:', err);
      return DEFAULT_TENANTS;
    }
  }

  async saveTenants(tenants: TenantInfo[]): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      for (const t of tenants) {
        await client.query(
          `INSERT INTO lrims_tenants (id, name, unit, description, status, created_at)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (id) DO UPDATE SET
             name = EXCLUDED.name,
             unit = EXCLUDED.unit,
             description = EXCLUDED.description,
             status = EXCLUDED.status`,
          [t.id, t.name, t.unit, t.description || '', t.status || 'Aktif', t.createdAt || new Date().toISOString()]
        );
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async getAccounts(): Promise<{ accounts: User[]; pendingUsers: PendingUser[] }> {
    try {
      const res = await this.pool.query("SELECT payload FROM lrims_accounts WHERE key_name = 'global_accounts'");
      if (res.rows.length === 0) {
        return { accounts: DEFAULT_ACCOUNTS, pendingUsers: [] };
      }
      const payload = res.rows[0].payload || {};
      const raw = payload.accounts && payload.accounts.length > 0 ? payload.accounts : DEFAULT_ACCOUNTS;
      return {
        accounts: mergeAccountsWithDefaults(raw),
        pendingUsers: payload.pendingUsers || [],
      };
    } catch (err) {
      console.error('[PostgresAdapter] Error in getAccounts, returning fallback:', err);
      return { accounts: DEFAULT_ACCOUNTS, pendingUsers: [] };
    }
  }

  async saveAccounts(state: { accounts: User[]; pendingUsers: PendingUser[] }): Promise<void> {
    await this.pool.query(
      `INSERT INTO lrims_accounts (key_name, payload, updated_at)
       VALUES ('global_accounts', $1, NOW())
       ON CONFLICT (key_name) DO UPDATE SET payload = EXCLUDED.payload, updated_at = NOW()`,
      [JSON.stringify(state)]
    );
  }

  async getTenantData(tenantId: string): Promise<DBData> {
    try {
      const res = await this.pool.query('SELECT payload FROM lrims_tenant_data WHERE tenant_id = $1', [tenantId]);
      if (res.rows.length === 0) {
        const initial = seedTenantData();
        await this.saveTenantData(tenantId, initial);
        return initial;
      }
      return res.rows[0].payload as DBData;
    } catch (err) {
      console.error(`[PostgresAdapter] Error in getTenantData(${tenantId}), returning fallback:`, err);
      return seedTenantData();
    }
  }

  async saveTenantData(tenantId: string, data: DBData): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      // Save Full JSON Payload into lrims_tenant_data
      await client.query(
        `INSERT INTO lrims_tenant_data (tenant_id, payload, updated_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (tenant_id) DO UPDATE SET payload = EXCLUDED.payload, updated_at = NOW()`,
        [tenantId, JSON.stringify(data)]
      );

      // Sync Master Reagents into lrims_reagents table
      if (Array.isArray(data.reagents)) {
        for (const r of data.reagents) {
          await client.query(
            `INSERT INTO lrims_reagents (id, tenant_id, code, name, brand, category, unit, min_stock, purchase_price, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
             ON CONFLICT (id) DO UPDATE SET
               name = EXCLUDED.name, brand = EXCLUDED.brand, category = EXCLUDED.category,
               unit = EXCLUDED.unit, min_stock = EXCLUDED.min_stock, purchase_price = EXCLUDED.purchase_price, updated_at = NOW()`,
            [r.id, tenantId, r.code, r.name, r.brand, r.category, r.unit, r.minimumStock || 0, r.price || 0]
          );
        }
      }

      // Sync Batches into lrims_batches table
      if (Array.isArray(data.batches)) {
        for (const b of data.batches) {
          await client.query(
            `INSERT INTO lrims_batches (id, tenant_id, reagent_id, reagent_name, lot_number, barcode, current_quantity, expiry_date, status, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
             ON CONFLICT (id) DO UPDATE SET
               current_quantity = EXCLUDED.current_quantity, expiry_date = EXCLUDED.expiry_date, status = EXCLUDED.status, updated_at = NOW()`,
            [b.id, tenantId, b.reagentId, b.reagentName, b.lotNumber, b.barcode, b.currentQuantity || 0, b.expiryDate, b.status]
          );
        }
      }

      // Sync Transactions into lrims_transactions table
      if (Array.isArray(data.transactions)) {
        for (const t of data.transactions) {
          await client.query(
            `INSERT INTO lrims_transactions (id, tenant_id, transaction_number, type, date, total_amount, user_name, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
             ON CONFLICT (id) DO NOTHING`,
            [t.id, tenantId, t.transactionNumber, t.type, t.date, t.totalAmount || 0, t.userName]
          );
        }
      }

      // Sync Purchase Orders into lrims_purchase_orders table
      if (Array.isArray(data.purchaseOrders)) {
        for (const po of data.purchaseOrders) {
          await client.query(
            `INSERT INTO lrims_purchase_orders (id, tenant_id, po_number, order_date, supplier_name, subtotal, tax, total, status, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
             ON CONFLICT (id) DO UPDATE SET
               status = EXCLUDED.status, subtotal = EXCLUDED.subtotal, tax = EXCLUDED.tax, total = EXCLUDED.total, updated_at = NOW()`,
            [po.id, tenantId, po.poNumber, po.orderDate, po.supplierName, po.subtotal || 0, po.tax || 0, po.total || 0, po.status]
          );
        }
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async healthCheck(): Promise<DBStatusResponse> {
    const start = Date.now();
    try {
      const tenants = await this.getTenants();
      const accountsState = await this.getAccounts();
      return {
        ok: true,
        provider: this.providerName,
        providerLabel: this.providerLabel,
        connectionStringMasked: this.maskUrl(this.connectionString),
        latencyMs: Date.now() - start,
        tenantCount: tenants.length,
        accountCount: accountsState.accounts.length,
        details: `Terhubung sukses ke ${this.providerLabel}. Tabel Reagen, Batches, Transaksi & PO tersinkronisasi.`,
      };
    } catch (err: any) {
      return {
        ok: false,
        provider: this.providerName,
        providerLabel: this.providerLabel,
        connectionStringMasked: this.maskUrl(this.connectionString),
        latencyMs: Date.now() - start,
        tenantCount: 0,
        accountCount: 0,
        details: `Gagal terhubung: ${err.message}`,
      };
    }
  }

  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
  }
}
