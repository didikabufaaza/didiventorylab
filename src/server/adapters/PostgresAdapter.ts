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
        min: 0,
        idleTimeoutMillis: 10000,
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
          items JSONB,
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
          items JSONB,
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS lrims_suppliers (
          id VARCHAR(255) PRIMARY KEY,
          tenant_id VARCHAR(255) NOT NULL,
          code VARCHAR(100),
          name TEXT NOT NULL,
          pic TEXT,
          phone VARCHAR(100),
          email VARCHAR(255),
          address TEXT,
          status VARCHAR(50),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS lrims_locations (
          id VARCHAR(255) PRIMARY KEY,
          tenant_id VARCHAR(255) NOT NULL,
          code VARCHAR(100),
          name TEXT NOT NULL,
          building VARCHAR(255),
          room VARCHAR(255),
          type VARCHAR(100),
          temperature_condition VARCHAR(100),
          status VARCHAR(50),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS lrims_analyzers (
          id VARCHAR(255) PRIMARY KEY,
          tenant_id VARCHAR(255) NOT NULL,
          name TEXT NOT NULL,
          brand VARCHAR(100),
          model VARCHAR(100),
          serial_number VARCHAR(100),
          unit VARCHAR(100),
          parameters JSONB,
          status VARCHAR(50),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS lrims_stock_movements (
          id VARCHAR(255) PRIMARY KEY,
          tenant_id VARCHAR(255) NOT NULL,
          reagent_id VARCHAR(255),
          reagent_name TEXT,
          batch_id VARCHAR(255),
          lot_number VARCHAR(100),
          transaction_id VARCHAR(255),
          transaction_number VARCHAR(100),
          location_name TEXT,
          movement_type VARCHAR(50),
          quantity_in NUMERIC DEFAULT 0,
          quantity_out NUMERIC DEFAULT 0,
          balance_after NUMERIC DEFAULT 0,
          created_at VARCHAR(100),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS lrims_stock_opnames (
          id VARCHAR(255) PRIMARY KEY,
          tenant_id VARCHAR(255) NOT NULL,
          session_number VARCHAR(100),
          title TEXT,
          location_id VARCHAR(255),
          location_name TEXT,
          date VARCHAR(100),
          status VARCHAR(50),
          notes TEXT,
          user_id VARCHAR(255),
          user_name TEXT,
          items JSONB,
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS lrims_audit_logs (
          id VARCHAR(255) PRIMARY KEY,
          tenant_id VARCHAR(255) NOT NULL,
          timestamp VARCHAR(100),
          user_id VARCHAR(255),
          user_name TEXT,
          user_role VARCHAR(100),
          action VARCHAR(255),
          module VARCHAR(255),
          target_id VARCHAR(255),
          details TEXT,
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS lrims_notifications (
          id VARCHAR(255) PRIMARY KEY,
          tenant_id VARCHAR(255) NOT NULL,
          title TEXT,
          message TEXT,
          type VARCHAR(50),
          severity VARCHAR(50),
          timestamp VARCHAR(100),
          read BOOLEAN DEFAULT FALSE,
          link_module VARCHAR(100),
          link_id VARCHAR(255),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS lrims_letterhead (
          tenant_id VARCHAR(255) PRIMARY KEY,
          pemda_name TEXT,
          hospital_name TEXT,
          hospital_address TEXT,
          phone TEXT,
          email TEXT,
          logo_left_url TEXT,
          logo_right_url TEXT,
          signatory_1_title TEXT,
          signatory_1_name TEXT,
          signatory_1_nip TEXT,
          signatory_2_title TEXT,
          signatory_2_name TEXT,
          signatory_2_nip TEXT,
          signatory_3_title TEXT,
          signatory_3_name TEXT,
          signatory_3_nip TEXT,
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
      `);

      // Ensure transactions and purchase orders have the items JSONB column
      await client.query('ALTER TABLE lrims_transactions ADD COLUMN IF NOT EXISTS items JSONB;');
      await client.query('ALTER TABLE lrims_purchase_orders ADD COLUMN IF NOT EXISTS items JSONB;');
      await client.query('ALTER TABLE lrims_notifications ADD COLUMN IF NOT EXISTS severity VARCHAR(50);');

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

      // Ensure payload JSONB column exists on all 11 tables
      const tables = [
        'lrims_reagents',
        'lrims_batches',
        'lrims_transactions',
        'lrims_purchase_orders',
        'lrims_suppliers',
        'lrims_locations',
        'lrims_analyzers',
        'lrims_stock_movements',
        'lrims_stock_opnames',
        'lrims_audit_logs',
        'lrims_notifications'
      ];
      for (const table of tables) {
        await client.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS payload JSONB;`);
      }

      // Ensure specific missing columns in lrims_purchase_orders exist
      await client.query(`
        ALTER TABLE lrims_purchase_orders ADD COLUMN IF NOT EXISTS supplier_id VARCHAR(255);
        ALTER TABLE lrims_purchase_orders ADD COLUMN IF NOT EXISTS estimated_delivery_date VARCHAR(100);
        ALTER TABLE lrims_purchase_orders ADD COLUMN IF NOT EXISTS notes TEXT;
        ALTER TABLE lrims_purchase_orders ADD COLUMN IF NOT EXISTS created_at VARCHAR(100);
      `);
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
      const res = await this.pool.query(
        "SELECT id, name, username, password, email, role, unit, status, tenant_id, tenant_name, created_by, created_at, requested_role, registered_at, message, account_type FROM lrims_accounts ORDER BY created_at ASC, registered_at ASC"
      );
      
      const accounts: User[] = [];
      const pendingUsers: PendingUser[] = [];
      
      for (const r of res.rows) {
        if (r.account_type === 'active') {
          accounts.push({
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
          });
        } else if (r.account_type === 'pending') {
          pendingUsers.push({
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
          });
        }
      }

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
    const client = await this.pool.connect();
    try {
      const unifiedQuery = `
        SELECT 
          (SELECT COALESCE(json_agg(r), '[]'::json) FROM lrims_reagents r WHERE r.tenant_id = $1) as reagents,
          (SELECT COALESCE(json_agg(b), '[]'::json) FROM lrims_batches b WHERE b.tenant_id = $1) as batches,
          (SELECT COALESCE(json_agg(t), '[]'::json) FROM (SELECT * FROM lrims_transactions WHERE tenant_id = $1 ORDER BY date DESC, id DESC) t) as transactions,
          (SELECT COALESCE(json_agg(po), '[]'::json) FROM (SELECT * FROM lrims_purchase_orders WHERE tenant_id = $1 ORDER BY order_date DESC, id DESC) po) as purchase_orders,
          (SELECT COALESCE(json_agg(s), '[]'::json) FROM lrims_suppliers s WHERE s.tenant_id = $1) as suppliers,
          (SELECT COALESCE(json_agg(l), '[]'::json) FROM lrims_locations l WHERE l.tenant_id = $1) as locations,
          (SELECT COALESCE(json_agg(a), '[]'::json) FROM lrims_analyzers a WHERE a.tenant_id = $1) as analyzers,
          (SELECT COALESCE(json_agg(sm), '[]'::json) FROM (SELECT * FROM lrims_stock_movements WHERE tenant_id = $1 ORDER BY date DESC, id DESC) sm) as stock_movements,
          (SELECT COALESCE(json_agg(so), '[]'::json) FROM (SELECT * FROM lrims_stock_opnames WHERE tenant_id = $1 ORDER BY date DESC, id DESC) so) as stock_opnames,
          (SELECT COALESCE(json_agg(al), '[]'::json) FROM (SELECT * FROM lrims_audit_logs WHERE tenant_id = $1 ORDER BY timestamp DESC, id DESC LIMIT 500) al) as audit_logs,
          (SELECT COALESCE(json_agg(n), '[]'::json) FROM (SELECT * FROM lrims_notifications WHERE tenant_id = $1 ORDER BY timestamp DESC) n) as notifications,
          (SELECT to_jsonb(lh) FROM lrims_letterhead lh WHERE lh.tenant_id = $1) as letterhead
      `;

      const res = await client.query(unifiedQuery, [tenantId]);
      const row = res.rows[0];

      // If not seeded (letterhead is missing/null)
      if (!row || !row.letterhead) {
        const initial = seedTenantData();
        client.release();
        await this.saveTenantData(tenantId, initial);
        return initial;
      }

      // Helper function to parse payload or fallback to column mapping
      const parseRow = (r: any, fallbackMapping: () => any) => {
        if (r && r.payload) {
          return typeof r.payload === 'string' ? JSON.parse(r.payload) : r.payload;
        }
        return fallbackMapping();
      };

      const reagents = (row.reagents || []).map((r: any) => parseRow(r, () => ({
        id: r.id,
        code: r.code,
        name: r.name,
        brand: r.brand,
        category: r.category,
        unit: r.unit,
        minimumStock: Number(r.min_stock || 0),
        price: Number(r.purchase_price || 0),
      })));

      const batches = (row.batches || []).map((b: any) => parseRow(b, () => ({
        id: b.id,
        reagentId: b.reagent_id,
        reagentName: b.reagent_name,
        lotNumber: b.lot_number,
        barcode: b.barcode,
        currentQuantity: Number(b.current_quantity || 0),
        expiryDate: b.expiry_date,
        status: b.status,
      })));

      const transactions = (row.transactions || []).map((t: any) => parseRow(t, () => ({
        id: t.id,
        transactionNumber: t.transaction_number,
        type: t.type,
        date: t.date,
        totalAmount: Number(t.total_amount || 0),
        userName: t.user_name,
        items: Array.isArray(t.items) ? t.items : (typeof t.items === 'string' ? JSON.parse(t.items) : []),
      })));

      const purchaseOrders = (row.purchase_orders || []).map((po: any) => parseRow(po, () => ({
        id: po.id,
        poNumber: po.po_number,
        orderDate: po.order_date,
        supplierName: po.supplier_name,
        subtotal: Number(po.subtotal || 0),
        tax: Number(po.tax || 0),
        total: Number(po.total || 0),
        status: po.status,
        items: Array.isArray(po.items) ? po.items : (typeof po.items === 'string' ? JSON.parse(po.items) : []),
        supplierId: po.supplier_id || undefined,
        estimatedDeliveryDate: po.estimated_delivery_date || undefined,
        notes: po.notes || undefined,
        createdAt: po.created_at || undefined,
      })));

      const suppliers = (row.suppliers || []).map((s: any) => parseRow(s, () => ({
        id: s.id,
        code: s.code || '',
        name: s.name,
        pic: s.pic || '',
        phone: s.phone || '',
        email: s.email || '',
        address: s.address || '',
        status: s.status || 'Aktif',
      })));

      const locations = (row.locations || []).map((l: any) => parseRow(l, () => ({
        id: l.id,
        code: l.code || '',
        name: l.name,
        building: l.building || '',
        room: l.room || '',
        type: l.type || 'Gudang',
        temperatureCondition: l.temperature_condition || '',
        status: l.status || 'Aktif',
      })));

      const analyzers = (row.analyzers || []).map((a: any) => parseRow(a, () => ({
        id: a.id,
        name: a.name,
        brand: a.brand || '',
        model: a.model || '',
        serialNumber: a.serial_number || '',
        unit: a.unit || '',
        parameters: Array.isArray(a.parameters) ? a.parameters : (typeof a.parameters === 'string' ? JSON.parse(a.parameters) : []),
        status: a.status || 'Aktif',
      })));

      const stockMovements = (row.stock_movements || []).map((m: any) => parseRow(m, () => ({
        id: m.id,
        reagentId: m.reagent_id || '',
        reagentName: m.reagent_name || '',
        batchId: m.batch_id || '',
        lotNumber: m.lot_number || '',
        transactionId: m.transaction_id || '',
        transactionNumber: m.transaction_number || '',
        locationName: m.location_name || '',
        movementType: m.movement_type || 'IN',
        quantityIn: Number(m.quantity_in || 0),
        quantityOut: Number(m.quantity_out || 0),
        balanceAfter: Number(m.balance_after || 0),
        createdAt: m.created_at || '',
      })));

      const stockOpnames = (row.stock_opnames || []).map((so: any) => parseRow(so, () => ({
        id: so.id,
        sessionNumber: so.session_number,
        title: so.title,
        locationId: so.location_id,
        locationName: so.location_name,
        date: so.date,
        status: so.status,
        notes: so.notes,
        userId: so.user_id,
        userName: so.user_name,
        items: Array.isArray(so.items) ? so.items : (typeof so.items === 'string' ? JSON.parse(so.items) : []),
      })));

      const auditLogs = (row.audit_logs || []).map((al: any) => parseRow(al, () => ({
        id: al.id,
        timestamp: al.timestamp,
        userId: al.user_id,
        userName: al.user_name,
        userRole: al.user_role,
        action: al.action,
        module: al.module,
        targetId: al.target_id,
        details: al.details,
      })));

      const notifications = (row.notifications || []).map((n: any) => parseRow(n, () => ({
        id: n.id,
        title: n.title,
        message: n.message,
        type: n.type,
        severity: n.severity || 'info',
        timestamp: n.timestamp,
        read: Boolean(n.read),
        linkModule: n.link_module,
      })));

      const lh = row.letterhead || {};

      return {
        users: [], // managed globally
        pendingUsers: [], // managed globally
        reagents,
        batches,
        transactions,
        purchaseOrders,
        suppliers,
        locations,
        analyzers,
        stockMovements,
        stockOpnames,
        auditLogs,
        notifications,
        letterhead: {
          pemdaName: lh.pemda_name || '',
          hospitalName: lh.hospital_name || '',
          hospitalAddress: lh.hospital_address || '',
          phone: lh.phone || '',
          email: lh.email || '',
          logoLeftUrl: lh.logo_left_url || '',
          logoRightUrl: lh.logo_right_url || '',
          signatory1Title: lh.signatory_1_title || '',
          signatory1Name: lh.signatory_1_name || '',
          signatory1Nip: lh.signatory_1_nip || '',
          signatory2Title: lh.signatory_2_title || '',
          signatory2Name: lh.signatory_2_name || '',
          signatory2Nip: lh.signatory_2_nip || '',
          signatory3Title: lh.signatory_3_title || '',
          signatory3Name: lh.signatory_3_name || '',
          signatory3Nip: lh.signatory_3_nip || '',
        },
      };
    } catch (err) {
      console.error(`[PostgresAdapter] Error in getTenantData(${tenantId}), returning fallback:`, err);
      return seedTenantData();
    } finally {
      client.release();
    }
  }

  async saveTenantData(tenantId: string, data: DBData): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Sync Master Reagents into lrims_reagents table (Bulk)
      if (Array.isArray(data.reagents)) {
        if (data.reagents.length > 0) {
          const values: any[] = [];
          const valueStrings: string[] = [];
          let index = 1;
          for (const r of data.reagents) {
            valueStrings.push(`($${index}, $${index + 1}, $${index + 2}, $${index + 3}, $${index + 4}, $${index + 5}, $${index + 6}, $${index + 7}, $${index + 8}, $${index + 9})`);
            values.push(r.id, tenantId, r.code, r.name, r.brand, r.category, r.unit, r.minimumStock || 0, r.price || 0, JSON.stringify(r));
            index += 10;
          }
          await client.query(
            `INSERT INTO lrims_reagents (id, tenant_id, code, name, brand, category, unit, min_stock, purchase_price, payload, updated_at)
             VALUES ${valueStrings.join(', ')}
             ON CONFLICT (id) DO UPDATE SET
               name = EXCLUDED.name, brand = EXCLUDED.brand, category = EXCLUDED.category,
               unit = EXCLUDED.unit, min_stock = EXCLUDED.min_stock, purchase_price = EXCLUDED.purchase_price, payload = EXCLUDED.payload, updated_at = NOW()`,
            values
          );
          
          const reagentIds = data.reagents.map(r => r.id);
          await client.query(
            `DELETE FROM lrims_reagents WHERE tenant_id = $1 AND id NOT IN (${reagentIds.map((_, i) => `$${i + 2}`).join(',')})`,
            [tenantId, ...reagentIds]
          );
        } else {
          await client.query('DELETE FROM lrims_reagents WHERE tenant_id = $1', [tenantId]);
        }
      }

      // Sync Batches into lrims_batches table (Bulk)
      if (Array.isArray(data.batches)) {
        if (data.batches.length > 0) {
          const values: any[] = [];
          const valueStrings: string[] = [];
          let index = 1;
          for (const b of data.batches) {
            valueStrings.push(`($${index}, $${index + 1}, $${index + 2}, $${index + 3}, $${index + 4}, $${index + 5}, $${index + 6}, $${index + 7}, $${index + 8}, $${index + 9})`);
            values.push(b.id, tenantId, b.reagentId, b.reagentName, b.lotNumber, b.barcode, b.currentQuantity || 0, b.expiryDate, b.status, JSON.stringify(b));
            index += 10;
          }
          await client.query(
            `INSERT INTO lrims_batches (id, tenant_id, reagent_id, reagent_name, lot_number, barcode, current_quantity, expiry_date, status, payload, updated_at)
             VALUES ${valueStrings.join(', ')}
             ON CONFLICT (id) DO UPDATE SET
               current_quantity = EXCLUDED.current_quantity, expiry_date = EXCLUDED.expiry_date, status = EXCLUDED.status, payload = EXCLUDED.payload, updated_at = NOW()`,
            values
          );
          
          const batchIds = data.batches.map(b => b.id);
          await client.query(
            `DELETE FROM lrims_batches WHERE tenant_id = $1 AND id NOT IN (${batchIds.map((_, i) => `$${i + 2}`).join(',')})`,
            [tenantId, ...batchIds]
          );
        } else {
          await client.query('DELETE FROM lrims_batches WHERE tenant_id = $1', [tenantId]);
        }
      }

      // Sync Transactions into lrims_transactions table (Bulk)
      if (Array.isArray(data.transactions)) {
        if (data.transactions.length > 0) {
          const values: any[] = [];
          const valueStrings: string[] = [];
          let index = 1;
          for (const t of data.transactions) {
            valueStrings.push(`($${index}, $${index + 1}, $${index + 2}, $${index + 3}, $${index + 4}, $${index + 5}, $${index + 6}, $${index + 7}, $${index + 8})`);
            values.push(t.id, tenantId, t.transactionNumber, t.type, t.date, t.totalAmount || 0, t.userName, JSON.stringify(t.items || []), JSON.stringify(t));
            index += 9;
          }
          await client.query(
            `INSERT INTO lrims_transactions (id, tenant_id, transaction_number, type, date, total_amount, user_name, items, payload, updated_at)
             VALUES ${valueStrings.join(', ')}
             ON CONFLICT (id) DO UPDATE SET
               transaction_number = EXCLUDED.transaction_number, type = EXCLUDED.type, date = EXCLUDED.date, total_amount = EXCLUDED.total_amount, user_name = EXCLUDED.user_name, items = EXCLUDED.items, payload = EXCLUDED.payload, updated_at = NOW()`,
            values
          );
          
          const transactionIds = data.transactions.map(t => t.id);
          await client.query(
            `DELETE FROM lrims_transactions WHERE tenant_id = $1 AND id NOT IN (${transactionIds.map((_, i) => `$${i + 2}`).join(',')})`,
            [tenantId, ...transactionIds]
          );
        } else {
          await client.query('DELETE FROM lrims_transactions WHERE tenant_id = $1', [tenantId]);
        }
      }

      // Sync Purchase Orders into lrims_purchase_orders table (Bulk)
      if (Array.isArray(data.purchaseOrders)) {
        if (data.purchaseOrders.length > 0) {
          const values: any[] = [];
          const valueStrings: string[] = [];
          let index = 1;
          for (const po of data.purchaseOrders) {
            valueStrings.push(`($${index}, $${index + 1}, $${index + 2}, $${index + 3}, $${index + 4}, $${index + 5}, $${index + 6}, $${index + 7}, $${index + 8}, $${index + 9}, $${index + 10}, $${index + 11}, $${index + 12}, $${index + 13}, $${index + 14})`);
            values.push(
              po.id, tenantId, po.poNumber, po.orderDate, po.supplierName, 
              po.subtotal || 0, po.tax || 0, po.total || 0, po.status, JSON.stringify(po.items || []),
              po.supplierId || null, po.estimatedDeliveryDate || null, po.notes || null, po.createdAt || null,
              JSON.stringify(po)
            );
            index += 15;
          }
          await client.query(
            `INSERT INTO lrims_purchase_orders (
               id, tenant_id, po_number, order_date, supplier_name, 
               subtotal, tax, total, status, items, 
               supplier_id, estimated_delivery_date, notes, created_at,
               payload, updated_at
             )
             VALUES ${valueStrings.join(', ')}
             ON CONFLICT (id) DO UPDATE SET
               status = EXCLUDED.status, subtotal = EXCLUDED.subtotal, tax = EXCLUDED.tax, total = EXCLUDED.total, items = EXCLUDED.items, 
               supplier_id = EXCLUDED.supplier_id, estimated_delivery_date = EXCLUDED.estimated_delivery_date, notes = EXCLUDED.notes, created_at = EXCLUDED.created_at,
               payload = EXCLUDED.payload, updated_at = NOW()`,
            values
          );
          
          const poIds = data.purchaseOrders.map(po => po.id);
          await client.query(
            `DELETE FROM lrims_purchase_orders WHERE tenant_id = $1 AND id NOT IN (${poIds.map((_, i) => `$${i + 2}`).join(',')})`,
            [tenantId, ...poIds]
          );
        } else {
          await client.query('DELETE FROM lrims_purchase_orders WHERE tenant_id = $1', [tenantId]);
        }
      }

      // Sync Suppliers (Bulk)
      if (Array.isArray(data.suppliers)) {
        if (data.suppliers.length > 0) {
          const values: any[] = [];
          const valueStrings: string[] = [];
          let index = 1;
          for (const s of data.suppliers) {
            valueStrings.push(`($${index}, $${index + 1}, $${index + 2}, $${index + 3}, $${index + 4}, $${index + 5}, $${index + 6}, $${index + 7}, $${index + 8}, $${index + 9})`);
            values.push(s.id, tenantId, s.code || '', s.name, s.pic || '', s.phone || '', s.email || '', s.address || '', s.status || 'Aktif', JSON.stringify(s));
            index += 10;
          }
          await client.query(
            `INSERT INTO lrims_suppliers (id, tenant_id, code, name, pic, phone, email, address, status, payload, updated_at)
             VALUES ${valueStrings.join(', ')}
             ON CONFLICT (id) DO UPDATE SET
               code = EXCLUDED.code, name = EXCLUDED.name, pic = EXCLUDED.pic, phone = EXCLUDED.phone, email = EXCLUDED.email, address = EXCLUDED.address, status = EXCLUDED.status, payload = EXCLUDED.payload, updated_at = NOW()`,
            values
          );
          const supplierIds = data.suppliers.map(s => s.id);
          await client.query(
            `DELETE FROM lrims_suppliers WHERE tenant_id = $1 AND id NOT IN (${supplierIds.map((_, i) => `$${i + 2}`).join(',')})`,
            [tenantId, ...supplierIds]
          );
        } else {
          await client.query('DELETE FROM lrims_suppliers WHERE tenant_id = $1', [tenantId]);
        }
      }

      // Sync Locations (Bulk)
      if (Array.isArray(data.locations)) {
        if (data.locations.length > 0) {
          const values: any[] = [];
          const valueStrings: string[] = [];
          let index = 1;
          for (const l of data.locations) {
            valueStrings.push(`($${index}, $${index + 1}, $${index + 2}, $${index + 3}, $${index + 4}, $${index + 5}, $${index + 6}, $${index + 7}, $${index + 8}, $${index + 9})`);
            values.push(l.id, tenantId, l.code || '', l.name, l.building || '', l.room || '', l.type || 'Gudang', l.temperatureCondition || '', l.status || 'Aktif', JSON.stringify(l));
            index += 10;
          }
          await client.query(
            `INSERT INTO lrims_locations (id, tenant_id, code, name, building, room, type, temperature_condition, status, payload, updated_at)
             VALUES ${valueStrings.join(', ')}
             ON CONFLICT (id) DO UPDATE SET
               code = EXCLUDED.code, name = EXCLUDED.name, building = EXCLUDED.building, room = EXCLUDED.room, type = EXCLUDED.type, temperature_condition = EXCLUDED.temperature_condition, status = EXCLUDED.status, payload = EXCLUDED.payload, updated_at = NOW()`,
            values
          );
          const locationIds = data.locations.map(l => l.id);
          await client.query(
            `DELETE FROM lrims_locations WHERE tenant_id = $1 AND id NOT IN (${locationIds.map((_, i) => `$${i + 2}`).join(',')})`,
            [tenantId, ...locationIds]
          );
        } else {
          await client.query('DELETE FROM lrims_locations WHERE tenant_id = $1', [tenantId]);
        }
      }

      // Sync Analyzers (Bulk)
      if (Array.isArray(data.analyzers)) {
        if (data.analyzers.length > 0) {
          const values: any[] = [];
          const valueStrings: string[] = [];
          let index = 1;
          for (const a of data.analyzers) {
            valueStrings.push(`($${index}, $${index + 1}, $${index + 2}, $${index + 3}, $${index + 4}, $${index + 5}, $${index + 6}, $${index + 7}, $${index + 8}, $${index + 9}, $${index + 10})`);
            values.push(a.id, tenantId, a.name, a.brand || '', a.model || '', a.serialNumber || '', a.unit || '', JSON.stringify(a.parameters || []), a.status || 'Aktif', JSON.stringify(a));
            index += 11;
          }
          await client.query(
            `INSERT INTO lrims_analyzers (id, tenant_id, name, brand, model, serial_number, unit, parameters, status, payload, updated_at)
             VALUES ${valueStrings.join(', ')}
             ON CONFLICT (id) DO UPDATE SET
               name = EXCLUDED.name, brand = EXCLUDED.brand, model = EXCLUDED.model, serial_number = EXCLUDED.serial_number, unit = EXCLUDED.unit, parameters = EXCLUDED.parameters, status = EXCLUDED.status, payload = EXCLUDED.payload, updated_at = NOW()`,
            values
          );
          const analyzerIds = data.analyzers.map(a => a.id);
          await client.query(
            `DELETE FROM lrims_analyzers WHERE tenant_id = $1 AND id NOT IN (${analyzerIds.map((_, i) => `$${i + 2}`).join(',')})`,
            [tenantId, ...analyzerIds]
          );
        } else {
          await client.query('DELETE FROM lrims_analyzers WHERE tenant_id = $1', [tenantId]);
        }
      }

      // Sync Stock Movements (Bulk)
      if (Array.isArray(data.stockMovements)) {
        if (data.stockMovements.length > 0) {
          const values: any[] = [];
          const valueStrings: string[] = [];
          let index = 1;
          for (const m of data.stockMovements) {
            valueStrings.push(`($${index}, $${index + 1}, $${index + 2}, $${index + 3}, $${index + 4}, $${index + 5}, $${index + 6}, $${index + 7}, $${index + 8}, $${index + 9}, $${index + 10}, $${index + 11}, $${index + 12}, $${index + 13}, $${index + 14}, $${index + 15})`);
            values.push(
              m.id, tenantId, m.reagentId || '', m.reagentName || '', m.batchId || '', m.lotNumber || '',
              m.transactionId || '', m.transactionNumber || '', m.locationName || '', m.movementType || 'IN',
              m.quantityIn || 0, m.quantityOut || 0, m.balanceAfter || 0, m.createdAt || '', JSON.stringify(m)
            );
            index += 15;
          }
          await client.query(
            `INSERT INTO lrims_stock_movements (id, tenant_id, reagent_id, reagent_name, batch_id, lot_number, transaction_id, transaction_number, location_name, movement_type, quantity_in, quantity_out, balance_after, created_at, payload, updated_at)
             VALUES ${valueStrings.join(', ')}
             ON CONFLICT (id) DO UPDATE SET
               reagent_id = EXCLUDED.reagent_id, reagent_name = EXCLUDED.reagent_name, batch_id = EXCLUDED.batch_id, lot_number = EXCLUDED.lot_number,
               transaction_id = EXCLUDED.transaction_id, transaction_number = EXCLUDED.transaction_number, location_name = EXCLUDED.location_name,
               movement_type = EXCLUDED.movement_type, quantity_in = EXCLUDED.quantity_in, quantity_out = EXCLUDED.quantity_out, balance_after = EXCLUDED.balance_after, created_at = EXCLUDED.created_at, payload = EXCLUDED.payload, updated_at = NOW()`,
            values
          );
          const smIds = data.stockMovements.map(m => m.id);
          await client.query(
            `DELETE FROM lrims_stock_movements WHERE tenant_id = $1 AND id NOT IN (${smIds.map((_, i) => `$${i + 2}`).join(',')})`,
            [tenantId, ...smIds]
          );
        } else {
          await client.query('DELETE FROM lrims_stock_movements WHERE tenant_id = $1', [tenantId]);
        }
      }

      // Sync Stock Opnames (Bulk)
      if (Array.isArray(data.stockOpnames)) {
        if (data.stockOpnames.length > 0) {
          const values: any[] = [];
          const valueStrings: string[] = [];
          let index = 1;
          for (const so of data.stockOpnames) {
            valueStrings.push(`($${index}, $${index + 1}, $${index + 2}, $${index + 3}, $${index + 4}, $${index + 5}, $${index + 6}, $${index + 7}, $${index + 8}, $${index + 9}, $${index + 10}, $${index + 11}, $${index + 12})`);
            values.push(so.id, tenantId, so.sessionNumber || null, so.title || null, so.locationId || null, so.locationName || null, so.date || null, so.status || null, so.notes || null, so.userId || null, so.userName || null, JSON.stringify(so.items || []), JSON.stringify(so));
            index += 13;
          }
          await client.query(
            `INSERT INTO lrims_stock_opnames (id, tenant_id, session_number, title, location_id, location_name, date, status, notes, user_id, user_name, items, payload, updated_at)
             VALUES ${valueStrings.join(', ')}
             ON CONFLICT (id) DO UPDATE SET
               session_number = EXCLUDED.session_number, title = EXCLUDED.title, location_id = EXCLUDED.location_id, location_name = EXCLUDED.location_name, date = EXCLUDED.date, status = EXCLUDED.status, notes = EXCLUDED.notes, user_id = EXCLUDED.user_id, user_name = EXCLUDED.user_name, items = EXCLUDED.items, payload = EXCLUDED.payload, updated_at = NOW()`,
            values
          );
          const opnameIds = data.stockOpnames.map(so => so.id);
          await client.query(
            `DELETE FROM lrims_stock_opnames WHERE tenant_id = $1 AND id NOT IN (${opnameIds.map((_, i) => `$${i + 2}`).join(',')})`,
            [tenantId, ...opnameIds]
          );
        } else {
          await client.query('DELETE FROM lrims_stock_opnames WHERE tenant_id = $1', [tenantId]);
        }
      }

      // Sync Audit Logs (Bulk)
      if (Array.isArray(data.auditLogs)) {
        if (data.auditLogs.length > 0) {
          const values: any[] = [];
          const valueStrings: string[] = [];
          let index = 1;
          for (const al of data.auditLogs) {
            valueStrings.push(`($${index}, $${index + 1}, $${index + 2}, $${index + 3}, $${index + 4}, $${index + 5}, $${index + 6}, $${index + 7}, $${index + 8}, $${index + 9}, $${index + 10})`);
            values.push(al.id, tenantId, al.timestamp || null, al.userId || null, al.userName || null, al.userRole || null, al.action || null, al.module || null, al.targetId || null, al.details || null, JSON.stringify(al));
            index += 11;
          }
          await client.query(
            `INSERT INTO lrims_audit_logs (id, tenant_id, timestamp, user_id, user_name, user_role, action, module, target_id, details, payload, updated_at)
             VALUES ${valueStrings.join(', ')}
             ON CONFLICT (id) DO NOTHING`,
            values
          );
          const logIds = data.auditLogs.map(al => al.id);
          await client.query(
            `DELETE FROM lrims_audit_logs WHERE tenant_id = $1 AND id NOT IN (${logIds.map((_, i) => `$${i + 2}`).join(',')})`,
            [tenantId, ...logIds]
          );
        } else {
          await client.query('DELETE FROM lrims_audit_logs WHERE tenant_id = $1', [tenantId]);
        }
      }

      // Sync Notifications (Bulk)
      if (Array.isArray(data.notifications)) {
        if (data.notifications.length > 0) {
          const values: any[] = [];
          const valueStrings: string[] = [];
          let index = 1;
          for (const n of data.notifications) {
            valueStrings.push(`($${index}, $${index + 1}, $${index + 2}, $${index + 3}, $${index + 4}, $${index + 5}, $${index + 6}, $${index + 7}, $${index + 8}, $${index + 9}, $${index + 10})`);
            values.push(n.id, tenantId, n.title || null, n.message || null, n.type || null, n.severity || 'info', n.timestamp || null, n.read || false, n.linkModule || null, JSON.stringify(n));
            index += 10;
          }
          await client.query(
            `INSERT INTO lrims_notifications (id, tenant_id, title, message, type, severity, timestamp, read, link_module, payload, updated_at)
             VALUES ${valueStrings.join(', ')}
             ON CONFLICT (id) DO UPDATE SET
               title = EXCLUDED.title, message = EXCLUDED.message, type = EXCLUDED.type, severity = EXCLUDED.severity, timestamp = EXCLUDED.timestamp, read = EXCLUDED.read, link_module = EXCLUDED.link_module, payload = EXCLUDED.payload, updated_at = NOW()`,
            values
          );
          const notifIds = data.notifications.map(n => n.id);
          await client.query(
            `DELETE FROM lrims_notifications WHERE tenant_id = $1 AND id NOT IN (${notifIds.map((_, i) => `$${i + 2}`).join(',')})`,
            [tenantId, ...notifIds]
          );
        } else {
          await client.query('DELETE FROM lrims_notifications WHERE tenant_id = $1', [tenantId]);
        }
      }

      // Sync Letterhead Config
      if (data.letterhead) {
        const lh = data.letterhead;
        await client.query(
          `INSERT INTO lrims_letterhead (
            tenant_id, pemda_name, hospital_name, hospital_address, phone, email,
            logo_left_url, logo_right_url, signatory_1_title, signatory_1_name, signatory_1_nip,
            signatory_2_title, signatory_2_name, signatory_2_nip, signatory_3_title, signatory_3_name, signatory_3_nip, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW())
          ON CONFLICT (tenant_id) DO UPDATE SET
            pemda_name = EXCLUDED.pemda_name, hospital_name = EXCLUDED.hospital_name, hospital_address = EXCLUDED.hospital_address,
            phone = EXCLUDED.phone, email = EXCLUDED.email, logo_left_url = EXCLUDED.logo_left_url, logo_right_url = EXCLUDED.logo_right_url,
            signatory_1_title = EXCLUDED.signatory_1_title, signatory_1_name = EXCLUDED.signatory_1_name, signatory_1_nip = EXCLUDED.signatory_1_nip,
            signatory_2_title = EXCLUDED.signatory_2_title, signatory_2_name = EXCLUDED.signatory_2_name, signatory_2_nip = EXCLUDED.signatory_2_nip,
            signatory_3_title = EXCLUDED.signatory_3_title, signatory_3_name = EXCLUDED.signatory_3_name, signatory_3_nip = EXCLUDED.signatory_3_nip, updated_at = NOW()`,
          [
            tenantId, lh.pemdaName, lh.hospitalName, lh.hospitalAddress, lh.phone, lh.email,
            lh.logoLeftUrl, lh.logoRightUrl, lh.signatory1Title, lh.signatory1Name, lh.signatory1Nip,
            lh.signatory2Title, lh.signatory2Name, lh.signatory2Nip, lh.signatory3Title, lh.signatory3Name, lh.signatory3Nip
          ]
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
