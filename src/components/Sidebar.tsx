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
  Boxes,
  ShieldCheck,
  FileText,
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
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs lg:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 flex w-64 flex-col border-r border-slate-800 bg-slate-900 text-slate-300 transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
          isOpenMobile ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="flex h-16 items-center justify-between border-b border-slate-800 px-5 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 font-bold text-white shadow-md shadow-indigo-950/40">
              <FlaskConical className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-bold text-base text-white tracking-tight">LabStock Pro</h1>
              <p className="text-[10px] font-medium text-slate-400">Inventory & Lot FEFO System</p>
            </div>
          </div>
          <button
            onClick={() => setIsOpenMobile(false)}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* User Role Info Banner */}
        <div className="mx-4 my-3 rounded-xl border border-slate-800 bg-slate-800/50 px-3.5 py-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-400 font-medium">Akses Role:</span>
            <span className="rounded-md bg-indigo-950 border border-indigo-800/60 px-2 py-0.5 text-[10px] font-bold text-indigo-300">
              {userRole}
            </span>
          </div>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-5 custom-scrollbar">
          {navItems.map((group, idx) => (
            <div key={idx} className="space-y-1">
              <p className="px-3 text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
                {group.group}
              </p>
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelect(item.id)}
                    className={`group flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-xs font-medium transition-colors ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : item.highlight
                        ? 'text-indigo-300 hover:bg-slate-800 hover:text-white'
                        : 'text-slate-300 hover:bg-slate-800 transition-colors'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <Icon
                        className={`h-4 w-4 shrink-0 transition-colors ${
                          isActive
                            ? 'text-white'
                            : item.highlight
                            ? 'text-indigo-400 group-hover:text-indigo-300'
                            : 'text-slate-400 group-hover:text-slate-200'
                        }`}
                      />
                      <span className="truncate">{item.label}</span>
                    </div>

                    <div className="flex items-center space-x-1.5">
                      {item.badge && (
                        <span className="rounded-md bg-indigo-500/20 px-1.5 py-0.5 text-[10px] font-bold text-indigo-300">
                          {item.badge}
                        </span>
                      )}
                      {item.badgeAlert !== undefined && item.badgeAlert > 0 && (
                        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500/90 px-1.5 text-[10px] font-extrabold text-white">
                          {item.badgeAlert}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-800 p-4 bg-slate-900/50 text-[11px] text-slate-500 text-center shrink-0">
          <p className="font-semibold text-slate-400">LabStock Pro v1.0</p>
          <p className="text-[10px]">Hospital Reagent Management</p>
        </div>
      </aside>
    </>
  );
};
