import React, { useState } from 'react';
import {
  Bell,
  Scan,
  ShieldCheck,
  RefreshCw,
  Trash2,
  Search,
  LogOut,
  Users,
  ChevronDown,
  Database,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { UserRole, SystemNotification, User } from '../types.js';

interface NavbarProps {
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  unreadNotifCount: number;
  onOpenNotifications: () => void;
  onOpenBarcodeScanner: () => void;
  onResetData: () => void;
  onClearData?: () => void;
  globalSearch: string;
  setGlobalSearch: (q: string) => void;
  onSearchSubmit: (e: React.FormEvent) => void;
  loggedInUser?: User | null;
  onLogout?: () => void;
  pendingUsersCount?: number;
  onOpenUserManagement?: () => void;
  accounts?: User[];
  onSwitchAccount?: (account: User) => Promise<void> | void;
  impersonatedBy?: string | null;
  isSidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
  onOpenMobileSidebar?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentRole,
  onRoleChange,
  unreadNotifCount,
  onOpenNotifications,
  onOpenBarcodeScanner,
  onResetData,
  onClearData,
  globalSearch,
  setGlobalSearch,
  onSearchSubmit,
  loggedInUser,
  onLogout,
  pendingUsersCount = 0,
  onOpenUserManagement,
  accounts = [],
  onSwitchAccount,
  impersonatedBy,
  isSidebarCollapsed = false,
  onToggleSidebar,
  onOpenMobileSidebar,
}) => {
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const roles: UserRole[] = [
    'Super Admin',
    'Admin Inventory',
    'Petugas Laboratorium',
    'Manajemen',
    'Auditor',
  ];

  const isManagement = currentRole === 'Manajemen';
  const isSuperAdmin = currentRole === 'Super Admin';
  // Dropdown tetap tersedia untuk Super Admin, termasuk saat sedang
  // melihat database sebagai akun lain (impersonatedBy aktif), agar bisa
  // kembali ke akun asal atau berpindah ke akun lain tanpa logout.
  const canImpersonate = isSuperAdmin || !!impersonatedBy;

  const displayName = loggedInUser?.name || currentRole;
  const displayInitials = loggedInUser
    ? loggedInUser.name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()
    : currentRole.slice(0, 2).toUpperCase();

  const groupedAccounts = (() => {
    const byTenant: Record<string, User[]> = {};
    for (const a of accounts) {
      const key = (a as any).tenantName || a.unit || 'Lainnya';
      if (!byTenant[key]) byTenant[key] = [];
      byTenant[key].push(a);
    }
    return Object.entries(byTenant).map(([tenantName, accs]) => ({
      tenantName,
      tenantId: accs[0]?.tenantId,
      accounts: accs.sort((a, b) => a.name.localeCompare(b.name)),
    }));
  })();

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white px-3 md:px-6 shrink-0 shadow-xs">
      {/* Sidebar Toggle & Search Bar */}
      <div className="flex items-center space-x-2.5 flex-1 max-w-xl">
        {/* Mobile Hamburger Drawer Toggle Button */}
        <button
          onClick={onOpenMobileSidebar}
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100/90 text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors border border-slate-200/80 shrink-0 lg:hidden shadow-xs"
          title="Buka Menu Sidebar (Mobile)"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Desktop Sidebar Collapse Toggle Panel/Button */}
        <button
          onClick={onToggleSidebar}
          className="hidden lg:flex items-center space-x-2 rounded-xl bg-slate-100/90 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 border border-slate-200/80 transition-all shadow-xs shrink-0 group"
          title={isSidebarCollapsed ? 'Tampilkan Sidebar Penuh (Ctrl + B)' : 'Ciutkan Sidebar (Ctrl + B)'}
        >
          {isSidebarCollapsed ? (
            <>
              <PanelLeftOpen className="h-4 w-4 text-indigo-600 group-hover:scale-110 transition-transform" />
              <span className="text-slate-600 group-hover:text-indigo-700">Tampilkan Menu</span>
            </>
          ) : (
            <>
              <PanelLeftClose className="h-4 w-4 text-slate-500 group-hover:text-indigo-600 group-hover:scale-110 transition-transform" />
              <span className="text-slate-600 group-hover:text-indigo-700">Ciutkan Menu</span>
            </>
          )}
        </button>

        <form onSubmit={onSearchSubmit} className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={globalSearch}
            onChange={(e) => setGlobalSearch(e.target.value)}
            placeholder="Cari reagen, lot, barcode, atau supplier..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50/80 pl-9 pr-20 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
          />
          <button
            type="submit"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-lg bg-indigo-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-indigo-700 transition-colors shadow-xs"
          >
            Cari
          </button>
        </form>

        {/* Quick Barcode Button */}
        {!isManagement && (
          <button
            onClick={onOpenBarcodeScanner}
            className="hidden sm:flex items-center space-x-1.5 rounded-xl bg-indigo-50 text-indigo-700 px-3 py-2 text-xs font-semibold border border-indigo-100 hover:bg-indigo-100 transition-colors shrink-0"
          >
            <Scan className="h-4 w-4 text-indigo-600" />
            <span className="hidden xl:inline">Scan Barcode</span>
          </button>
        )}
      </div>

      {/* Right Controls */}
      <div className="flex items-center space-x-2 md:space-x-3 ml-4">
        {/* Clear Data Button (Super Admin Only) */}
        {onClearData && isSuperAdmin && (
          <button
            onClick={onClearData}
            title="Kosongkan Semua Data Transaksi, Stok & Lot (Super Admin Only)"
            className="flex items-center space-x-1.5 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 hover:text-rose-900 transition"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Kosongkan Data</span>
          </button>
        )}

        {/* Reset Data Button (Super Admin Only) */}
        {isSuperAdmin && (
          <button
            onClick={onResetData}
            title="Reset Data Demo Ke Seed Awal (Super Admin Only)"
            className="flex items-center space-x-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Reset Demo</span>
          </button>
        )}

        {/* Role Switcher Select (only show if no loggedInUser) */}
        {!loggedInUser && (
          <div className="flex items-center space-x-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-700">
            <ShieldCheck className="h-4 w-4 text-indigo-600 hidden sm:inline" />
            <span className="font-medium hidden lg:inline text-slate-500">Role:</span>
            <select
              value={currentRole}
              onChange={(e) => onRoleChange(e.target.value as UserRole)}
              className="bg-transparent font-semibold text-slate-800 focus:outline-none cursor-pointer py-1"
            >
              {roles.map((role) => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>
          </div>
        )}

        {/* Super Admin: Pending Users Badge */}
        {currentRole === 'Super Admin' && onOpenUserManagement && pendingUsersCount > 0 && (
          <button
            onClick={onOpenUserManagement}
            title={`${pendingUsersCount} permohonan akun baru menunggu persetujuan`}
            className="relative flex items-center space-x-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs font-bold text-amber-700 hover:bg-amber-100 transition animate-pulse"
          >
            <Users className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Pendaftar Baru</span>
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-black text-white">
              {pendingUsersCount}
            </span>
          </button>
        )}

        {/* LIHAT AKUN SEBAGAI (hanya Super Admin) */}
        {canImpersonate && onSwitchAccount && accounts.length > 0 && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setSwitcherOpen((o) => !o)}
              title="Lihat database akun tertentu (impersonasi)"
              className={`flex items-center space-x-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-bold transition ${
                impersonatedBy
                  ? 'border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100'
                  : 'border-indigo-300 bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
              }`}
            >
              <Database className="h-3.5 w-3.5" />
              <span className="hidden xl:inline">Lihat Akun Sebagai</span>
              <span className="truncate max-w-[140px]">{loggedInUser?.name || currentRole}</span>
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${switcherOpen ? 'rotate-180' : ''}`} />
            </button>
            {switcherOpen && (
              <div
                className="absolute right-0 mt-2 w-[320px] rounded-2xl border border-slate-200 bg-white shadow-2xl z-40 animate-fade-in"
                onMouseLeave={() => setSwitcherOpen(false)}
              >
                <div className="border-b border-slate-100 px-4 py-3 bg-slate-50 rounded-t-2xl">
                  <p className="text-[11px] font-black uppercase tracking-wider text-slate-500">Lihat Akun Sebagai</p>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    Buka database tenant lain untuk melakukan operasi lintas unit.
                  </p>
                </div>
                <div className="max-h-[420px] overflow-y-auto py-1">
                  {groupedAccounts.map((group) => (
                    <div key={group.tenantId || group.tenantName} className="py-1">
                      <div className="flex items-center space-x-1.5 px-4 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400">
                        <Database className="h-3 w-3" />
                        <span>{group.tenantName}</span>
                      </div>
                      {group.accounts.map((acc) => {
                        const isCurrent = acc.id === loggedInUser?.id;
                        return (
                          <button
                            key={acc.id}
                            type="button"
                            disabled={isCurrent}
                            onClick={() => {
                              setSwitcherOpen(false);
                              onSwitchAccount(acc);
                            }}
                            className={`w-full text-left px-4 py-2 flex items-center justify-between hover:bg-slate-50 transition ${
                              isCurrent ? 'bg-indigo-50/60' : ''
                            }`}
                          >
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-900 truncate">{acc.name}</p>
                              <p className="text-[10px] text-slate-500 font-mono">
                                @{acc.username} · {acc.role}
                              </p>
                            </div>
                            {isCurrent && (
                              <span className="shrink-0 text-[9px] font-black uppercase tracking-wider text-indigo-700 bg-indigo-100 border border-indigo-200 rounded-md px-1.5 py-0.5">
                                Aktif
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
                {impersonatedBy && (
                  <div className="border-t border-slate-100 px-4 py-2.5 bg-rose-50 rounded-b-2xl text-[11px] text-rose-700">
                    Sedang melihat database sebagai akun lain (asal login: <strong>{impersonatedBy}</strong>). Pilih baris <em>Aktif</em> untuk kembali ke akun Anda.
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Notification Bell */}
        <button
          onClick={onOpenNotifications}
          className="relative rounded-lg border border-slate-200 bg-slate-50 p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition"
          title="Notifikasi Sistem"
        >
          <Bell className="h-5 w-5" />
          {unreadNotifCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-xs">
              {unreadNotifCount}
            </span>
          )}
        </button>

        {/* Active User Avatar + Logout */}
        <div className="hidden sm:flex items-center space-x-2 border-l border-slate-200 pl-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-indigo-600 text-xs font-black text-white shadow-sm">
            {displayInitials}
          </div>
          <div className="hidden lg:block text-left">
            <p className="text-xs font-semibold text-slate-800 leading-tight truncate max-w-[120px]">{displayName}</p>
            <p className="text-[10px] text-slate-500">{loggedInUser?.role || currentRole}</p>
          </div>
          {onLogout && (
            <button
              onClick={onLogout}
              title="Keluar dari Sistem"
              className="rounded-lg p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
            >
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
