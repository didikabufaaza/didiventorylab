import React from 'react';
import {
  LayoutDashboard,
  Package,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  ClipboardCheck,
  ShoppingBag,
  Truck,
  FlaskConical,
  Layers,
  MapPin,
  Cpu,
  FileSpreadsheet,
  History,
  AlertCircle,
  Menu,
  X,
  ChevronRight,
  ChevronLeft,
  PanelLeftClose,
  PanelLeftOpen,
  Boxes,
  ShieldCheck,
  FileText,
  LogOut,
} from 'lucide-react';
import { UserRole } from '../types.js';

export type ActiveTab =
  | 'dashboard'
  | 'reagents'
  | 'batches'
  | 'stock-in'
  | 'reagent-out'
  | 'transfer'
  | 'stock-opname'
  | 'purchase-orders'
  | 'suppliers'
  | 'locations'
  | 'analyzers'
  | 'letterhead'
  | 'reports'
  | 'audit-trail'
  | 'user-management';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  userRole: UserRole;
  expiredCount: number;
  lowStockCount: number;
  isOpenMobile: boolean;
  setIsOpenMobile: (open: boolean) => void;
  isCollapsed?: boolean;
  setIsCollapsed?: (collapsed: boolean | ((prev: boolean) => boolean)) => void;
  onLogout?: () => void;
}

interface NavItem {
  id: ActiveTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  badgeAlert?: number;
  highlight?: boolean;
}

// Permissions per role: menu yang boleh diakses
export const ROLE_MENU_ACCESS: Record<UserRole, ActiveTab[]> = {
  'Super Admin': [
    'dashboard', 'reagent-out', 'stock-in', 'batches', 'transfer', 'stock-opname',
    'purchase-orders', 'suppliers', 'letterhead',
    'reagents', 'locations', 'analyzers',
    'reports', 'audit-trail', 'user-management',
  ],
  'Admin Inventory': [
    'dashboard', 'reagent-out', 'stock-in', 'batches', 'transfer', 'stock-opname',
    'purchase-orders', 'suppliers', 'letterhead',
    'reagents', 'locations', 'analyzers',
    'reports', 'audit-trail',
  ],
  'Petugas Laboratorium': [
    'dashboard', 'reagent-out', 'batches', 'stock-opname',
    'reports',
  ],
  'Manajemen': [
    'dashboard', 'purchase-orders',
  ],
  'Auditor': [
    'dashboard', 'batches', 'reports', 'audit-trail',
  ],
};

