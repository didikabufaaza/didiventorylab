import React, { useState, useEffect } from 'react';
import { Users, UserCheck, Clock, Shield, CheckCircle2, XCircle, Edit2, Trash2, RefreshCw, Search, ChevronDown, Eye, EyeOff, AlertTriangle, Database, UserPlus } from 'lucide-react';
import { User, PendingUser, UserRole, TenantInfo } from '../../types.js';
import {
  getPendingUsersApi,
  approvePendingUserApi,
  rejectPendingUserApi,
  getAllUsersApi,
  updateUserApi,
  deleteUserApi,
  fetchTenantsApi,
  createAccountApi,
  fetchDbStatusApi,
  testDbConnectionApi,
  migrateDatabaseApi,
} from '../../lib/api.js';

const ALL_ROLES: UserRole[] = [
  'Super Admin',
  'Admin Inventory',
  'Petugas Laboratorium',
  'Manajemen',
  'Auditor',
];

const roleColors: Record<UserRole, string> = {
  'Super Admin': 'bg-rose-100 text-rose-800 border-rose-200',
  'Admin Inventory': 'bg-teal-100 text-teal-800 border-teal-200',
  'Petugas Laboratorium': 'bg-blue-100 text-blue-800 border-blue-200',
  'Manajemen': 'bg-purple-100 text-purple-800 border-purple-200',
  'Auditor': 'bg-amber-100 text-amber-800 border-amber-200',
};

interface UserManagementPanelProps {
  onDataChange?: () => void;
}

