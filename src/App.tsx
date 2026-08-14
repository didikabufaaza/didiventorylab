import React, { useEffect, useState, useCallback, useRef } from 'react';
import { AlertTriangle, BellRing } from 'lucide-react';
import {
  UserRole,
  User,
  PendingUser,
  DBData,
  Reagent,
  ReagentBatch,
  InventoryTransaction,
  PurchaseOrder,
  StockOpnameSession,
  Supplier,
  StorageLocation,
  Analyzer,
  AuditLog,
  SystemNotification,
} from './types.js';
import {
  fetchFullState,
  resetDatabaseState,
  clearDatabaseData,
  createReagentApi,
  createReagentsBatchApi,
  updateReagentApi,
  deleteReagentApi,
  createSupplierApi,
  updateSupplierApi,
  deleteSupplierApi,
  createLocationApi,
  updateLocationApi,
  deleteLocationApi,
  createAnalyzerApi,
  updateAnalyzerApi,
  deleteAnalyzerApi,
  markBatchOpenedApi,
  updateBatchStatusApi,
  updateBatchApi,
  deleteBatchApi,
  stockInApi,
  stockOutApi,
  createStockOpnameApi,
  createPOApi,
  updatePOApi,
  deletePOApi,
  submitPOApi,
  approvePOApi,
  updateLetterheadApi,
  markNotificationsReadApi,
  fetchAccountsApi,
  switchAccountApi,
  getPendingUsersApi,
} from './lib/api.js';

import { LoginPage } from './components/Auth/LoginPage.js';
import { UserManagementPanel } from './components/Auth/UserManagementPanel.js';
import { Navbar } from './components/Navbar.js';
import { Sidebar, ActiveTab, SIDEBAR_DEFAULT_TAB, ROLE_MENU_ACCESS } from './components/Sidebar.js';
import { BarcodeScannerModal } from './components/BarcodeScannerModal.js';
import { NotificationDrawer } from './components/Notifications/NotificationDrawer.js';
import { DashboardView } from './components/Dashboard/DashboardView.js';
import { ReagentMasterView } from './components/MasterData/ReagentMasterView.js';
import { BatchMasterView } from './components/MasterData/BatchMasterView.js';
import { ReagentInView } from './components/ReagentIn/ReagentInView.js';
import { ReagentOutView } from './components/ReagentOut/ReagentOutView.js';
import { LocationView } from './components/MasterData/LocationView.js';
import { SupplierView } from './components/MasterData/SupplierView.js';
import { AnalyzerView } from './components/MasterData/AnalyzerView.js';
import { LetterheadView } from './components/Procurement/LetterheadView.js';
import { PurchaseOrderView } from './components/Procurement/PurchaseOrderView.js';
import { StockOpnameView } from './components/StockOpname/StockOpnameView.js';
import { ReportsView } from './components/Reports/ReportsView.js';
import { AuditLogView } from './components/AuditLog/AuditLogView.js';

