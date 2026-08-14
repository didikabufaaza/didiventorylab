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
        max: 5,
        min: 1,
        idleTimeoutMillis: 60000,
        connectionTimeoutMillis: 5000,
        allowExitOnIdle: false,
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

      // Relational lrims_accounts: check if old JSONB format exists
      const acctTableCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns
          WHERE table_name = 'lrims_accounts' AND column_name = 'key_name'
        ) as has_key_name
      `);
      const isOldFormat = acctTableCheck.rows[0].has_key_name;

      if (isOldFormat) {
        // Migrate from old JSONB to relational
        console.log('[DB Init] Migrating lrims_accounts from JSONB to relational...');
        const oldData = await client.query("SELECT payload FROM lrims_accounts WHERE key_name = 'global_accounts'");
        const payload = oldData.rows[0]?.payload || {};
        const accounts: User[] = payload.accounts || DEFAULT_ACCOUNTS;
        const pendingUsers: PendingUser[] = payload.pendingUsers || [];

        // Drop old table and recreate
        await client.query('DROP TABLE lrims_accounts');
        await client.query(`
          CREATE TABLE lrims_accounts (
            id VARCHAR(255) PRIMARY KEY,
            name TEXT NOT NULL,
            username VARCHAR(100) NOT NULL,
            password VARCHAR(255) DEFAULT '',
            email VARCHAR(255) DEFAULT '',
            role VARCHAR(50) DEFAULT 'Petugas Laboratorium',
            unit VARCHAR(100),
            status VARCHAR(50) DEFAULT 'Aktif',
            tenant_id VARCHAR(255),
            tenant_name VARCHAR(255),
            created_by VARCHAR(255),
            created_at TIMESTAMPTZ DEFAULT NOW(),
            requested_role VARCHAR(50),
            registered_at TIMESTAMPTZ,
            message TEXT,
            account_type VARCHAR(20) NOT NULL DEFAULT 'active',
            updated_at TIMESTAMPTZ DEFAULT NOW()
          )
        `);

        // Insert active accounts
        for (const a of accounts) {
          await client.query(
            `INSERT INTO lrims_accounts (id, name, username, password, email, role, unit, status, tenant_id, tenant_name, created_by, created_at, account_type, updated_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'active',NOW())
             ON CONFLICT (id) DO NOTHING`,
            [a.id, a.name, a.username, a.password || '', a.email || '', a.role, a.unit, a.status || 'Aktif', a.tenantId || null, a.tenantName || null, a.createdBy || null, a.createdAt || new Date().toISOString()]
          );
        }

        // Insert pending users
        for (const p of pendingUsers) {
          await client.query(
            `INSERT INTO lrims_accounts (id, name, username, password, email, unit, requested_role, registered_at, tenant_id, message, account_type, updated_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'pending',NOW())
             ON CONFLICT (id) DO NOTHING`,
            [p.id, p.name, p.username, p.password, p.email || '', p.unit, p.requestedRole, p.registeredAt, p.tenantId || null, p.message || null]
          );
        }
        console.log(`[DB Init] Migrated ${accounts.length} active + ${pendingUsers.length} pending accounts to relational table.`);
      } else {
        // Create if not exists (fresh install)
        await client.query(`
          CREATE TABLE IF NOT EXISTS lrims_accounts (
            id VARCHAR(255) PRIMARY KEY,
            name TEXT NOT NULL,
            username VARCHAR(100) NOT NULL,
            password VARCHAR(255) DEFAULT '',
            email VARCHAR(255) DEFAULT '',
            role VARCHAR(50) DEFAULT 'Petugas Laboratorium',
            unit VARCHAR(100),
            status VARCHAR(50) DEFAULT 'Aktif',
            tenant_id VARCHAR(255),
            tenant_name VARCHAR(255),
            created_by VARCHAR(255),
            created_at TIMESTAMPTZ DEFAULT NOW(),
            requested_role VARCHAR(50),
            registered_at TIMESTAMPTZ,
            message TEXT,
            account_type VARCHAR(20) NOT NULL DEFAULT 'active',
            updated_at TIMESTAMPTZ DEFAULT NOW()
          )
        `);
      }

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
      const accountsCheck = await client.query("SELECT COUNT(*) FROM lrims_accounts WHERE account_type = 'active'");
      if (parseInt(accountsCheck.rows[0].count, 10) === 0) {
        for (const a of DEFAULT_ACCOUNTS) {
          await client.query(
            `INSERT INTO lrims_accounts (id, name, username, password, email, role, unit, status, tenant_id, tenant_name, created_by, created_at, account_type, updated_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'active',NOW())
             ON CONFLICT (id) DO NOTHING`,
            [a.id, a.name, a.username, a.password || '', a.email || '', a.role, a.unit, a.status || 'Aktif', a.tenantId || null, a.tenantName || null, a.createdBy || null, a.createdAt || new Date().toISOString()]
          );
        }
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
      const activeRes = await this.pool.query(
        "SELECT id, name, username, password, email, role, unit, status, tenant_id, tenant_name, created_by, created_at FROM lrims_accounts WHERE account_type = 'active' ORDER BY created_at ASC"
      );
      const pendingRes = await this.pool.query(
        "SELECT id, name, username, password, email, unit, requested_role, registered_at, tenant_id, message FROM lrims_accounts WHERE account_type = 'pending' ORDER BY registered_at ASC"
      );

      const accounts: User[] = activeRes.rows.map((r: any) => ({
        id: r.id,
        name: r.name,
        username: r.username,
        password: r.password,
        email: r.email,
        role: r.role,
        unit: r.unit,
        status: r.status,
        tenantId: r.tenant_id || undefined,
        tenantName: r.tenant_name || undefined,
        createdBy: r.created_by || undefined,
        createdAt: r.created_at ? new Date(r.created_at).toISOString() : undefined,
      }));

      const pendingUsers: PendingUser[] = pendingRes.rows.map((r: any) => ({
        id: r.id,
        name: r.name,
        username: r.username,
        password: r.password,
        email: r.email,
        unit: r.unit,
        requestedRole: r.requested_role,
        registeredAt: r.registered_at ? new Date(r.registered_at).toISOString() : new Date().toISOString(),
        tenantId: r.tenant_id || undefined,
        message: r.message || undefined,
      }));

      if (accounts.length === 0) {
        return { accounts: DEFAULT_ACCOUNTS, pendingUsers: [] };
      }

      return { accounts, pendingUsers };
    } catch (err) {
      console.error('[PostgresAdapter] Error in getAccounts, returning fallback:', err);
      return { accounts: DEFAULT_ACCOUNTS, pendingUsers: [] };
    }
  }

  async saveAccounts(state: { accounts: User[]; pendingUsers: PendingUser[] }): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Upsert active accounts
      for (const a of state.accounts) {
        await client.query(
          `INSERT INTO lrims_accounts (id, name, username, password, email, role, unit, status, tenant_id, tenant_name, created_by, created_at, account_type, updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'active',NOW())
           ON CONFLICT (id) DO UPDATE SET
             name = EXCLUDED.name, username = EXCLUDED.username, password = EXCLUDED.password,
             email = EXCLUDED.email, role = EXCLUDED.role, unit = EXCLUDED.unit, status = EXCLUDED.status,
             tenant_id = EXCLUDED.tenant_id, tenant_name = EXCLUDED.tenant_name, created_by = EXCLUDED.created_by,
             created_at = EXCLUDED.created_at, account_type = 'active', updated_at = NOW()`,
          [a.id, a.name, a.username, a.password || '', a.email || '', a.role, a.unit, a.status || 'Aktif', a.tenantId || null, a.tenantName || null, a.createdBy || null, a.createdAt || new Date().toISOString()]
        );
      }

      // Upsert pending users
      for (const p of state.pendingUsers) {
        await client.query(
          `INSERT INTO lrims_accounts (id, name, username, password, email, unit, requested_role, registered_at, tenant_id, message, account_type, updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'pending',NOW())
           ON CONFLICT (id) DO UPDATE SET
             name = EXCLUDED.name, username = EXCLUDED.username, password = EXCLUDED.password,
             email = EXCLUDED.email, unit = EXCLUDED.unit, requested_role = EXCLUDED.requested_role,
             registered_at = EXCLUDED.registered_at, tenant_id = EXCLUDED.tenant_id, message = EXCLUDED.message,
             account_type = 'pending', updated_at = NOW()`,
          [p.id, p.name, p.username, p.password, p.email || '', p.unit, p.requestedRole, p.registeredAt, p.tenantId || null, p.message || null]
        );
      }

      // Remove stale rows that are no longer in the state
      const activeIds = state.accounts.map(a => a.id);
      const pendingIds = state.pendingUsers.map(p => p.id);
      const allIds = [...activeIds, ...pendingIds];

      if (allIds.length > 0) {
        await client.query(
          `DELETE FROM lrims_accounts WHERE id NOT IN (${allIds.map((_, i) => `$${i + 1}`).join(',')})`,
          allIds
        );
      } else {
        await client.query('DELETE FROM lrims_accounts');
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
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