export const SIDEBAR_DEFAULT_TAB: Record<UserRole, ActiveTab> = {
  'Super Admin': 'dashboard',
  'Admin Inventory': 'dashboard',
  'Petugas Laboratorium': 'dashboard',
  'Manajemen': 'dashboard',
  'Auditor': 'dashboard',
};

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  userRole,
  expiredCount,
  lowStockCount,
  isOpenMobile,
  setIsOpenMobile,
  isCollapsed = false,
  setIsCollapsed,
  onLogout,
}) => {
  const allowedTabs = ROLE_MENU_ACCESS[userRole] || ROLE_MENU_ACCESS['Auditor'];

  const allNavItems: { group: string; items: NavItem[] }[] = [
    {
      group: 'UTAMA',
      items: [
        { id: 'dashboard' as ActiveTab, label: 'Dashboard', icon: LayoutDashboard },
      ],
    },
    {
      group: 'INVENTORY & STOK',
      items: [
        { id: 'reagent-out' as ActiveTab, label: 'Reagen OUT (Keluar)', icon: ArrowUpRight, badge: 'POS' },
        { id: 'stock-in' as ActiveTab, label: 'Reagen IN (Masuk)', icon: ArrowDownLeft },
        { id: 'batches' as ActiveTab, label: 'Stok Lot & Stability', icon: Boxes, badgeAlert: expiredCount > 0 ? expiredCount : undefined },
        { id: 'transfer' as ActiveTab, label: 'Transfer Lokasi', icon: ArrowLeftRight },
        { id: 'stock-opname' as ActiveTab, label: 'Stock Opname', icon: ClipboardCheck },
      ],
    },
    {
      group: 'PENGADAAN & SUPPLIER',
      items: [
        { id: 'purchase-orders' as ActiveTab, label: 'Purchase Order (PO)', icon: ShoppingBag },
        { id: 'suppliers' as ActiveTab, label: 'Master Supplier', icon: Truck },
        { id: 'letterhead' as ActiveTab, label: 'Pengaturan Kop Surat', icon: FileText },
      ],
    },
    {
      group: 'MASTER DATA',
      items: [
        { id: 'reagents' as ActiveTab, label: 'Master Reagen', icon: FlaskConical, badgeAlert: lowStockCount > 0 ? lowStockCount : undefined },
        { id: 'locations' as ActiveTab, label: 'Lokasi Penyimpanan', icon: MapPin },
        { id: 'analyzers' as ActiveTab, label: 'Analyzer & Parameter', icon: Cpu },
      ],
    },
    {
      group: 'ANALISIS & AUDIT',
      items: [
        { id: 'reports' as ActiveTab, label: 'Laporan Lengkap', icon: FileSpreadsheet, highlight: true },
        { id: 'audit-trail' as ActiveTab, label: 'Audit Trail & Log', icon: History },
        { id: 'user-management' as ActiveTab, label: 'Manajemen User', icon: ShieldCheck },
      ],
    },
  ];

  // Filter menu berdasarkan role pengguna
  const navItems = allNavItems
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => allowedTabs.includes(item.id as ActiveTab)),
    }))
    .filter((group) => group.items.length > 0);

  const handleSelect = (tab: ActiveTab) => {
    setActiveTab(tab);
    setIsOpenMobile(false);
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          onClick={() => setIsOpenMobile(false)}
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs lg:hidden transition-opacity"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 flex flex-col border-r border-slate-800 bg-slate-900 text-slate-300 transition-all duration-300 ease-in-out lg:static lg:translate-x-0 ${
          isCollapsed ? 'lg:w-20' : 'lg:w-64'
        } w-64 ${isOpenMobile ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}`}
      >
        {/* Brand Header */}
        <div className="flex h-16 items-center justify-between border-b border-slate-800 px-4 shrink-0">
          <div className="flex items-center space-x-3 overflow-hidden">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-950 border border-slate-800 shadow-md p-1">
              <img
                src="https://lh3.googleusercontent.com/d/1aJ9JZ4J44viC5qgISqdHgNAOx82_9ZFL"
                alt="di-diventory logo"
                className="h-full w-full object-contain"
              />
            </div>
            {!isCollapsed && (
              <div className="truncate transition-opacity duration-200">
                <h1 className="font-extrabold text-base text-white tracking-tight leading-none">
                  di-diventory
                </h1>
                <p className="text-[10px] font-semibold text-indigo-400 mt-0.5">didik-digital inventory</p>
              </div>
            )}
          </div>

          {/* Desktop Collapse Icon Button */}
          {setIsCollapsed && (
            <button
              onClick={() => setIsCollapsed((prev) => !prev)}
              className="hidden lg:flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors border border-transparent hover:border-slate-700"
              title={isCollapsed ? 'Perluas Sidebar (Ctrl + B)' : 'Ciutkan Sidebar (Ctrl + B)'}
            >
              {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
          )}

          {/* Mobile Close Button */}
          <button
            onClick={() => setIsOpenMobile(false)}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 lg:hidden"
            title="Tutup Menu Sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* User Role Info Banner */}
        <div
          className={`mx-3 my-3 rounded-xl border border-slate-800 bg-slate-800/40 p-2 text-xs transition-all ${
            isCollapsed ? 'lg:px-1.5 lg:text-center' : 'px-3 py-2'
          }`}
        >
          <div className={`flex items-center ${isCollapsed ? 'lg:justify-center' : 'justify-between'}`}>
            {!isCollapsed && <span className="text-[11px] text-slate-400 font-medium">Akses Role:</span>}
            <span
              className="rounded-md bg-indigo-950/80 border border-indigo-800/60 px-2 py-0.5 text-[10px] font-bold text-indigo-300 truncate"
              title={`Role Saat Ini: ${userRole}`}
            >
              {isCollapsed ? userRole.split(' ')[0] : userRole}
            </span>
          </div>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto px-2.5 py-2 space-y-4 custom-scrollbar">
          {navItems.map((group, idx) => (
            <div key={idx} className="space-y-1">
              {!isCollapsed ? (
                <p className="px-3 text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
                  {group.group}
                </p>
              ) : (
                <div className="hidden lg:block my-2 border-t border-slate-800/80" />
              )}

              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelect(item.id)}
                    title={isCollapsed ? item.label : undefined}
                    className={`group relative flex w-full items-center rounded-xl py-2.5 text-xs font-medium transition-all ${
                      isCollapsed ? 'lg:justify-center lg:px-2 px-3' : 'justify-between px-3'
                    } ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-950/40 font-semibold ring-1 ring-indigo-400/40'
                        : item.highlight
                        ? 'text-indigo-300 hover:bg-slate-800 hover:text-white'
                        : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <Icon
                        className={`h-4 w-4 shrink-0 transition-transform group-hover:scale-110 ${
                          isActive
                            ? 'text-white'
                            : item.highlight
                            ? 'text-indigo-400 group-hover:text-indigo-300'
                            : 'text-slate-400 group-hover:text-slate-200'
                        }`}
                      />
                      <span className={`truncate ${isCollapsed ? 'lg:hidden' : 'inline'}`}>
                        {item.label}
                      </span>
                    </div>

                    {/* Badges */}
                    <div className={`flex items-center space-x-1.5 ${isCollapsed ? 'lg:hidden' : 'flex'}`}>
                      {item.badge && (
                        <span className="rounded-md bg-indigo-500/20 px-1.5 py-0.5 text-[10px] font-bold text-indigo-300">
                          {item.badge}
                        </span>
                      )}
                      {item.badgeAlert !== undefined && item.badgeAlert > 0 && (
                        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500/90 px-1.5 text-[10px] font-extrabold text-white shadow-xs">
                          {item.badgeAlert}
                        </span>
                      )}
                    </div>

                    {/* Mini Badge Dot when Collapsed */}
                    {isCollapsed && item.badgeAlert !== undefined && item.badgeAlert > 0 && (
                      <span className="hidden lg:block absolute top-1.5 right-1.5 h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-slate-900 animate-pulse" />
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div
          className={`border-t border-slate-800 p-3 bg-slate-950/80 text-[11px] text-slate-400 text-center shrink-0 space-y-2.5 ${
            isCollapsed ? 'lg:px-1 lg:py-2' : ''
          }`}
        >
          {onLogout && (
            <button
              onClick={onLogout}
              title="Keluar dari Aplikasi"
              className={`w-full flex items-center justify-center space-x-2 rounded-xl bg-rose-600/20 border border-rose-500/40 text-rose-300 hover:bg-rose-600 hover:text-white transition-all py-2 px-2 text-xs font-bold shadow-xs group ${
                isCollapsed ? 'lg:px-1.5' : ''
              }`}
            >
              <LogOut className="h-4 w-4 shrink-0 group-hover:scale-110 transition-transform text-rose-400 group-hover:text-white" />
              <span className={`truncate ${isCollapsed ? 'lg:hidden' : 'inline'}`}>Keluar Aplikasi</span>
            </button>
          )}

          <div>
            <p className="font-bold text-slate-200 truncate">
              {isCollapsed ? 'di-diventory.v1' : 'di-diventory.v1'}
            </p>
            {!isCollapsed && <p className="text-[10px] font-semibold text-slate-400">didik-digital inventory</p>}
          </div>
        </div>
      </aside>
    </>
  );
};