export default function App() {
  // Auth State
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [currentRole, setCurrentRole] = useState<UserRole>('Admin Inventory');
  const [globalSearch, setGlobalSearch] = useState('');
  const [loggedInUser, setLoggedInUser] = useState<{
    id: string;
    name: string;
    username: string;
    role: UserRole;
    unit: string;
    email: string;
    tenantId?: string;
    tenantName?: string;
  } | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pendingUsersCount, setPendingUsersCount] = useState(0);
  const [impersonatedBy, setImpersonatedBy] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<User[]>([]);
  const [latestNewUserAlert, setLatestNewUserAlert] = useState<PendingUser | null>(null);
  const prevPendingCountRef = useRef<number>(0);

  // Pemulihan sesi dari sessionStorage (tanpa flash login saat reload)
  useEffect(() => {
    try {
      const saved = window.sessionStorage.getItem('lrims_session');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.user?.role) {
          setLoggedInUser(parsed.user);
          setCurrentRole(parsed.user.role as UserRole);
          setImpersonatedBy(parsed.impersonatedBy || null);
          setIsAuthenticated(true);
        }
      }
    } catch (e) {
      console.error('Failed to restore session:', e);
    }
  }, []);

  // Muat daftar akun lintas database untuk Super Admin (dropdown "Lihat Akun Sebagai")
  useEffect(() => {
    // Daftar akun dimuat bila user adalah Super Admin ATAU sedang
    // impersonasi (impersonatedBy aktif), agar dropdown tetap berfungsi
    // untuk kembali ke akun asal / berpindah ke akun lain.
    if (!isAuthenticated || (currentRole !== 'Super Admin' && !impersonatedBy)) {
      setAccounts([]);
      return;
    }
    let cancelled = false;
    fetchAccountsApi()
      .then((accs) => {
        if (!cancelled) setAccounts(accs);
      })
      .catch(() => {
        if (!cancelled) setAccounts([]);
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, currentRole, impersonatedBy]);

  // Modals & Drawers State
  const [isBarcodeModalOpen, setIsBarcodeModalOpen] = useState(false);
  const [isNotifDrawerOpen, setIsNotifDrawerOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('lrims_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });
  const [scannedBarcode, setScannedBarcode] = useState<string | null>(null);

  const toggleSidebar = useCallback(() => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('lrims_sidebar_collapsed', String(next));
      } catch {}
      return next;
    });
  }, []);

  // Shortcut Keyboard Ctrl + B / Cmd + B untuk toggle Sidebar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        toggleSidebar();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleSidebar]);

  // Confirmation Modal State & Inputs
  const [confirmModalConfig, setConfirmModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'reset' | 'clear';
    confirmText: string;
    confirmColor: 'indigo' | 'rose';
  } | null>(null);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [confirmReason, setConfirmReason] = useState('');
  const [confirmModalError, setConfirmModalError] = useState('');

  // App Data State
  const [data, setData] = useState<DBData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Hydrate Data on Mount
  const loadData = async () => {
    try {
      setLoading(true);
      const res = await fetchFullState();
      setData(res);
      // Update pending users count for Super Admin
      if (res.pendingUsers) setPendingUsersCount(res.pendingUsers.length);
      setError(null);
    } catch (err: any) {
      console.error('Failed to load DB state:', err);
      setError('Gagal menghubungkan ke Server Backend LRIMS.');
    } finally {
      setLoading(false);
    }
  };

  const [showTimeoutAlert, setShowTimeoutAlert] = useState(false);
  const [showSessionExpired, setShowSessionExpired] = useState(false);

  const handleLoginSuccess = useCallback((user: typeof loggedInUser) => {
    if (!user) return;
    setLoggedInUser(user);
    setCurrentRole(user.role);
    setIsAuthenticated(true);
    setImpersonatedBy(null);
    setShowTimeoutAlert(false);
    setShowSessionExpired(false);
    try {
      window.sessionStorage.setItem('lrims_session', JSON.stringify({ user }));
    } catch (e) {
      console.error('Failed to persist session:', e);
    }
    // Muat ulang data tenant milik akun yang baru login
    loadData();
  }, []);

  const handleLogout = useCallback(() => {
    setIsAuthenticated(false);
    setLoggedInUser(null);
    setCurrentRole('Admin Inventory');
    setImpersonatedBy(null);
    setAccounts([]);
    setActiveTab('dashboard');
    try {
      window.sessionStorage.removeItem('lrims_session');
      window.sessionStorage.removeItem('lrims_token');
    } catch (e) {
      console.error('Failed to clear session:', e);
    }
  }, []);

  const handleSwitchAccount = useCallback(async (account: User) => {
    if (!loggedInUser) return;
    if (account.id === loggedInUser.id) return;
    try {
      const res = await switchAccountApi(account.id);
      const nextUser = {
        id: res.user.id,
        name: res.user.name,
        username: res.user.username,
        role: res.user.role,
        unit: res.user.unit,
        email: res.user.email,
        tenantId: res.user.tenantId,
        tenantName: res.user.tenantName,
      } as typeof loggedInUser;
      setLoggedInUser(nextUser);
      setCurrentRole(res.user.role as UserRole);
      setImpersonatedBy(res.impersonatedBy || null);
      // Reset state tampilan agar menu & data milik akun tujuan dimuat ulang
      setGlobalSearch('');
      setScannedBarcode(null);
      setConfirmModalConfig(null);
      setIsBarcodeModalOpen(false);
      setIsNotifDrawerOpen(false);
      setIsMobileSidebarOpen(false);
      try {
        window.sessionStorage.setItem(
          'lrims_session',
          JSON.stringify({ user: nextUser, impersonatedBy: res.impersonatedBy || null })
        );
      } catch {
        /* ignore */
      }
      setActiveTab('dashboard');
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Gagal berpindah ke akun tersebut.');
    }
  }, [loggedInUser]);

  // Listener global sesi berakhir: api.ts mengirim event `lrims:session-expired`
  // ketika menerima 401. Aplikasi kemudian logout otomatis & tampilkan banner.
  useEffect(() => {
    if (!isAuthenticated) return;
    const handler = () => {
      if (!isAuthenticated) return;
      setShowSessionExpired(true);
      handleLogout();
    };
    window.addEventListener('lrims:session-expired', handler);
    return () => window.removeEventListener('lrims:session-expired', handler);
  }, [isAuthenticated, handleLogout]);

  // Pastikan tab aktif selalu valid sesuai role sesi berjalan
  useEffect(() => {
    if (!isAuthenticated) return;
    const defaultTab = SIDEBAR_DEFAULT_TAB[currentRole] || 'dashboard';
    setActiveTab((prev) => (ROLE_MENU_ACCESS[currentRole] && !ROLE_MENU_ACCESS[currentRole].includes(prev) ? defaultTab : prev));
  }, [currentRole, isAuthenticated]);

  // Inactivity Auto-Logout (3 minutes = 180000ms)
  useEffect(() => {
    if (!isAuthenticated) return;

    let timeoutId: number;

    const resetTimer = () => {
      if (timeoutId) window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => {
        handleLogout();
        setShowTimeoutAlert(true);
      }, 3 * 60 * 1000); // 3 minutes
    };

    // Events to monitor activity
    const activityEvents = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    
    // Initialize timer
    resetTimer();

    // Attach listeners
    activityEvents.forEach((event) => {
      window.addEventListener(event, resetTimer);
    });

    return () => {
      if (timeoutId) window.clearTimeout(timeoutId);
      activityEvents.forEach((event) => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [isAuthenticated, handleLogout]);

  // Real-Time Polling Pendaftaran Akun Baru (Super Admin)
  useEffect(() => {
    if (!isAuthenticated || currentRole !== 'Super Admin') return;

    const checkPendingRealtime = async () => {
      try {
        const pending = await getPendingUsersApi();
        const count = pending.length;
        setPendingUsersCount(count);

        if (count > prevPendingCountRef.current && prevPendingCountRef.current > 0) {
          // Ada pendaftaran akun baru secara real-time!
          const latest = pending[0];
          if (latest) {
            setLatestNewUserAlert(latest);
          }
        }
        prevPendingCountRef.current = count;
      } catch {
        /* silent catch */
      }
    };

    checkPendingRealtime();
    const interval = setInterval(checkPendingRealtime, 4000); // Polling real-time setiap 4 detik

    return () => clearInterval(interval);
  }, [isAuthenticated, currentRole]);

  useEffect(() => {
    loadData();
  }, []);

  // Handlers
  const handleResetData = () => {
    setConfirmPassword('');
    setConfirmReason('');
    setConfirmModalError('');
    setConfirmModalConfig({
      isOpen: true,
      title: 'Reset Database Demo',
      message: 'Apakah Anda yakin ingin mengembalikan seluruh data reagen, stok, lot, lokasi, dan transaksi ke kondisi awal seed demo bawaan pabrik?',
      type: 'reset',
      confirmText: 'Ya, Reset Demo',
      confirmColor: 'indigo',
    });
  };

  const handleClearData = () => {
    setConfirmPassword('');
    setConfirmReason('');
    setConfirmModalError('');
    setConfirmModalConfig({
      isOpen: true,
      title: 'Kosongkan Seluruh Data Master & Transaksi',
      message: 'Apakah Anda yakin ingin mengosongkan semua data Master Supplier, Master Reagen, Lokasi Penyimpanan, Lot Stok, Transaksi IN/OUT, Laporan, dan PO agar dapat mencoba aplikasi sepenuhnya dari awal?',
      type: 'clear',
      confirmText: 'Ya, Kosongkan Semua Data Master & Stok',
      confirmColor: 'rose',
    });
  };

  const executeConfirmAction = async () => {
    if (!confirmModalConfig) return;
    setConfirmModalError('');

    if (currentRole !== 'Super Admin') {
      setConfirmModalError('Akses Ditolak: Hanya Super Admin yang berhak melakukan tindakan ini.');
      return;
    }

    if (confirmPassword !== 'dirah123') {
      setConfirmModalError('Password Keamanan Salah! Masukkan password keamanan yang benar ("dirah123").');
      return;
    }

    if (confirmReason.trim().length < 10) {
      setConfirmModalError(`Alasan tindakan wajib diisi minimal 10 karakter (saat ini ${confirmReason.trim().length} karakter).`);
      return;
    }

    try {
      setLoading(true);
      if (confirmModalConfig.type === 'reset') {
        const newData = await resetDatabaseState();
        setData(newData);
      } else if (confirmModalConfig.type === 'clear') {
        const newData = await clearDatabaseData();
        setData(newData);
      }
    } catch (err) {
      console.error('Error executing DB reset/clear:', err);
    } finally {
      setLoading(false);
      setConfirmModalConfig(null);
      setConfirmPassword('');
      setConfirmReason('');
      setConfirmModalError('');
    }
  };

  const handleScanSuccess = (barcode: string) => {
    setScannedBarcode(barcode);
    // Navigasi hanya ke tab yang diizinkan sesuai role pengguna
    const allowed = ROLE_MENU_ACCESS[currentRole] || [];
    const target = (['reagent-out', 'stock-in', 'batches'] as ActiveTab[]).find(
      (t) => allowed.includes(t)
    );
    if (target && target !== activeTab) setActiveTab(target);
  };

  const handleGlobalSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!globalSearch.trim()) return;
    setActiveTab('reports');
  };

  // API Wrapper Actions
  const handleCreateReagent = async (reagent: Partial<Reagent>) => {
    await createReagentApi(reagent);
    await loadData();
  };
 
  const handleCreateReagentsBatch = async (reagentsList: Partial<Reagent>[]) => {
    await createReagentsBatchApi(reagentsList);
    await loadData();
  };

  const handleUpdateReagent = async (id: string, reagent: Partial<Reagent>) => {
    await updateReagentApi(id, reagent);
    await loadData();
  };

  const handleDeleteReagent = async (id: string) => {
    await deleteReagentApi(id);
    await loadData();
  };

  const handleCreateSupplier = async (supplier: Partial<Supplier>) => {
    await createSupplierApi(supplier);
    await loadData();
  };

  const handleUpdateSupplier = async (id: string, supplier: Partial<Supplier>) => {
    await updateSupplierApi(id, supplier);
    await loadData();
  };

  const handleDeleteSupplier = async (id: string) => {
    await deleteSupplierApi(id);
    await loadData();
  };

  const handleCreateLocation = async (location: Partial<StorageLocation>) => {
    await createLocationApi(location);
    await loadData();
  };

  const handleUpdateLocation = async (id: string, location: Partial<StorageLocation>) => {
    await updateLocationApi(id, location);
    await loadData();
  };

  const handleDeleteLocation = async (id: string) => {
    await deleteLocationApi(id);
    await loadData();
  };

  const handleCreateAnalyzer = async (analyzer: Partial<Analyzer>) => {
    await createAnalyzerApi(analyzer);
    await loadData();
  };

  const handleUpdateAnalyzer = async (id: string, analyzer: Partial<Analyzer>) => {
    await updateAnalyzerApi(id, analyzer);
    await loadData();
  };

  const handleDeleteAnalyzer = async (id: string) => {
    await deleteAnalyzerApi(id);
    await loadData();
  };

  const handleMarkBatchOpened = async (batchId: string, openedDate: string, days: number) => {
    await markBatchOpenedApi(batchId, openedDate, days);
    await loadData();
  };

  const handleUpdateBatchStatus = async (batchId: string, status: string, notes?: string) => {
    await updateBatchStatusApi(batchId, status, notes);
    await loadData();
  };

  const handleUpdateBatch = async (batchId: string, payload: Partial<ReagentBatch>) => {
    await updateBatchApi(batchId, payload);
    await loadData();
  };

  const handleDeleteBatch = async (batchId: string) => {
    await deleteBatchApi(batchId);
    await loadData();
  };

  const handleProcessStockIn = async (payload: any) => {
    await stockInApi(payload);
    await loadData();
  };

  const handleProcessStockOut = async (payload: any) => {
    await stockOutApi(payload);
    await loadData();
  };

  const handleCreateStockOpname = async (payload: any) => {
    await createStockOpnameApi(payload);
    await loadData();
  };

  const handleCreatePO = async (payload: any) => {
    await createPOApi(payload);
    await loadData();
  };

  const handleUpdatePO = async (poId: string, payload: any) => {
    await updatePOApi(poId, payload);
    await loadData();
  };

  const handleDeletePO = async (poId: string) => {
    await deletePOApi(poId);
    await loadData();
  };

  const handleSubmitPO = async (poId: string) => {
    await submitPOApi(poId);
    await loadData();
  };

  const handleApprovePO = async (poId: string) => {
    await approvePOApi(poId);
    await loadData();
  };

  const handleSaveLetterhead = async (payload: any) => {
    await updateLetterheadApi(payload);
    await loadData();
  };

  const handleMarkNotifRead = async (id?: string) => {
    await markNotificationsReadApi(id);
    await loadData();
  };

  if (loading && !data) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-900 text-white">
        <div className="text-center space-y-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-teal-500 border-t-transparent mx-auto" />
          <p className="text-sm font-semibold text-teal-300">Memuat LRIMS Laboratory System...</p>
        </div>
      </div>
    );
  }

  const reagents = data?.reagents || [];
  const batches = data?.batches || [];
  const transactions = data?.transactions || [];
  const stockOpnames = data?.stockOpnames || [];
  const purchaseOrders = data?.purchaseOrders || [];
  const suppliers = data?.suppliers || [];
  const locations = data?.locations || [];
  const analyzers = data?.analyzers || [];
  const letterhead = data?.letterhead || {
    pemdaName: 'PEMERINTAH KABUPATEN / PROVINSI DINAS KESEHATAN',
    hospitalName: 'RSUD DR. RADEN SOEDJONO LABSENTRAL',
    hospitalAddress: 'Jl. Prof. Dr. Soepomo No. 45, Tebet, Jakarta Selatan',
    phone: '(021) 555-1234 / Fax: (021) 555-5678',
    email: 'info@rsud-soedjono.go.id',
    logoLeftUrl: '',
    logoRightUrl: '',
    signatory1Title: 'Kabid Penunjang Medis',
    signatory1Name: 'dr. Hj. Endang Rahmawati, M.Kes',
    signatory1Nip: 'NIP. 19760412 200312 2 004',
    signatory2Title: 'Kepala Instalasi Farmasi',
    signatory2Name: 'Apt. Rian Hidayat, S.Farm',
    signatory2Nip: 'NIP. 19820815 200804 1 003',
    signatory3Title: 'Kepala Instalasi Laboratorium',
    signatory3Name: 'Dr. Hendra Wijaya, Sp.PK',
    signatory3Nip: 'NIP. 19791104 200604 1 009',
  };
  const auditLogs = data?.auditLogs || [];
  const notifications = data?.notifications || [];

  const unreadNotifCount = notifications.filter((n) => !n.read).length;

  const canView = (tab: ActiveTab) => (ROLE_MENU_ACCESS[currentRole] || []).includes(tab);

  const expiredCount = batches.filter((b) => b.status === 'Expired' || new Date(b.expiryDate) < new Date()).length;
  const lowStockCount = reagents.filter((r) => {
    const totalQty = batches
      .filter((b) => b.reagentId === r.id && (b.status === 'Available' || b.status === 'Opened'))
      .reduce((acc, b) => acc + b.currentQuantity, 0);
    return totalQty <= r.minimumStock;
  }).length;

  if (!isAuthenticated) {
    return (
      <div className="relative w-full h-screen">
        <LoginPage onLoginSuccess={handleLoginSuccess} />
        {showTimeoutAlert && (
          <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm px-4">
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 shadow-xl flex items-start space-x-3 animate-bounce">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center text-rose-700">
                ⚠️
              </div>
              <div className="flex-1">
                <h4 className="text-xs font-bold text-slate-900">Sesi Anda Berakhir</h4>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                  Sesi login Anda telah otomatis dinonaktifkan karena tidak ada aktivitas selama 3 menit. Silakan login kembali.
                </p>
              </div>
              <button
                onClick={() => setShowTimeoutAlert(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ✕
              </button>
            </div>
          </div>
        )}
        {showSessionExpired && (
          <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm px-4">
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-xl flex items-start space-x-3 animate-bounce">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-700">
                🔒
              </div>
              <div className="flex-1">
                <h4 className="text-xs font-bold text-slate-900">Sesi Telah Berakhir</h4>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                  Token sesi Anda tidak lagi valid (server dimulai ulang atau sesi kadaluarsa). Silakan login kembali untuk melanjutkan.
                </p>
              </div>
              <button
                onClick={() => setShowSessionExpired(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ✕
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-slate-100 font-sans text-slate-900 overflow-hidden">
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        userRole={currentRole}
        expiredCount={expiredCount}
        lowStockCount={lowStockCount}
        isOpenMobile={isMobileSidebarOpen}
        setIsOpenMobile={setIsMobileSidebarOpen}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Navbar */}
        <Navbar
          currentRole={currentRole}
          onRoleChange={setCurrentRole}
          unreadNotifCount={unreadNotifCount}
          onOpenNotifications={() => setIsNotifDrawerOpen(true)}
          onOpenBarcodeScanner={() => setIsBarcodeModalOpen(true)}
          onResetData={handleResetData}
          onClearData={handleClearData}
          globalSearch={globalSearch}
          setGlobalSearch={setGlobalSearch}
          onSearchSubmit={handleGlobalSearchSubmit}
          loggedInUser={loggedInUser}
          onLogout={handleLogout}
          pendingUsersCount={pendingUsersCount}
          onOpenUserManagement={() => setActiveTab('user-management')}
          accounts={accounts}
          onSwitchAccount={handleSwitchAccount}
          impersonatedBy={impersonatedBy}
          isSidebarCollapsed={isSidebarCollapsed}
          onToggleSidebar={toggleSidebar}
          onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
        />

        {/* Main Route Content View */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar">
          {activeTab === 'dashboard' && canView('dashboard') && (
            <DashboardView
              reagents={reagents}
              batches={batches}
              transactions={transactions}
              onOpenBarcodeScanner={() => setIsBarcodeModalOpen(true)}
              onNavigateToTab={setActiveTab}
              readOnly={currentRole === 'Manajemen'}
            />
          )}

          {activeTab === 'reagents' && canView('reagents') && (
            <ReagentMasterView
              reagents={reagents}
              batches={batches}
              currentRole={currentRole}
              onCreateReagent={handleCreateReagent}
              onCreateReagentsBatch={handleCreateReagentsBatch}
              onUpdateReagent={handleUpdateReagent}
              onDeleteReagent={handleDeleteReagent}
            />
          )}

          {activeTab === 'batches' && canView('batches') && (
            <BatchMasterView
              batches={batches}
              locations={locations}
              currentRole={currentRole}
              onMarkBatchOpened={handleMarkBatchOpened}
              onUpdateBatchStatus={handleUpdateBatchStatus}
              onUpdateBatch={handleUpdateBatch}
              onDeleteBatch={handleDeleteBatch}
            />
          )}

          {activeTab === 'stock-in' && canView('stock-in') && (
            <ReagentInView
              reagents={reagents}
              suppliers={suppliers}
              locations={locations}
              currentRole={currentRole}
              onOpenBarcodeScanner={() => setIsBarcodeModalOpen(true)}
              onProcessStockIn={handleProcessStockIn}
              onCreateReagentsBatch={handleCreateReagentsBatch}
              scannedBarcode={scannedBarcode}
              clearScannedBarcode={() => setScannedBarcode(null)}
            />
          )}

          {activeTab === 'reagent-out' && canView('reagent-out') && (
            <ReagentOutView
              reagents={reagents}
              batches={batches}
              currentRole={currentRole}
              onOpenBarcodeScanner={() => setIsBarcodeModalOpen(true)}
              onProcessStockOut={handleProcessStockOut}
              scannedBarcode={scannedBarcode}
              clearScannedBarcode={() => setScannedBarcode(null)}
            />
          )}

          {activeTab === 'locations' && canView('locations') && (
            <LocationView
              locations={locations}
              currentRole={currentRole}
              onCreateLocation={handleCreateLocation}
              onUpdateLocation={handleUpdateLocation}
              onDeleteLocation={handleDeleteLocation}
            />
          )}

          {activeTab === 'suppliers' && canView('suppliers') && (
            <SupplierView
              suppliers={suppliers}
              currentRole={currentRole}
              onCreateSupplier={handleCreateSupplier}
              onUpdateSupplier={handleUpdateSupplier}
              onDeleteSupplier={handleDeleteSupplier}
            />
          )}

          {activeTab === 'analyzers' && canView('analyzers') && (
            <AnalyzerView
              analyzers={analyzers}
              currentRole={currentRole}
              onCreateAnalyzer={handleCreateAnalyzer}
              onUpdateAnalyzer={handleUpdateAnalyzer}
              onDeleteAnalyzer={handleDeleteAnalyzer}
            />
          )}

          {activeTab === 'letterhead' && canView('letterhead') && (
            <LetterheadView
              letterhead={letterhead}
              onSaveLetterhead={handleSaveLetterhead}
            />
          )}

          {activeTab === 'purchase-orders' && canView('purchase-orders') && (
            <PurchaseOrderView
              purchaseOrders={purchaseOrders}
              suppliers={suppliers}
              reagents={reagents}
              letterhead={letterhead}
              currentRole={currentRole}
              onCreatePO={handleCreatePO}
              onUpdatePO={handleUpdatePO}
              onDeletePO={handleDeletePO}
              onSubmitPO={handleSubmitPO}
              onApprovePO={handleApprovePO}
            />
          )}

          {activeTab === 'stock-opname' && canView('stock-opname') && (
            <StockOpnameView
              stockOpnames={stockOpnames}
              batches={batches}
              locations={locations}
              currentRole={currentRole}
              onCreateStockOpname={handleCreateStockOpname}
            />
          )}

          {activeTab === 'reports' && canView('reports') && (
            <ReportsView
              reagents={reagents}
              batches={batches}
              transactions={transactions}
              stockOpnames={stockOpnames}
              purchaseOrders={purchaseOrders}
              suppliers={suppliers}
              locations={locations}
            />
          )}

          {activeTab === 'audit-trail' && canView('audit-trail') && (
            <AuditLogView auditLogs={auditLogs} currentRole={currentRole} />
          )}

          {activeTab === 'user-management' && currentRole === 'Super Admin' && (
            <div className="space-y-4">
              <UserManagementPanel onDataChange={loadData} />
            </div>
          )}
        </main>
      </div>

      {/* Barcode Camera & USB Scanner Modal */}
      <BarcodeScannerModal
        isOpen={isBarcodeModalOpen}
        onClose={() => setIsBarcodeModalOpen(false)}
        onScanSuccess={handleScanSuccess}
      />

      {/* Notification Drawer */}
      <NotificationDrawer
        isOpen={isNotifDrawerOpen}
        onClose={() => setIsNotifDrawerOpen(false)}
        notifications={notifications}
        onMarkRead={handleMarkNotifRead}
        onNavigateToTab={(tab) => {
          const target = tab as ActiveTab;
          if (canView(target)) setActiveTab(target);
        }}
      />

      {/* Confirmation Modal for Reset/Clear Data */}
      {confirmModalConfig?.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center space-x-3">
              <div
                className={`p-3 rounded-xl ${
                  confirmModalConfig.confirmColor === 'rose'
                    ? 'bg-rose-100 text-rose-700'
                    : 'bg-indigo-100 text-indigo-700'
                }`}
              >
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">{confirmModalConfig.title}</h3>
                <p className="text-xs text-slate-500 mt-0.5">Otentikasi & Konfirmasi Tindakan Super Admin</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200">
              {confirmModalConfig.message}
            </p>

            {confirmModalError && (
              <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700 font-medium">
                {confirmModalError}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Password Keamanan Super Admin *
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Masukkan password 'dirah123'..."
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-xs font-semibold text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-bold text-slate-700">
                    Alasan Tindakan (Min. 10 Karakter) *
                  </label>
                  <span
                    className={`text-[10px] font-bold ${
                      confirmReason.trim().length >= 10 ? 'text-emerald-600' : 'text-rose-500'
                    }`}
                  >
                    {confirmReason.trim().length} / 10 Karakter
                  </span>
                </div>
                <textarea
                  rows={2}
                  value={confirmReason}
                  onChange={(e) => setConfirmReason(e.target.value)}
                  placeholder="Contoh: Pembersihan data demo untuk persiapan audit operasional..."
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs font-medium text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => {
                  setConfirmModalConfig(null);
                  setConfirmPassword('');
                  setConfirmReason('');
                  setConfirmModalError('');
                }}
                className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
              >
                Batal
              </button>
              <button
                onClick={executeConfirmAction}
                className={`rounded-lg px-4 py-2 text-xs font-bold text-white shadow-sm transition ${
                  confirmModalConfig.confirmColor === 'rose'
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-indigo-600 hover:bg-indigo-700'
                }`}
              >
                {confirmModalConfig.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Real-Time Alert untuk Permohonan Pendaftaran Akun Baru (Super Admin) */}
      {latestNewUserAlert && (
        <div className="fixed top-4 right-4 z-50 max-w-md w-full animate-bounce">
          <div className="bg-slate-950 border-2 border-rose-500 text-white rounded-2xl p-4 shadow-2xl backdrop-blur-xl flex items-start space-x-3.5 ring-4 ring-rose-500/30">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-600 text-white font-bold text-lg animate-pulse shadow-md">
              <BellRing className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h4 className="font-extrabold text-sm text-white flex items-center space-x-1.5">
                  <span>Permohonan Akun Baru!</span>
                  <span className="rounded-md bg-rose-500/20 px-1.5 py-0.5 text-[10px] text-rose-300 font-bold">REAL-TIME</span>
                </h4>
                <button
                  onClick={() => setLatestNewUserAlert(null)}
                  className="text-slate-400 hover:text-white p-1 text-xs font-bold"
                >
                  ✕
                </button>
              </div>
              <p className="text-xs text-slate-300 mt-1 font-medium leading-relaxed">
                <strong className="text-white font-bold">{latestNewUserAlert.name}</strong> (@{latestNewUserAlert.username}) dari unit <span className="underline font-bold text-rose-300">{latestNewUserAlert.unit || 'Umum'}</span> baru saja mendaftar.
              </p>
              <div className="mt-3 flex items-center space-x-2">
                <button
                  onClick={() => {
                    setActiveTab('user-management');
                    setLatestNewUserAlert(null);
                  }}
                  className="rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 px-3.5 py-2 text-xs font-extrabold text-white hover:from-rose-500 hover:to-rose-600 shadow-md transition-all flex items-center space-x-1.5"
                >
                  <span>Proses & Setujui Sekarang</span>
                  <span>→</span>
                </button>
                <button
                  onClick={() => setLatestNewUserAlert(null)}
                  className="rounded-xl bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:text-white transition-all"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