export const UserManagementPanel: React.FC<UserManagementPanelProps> = ({ onDataChange }) => {
  const [tab, setTab] = useState<'active' | 'pending'>('pending');
  const [users, setUsers] = useState<User[]>([]);
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [tenants, setTenants] = useState<TenantInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  // DB Adapter & Integration state
  const [dbStatus, setDbStatus] = useState<any>(null);
  const [isDbModalOpen, setIsDbModalOpen] = useState(false);
  const [testConnUrl, setTestConnUrl] = useState('');
  const [testConnLoading, setTestConnLoading] = useState(false);
  const [testConnResult, setTestConnResult] = useState<any>(null);
  const [migrating, setMigrating] = useState(false);
  const [migrateMsg, setMigrateMsg] = useState('');

  // Approve modal
  const [approveTarget, setApproveTarget] = useState<PendingUser | null>(null);
  const [approveRole, setApproveRole] = useState<UserRole>('Petugas Laboratorium');
  const [approveTenantId, setApproveTenantId] = useState<string>('');

  // Create account modal
  const [createOpen, setCreateOpen] = useState(false);
  const [createTenantId, setCreateTenantId] = useState<string>('');
  const [createName, setCreateName] = useState('');
  const [createUsername, setCreateUsername] = useState('');
  const [createEmail, setCreateEmail] = useState('');
  const [createUnit, setCreateUnit] = useState('');
  const [createRole, setCreateRole] = useState<UserRole>('Petugas Laboratorium');
  const [createPassword, setCreatePassword] = useState('');
  const [showCreatePwd, setShowCreatePwd] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createLoading, setCreateLoading] = useState(false);

  // Edit user modal & states
  const [editTarget, setEditTarget] = useState<User | null>(null);
  const [editName, setEditName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editUnit, setEditUnit] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('Petugas Laboratorium');
  const [editStatus, setEditStatus] = useState<'Aktif' | 'Nonaktif'>('Aktif');
  const [editTenantId, setEditTenantId] = useState<string>('');
  const [editPassword, setEditPassword] = useState('');
  const [showEditPwd, setShowEditPwd] = useState(false);
  const [editError, setEditError] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  // Delete modal
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Reject target
  const [rejectTarget, setRejectTarget] = useState<PendingUser | null>(null);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [u, p, t, dbs] = await Promise.all([
        getAllUsersApi(),
        getPendingUsersApi(),
        fetchTenantsApi(),
        fetchDbStatusApi().catch(() => null),
      ]);
      setUsers(u);
      setPendingUsers(p);
      setTenants(t);
      if (dbs) setDbStatus(dbs);
    } catch { /* silent */ }
    setLoading(false);
  };

  const handleTestConnection = async () => {
    if (!testConnUrl.trim()) return;
    setTestConnLoading(true);
    setTestConnResult(null);
    try {
      const res = await testDbConnectionApi(testConnUrl.trim());
      setTestConnResult(res);
    } catch (err: any) {
      setTestConnResult({ ok: false, error: err.message || 'Gagal menguji koneksi.' });
    } finally {
      setTestConnLoading(false);
    }
  };

  const handleMigrate = async () => {
    setMigrating(true);
    setMigrateMsg('');
    try {
      const res = await migrateDatabaseApi();
      setMigrateMsg(res.message);
      await loadAll();
    } catch (err: any) {
      setMigrateMsg(`Gagal migrasi: ${err.message}`);
    } finally {
      setMigrating(false);
    }
  };

  useEffect(() => {
    loadAll();
    const interval = setInterval(loadAll, 3000);
    return () => clearInterval(interval);
  }, []);

  const tenantNameById = (id?: string) => tenants.find((t) => t.id === id)?.name || '-';

  const handleApprove = async () => {
    if (!approveTarget) return;
    try {
      await approvePendingUserApi(approveTarget.id, approveRole, approveTenantId || undefined);
      setApproveTarget(null);
      await loadAll();
      onDataChange?.();
    } catch (err: any) {
      alert(err.message || 'Gagal menyetujui akun');
    }
  };

  const handleReject = async () => {
    if (!rejectTarget) return;
    try {
      await rejectPendingUserApi(rejectTarget.id);
      setRejectTarget(null);
      await loadAll();
      onDataChange?.();
    } catch (err: any) {
      alert(err.message || 'Gagal menolak permohonan akun');
    }
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;
    setEditError('');
    setEditLoading(true);
    try {
      await updateUserApi(editTarget.id, {
        name: editName.trim(),
        username: editUsername.trim(),
        email: editEmail.trim(),
        unit: editUnit.trim(),
        role: editRole,
        status: editStatus,
        tenantId: editTenantId || undefined,
        password: editPassword.trim() !== '' ? editPassword : undefined,
      });
      setEditTarget(null);
      await loadAll();
      onDataChange?.();
    } catch (err: any) {
      setEditError(err.message || 'Gagal memperbarui user');
    } finally {
      setEditLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await deleteUserApi(deleteTarget.id);
      setDeleteTarget(null);
      await loadAll();
      onDataChange?.();
    } catch (err: any) {
      alert(err.message || 'Gagal menghapus user');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');
    setCreateLoading(true);
    try {
      await createAccountApi({
        tenantId: createTenantId,
        name: createName.trim(),
        username: createUsername.trim(),
        email: createEmail.trim(),
        unit: createUnit.trim() || undefined,
        role: createRole,
        password: createPassword || 'password123',
        status: 'Aktif',
      });
      setCreateOpen(false);
      setCreateName(''); setCreateUsername(''); setCreateEmail(''); setCreateUnit(''); setCreatePassword(''); setCreateRole('Petugas Laboratorium');
      await loadAll();
      onDataChange?.();
    } catch (err: any) {
      setCreateError(err.message || 'Gagal menambah akun');
    } finally {
      setCreateLoading(false);
    }
  };

  const openEditModal = (u: User) => {
    setEditTarget(u);
    setEditName(u.name);
    setEditUsername(u.username);
    setEditEmail(u.email);
    setEditUnit(u.unit);
    setEditRole(u.role);
    setEditStatus(u.status);
    setEditTenantId(u.tenantId || '');
    setEditPassword('');
    setShowEditPwd(false);
    setEditError('');
  };

  const filteredUsers = users.filter((u) => {
    const q = search.toLowerCase();
    const tenant = tenantNameById(u.tenantId).toLowerCase();
    return (
      u.name.toLowerCase().includes(q) ||
      u.username.toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q) ||
      u.unit.toLowerCase().includes(q) ||
      tenant.includes(q)
    );
  });

  const filteredPending = pendingUsers.filter((p) => {
    const q = search.toLowerCase();
    return p.name.toLowerCase().includes(q) || p.username.toLowerCase().includes(q) || p.unit.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-slate-900 flex items-center space-x-2">
            <Users className="h-5 w-5 text-indigo-600" />
            <span>Manajemen User & Akses</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Kelola akun pengguna, peran, dan permohonan registrasi baru</p>
        </div>
        <div className="flex items-center space-x-2">
          {/* Database Provider Status Badge Button */}
          <button
            type="button"
            onClick={() => setIsDbModalOpen(true)}
            className="flex items-center space-x-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-800 hover:bg-blue-100 transition shadow-xs"
            title="Buka Pengaturan & Integrasi Database (Neon DB / Supabase / Postgres)"
          >
            <Database className="h-3.5 w-3.5 text-blue-600" />
            <span>DB: {dbStatus?.providerLabel || 'Local JSON'}</span>
            <span className={`inline-block w-2 h-2 rounded-full ${dbStatus?.ok ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
          </button>

          <button
            type="button"
            onClick={() => {
              setCreateTenantId(tenants[0]?.id || '');
              setCreateOpen(true);
            }}
            disabled={tenants.length === 0}
            className="flex items-center space-x-1.5 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-bold text-white hover:bg-indigo-700 transition disabled:opacity-60"
          >
            <UserPlus className="h-3.5 w-3.5" />
            <span>Tambah Akun</span>
          </button>
          <button onClick={loadAll} className="flex items-center space-x-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center space-x-1 border-b border-slate-200">
        <button
          onClick={() => setTab('pending')}
          className={`relative px-4 py-2.5 text-xs font-bold transition-colors ${tab === 'pending' ? 'text-indigo-700 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <span className="flex items-center space-x-2">
            <Clock className="h-3.5 w-3.5" />
            <span>Pending Approval</span>
            {pendingUsers.length > 0 && (
              <span className="inline-flex items-center justify-center rounded-full bg-rose-600 px-1.5 py-0.5 text-[10px] font-black text-white min-w-[18px]">
                {pendingUsers.length}
              </span>
            )}
          </span>
        </button>
        <button
          onClick={() => setTab('active')}
          className={`px-4 py-2.5 text-xs font-bold transition-colors ${tab === 'active' ? 'text-indigo-700 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <span className="flex items-center space-x-2">
            <UserCheck className="h-3.5 w-3.5" />
            <span>User Aktif ({users.length})</span>
          </span>
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari nama, username, unit, atau peran..."
          className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-4 py-2.5 text-xs font-medium text-slate-700 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 transition-all"
        />
      </div>

      {/* === PENDING APPROVAL TAB === */}
      {tab === 'pending' && (
        <div>
          {filteredPending.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <UserCheck className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">Tidak ada permohonan pendaftaran baru</p>
              <p className="text-xs mt-1 opacity-70">Semua permintaan akses telah diproses</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredPending.map((p) => (
                <div key={p.id} className="flex items-start justify-between rounded-2xl border border-amber-200/60 bg-amber-50/40 p-4">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-black text-sm border border-amber-200">
                      {p.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">{p.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        <span className="font-mono text-slate-600">@{p.username}</span> · {p.email}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">Unit: <strong>{p.unit}</strong></p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Database cocok:{' '}
                        <strong className="text-indigo-700">
                          {tenants.find((t) => (t.unit || '').toLowerCase() === (p.unit || '').toLowerCase())?.name || '(tidak cocok, pilih saat setujui)'}
                        </strong>
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Peran diminta:{' '}
                        <span className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-bold ${roleColors[p.requestedRole]}`}>
                          {p.requestedRole}
                        </span>
                      </p>
                      <p className="text-[11px] text-slate-400 mt-1.5">
                        Mendaftar: {new Date(p.registeredAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col space-y-2 flex-shrink-0 ml-3">
                    <button
                      onClick={() => {
                        setApproveTarget(p);
                        setApproveRole(p.requestedRole);
                        const matched = tenants.find(
                          (t) => (t.unit || '').toLowerCase() === (p.unit || '').toLowerCase()
                        );
                        setApproveTenantId(matched?.id || p.tenantId || '');
                      }}
                      className="flex items-center space-x-1.5 rounded-xl bg-teal-600 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-teal-700 transition"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Setujui</span>
                    </button>
                    <button
                      onClick={() => setRejectTarget(p)}
                      className="flex items-center space-x-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-[11px] font-bold text-rose-700 hover:bg-rose-100 transition"
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      <span>Tolak</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* === ACTIVE USERS TAB === */}
      {tab === 'active' && (
        <div className="overflow-auto rounded-2xl border border-slate-200 bg-white">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 font-black text-slate-600 uppercase tracking-wider text-[10px]">Nama</th>
                <th className="px-4 py-3 font-black text-slate-600 uppercase tracking-wider text-[10px]">Username</th>
                <th className="px-4 py-3 font-black text-slate-600 uppercase tracking-wider text-[10px]">Database</th>
                <th className="px-4 py-3 font-black text-slate-600 uppercase tracking-wider text-[10px]">Peran</th>
                <th className="px-4 py-3 font-black text-slate-600 uppercase tracking-wider text-[10px]">Status</th>
                <th className="px-4 py-3 font-black text-slate-600 uppercase tracking-wider text-[10px] text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/80 transition">
                  <td className="px-4 py-3 font-semibold text-slate-900">{u.name}</td>
                  <td className="px-4 py-3 font-mono text-slate-600">@{u.username}</td>
                  <td className="px-4 py-3 text-slate-600">
                    <span className="inline-flex items-center space-x-1 rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-700">
                      <Database className="h-3 w-3" />
                      <span>{tenantNameById(u.tenantId)}</span>
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-bold ${roleColors[u.role]}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${u.status === 'Aktif' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'}`}>
                      {u.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right space-x-1.5 whitespace-nowrap">
                    <button
                      onClick={() => openEditModal(u)}
                      className="inline-flex items-center space-x-1 rounded-lg bg-indigo-50 border border-indigo-200 px-2 py-1 text-[11px] font-bold text-indigo-700 hover:bg-indigo-100 transition"
                    >
                      <Edit2 className="h-3 w-3" />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => setDeleteTarget(u)}
                      className="inline-flex items-center space-x-1 rounded-lg bg-rose-50 border border-rose-200 px-2 py-1 text-[11px] font-bold text-rose-700 hover:bg-rose-100 transition"
                    >
                      <Trash2 className="h-3 w-3" />
                      <span>Hapus</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* === APPROVE MODAL === */}
      {approveTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-teal-100 mx-auto">
              <UserCheck className="h-6 w-6 text-teal-700" />
            </div>
            <div className="text-center">
              <h3 className="font-bold text-slate-900 text-base">Setujui Pendaftaran</h3>
              <p className="text-xs text-slate-500 mt-1">Tentukan peran dan database untuk <strong>{approveTarget.name}</strong></p>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Database / Tenant *</label>
              <div className="relative">
                <select
                  value={approveTenantId}
                  onChange={(e) => setApproveTenantId(e.target.value)}
                  className="w-full appearance-none rounded-xl border border-slate-300 px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all pr-8"
                >
                  <option value="">-- Pilih database --</option>
                  {tenants.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Tetapkan Peran *</label>
              <div className="relative">
                <select
                  value={approveRole}
                  onChange={(e) => setApproveRole(e.target.value as UserRole)}
                  className="w-full appearance-none rounded-xl border border-slate-300 px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all pr-8"
                >
                  {ALL_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              </div>
            </div>
            <div className="flex space-x-2">
              <button onClick={handleApprove} disabled={!approveTenantId} className="flex-1 rounded-xl bg-teal-600 py-2.5 text-xs font-bold text-white hover:bg-teal-700 transition disabled:opacity-60">
                Konfirmasi & Setujui
              </button>
              <button onClick={() => setApproveTarget(null)} className="flex-1 rounded-xl border border-slate-300 bg-white py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition">
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* === REJECT MODAL === */}
      {rejectTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl text-center space-y-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-rose-100 mx-auto">
              <XCircle className="h-6 w-6 text-rose-600" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Tolak Pendaftaran?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Akun <strong>{rejectTarget.name}</strong> (<span className="font-mono">@{rejectTarget.username}</span>) akan ditolak dan dihapus dari daftar.
              </p>
            </div>
            <div className="flex space-x-2">
              <button onClick={handleReject} className="flex-1 rounded-xl bg-rose-600 py-2.5 text-xs font-bold text-white hover:bg-rose-700 transition">
                Ya, Tolak Pendaftaran
              </button>
              <button onClick={() => setRejectTarget(null)} className="flex-1 rounded-xl border border-slate-300 bg-white py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition">
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* === DELETE USER MODAL === */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl text-center space-y-4 animate-scale-in">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-rose-100 mx-auto">
              <AlertTriangle className="h-6 w-6 text-rose-600" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Hapus Akun Pengguna?</h3>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                Apakah Anda yakin ingin menghapus user <strong>{deleteTarget.name}</strong> (<span className="font-mono">@{deleteTarget.username}</span>)? Tindakan ini tidak dapat dibatalkan.
              </p>
            </div>
            <div className="flex space-x-2 pt-2">
              <button
                disabled={deleteLoading}
                onClick={handleDeleteUser}
                className="flex-1 rounded-xl bg-rose-600 py-2.5 text-xs font-bold text-white hover:bg-rose-700 transition disabled:opacity-60"
              >
                {deleteLoading ? 'Menghapus...' : 'Ya, Hapus Akun'}
              </button>
              <button
                disabled={deleteLoading}
                onClick={() => setDeleteTarget(null)}
                className="flex-1 rounded-xl border border-slate-300 bg-white py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition disabled:opacity-60"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* === EDIT USER MODAL (FIXED & EXPANDED) === */}
      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-fade-in overflow-y-auto">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4 my-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <Shield className="h-5 w-5 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-base">Edit Informasi & Akses User</h3>
              </div>
              <button onClick={() => setEditTarget(null)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            {editError && (
              <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 px-3.5 py-2.5">
                <p className="text-xs text-rose-600 font-medium">{editError}</p>
              </div>
            )}

            <form onSubmit={handleEditUser} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 space-y-1">
                  <label className="block text-xs font-bold text-slate-700">Nama Lengkap *</label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-xs font-semibold text-slate-900"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">Username *</label>
                  <input
                    type="text"
                    required
                    value={editUsername}
                    onChange={(e) => setEditUsername(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-xs font-mono text-slate-900"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">Email *</label>
                  <input
                    type="email"
                    required
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-xs font-semibold text-slate-900"
                  />
                </div>
                <div className="col-span-2 space-y-1">
                  <label className="block text-xs font-bold text-slate-700">Database / Tenant *</label>
                  <div className="relative">
                    <select
                      value={editTenantId}
                      onChange={(e) => setEditTenantId(e.target.value)}
                      className="w-full appearance-none rounded-xl border border-slate-300 pl-3 pr-8 py-2.5 text-xs font-bold text-slate-900"
                    >
                      <option value="">-- Pilih database --</option>
                      {tenants.map((t) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>
                <div className="col-span-2 space-y-1">
                  <label className="block text-xs font-bold text-slate-700">Unit Kerja *</label>
                  <input
                    type="text"
                    required
                    value={editUnit}
                    onChange={(e) => setEditUnit(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-xs font-semibold text-slate-900"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">Peran / Role *</label>
                  <div className="relative">
                    <select
                      value={editRole}
                      onChange={(e) => setEditRole(e.target.value as UserRole)}
                      className="w-full appearance-none rounded-xl border border-slate-300 pl-3 pr-8 py-2.5 text-xs font-bold text-slate-900"
                    >
                      {ALL_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">Status Akun *</label>
                  <div className="relative">
                    <select
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value as 'Aktif' | 'Nonaktif')}
                      className="w-full appearance-none rounded-xl border border-slate-300 pl-3 pr-8 py-2.5 text-xs font-bold text-slate-900"
                    >
                      <option value="Aktif">Aktif</option>
                      <option value="Nonaktif">Nonaktif</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>
                <div className="col-span-2 space-y-1">
                  <label className="block text-xs font-bold text-slate-700">Ganti Password (Opsional)</label>
                  <div className="relative">
                    <input
                      type={showEditPwd ? 'text' : 'password'}
                      value={editPassword}
                      onChange={(e) => setEditPassword(e.target.value)}
                      placeholder="Kosongkan jika tidak ingin mengubah"
                      className="w-full rounded-xl border border-slate-300 p-2.5 pr-10 text-xs font-semibold placeholder:text-slate-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShowEditPwd(!showEditPwd)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showEditPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="submit"
                  disabled={editLoading}
                  className="flex-1 rounded-xl bg-indigo-600 py-2.5 text-xs font-bold text-white hover:bg-indigo-700 transition disabled:opacity-60"
                >
                  {editLoading ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditTarget(null)}
                  className="flex-1 rounded-xl border border-slate-300 bg-white py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
                >
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* === CREATE ACCOUNT MODAL === */}
      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-fade-in overflow-y-auto">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4 my-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <UserPlus className="h-5 w-5 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-base">Tambah Akun Baru</h3>
              </div>
              <button onClick={() => setCreateOpen(false)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            {createError && (
              <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 px-3.5 py-2.5">
                <p className="text-xs text-rose-600 font-medium">{createError}</p>
              </div>
            )}

            <form onSubmit={handleCreateAccount} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 space-y-1">
                  <label className="block text-xs font-bold text-slate-700">Database / Tenant *</label>
                  <div className="relative">
                    <select
                      required
                      value={createTenantId}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCreateTenantId(val);
                        const selectedT = tenants.find((t) => t.id === val);
                        if (selectedT) setCreateUnit(selectedT.unit || selectedT.name);
                      }}
                      className="w-full appearance-none rounded-xl border border-slate-300 pl-3 pr-8 py-2.5 text-xs font-bold text-slate-900"
                    >
                      <option value="">-- Pilih database --</option>
                      {tenants.map((t) => (
                        <option key={t.id} value={t.id}>{t.name} ({t.unit})</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>
                <div className="col-span-2 space-y-1">
                  <label className="block text-xs font-bold text-slate-700">Nama Lengkap *</label>
                  <input
                    type="text"
                    required
                    value={createName}
                    onChange={(e) => setCreateName(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-xs font-semibold text-slate-900"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">Username *</label>
                  <input
                    type="text"
                    required
                    value={createUsername}
                    onChange={(e) => setCreateUsername(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-xs font-mono text-slate-900"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">Email *</label>
                  <input
                    type="email"
                    required
                    value={createEmail}
                    onChange={(e) => setCreateEmail(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-xs font-semibold text-slate-900"
                  />
                </div>
                <div className="col-span-2 space-y-1">
                  <label className="block text-xs font-bold text-slate-700">Unit Kerja (display)</label>
                  <input
                    type="text"
                    value={createUnit}
                    onChange={(e) => setCreateUnit(e.target.value)}
                    placeholder="(Otomatis dari nama tenant jika kosong)"
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-xs font-semibold text-slate-900"
                  />
                </div>
                <div className="col-span-2 space-y-1">
                  <label className="block text-xs font-bold text-slate-700">Peran / Role *</label>
                  <div className="relative">
                    <select
                      value={createRole}
                      onChange={(e) => setCreateRole(e.target.value as UserRole)}
                      className="w-full appearance-none rounded-xl border border-slate-300 pl-3 pr-8 py-2.5 text-xs font-bold text-slate-900"
                    >
                      {ALL_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>
                <div className="col-span-2 space-y-1">
                  <label className="block text-xs font-bold text-slate-700">Password (default: password123)</label>
                  <div className="relative">
                    <input
                      type={showCreatePwd ? 'text' : 'password'}
                      value={createPassword}
                      onChange={(e) => setCreatePassword(e.target.value)}
                      placeholder="password123"
                      className="w-full rounded-xl border border-slate-300 p-2.5 pr-10 text-xs font-semibold placeholder:text-slate-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCreatePwd(!showCreatePwd)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showCreatePwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="submit"
                  disabled={createLoading}
                  className="flex-1 rounded-xl bg-indigo-600 py-2.5 text-xs font-bold text-white hover:bg-indigo-700 transition disabled:opacity-60"
                >
                  {createLoading ? 'Menyimpan...' : 'Simpan Akun'}
                </button>
                <button
                  type="button"
                  onClick={() => setCreateOpen(false)}
                  className="flex-1 rounded-xl border border-slate-300 bg-white py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
                >
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Database Integration & Status Modal (Neon DB / Supabase / Postgres) */}
      {isDbModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl border border-slate-200 p-6 space-y-5 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-xl bg-blue-100 text-blue-700">
                  <Database className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Integrasi Database Multi-Provider</h3>
                  <p className="text-xs text-slate-500">Neon DB, Supabase, Insforge Dev, & PostgreSQL Generic</p>
                </div>
              </div>
              <button
                onClick={() => setIsDbModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>

            {/* Current Active DB Card */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Status Provider Aktif</span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${dbStatus?.ok ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                  {dbStatus?.ok ? '● AKTIF & TERHUBUNG' : '● GAGAL / UNREACHABLE'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-500 font-medium block">Provider Engine:</span>
                  <span className="font-bold text-indigo-700 text-sm">{dbStatus?.providerLabel || 'Local JSON Storage'}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-medium block">Koneksi Latensi:</span>
                  <span className="font-mono font-bold text-slate-900">{dbStatus?.latencyMs || 0} ms</span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-500 font-medium block">String Koneksi (Masked):</span>
                  <span className="font-mono text-[11px] bg-white px-2 py-1 rounded border border-slate-200 text-slate-700 block truncate">
                    {dbStatus?.connectionStringMasked || 'File: ./data/*.json'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 font-medium block">Jumlah Database Tenant:</span>
                  <span className="font-bold text-slate-900">{dbStatus?.tenantCount || 0} Tenant</span>
                </div>
                <div>
                  <span className="text-slate-500 font-medium block">Jumlah Akun User:</span>
                  <span className="font-bold text-slate-900">{dbStatus?.accountCount || 0} Akun</span>
                </div>
              </div>
            </div>

            {/* Test Connection Input */}
            <div className="space-y-2 border-t border-slate-100 pt-3">
              <label className="block text-xs font-bold text-slate-800">
                Uji Koneksi Connection String Baru (Neon DB / Supabase / Postgres)
              </label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={testConnUrl}
                  onChange={(e) => setTestConnUrl(e.target.value)}
                  placeholder="postgresql://neondb_owner:password@ep-xxx.neon.tech/neondb?sslmode=require"
                  className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-xs font-mono text-slate-900"
                />
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={testConnLoading || !testConnUrl.trim()}
                  className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 transition disabled:opacity-60 shrink-0"
                >
                  {testConnLoading ? 'Menguji...' : 'Uji Koneksi'}
                </button>
              </div>

              {testConnResult && (
                <div className={`rounded-xl p-3 text-xs font-medium border ${testConnResult.ok ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>
                  {testConnResult.ok ? (
                    <div>
                      <strong>✓ Koneksi Sukses!</strong> Engine detected: <strong>{testConnResult.providerLabel}</strong> ({testConnResult.latencyMs}ms).
                    </div>
                  ) : (
                    <div>
                      <strong>❌ Gagal Terhubung:</strong> {testConnResult.error || testConnResult.details}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 1-Click Migration Button */}
            <div className="border-t border-slate-100 pt-3 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Sinkronisasi & Migrasi Data</h4>
                  <p className="text-[11px] text-slate-500">Salin seluruh data tenant & akun lokal ke database PostgreSQL aktif</p>
                </div>
                <button
                  type="button"
                  onClick={handleMigrate}
                  disabled={migrating}
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition disabled:opacity-60"
                >
                  {migrating ? 'Memigrasikan...' : 'Jalankan Migrasi'}
                </button>
              </div>

              {migrateMsg && (
                <div className="rounded-xl bg-blue-50 border border-blue-200 p-3 text-xs font-medium text-blue-900">
                  {migrateMsg}
                </div>
              )}
            </div>

            {/* Configuration Guide */}
            <div className="rounded-xl bg-amber-50/70 border border-amber-200 p-3.5 text-xs text-amber-900 space-y-1.5">
              <span className="font-bold block">💡 Panduan Integrasi Cepat `.env`:</span>
              <p>1. Salin connection string dari <strong>Neon DB Dashboard</strong> atau <strong>Supabase Settings</strong>.</p>
              <p>2. Buka file <code className="font-mono bg-amber-100 px-1 rounded">.env</code> di root project, lalu isi variable <code className="font-mono bg-amber-100 px-1 rounded">DATABASE_URL="..."</code>.</p>
              <p>3. Restart server backend (<code className="font-mono bg-amber-100 px-1 rounded">npm run dev</code>). Sistem akan otomatis mendeteksi dan menggunakan PostgreSQL!</p>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsDbModalOpen(false)}
                className="rounded-xl bg-slate-900 px-5 py-2 text-xs font-bold text-white hover:bg-slate-800 transition"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
