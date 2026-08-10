import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { db, accountStore, tenantStore, initDatabase, getDbStatus } from './src/server/db.js';
import { PostgresAdapter } from './src/server/adapters/PostgresAdapter.js';
import {
  InventoryTransaction,
  StockMovement,
  ReagentBatch,
  AuditLog,
  PurchaseOrder,
  StockOpnameSession,
  User,
  PendingUser,
} from './src/types.js';

export async function buildApp() {
  await initDatabase();
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Sesi token (token -> { accountId, impersonatedBy? }). Disimpan in-memory saat login.
  interface SessionInfo {
  accountId: string;
  impersonatedBy?: string;
}
const sessions = new Map<string, SessionInfo>();

// Peran efektif mengikuti peran akun yang sedang login (impersonasi murni).
// Saat Super Admin memilih "Lihat Akun Sebagai", peran pada sesi baru menjadi
// peran akun yang dilihat, sehingga menu & hak akses sesuai akun tersebut.
const getEffectiveRole = (account: User) => account.role;

const denyAccess = (res: express.Response, role?: string) => {
  const msg = role ? `Akses ditolak: peran '${role}' tidak memiliki izin untuk tindakan ini.` : 'Akses ditolak: tindakan ini tidak diizinkan untuk peran Anda.';
  res.status(403).json({ error: msg });
};

const pushAudit = (
  tenantId: string,
  entry: { action: string; module?: string; targetId?: string; details: string }
) => {
  if (!tenantId || !tenantStoreAllExists(tenantId)) return;
  const prev = db.current();
  db.bind(tenantId);
  const data = db.get();
  data.auditLogs.unshift({
    id: `audn-${Date.now()}`,
    timestamp: new Date().toLocaleString('id-ID'),
    userId: 'usr-admin',
    userName: 'Super Admin',
    userRole: 'Super Admin',
    action: entry.action,
    module: entry.module || 'Manajemen User',
    targetId: entry.targetId || '',
    details: entry.details,
  });
  db.save();
  db.bind(prev);
};

function tenantStoreAllExists(tenantId: string): boolean {
  return !!tenantStore.find(tenantId);
}

// ============================================================
// KONTEKS MULTI-TENANT & PENEGAKAN PERAN SISI SERVER
// 1) Bind DB ke tenant milik akun yang sedang login (privat).
// 2) Semua mutasi (POST/PUT/DELETE) wajib punya sesi.
// 3) Manajemen User/Akun & Tenant hanya boleh oleh Super Admin.
// 4) Peran read-only (Manajemen/Auditor) tidak boleh mutasi
//    kecuali pengecualian khusus.
// ============================================================
app.use('/api', (req, res, next) => {
  const fullUrl = req.originalUrl.split('?')[0];

  // Public endpoints
  const isPublic =
    fullUrl === '/api/auth/login' ||
    fullUrl === '/api/auth/register' ||
    fullUrl === '/api/auth/reset-password' ||
    fullUrl === '/api/health';

  // Endpoint publik (login/register/health) selalu lewat tanpa enforcement sesi.
  if (isPublic) return next();

  // Resolusi sesi -> akun global & bind tenant (berlaku untuk SEMUA request).
  // Tanpa sesi valid, bind tenant default 'lab-sentral' (guests/visual) sehingga
  // tidak pernah memakai tenant milik pengguna lain.
  const auth = req.headers.authorization || '';
  const token = auth.replace(/^Bearer\s+/i, '');
  const session = token ? sessions.get(token) : undefined;
  if (session) {
    const account = accountStore.findById(session.accountId);
    if (account && account.status === 'Aktif') {
      (req as any).user = account;
      (req as any).session = session;
      db.bind(account.tenantId || 'lab-sentral');
    } else {
      db.bind('lab-sentral');
    }
  } else {
    db.bind('lab-sentral');
  }

  const user = (req as any).user as User | undefined;
  const role = user ? getEffectiveRole(user) : null;

  // Endpoint manajemen Akun/Tenant GLOBAL: hanya Super Admin (berlaku semua method).
  // Pengecualian /api/auth/switch: sesi yang sedang dalam mode
  // "Lihat Akun Sebagai" (impersonatedBy aktif) juga diizinkan berpindah
  // akun, sehingga Super Admin tidak perlu logout untuk berpindah lagi.
  const isStrictAdminOnly =
    /^\/api\/(users|pending-users|accounts|tenants)(\/|$)/.test(fullUrl);
  if (isStrictAdminOnly) {
    if (!user) {
      res.status(401).json({ error: 'Sesi tidak valid atau telah berakhir. Silakan masuk kembali.' });
      return;
    }
    const sessionInfo = (req as any).session as SessionInfo | undefined;
    const isAllowedAdmin = role === 'Super Admin' || !!sessionInfo?.impersonatedBy;
    if (!isAllowedAdmin) return denyAccess(res, role);
    return next();
  }
  if (fullUrl === '/api/auth/switch') {
    if (!user) {
      res.status(401).json({ error: 'Sesi tidak valid atau telah berakhir. Silakan masuk kembali.' });
      return;
    }
    const sessionInfo = (req as any).session as SessionInfo | undefined;
    const canSwitch = role === 'Super Admin' || !!sessionInfo?.impersonatedBy;
    if (!canSwitch) return denyAccess(res, role);
    return next();
  }

  // GET/OPTIONS (non-admin) tidak perlu enforcement (data bisa dimuat sebelum login)
  if (req.method === 'GET' || req.method === 'OPTIONS') return next();

  if (!user) {
    res.status(401).json({ error: 'Sesi tidak valid atau telah berakhir. Silakan masuk kembali.' });
    return;
  }

  // Peran 'Manajemen' & 'Auditor' bersifat read-only dengan pengecualian khusus
  if (role === 'Manajemen' || role === 'Auditor') {
    // Manajemen boleh: menyetujui PO + mengisi catatan PO + menandai notifikasi
    if (role === 'Manajemen' && /^\/api\/purchase-orders\/[^/]+\/approve$/.test(fullUrl) && req.method === 'PUT') return next();
    if (role === 'Manajemen' && /^\/api\/purchase-orders\/[^/]+$/.test(fullUrl) && req.method === 'PUT') {
      const keys = Object.keys(req.body || {});
      if (keys.length > 0 && keys.every((k) => k === 'notes')) return next();
      return denyAccess(res, role);
    }
    if (/^\/api\/notifications\/read$/.test(fullUrl) && req.method === 'POST') return next();
    return denyAccess(res, role);
  }

  next();
});

// Log API requests
app.use('/api', (req, res, next) => {
  console.log(`[API] ${req.method} ${req.url} tenant=${db.current()}`);
  next();
});

  // --- API ROUTES ---

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Full DB state getter
  app.get('/api/data', (req, res) => {
    const tenantData = db.get();
    const user = (req as any).user as User | undefined;
    const tenantId = user?.tenantId || db.current();
    const tenantAccounts = accountStore
      .getAll()
      .filter((a) => a.tenantId === tenantId)
      .map(({ password: _pw, ...a }) => a);
    res.json({
      ...tenantData,
      users: tenantAccounts,
      pendingUsers: accountStore.getPendingUsers(),
    });
  });

  // Reset database to initial seed
  app.post('/api/reset-data', (req, res) => {
    db.reset();
    res.json({ message: 'Database reset successfully', data: db.get() });
  });

  app.post('/api/clear-data', (req, res) => {
    const clearMaster = req.body?.clearMaster !== false;
    db.clearOperationalData(clearMaster);
    res.json({ message: 'Data cleared successfully', data: db.get() });
  });

  // AUTH ROUTES
  app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;
    const user = accountStore.findByUsername(username || '');
    if (!user || user.password !== password || user.status !== 'Aktif') {
      res.status(401).json({ error: 'Username atau password salah, atau akun tidak aktif.' });
      return;
    }
    const tenant = tenantStore.find(user.tenantId || 'lab-sentral');
    const token = `tok_${Date.now()}_${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`;
    sessions.set(token, { accountId: user.id });
    db.bind(user.tenantId || 'lab-sentral');
    const { password: _pw, ...safeUser } = user;
    res.json({ user: { ...safeUser, tenantName: tenant?.name || '' }, token });
  });

  // Helper untuk memastikan semua Unit / Instalasi yang terdaftar punya Database Tenant
  function syncTenantUnits() {
    const tenants = tenantStore.getAll();
    const pending = accountStore.getPendingUsers();
    const accounts = accountStore.getAll();

    const allUnits = new Set<string>();
    pending.forEach((p) => { if (p.unit && p.unit.trim()) allUnits.add(p.unit.trim()); });
    accounts.forEach((a) => { if (a.unit && a.unit.trim()) allUnits.add(a.unit.trim()); });

    for (const unit of allUnits) {
      const exists = tenants.some(
        (t) => (t.unit || '').toLowerCase() === unit.toLowerCase() || (t.name || '').toLowerCase() === unit.toLowerCase()
      );
      if (!exists) {
        tenantStore.create({
          name: unit.startsWith('Database') ? unit : `Database ${unit}`,
          unit: unit,
          description: `Database otomatis untuk unit ${unit}`,
        });
      }
    }
  }

  app.post('/api/auth/register', (req, res) => {
    const { username, name, email, unit, password: pwd, requestedRole } = req.body;
    if (
      accountStore.findByUsername(username) ||
      accountStore.getPendingUsers().some((p) => p.username === username)
    ) {
      res.status(409).json({ error: 'Username sudah digunakan.' });
      return;
    }
    // Sinkronkan unit & buat tenant baru jika unit belum memiliki tenant
    if (unit && unit.trim()) {
      let tenantMatch = tenantStore
        .getAll()
        .find((t) => (t.unit || '').toLowerCase() === unit.toLowerCase() || (t.name || '').toLowerCase() === unit.toLowerCase());
      if (!tenantMatch) {
        tenantMatch = tenantStore.create({
          name: unit.startsWith('Database') ? unit : `Database ${unit}`,
          unit: unit,
          description: `Database otomatis untuk unit ${unit}`,
        }) || undefined;
      }
    }
    syncTenantUnits();
    const tenants = tenantStore.getAll();
    const tenantMatch = tenants.find((t) => (t.unit || '').toLowerCase() === (unit || '').toLowerCase());

    const newPending: PendingUser = {
      id: `pnd-${Date.now()}`,
      name,
      username,
      email,
      unit,
      password: pwd,
      requestedRole: requestedRole || 'Petugas Laboratorium',
      registeredAt: new Date().toISOString(),
      tenantId: tenantMatch?.id,
    };
    accountStore.addPending(newPending);
    res.status(201).json({ message: 'Pendaftaran berhasil. Menunggu persetujuan Super Admin.' });
  });

  app.post('/api/auth/reset-password', (req, res) => {
    const { username, email, newPassword } = req.body || {};
    if (!username || !email || !newPassword) {
      res.status(400).json({ error: 'Username, email, dan password baru wajib diisi.' });
      return;
    }
    const user = accountStore
      .getAll()
      .find(
        (a) =>
          a.username.toLowerCase() === (username || '').toLowerCase() &&
          a.email.toLowerCase() === (email || '').toLowerCase()
      );
    if (!user) {
      res.status(404).json({ error: 'Akun dengan username dan email tersebut tidak ditemukan.' });
      return;
    }
    if (newPassword.length < 6) {
      res.status(400).json({ error: 'Password baru minimal 6 karakter.' });
      return;
    }
    accountStore.update(user.id, { password: newPassword });
    res.json({ message: 'Password berhasil diperbarui. Silakan masuk dengan password baru Anda.' });
  });

  // ============================================================
  // ENDPOINT MULTI-TENANT: AKUN GLOBAL & DATABASE
  // ============================================================

  // Status Provider Database Aktif (Neon DB / Supabase / Postgres / JSON)
  app.get('/api/db/status', async (req, res) => {
    try {
      const status = await getDbStatus();
      res.json(status);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Gagal mengecek status database' });
    }
  });

  // Uji Koneksi Database PostgreSQL Baru (Neon DB / Supabase / Insforge Dev / Generic Postgres)
  app.post('/api/db/test-connection', async (req, res) => {
    const { connectionString } = req.body || {};
    if (!connectionString) {
      res.status(400).json({ error: 'URL Koneksi Database PostgreSQL wajib diisi.' });
      return;
    }
    try {
      const testAdapter = new PostgresAdapter(connectionString);
      await testAdapter.init();
      const status = await testAdapter.healthCheck();
      await testAdapter.close();
      res.json(status);
    } catch (err: any) {
      res.status(400).json({ ok: false, error: err.message || 'Koneksi ke PostgreSQL gagal.' });
    }
  });

  // Sinkronisasi & Migrasi Data dari Lokal ke PostgreSQL
  app.post('/api/db/migrate', async (req, res) => {
    try {
      const adapter = await initDatabase();
      await adapter.init(); // Pastikan seluruh 7 Tabel (Tenants, Accounts, TenantData, Reagents, Batches, Transactions, POs) terbuat di Neon DB
      const tenants = tenantStore.getAll();
      const accountsState = { accounts: accountStore.getAll(), pendingUsers: accountStore.getPendingUsers() };

      await adapter.saveTenants(tenants);
      await adapter.saveAccounts(accountsState);

      for (const t of tenants) {
        db.bind(t.id);
        const tenantData = db.get();
        await adapter.saveTenantData(t.id, tenantData);
      }

      res.json({
        ok: true,
        message: `Migrasi data sukses ke ${adapter.providerLabel}. Total ${tenants.length} database tenant, Reagen, Batch Stok, Transaksi, dan PO tersinkronisasi ke Neon DB!`,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Gagal mengeksekusi migrasi database.' });
    }
  });

  // Daftar semua tenant/database (hanya Super Admin)
  app.get('/api/tenants', (req, res) => {
    syncTenantUnits();
    res.json(tenantStore.getAll());
  });

  // Tambah database/tenant baru (hanya Super Admin)
  app.post('/api/tenants', (req, res) => {
    const { name, unit, description } = req.body || {};
    if (!name || !unit) {
      res.status(400).json({ error: 'Nama dan unit database wajib diisi.' });
      return;
    }
    const created = tenantStore.create({ name, unit, description });
    if (!created) {
      res.status(409).json({ error: 'Database dengan unit tersebut sudah ada.' });
      return;
    }
    res.status(201).json(created);
  });

  // Daftar semua akun lintas tenant (hanya Super Admin)
  app.get('/api/accounts', (req, res) => {
    const tenantName = new Map(tenantStore.getAll().map((t) => [t.id, t.name]));
    const accounts = accountStore
      .getAll()
      .map(({ password: _pw, ...a }) => ({ ...a, tenantName: tenantName.get(a.tenantId || '') || '' }));
    res.json(accounts);
  });

  // Tambah akun baru ke database/tenant tertentu (hanya Super Admin)
  app.post('/api/accounts', (req, res) => {
    const { tenantId, name, username, password, email, unit, role, status } = req.body;
    if (!tenantId || !tenantStore.find(tenantId)) {
      res.status(400).json({ error: 'Database/tenant tidak valid.' });
      return;
    }
    if (accountStore.findByUsername(username)) {
      res.status(409).json({ error: 'Username sudah digunakan.' });
      return;
    }
    const newAccount: User = {
      id: `acc-${Date.now()}`,
      tenantId,
      name,
      username,
      password: password || 'password123',
      email: email || '',
      role,
      unit: unit || tenantStore.find(tenantId)?.name || '',
      status: status || 'Aktif',
      createdAt: new Date().toISOString(),
    };
    accountStore.add(newAccount);
    const { password: _pw, ...safe } = newAccount;
    res.status(201).json(safe);
  });

  // SWITCH "Lihat Akun Sebagai" (hanya Super Admin & Impersonated Admin)
  app.post('/api/auth/switch', (req, res) => {
    const current = (req as any).user as User;
    const sessionInfo = (req as any).session as SessionInfo | undefined;
    const { accountId } = req.body;
    if (!current) {
      res.status(401).json({ error: 'Tidak ada sesi aktif.' });
      return;
    }
    const target = accountStore.findById(accountId);
    if (!target || target.status !== 'Aktif') {
      res.status(404).json({ error: 'Akun tujuan tidak ditemukan.' });
      return;
    }
    const realAdminId = sessionInfo?.impersonatedBy || current.id;
    const realAdminAccount = accountStore.findById(realAdminId);
    const isReturningToAdmin = target.id === realAdminId;

    const token = `tok_${Date.now()}_${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`;
    sessions.set(token, {
      accountId: target.id,
      impersonatedBy: isReturningToAdmin ? undefined : realAdminId,
    });
    db.bind(target.tenantId || 'lab-sentral');
    const tenant = tenantStore.find(target.tenantId || 'lab-sentral');
    const { password: _pw, ...safeUser } = target;
    res.json({
      user: { ...safeUser, tenantName: tenant?.name || '' },
      token,
      impersonatedBy: isReturningToAdmin ? undefined : (realAdminAccount?.name || current.name),
      impersonated: !isReturningToAdmin,
    });
  });

  app.get('/api/pending-users', (req, res) => {
    res.json(accountStore.getPendingUsers());
  });

  app.post('/api/pending-users/:id/approve', (req, res) => {
    const pending = accountStore.removePending(req.params.id);
    if (!pending) { res.status(404).json({ error: 'Pending user not found' }); return; }
    const tenantId = req.body.tenantId || pending.tenantId || 'lab-sentral';
    const tenant = tenantStore.find(tenantId);
    const role = req.body.role || pending.requestedRole;
    const newUser: User = {
      id: `acc-${Date.now()}`,
      name: pending.name,
      username: pending.username,
      password: pending.password,
      email: pending.email,
      role,
      unit: tenant?.name || pending.unit,
      tenantId,
      status: 'Aktif',
      createdAt: new Date().toISOString(),
    };
    accountStore.add(newUser);
    pushAudit(tenantId, {
      action: 'APPROVE_USER',
      targetId: newUser.id,
      details: `Menyetujui pendaftaran akun baru: ${newUser.name} (@${newUser.username}) pada database ${tenant?.name || tenantId} sebagai ${role}`,
    });
    const { password: _pw, ...safeUser } = newUser;
    res.json({ ...safeUser, tenantName: tenant?.name || '' });
  });

  app.post('/api/pending-users/:id/reject', (req, res) => {
    const removed = accountStore.removePending(req.params.id);
    if (!removed) { res.status(404).json({ error: 'Pending user not found' }); return; }
    if (removed.tenantId) {
      pushAudit(removed.tenantId, {
        action: 'REJECT_USER',
        details: `Menolak pendaftaran akun: ${removed.name} (@${removed.username})`,
      });
    }
    res.json({ success: true });
  });

  app.get('/api/users', (req, res) => {
    const tenantName = new Map(tenantStore.getAll().map((t) => [t.id, t.name]));
    const users = accountStore
      .getAll()
      .map(({ password: _pw, ...u }) => ({ ...u, tenantName: tenantName.get(u.tenantId || '') || '' }));
    res.json(users);
  });

  app.put('/api/users/:id', (req, res) => {
    const current = accountStore.findById(req.params.id);
    if (!current) { res.status(404).json({ error: 'User not found' }); return; }

    const { name, username, email, unit, role, status, password, tenantId } = req.body;

    // Validasi keunikan username jika diubah
    if (username && username !== current.username) {
      const dupe = [...accountStore.getAll(), ...accountStore.getPendingUsers()].some(
        (a) => a.username === username
      );
      if (dupe) {
        res.status(409).json({ error: 'Username sudah digunakan oleh akun lain.' });
        return;
      }
    }

    const updated = accountStore.update(req.params.id, {
      ...(name ? { name } : {}),
      ...(username ? { username } : {}),
      ...(email ? { email } : {}),
      ...(unit ? { unit } : {}),
      ...(role ? { role } : {}),
      ...(status ? { status } : {}),
      ...(tenantId ? { tenantId } : {}),
      ...(password && password.trim() !== '' ? { password } : {}),
    });
    if (!updated) { res.status(404).json({ error: 'User not found' }); return; }

    const tenant = tenantStore.find(updated.tenantId || 'lab-sentral');
    pushAudit(updated.tenantId || 'lab-sentral', {
      action: 'UPDATE_USER',
      targetId: updated.id,
      details: `Memperbarui akun: ${updated.name} (@${updated.username}) pada database ${tenant?.name || 'lab-sentral'}`,
    });

    const { password: _pw, ...safeUser } = updated;
    res.json({ ...safeUser, tenantName: tenant?.name || '' });
  });

  app.delete('/api/users/:id', (req, res) => {
    const deletedUser = accountStore.remove(req.params.id);
    if (!deletedUser) { res.status(404).json({ error: 'User not found' }); return; }

    const tenant = tenantStore.find(deletedUser.tenantId || 'lab-sentral');
    pushAudit(deletedUser.tenantId || 'lab-sentral', {
      action: 'DELETE_USER',
      targetId: deletedUser.id,
      details: `Menghapus akun: ${deletedUser.name} (@${deletedUser.username}) dari database ${tenant?.name || 'lab-sentral'}`,
    });
    res.json({ success: true });
  });

  // 1. REAGENTS CRUD
  app.get('/api/reagents', (req, res) => {
    res.json(db.get().reagents);
  });

  app.post('/api/reagents', (req, res) => {
    const data = db.get();
    const newReagent = {
      ...req.body,
      id: `rea-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    data.reagents.unshift(newReagent);

    // Audit Log
    data.auditLogs.unshift({
      id: `aud-${Date.now()}`,
      timestamp: new Date().toLocaleString('id-ID'),
      userId: req.body.userId || 'usr-2',
      userName: req.body.userName || 'Admin Inventory',
      userRole: req.body.userRole || 'Admin Inventory',
      action: 'CREATE_REAGENT',
      module: 'Master Reagen',
      targetId: newReagent.id,
      details: `Menambah master reagen baru: ${newReagent.name} (${newReagent.code})`,
    });

    db.save();
    res.status(201).json(newReagent);
  });

  app.put('/api/reagents/:id', (req, res) => {
    const data = db.get();
    const index = data.reagents.findIndex((r) => r.id === req.params.id);
    if (index === -1) {
      res.status(404).json({ error: 'Reagent not found' });
      return;
    }
    data.reagents[index] = {
      ...data.reagents[index],
      ...req.body,
      updatedAt: new Date().toISOString(),
    };

    data.auditLogs.unshift({
      id: `aud-${Date.now()}`,
      timestamp: new Date().toLocaleString('id-ID'),
      userId: req.body.userId || 'usr-2',
      userName: req.body.userName || 'Admin Inventory',
      userRole: req.body.userRole || 'Admin Inventory',
      action: 'UPDATE_REAGENT',
      module: 'Master Reagen',
      targetId: req.params.id,
      details: `Memperbarui master reagen: ${data.reagents[index].name}`,
    });

    db.save();
    res.json(data.reagents[index]);
  });

  app.delete('/api/reagents/:id', (req, res) => {
    const data = db.get();
    const index = data.reagents.findIndex((r) => r.id === req.params.id);
    if (index === -1) {
      res.status(404).json({ error: 'Reagent not found' });
      return;
    }
    const removed = data.reagents.splice(index, 1)[0];
    data.auditLogs.unshift({
      id: `aud-${Date.now()}`,
      timestamp: new Date().toLocaleString('id-ID'),
      userId: 'usr-2',
      userName: 'Admin Inventory',
      userRole: 'Admin Inventory',
      action: 'DELETE_REAGENT',
      module: 'Master Reagen',
      targetId: req.params.id,
      details: `Menghapus master reagen: ${removed.name} (${removed.code})`,
    });
    db.save();
    res.json({ success: true, id: req.params.id });
  });

  // 1a. REAGENTS BATCH CRUD
  app.post('/api/reagents/batch', (req, res) => {
    const data = db.get();
    const reagentsList = req.body.reagents;
    if (!Array.isArray(reagentsList)) {
      res.status(400).json({ error: 'Reagents list must be an array' });
      return;
    }
    const inserted = [];
    const now = Date.now();
    for (let i = 0; i < reagentsList.length; i++) {
      const item = reagentsList[i];
      const newReagent = {
        ...item,
        id: `rea-${now}-${i}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      data.reagents.unshift(newReagent);
      inserted.push(newReagent);
    }

    data.auditLogs.unshift({
      id: `aud-${now}`,
      timestamp: new Date().toLocaleString('id-ID'),
      userId: req.body.userId || 'usr-2',
      userName: req.body.userName || 'Admin Inventory',
      userRole: req.body.userRole || 'Admin Inventory',
      action: 'BATCH_CREATE_REAGENT',
      module: 'Master Reagen',
      targetId: `batch-${now}`,
      details: `Menambah ${inserted.length} master reagen baru secara massal (Smart Input)`,
    });

    db.save();
    res.status(201).json(inserted);
  });

  // 1b. SUPPLIERS CRUD
  app.post('/api/suppliers', (req, res) => {
    const data = db.get();
    const newSupplier = {
      ...req.body,
      id: `sup-${Date.now()}`,
      code: req.body.code || `SUP-${Math.floor(100 + Math.random() * 900)}`,
      status: req.body.status || 'Aktif',
      totalOrders: 0,
    };
    data.suppliers.unshift(newSupplier);
    data.auditLogs.unshift({
      id: `aud-${Date.now()}`,
      timestamp: new Date().toLocaleString('id-ID'),
      userId: 'usr-2',
      userName: 'Admin Inventory',
      userRole: 'Admin Inventory',
      action: 'CREATE_SUPPLIER',
      module: 'Master Supplier',
      targetId: newSupplier.id,
      details: `Menambah supplier baru: ${newSupplier.name}`,
    });
    db.save();
    res.status(201).json(newSupplier);
  });

  app.put('/api/suppliers/:id', (req, res) => {
    const data = db.get();
    const index = data.suppliers.findIndex((s) => s.id === req.params.id);
    if (index === -1) {
      res.status(404).json({ error: 'Supplier not found' });
      return;
    }
    data.suppliers[index] = { ...data.suppliers[index], ...req.body };
    data.auditLogs.unshift({
      id: `aud-${Date.now()}`,
      timestamp: new Date().toLocaleString('id-ID'),
      userId: 'usr-2',
      userName: 'Admin Inventory',
      userRole: 'Admin Inventory',
      action: 'UPDATE_SUPPLIER',
      module: 'Master Supplier',
      targetId: req.params.id,
      details: `Memperbarui supplier: ${data.suppliers[index].name}`,
    });
    db.save();
    res.json(data.suppliers[index]);
  });

  app.delete('/api/suppliers/:id', (req, res) => {
    const data = db.get();
    const index = data.suppliers.findIndex((s) => s.id === req.params.id);
    if (index === -1) {
      res.status(404).json({ error: 'Supplier not found' });
      return;
    }
    const removed = data.suppliers.splice(index, 1)[0];
    data.auditLogs.unshift({
      id: `aud-${Date.now()}`,
      timestamp: new Date().toLocaleString('id-ID'),
      userId: 'usr-2',
      userName: 'Admin Inventory',
      userRole: 'Admin Inventory',
      action: 'DELETE_SUPPLIER',
      module: 'Master Supplier',
      targetId: req.params.id,
      details: `Menghapus supplier: ${removed.name}`,
    });
    db.save();
    res.json({ success: true, id: req.params.id });
  });

  // 1c. LOCATIONS CRUD
  app.post('/api/locations', (req, res) => {
    const data = db.get();
    const newLoc = {
      ...req.body,
      id: `loc-${Date.now()}`,
      code: req.body.code || `LOC-${Math.floor(100 + Math.random() * 900)}`,
      status: req.body.status || 'Aktif',
    };
    data.locations.unshift(newLoc);
    data.auditLogs.unshift({
      id: `aud-${Date.now()}`,
      timestamp: new Date().toLocaleString('id-ID'),
      userId: 'usr-2',
      userName: 'Admin Inventory',
      userRole: 'Admin Inventory',
      action: 'CREATE_LOCATION',
      module: 'Master Lokasi',
      targetId: newLoc.id,
      details: `Menambah lokasi penyimpanan baru: ${newLoc.name}`,
    });
    db.save();
    res.status(201).json(newLoc);
  });

  app.put('/api/locations/:id', (req, res) => {
    const data = db.get();
    const index = data.locations.findIndex((l) => l.id === req.params.id);
    if (index === -1) {
      res.status(404).json({ error: 'Location not found' });
      return;
    }
    data.locations[index] = { ...data.locations[index], ...req.body };
    data.auditLogs.unshift({
      id: `aud-${Date.now()}`,
      timestamp: new Date().toLocaleString('id-ID'),
      userId: 'usr-2',
      userName: 'Admin Inventory',
      userRole: 'Admin Inventory',
      action: 'UPDATE_LOCATION',
      module: 'Master Lokasi',
      targetId: req.params.id,
      details: `Memperbarui lokasi: ${data.locations[index].name}`,
    });
    db.save();
    res.json(data.locations[index]);
  });

  app.delete('/api/locations/:id', (req, res) => {
    const data = db.get();
    const index = data.locations.findIndex((l) => l.id === req.params.id);
    if (index === -1) {
      res.status(404).json({ error: 'Location not found' });
      return;
    }
    const removed = data.locations.splice(index, 1)[0];
    data.auditLogs.unshift({
      id: `aud-${Date.now()}`,
      timestamp: new Date().toLocaleString('id-ID'),
      userId: 'usr-2',
      userName: 'Admin Inventory',
      userRole: 'Admin Inventory',
      action: 'DELETE_LOCATION',
      module: 'Master Lokasi',
      targetId: req.params.id,
      details: `Menghapus lokasi penyimpanan: ${removed.name}`,
    });
    db.save();
    res.json({ success: true, id: req.params.id });
  });

  // 1d. ANALYZERS CRUD
  app.post('/api/analyzers', (req, res) => {
    const data = db.get();
    const newAnalyzer = {
      ...req.body,
      id: `anz-${Date.now()}`,
      parameters: Array.isArray(req.body.parameters) ? req.body.parameters : (req.body.parameters || '').split(',').map((p: string) => p.trim()).filter(Boolean),
      status: req.body.status || 'Aktif',
    };
    data.analyzers.unshift(newAnalyzer);
    data.auditLogs.unshift({
      id: `aud-${Date.now()}`,
      timestamp: new Date().toLocaleString('id-ID'),
      userId: 'usr-2',
      userName: 'Admin Inventory',
      userRole: 'Admin Inventory',
      action: 'CREATE_ANALYZER',
      module: 'Master Analyzer',
      targetId: newAnalyzer.id,
      details: `Menambah analyzer & parameter baru: ${newAnalyzer.name}`,
    });
    db.save();
    res.status(201).json(newAnalyzer);
  });

  app.put('/api/analyzers/:id', (req, res) => {
    const data = db.get();
    const index = data.analyzers.findIndex((a) => a.id === req.params.id);
    if (index === -1) {
      res.status(404).json({ error: 'Analyzer not found' });
      return;
    }
    const paramsList = Array.isArray(req.body.parameters) 
      ? req.body.parameters 
      : (typeof req.body.parameters === 'string' ? req.body.parameters.split(',').map((p: string) => p.trim()).filter(Boolean) : data.analyzers[index].parameters);

    data.analyzers[index] = { 
      ...data.analyzers[index], 
      ...req.body,
      parameters: paramsList
    };
    data.auditLogs.unshift({
      id: `aud-${Date.now()}`,
      timestamp: new Date().toLocaleString('id-ID'),
      userId: 'usr-2',
      userName: 'Admin Inventory',
      userRole: 'Admin Inventory',
      action: 'UPDATE_ANALYZER',
      module: 'Master Analyzer',
      targetId: req.params.id,
      details: `Memperbarui analyzer: ${data.analyzers[index].name}`,
    });
    db.save();
    res.json(data.analyzers[index]);
  });

  app.delete('/api/analyzers/:id', (req, res) => {
    const data = db.get();
    const index = data.analyzers.findIndex((a) => a.id === req.params.id);
    if (index === -1) {
      res.status(404).json({ error: 'Analyzer not found' });
      return;
    }
    const removed = data.analyzers.splice(index, 1)[0];
    data.auditLogs.unshift({
      id: `aud-${Date.now()}`,
      timestamp: new Date().toLocaleString('id-ID'),
      userId: 'usr-2',
      userName: 'Admin Inventory',
      userRole: 'Admin Inventory',
      action: 'DELETE_ANALYZER',
      module: 'Master Analyzer',
      targetId: req.params.id,
      details: `Menghapus analyzer: ${removed.name}`,
    });
    db.save();
    res.json({ success: true, id: req.params.id });
  });

  app.get('/api/batches', (req, res) => {
    res.json(db.get().batches);
  });

  // Edit batch/lot
  app.put('/api/batches/:id', (req, res) => {
    const data = db.get();
    const batch = data.batches.find((b) => b.id === req.params.id);
    if (!batch) {
      res.status(404).json({ error: 'Batch not found' });
      return;
    }
    const prevLot = batch.lotNumber;
    Object.assign(batch, req.body);
    batch.updatedAt = new Date().toISOString();

    data.auditLogs.unshift({
      id: `aud-${Date.now()}`,
      timestamp: new Date().toLocaleString('id-ID'),
      userId: req.body.userId || 'usr-1',
      userName: req.body.userName || 'Super Admin',
      userRole: req.body.userRole || 'Super Admin',
      action: 'UPDATE_BATCH',
      module: 'Lot Tracking',
      targetId: req.params.id,
      details: `Memperbarui lot ${prevLot} (${batch.reagentName})`,
    });

    db.save();
    res.json(batch);
  });

  // Delete batch/lot
  app.delete('/api/batches/:id', (req, res) => {
    const data = db.get();
    const index = data.batches.findIndex((b) => b.id === req.params.id);
    if (index === -1) {
      res.status(404).json({ error: 'Batch not found' });
      return;
    }
    const removed = data.batches.splice(index, 1)[0];

    data.auditLogs.unshift({
      id: `aud-${Date.now()}`,
      timestamp: new Date().toLocaleString('id-ID'),
      userId: 'usr-1',
      userName: 'Super Admin',
      userRole: 'Super Admin',
      action: 'DELETE_BATCH',
      module: 'Lot Tracking',
      targetId: req.params.id,
      details: `Menghapus lot ${removed.lotNumber} (${removed.reagentName})`,
    });

    db.save();
    res.json({ success: true, id: req.params.id });
  });

  app.put('/api/batches/:id/opened', (req, res) => {
    const data = db.get();
    const batch = data.batches.find((b) => b.id === req.params.id);
    if (!batch) {
      res.status(404).json({ error: 'Batch not found' });
      return;
    }

    const openedDate = req.body.openedDate || new Date().toISOString().split('T')[0];
    const openStabilityDays = req.body.openStabilityDays || 30;
    
    // Calculate opened expiry date
    const d = new Date(openedDate);
    d.setDate(d.getDate() + openStabilityDays);
    const openedExpiryDate = d.toISOString().split('T')[0];

    batch.openedDate = openedDate;
    batch.openStabilityDays = openStabilityDays;
    batch.openedExpiryDate = openedExpiryDate;
    batch.status = 'Opened';
    batch.updatedAt = new Date().toISOString();

    data.auditLogs.unshift({
      id: `aud-${Date.now()}`,
      timestamp: new Date().toLocaleString('id-ID'),
      userId: req.body.userId || 'usr-3',
      userName: req.body.userName || 'Petugas Laboratorium',
      userRole: req.body.userRole || 'Petugas Laboratorium',
      action: 'OPEN_REAGENT',
      module: 'Lot Tracking',
      targetId: batch.id,
      details: `Membuka reagen ${batch.reagentName} (LOT: ${batch.lotNumber}). Batas stabilitas hingga ${openedExpiryDate}`,
    });

    db.save();
    res.json(batch);
  });

  app.put('/api/batches/:id/quarantine', (req, res) => {
    const data = db.get();
    const batch = data.batches.find((b) => b.id === req.params.id);
    if (!batch) {
      res.status(404).json({ error: 'Batch not found' });
      return;
    }
    batch.status = req.body.status || 'Quarantine';
    batch.notes = req.body.notes || 'Di-quarantine oleh admin';
    batch.updatedAt = new Date().toISOString();

    data.auditLogs.unshift({
      id: `aud-${Date.now()}`,
      timestamp: new Date().toLocaleString('id-ID'),
      userId: req.body.userId || 'usr-2',
      userName: req.body.userName || 'Admin Inventory',
      userRole: req.body.userRole || 'Admin Inventory',
      action: 'QUARANTINE_BATCH',
      module: 'Lot Tracking',
      targetId: batch.id,
      details: `Mengubah status lot ${batch.lotNumber} (${batch.reagentName}) menjadi ${batch.status}. Catatan: ${batch.notes}`,
    });

    db.save();
    res.json(batch);
  });

  // 3. INVENTORY STOCK IN
  app.post('/api/inventory/in', (req, res) => {
    const data = db.get();
    const {
      supplierId,
      supplierName,
      poNumber,
      invoiceNumber,
      locationId,
      locationName,
      userId,
      userName,
      userRole,
      notes,
      items, // array of { reagentId, lotNumber, batchNumber, barcode, expiryDate, quantity, unit, unitPrice }
    } = req.body;

    if (!items || items.length === 0) {
      res.status(400).json({ error: 'Items are required' });
      return;
    }

    const transactionNumber = `IN-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`;
    let totalAmount = 0;
    const trxItems = [];

    for (const item of items) {
      const reagent = data.reagents.find((r) => r.id === item.reagentId);
      if (!reagent) continue;

      const itemTotal = (item.quantity || 1) * (item.unitPrice || 0);
      totalAmount += itemTotal;

      // Check if matching lot exists
      let batch = data.batches.find(
        (b) => b.reagentId === item.reagentId && b.lotNumber.toLowerCase() === item.lotNumber.toLowerCase()
      );

      if (batch) {
        batch.currentQuantity += Number(item.quantity);
        batch.status = batch.status === 'Empty' ? 'Available' : batch.status;
        batch.updatedAt = new Date().toISOString();
      } else {
        batch = {
          id: `bat-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          reagentId: reagent.id,
          reagentCode: reagent.code,
          reagentName: reagent.name,
          brand: reagent.brand,
          lotNumber: item.lotNumber,
          batchNumber: item.batchNumber || `B-${Math.floor(1000 + Math.random() * 9000)}`,
          barcode: item.barcode || reagent.barcode,
          manufactureDate: item.manufactureDate || undefined,
          expiryDate: item.expiryDate,
          receivedDate: new Date().toISOString().split('T')[0],
          openStabilityDays: reagent.openStabilityValue || 30,
          initialQuantity: Number(item.quantity),
          currentQuantity: Number(item.quantity),
          unit: item.unit || reagent.unit,
          purchasePrice: Number(item.unitPrice) || 0,
          supplierId: supplierId || 'sup-1',
          supplierName: supplierName || 'PT Medika Diagnostics',
          locationId: locationId || 'loc-1',
          locationName: locationName || 'Gudang Utama',
          poNumber: poNumber || undefined,
          invoiceNumber: invoiceNumber || undefined,
          status: 'Available',
          notes: item.notes || undefined,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        data.batches.unshift(batch);
      }

      trxItems.push({
        id: `tri-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        reagentId: reagent.id,
        reagentCode: reagent.code,
        reagentName: reagent.name,
        batchId: batch.id,
        lotNumber: batch.lotNumber,
        barcode: batch.barcode,
        expiryDate: batch.expiryDate,
        quantity: Number(item.quantity),
        unit: item.unit || reagent.unit,
        unitPrice: Number(item.unitPrice) || 0,
        totalPrice: itemTotal,
        locationId,
        locationName,
      });

      // Stock Movement
      data.stockMovements.unshift({
        id: `mov-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        reagentId: reagent.id,
        reagentName: reagent.name,
        batchId: batch.id,
        lotNumber: batch.lotNumber,
        transactionId: transactionNumber,
        transactionNumber,
        locationName: locationName || batch.locationName,
        movementType: 'IN',
        quantityIn: Number(item.quantity),
        quantityOut: 0,
        balanceAfter: batch.currentQuantity,
        createdAt: new Date().toLocaleString('id-ID'),
        createdBy: userName || 'Admin Inventory',
        notes: `Stock IN via ${transactionNumber}`,
      });
    }

    const newTransaction: InventoryTransaction = {
      id: `trx-${Date.now()}`,
      transactionNumber,
      type: 'IN',
      date: new Date().toLocaleString('id-ID'),
      supplierId,
      supplierName,
      poNumber,
      invoiceNumber,
      destinationLocationId: locationId,
      destinationLocationName: locationName,
      userId: userId || 'usr-2',
      userName: userName || 'Admin Inventory',
      userRole: userRole || 'Admin Inventory',
      notes,
      status: 'Completed',
      items: trxItems,
      totalAmount,
      createdAt: new Date().toISOString(),
    };

    data.transactions.unshift(newTransaction);

    // Audit Log
    data.auditLogs.unshift({
      id: `aud-${Date.now()}`,
      timestamp: new Date().toLocaleString('id-ID'),
      userId: userId || 'usr-2',
      userName: userName || 'Admin Inventory',
      userRole: userRole || 'Admin Inventory',
      action: 'STOCK_IN',
      module: 'Reagen IN',
      targetId: transactionNumber,
      details: `Stock IN ${trxItems.length} item reagen (${transactionNumber}) senilai Rp ${totalAmount.toLocaleString('id-ID')}`,
    });

    db.save();
    res.status(201).json({ transaction: newTransaction, batches: data.batches });
  });

  // 4. INVENTORY STOCK OUT (POS)
  app.post('/api/inventory/out', (req, res) => {
    const data = db.get();
    const {
      destinationUnit,
      purpose,
      notes,
      userId,
      userName,
      userRole,
      items, // array of { batchId, quantity, purpose, destinationUnit }
    } = req.body;

    if (!items || items.length === 0) {
      res.status(400).json({ error: 'No items provided for OUT' });
      return;
    }

    const transactionNumber = `OUT-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`;
    let totalAmount = 0;
    const trxItems = [];

    for (const item of items) {
      const batch = data.batches.find((b) => b.id === item.batchId);
      if (!batch) {
        res.status(404).json({ error: `Batch ID ${item.batchId} not found` });
        return;
      }

      if (batch.currentQuantity < item.quantity) {
        res.status(400).json({
          error: `Stok tidak mencukupi untuk ${batch.reagentName} (Lot: ${batch.lotNumber}). Stok tersedia: ${batch.currentQuantity}, diminta: ${item.quantity}`,
        });
        return;
      }

      // Check expiry validation
      if (new Date(batch.expiryDate) < new Date()) {
        res.status(400).json({
          error: `Reagen ${batch.reagentName} (Lot: ${batch.lotNumber}) sudah KADALUARSA (${batch.expiryDate}). Tidak dapat dikeluarkan untuk pemakaian normal!`,
        });
        return;
      }

      if (batch.status === 'Quarantine') {
        res.status(400).json({
          error: `Reagen ${batch.reagentName} (Lot: ${batch.lotNumber}) dalam status QUARANTINE. Pengeluaran diblokir!`,
        });
        return;
      }

      // Decrement batch stock
      batch.currentQuantity -= Number(item.quantity);
      if (batch.currentQuantity === 0) {
        batch.status = 'Empty';
      }
      batch.updatedAt = new Date().toISOString();

      const itemTotal = Number(item.quantity) * (batch.purchasePrice || 0);
      totalAmount += itemTotal;

      trxItems.push({
        id: `tri-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        reagentId: batch.reagentId,
        reagentCode: batch.reagentCode,
        reagentName: batch.reagentName,
        batchId: batch.id,
        lotNumber: batch.lotNumber,
        barcode: batch.barcode,
        expiryDate: batch.expiryDate,
        quantity: Number(item.quantity),
        unit: batch.unit,
        unitPrice: batch.purchasePrice || 0,
        totalPrice: itemTotal,
        purpose: item.purpose || purpose,
        destinationUnit: item.destinationUnit || destinationUnit,
      });

      // Movement
      data.stockMovements.unshift({
        id: `mov-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        reagentId: batch.reagentId,
        reagentName: batch.reagentName,
        batchId: batch.id,
        lotNumber: batch.lotNumber,
        transactionId: transactionNumber,
        transactionNumber,
        locationName: batch.locationName,
        movementType: 'OUT',
        quantityIn: 0,
        quantityOut: Number(item.quantity),
        balanceAfter: batch.currentQuantity,
        createdAt: new Date().toLocaleString('id-ID'),
        createdBy: userName || 'Petugas Lab',
        notes: `Stock OUT untuk ${destinationUnit} (${purpose})`,
      });
    }

    const newTransaction: InventoryTransaction = {
      id: `trx-${Date.now()}`,
      transactionNumber,
      type: 'OUT',
      date: new Date().toLocaleString('id-ID'),
      destinationUnit,
      purpose,
      userId: userId || 'usr-3',
      userName: userName || 'Petugas Lab',
      userRole: userRole || 'Petugas Laboratorium',
      notes,
      status: 'Completed',
      items: trxItems,
      totalAmount,
      createdAt: new Date().toISOString(),
    };

    data.transactions.unshift(newTransaction);

    // Audit Log
    data.auditLogs.unshift({
      id: `aud-${Date.now()}`,
      timestamp: new Date().toLocaleString('id-ID'),
      userId: userId || 'usr-3',
      userName: userName || 'Petugas Lab',
      userRole: userRole || 'Petugas Laboratorium',
      action: 'STOCK_OUT',
      module: 'Reagen OUT',
      targetId: transactionNumber,
      details: `Pengeluaran ${trxItems.length} item reagen ke ${destinationUnit} [Keperluan: ${purpose}] (${transactionNumber})`,
    });

    db.save();
    res.status(201).json({ transaction: newTransaction, batches: data.batches });
  });

  // 5. STOCK TRANSFER
  app.post('/api/inventory/transfer', (req, res) => {
    const data = db.get();
    const { batchId, quantity, sourceLocationName, destinationLocationId, destinationLocationName, userId, userName, userRole, notes } = req.body;

    const batch = data.batches.find((b) => b.id === batchId);
    if (!batch) {
      res.status(404).json({ error: 'Batch not found' });
      return;
    }

    if (batch.currentQuantity < quantity) {
      res.status(400).json({ error: 'Stok tidak mencukupi untuk transfer' });
      return;
    }

    // Update batch location or split batch if partial
    batch.locationId = destinationLocationId;
    batch.locationName = destinationLocationName;
    batch.updatedAt = new Date().toISOString();

    const transactionNumber = `TRF-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`;

    data.auditLogs.unshift({
      id: `aud-${Date.now()}`,
      timestamp: new Date().toLocaleString('id-ID'),
      userId: userId || 'usr-2',
      userName: userName || 'Admin Inventory',
      userRole: userRole || 'Admin Inventory',
      action: 'STOCK_TRANSFER',
      module: 'Transfer Stok',
      targetId: transactionNumber,
      details: `Transfer ${quantity} ${batch.unit} ${batch.reagentName} (LOT: ${batch.lotNumber}) dari ${sourceLocationName} ke ${destinationLocationName}`,
    });

    db.save();
    res.json({ message: 'Stock transferred successfully', batch });
  });

  // 6. STOCK OPNAME
  app.post('/api/stock-opnames', (req, res) => {
    const data = db.get();
    const { title, locationId, locationName, userId, userName, items, notes } = req.body;

    const sessionNumber = `SO-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`;

    let totalDifference = 0;
    const processedItems = (items || []).map((it: any) => {
      const diff = Number(it.physicalStock) - Number(it.systemStock);
      const diffVal = diff * (it.unitPrice || 0);
      totalDifference += diff;
      return {
        ...it,
        difference: diff,
        differenceValue: diffVal,
      };
    });

    const newSession: StockOpnameSession = {
      id: `so-${Date.now()}`,
      sessionNumber,
      title: title || `Stock Opname ${locationName}`,
      locationId,
      locationName,
      date: new Date().toLocaleString('id-ID'),
      userId: userId || 'usr-2',
      userName: userName || 'Admin Inventory',
      status: 'Finalized',
      totalItems: processedItems.length,
      totalDifference,
      notes,
      items: processedItems,
      createdAt: new Date().toISOString(),
    };

    // Apply adjustments to batches
    for (const it of processedItems) {
      const batch = data.batches.find((b) => b.id === it.batchId);
      if (batch) {
        batch.currentQuantity = Number(it.physicalStock);
        if (batch.currentQuantity === 0) batch.status = 'Empty';
        else if (batch.status === 'Empty' && batch.currentQuantity > 0) batch.status = 'Available';
        batch.updatedAt = new Date().toISOString();
      }
    }

    data.stockOpnames.unshift(newSession);

    data.auditLogs.unshift({
      id: `aud-${Date.now()}`,
      timestamp: new Date().toLocaleString('id-ID'),
      userId: userId || 'usr-2',
      userName: userName || 'Admin Inventory',
      userRole: 'Admin Inventory',
      action: 'STOCK_OPNAME_FINALIZE',
      module: 'Stock Opname',
      targetId: sessionNumber,
      details: `Finalisasi Stock Opname ${sessionNumber} di ${locationName}. Total selisih: ${totalDifference} unit`,
    });

    db.save();
    res.status(201).json(newSession);
  });

  // 7. PURCHASE ORDERS
  app.post('/api/purchase-orders', (req, res) => {
    const data = db.get();
    const { supplierId, supplierName, estimatedDeliveryDate, items, notes, userId, userName } = req.body;

    const poNumber = `PO-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`;

    let subtotal = 0;
    const poItems = (items || []).map((it: any, idx: number) => {
      const lineTotal = Number(it.quantityOrdered) * Number(it.unitPrice);
      subtotal += lineTotal;
      return {
        id: `poi-${Date.now()}-${idx}`,
        reagentId: it.reagentId,
        reagentCode: it.reagentCode,
        reagentName: it.reagentName,
        unit: it.unit,
        quantityOrdered: Number(it.quantityOrdered),
        quantityReceived: 0,
        unitPrice: Number(it.unitPrice),
        totalPrice: lineTotal,
      };
    });

    const tax = subtotal * 0.11; // 11% PPN
    const total = subtotal + tax;

    const initialStatus = req.body.status || 'Draft';

    const newPO: PurchaseOrder = {
      id: `po-${Date.now()}`,
      poNumber,
      supplierId,
      supplierName,
      orderDate: new Date().toISOString().split('T')[0],
      estimatedDeliveryDate: estimatedDeliveryDate || new Date().toISOString().split('T')[0],
      status: initialStatus,
      items: poItems,
      subtotal,
      tax,
      total,
      notes,
      createdAt: new Date().toISOString(),
    };

    data.purchaseOrders.unshift(newPO);

    data.auditLogs.unshift({
      id: `aud-${Date.now()}`,
      timestamp: new Date().toLocaleString('id-ID'),
      userId: userId || 'usr-2',
      userName: userName || 'Admin Inventory',
      userRole: 'Admin Inventory',
      action: 'CREATE_PO',
      module: 'Purchase Order',
      targetId: poNumber,
      details: `Membuat Purchase Order ${poNumber} ke ${supplierName} (Status: ${initialStatus}) senilai Rp ${total.toLocaleString('id-ID')}`,
    });

    db.save();
    res.status(201).json(newPO);
  });

  app.put('/api/purchase-orders/:id/submit', (req, res) => {
    const data = db.get();
    const po = data.purchaseOrders.find((p) => p.id === req.params.id);
    if (!po) {
      res.status(404).json({ error: 'PO not found' });
      return;
    }

    po.status = 'Submitted';

    data.auditLogs.unshift({
      id: `aud-${Date.now()}`,
      timestamp: new Date().toLocaleString('id-ID'),
      userId: req.body.userId || 'usr-2',
      userName: req.body.userName || 'Admin Inventory',
      userRole: 'Admin Inventory',
      action: 'SUBMIT_PO',
      module: 'Purchase Order',
      targetId: po.poNumber,
      details: `Mengirim Purchase Order ${po.poNumber} (${po.supplierName}) ke Manajemen untuk Approval`,
    });

    data.notifications.unshift({
      id: `notif-${Date.now()}`,
      type: 'PO_APPROVAL',
      title: 'Permohonan Approval PO Baru',
      message: `Purchase Order ${po.poNumber} (${po.supplierName}) telah dikirim dan menunggu persetujuan Manajemen.`,
      severity: 'info',
      timestamp: new Date().toLocaleString('id-ID'),
      read: false,
      linkModule: 'purchase-orders',
    });

    db.save();
    res.json(po);
  });

  app.put('/api/purchase-orders/:id/approve', (req, res) => {
    const data = db.get();
    const po = data.purchaseOrders.find((p) => p.id === req.params.id);
    if (!po) {
      res.status(404).json({ error: 'PO not found' });
      return;
    }

    const actor = (req as any).user as User | undefined;
    const approverName = actor?.name || req.body.approvedBy || 'Akun Sistem';
    const approverRole = actor?.role || 'Manajemen';
    const approverId = actor?.id || req.body.userId || 'usr-system';

    po.status = 'Approved';
    po.approvedBy = approverName;

    data.auditLogs.unshift({
      id: `aud-${Date.now()}`,
      timestamp: new Date().toLocaleString('id-ID'),
      userId: approverId,
      userName: approverName,
      userRole: approverRole,
      action: 'APPROVE_PO',
      module: 'Purchase Order',
      targetId: po.poNumber,
      details: `Menyetujui Purchase Order ${po.poNumber} (${po.supplierName})`,
    });

    db.save();
    res.json(po);
  });

  app.put('/api/purchase-orders/:id', (req, res) => {
    const data = db.get();
    const index = data.purchaseOrders.findIndex((p) => p.id === req.params.id);
    if (index === -1) {
      res.status(404).json({ error: 'PO not found' });
      return;
    }
    const current = data.purchaseOrders[index];
    data.purchaseOrders[index] = {
      ...current,
      ...req.body,
    };
    db.save();
    res.json(data.purchaseOrders[index]);
  });

  app.delete('/api/purchase-orders/:id', (req, res) => {
    const data = db.get();
    const index = data.purchaseOrders.findIndex((p) => p.id === req.params.id);
    if (index === -1) {
      res.status(404).json({ error: 'PO not found' });
      return;
    }
    const removed = data.purchaseOrders.splice(index, 1)[0];
    data.auditLogs.unshift({
      id: `aud-${Date.now()}`,
      timestamp: new Date().toLocaleString('id-ID'),
      userId: 'usr-2',
      userName: 'Admin Inventory',
      userRole: 'Admin Inventory',
      action: 'DELETE_PO',
      module: 'Purchase Order',
      targetId: req.params.id,
      details: `Menghapus Purchase Order ${removed.poNumber}`,
    });
    db.save();
    res.json({ success: true, id: req.params.id });
  });

  // 8. KOP SURAT (LETTERHEAD CONFIG)
  app.get('/api/letterhead', (req, res) => {
    const data = db.get();
    res.json(data.letterhead || {});
  });

  app.put('/api/letterhead', (req, res) => {
    const data = db.get();
    data.letterhead = {
      ...(data.letterhead || {}),
      ...req.body,
    };
    data.auditLogs.unshift({
      id: `aud-${Date.now()}`,
      timestamp: new Date().toLocaleString('id-ID'),
      userId: req.body.userId || 'usr-4',
      userName: req.body.userName || 'Super Admin',
      userRole: 'Super Admin',
      action: 'UPDATE_LETTERHEAD',
      module: 'Pengaturan Kop Surat',
      targetId: 'KOP-01',
      details: 'Memperbarui konfigurasi Kop Surat & Penandatangan PO Rumah Sakit',
    });
    db.save();
    res.json(data.letterhead);
  });

  // 9. NOTIFICATIONS MARK AS READ
  app.post('/api/notifications/read', (req, res) => {
    const data = db.get();
    if (req.body.id) {
      const notif = data.notifications.find((n) => n.id === req.body.id);
      if (notif) notif.read = true;
    } else {
      data.notifications.forEach((n) => (n.read = true));
    }
    db.save();
    res.json({ success: true });
  });

  // --- VITE / SERVING FRONTEND ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }
  return app;
}

export async function startServer() {
  const app = await buildApp();
  const PORT = Number(process.env.PORT) || 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[LRIMS Server] Running on http://0.0.0.0:${PORT}`);
  });
}

if (!process.env.VERCEL) {
  startServer().catch((err) => {
    console.error('[LRIMS Server] Failed to start:', err);
  });
}
