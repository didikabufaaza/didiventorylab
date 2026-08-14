import {
  DBData,
  Reagent,
  ReagentBatch,
  InventoryTransaction,
  PurchaseOrder,
  StockOpnameSession,
  Supplier,
  StorageLocation,
  Analyzer,
  LetterheadConfig,
  User,
  PendingUser,
  TenantInfo,
  UserRole,
} from '../types.js';

const BASE_URL = '/api';

const TOKEN_KEY = 'lrims_token';

function getToken(): string | null {
  try {
    return window.sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers || {});
  const token = getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const res = await fetch(`${BASE_URL}${path}`, { ...init, headers });
  if (res.status === 401) {
    // Sesi tidak valid: kirim event global agar aplikasi melakukan logout otomatis
    try {
      window.dispatchEvent(new CustomEvent('lrims:session-expired'));
    } catch {
      /* ignore */
    }
    let message = 'Sesi tidak valid atau telah berakhir. Silakan masuk kembali.';
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
  if (!res.ok) {
    let message = `Request Gagal (${res.status})`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as Promise<T>;
}

export async function fetchFullState(): Promise<DBData> {
  return request<DBData>('/data');
}

// Auth API
export async function loginApi(username: string, password: string): Promise<{ user: User }> {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Login gagal');
  }
  const body = await res.json();
  if (body.token) {
    try {
      window.sessionStorage.setItem(TOKEN_KEY, body.token);
    } catch {
      /* ignore */
    }
  }
  return { user: body.user };
}

export async function registerApi(payload: { name: string; username: string; email: string; unit: string; password: string; requestedRole?: string }): Promise<void> {
  const res = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Registrasi gagal');
  }
}

export async function resetPasswordApi(payload: { username: string; email: string; newPassword: string }): Promise<string> {
  const res = await fetch(`${BASE_URL}/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Gagal mereset password.');
  }
  const body = await res.json();
  return body.message || 'Password berhasil diperbarui.';
}

export async function getPendingUsersApi(): Promise<PendingUser[]> {
  return request<PendingUser[]>('/pending-users');
}

export async function approvePendingUserApi(id: string, role: string, tenantId?: string): Promise<User> {
  return request<User>(`/pending-users/${id}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role, tenantId }),
  });
}

export async function rejectPendingUserApi(id: string): Promise<void> {
  await request<void>(`/pending-users/${id}/reject`, { method: 'POST' });
}

export async function getAllUsersApi(): Promise<User[]> {
  return request<User[]>('/users');
}

export async function updateUserApi(id: string, payload: Partial<User> & { password?: string }): Promise<User> {
  return request<User>(`/users/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function deleteUserApi(id: string): Promise<void> {
  await request<void>(`/users/${id}`, { method: 'DELETE' });
}

export async function resetDatabaseState(): Promise<DBData> {
  const body = await request<{ message: string; data: DBData }>('/reset-data', { method: 'POST' });
  return body.data;
}

export async function clearDatabaseData(clearMaster: boolean = true): Promise<DBData> {
  const body = await request<{ message: string; data: DBData }>('/clear-data', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clearMaster }),
  });
  return body.data;
}

// Reagent API
export async function createReagentApi(reagent: Partial<Reagent>): Promise<Reagent> {
  return request<Reagent>('/reagents', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(reagent),
  });
}

export async function createReagentsBatchApi(reagents: Partial<Reagent>[]): Promise<Reagent[]> {
  return request<Reagent[]>('/reagents/batch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reagents }),
  });
}

export async function updateReagentApi(id: string, reagent: Partial<Reagent>): Promise<Reagent> {
  return request<Reagent>(`/reagents/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(reagent),
  });
}

export async function deleteReagentApi(id: string): Promise<any> {
  return request<any>(`/reagents/${id}`, { method: 'DELETE' });
}

// Supplier API
export async function createSupplierApi(supplier: Partial<Supplier>): Promise<Supplier> {
  return request<Supplier>('/suppliers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(supplier),
  });
}

export async function updateSupplierApi(id: string, supplier: Partial<Supplier>): Promise<Supplier> {
  return request<Supplier>(`/suppliers/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(supplier),
  });
}

export async function deleteSupplierApi(id: string): Promise<any> {
  return request<any>(`/suppliers/${id}`, { method: 'DELETE' });
}

// Location API
export async function createLocationApi(location: Partial<StorageLocation>): Promise<StorageLocation> {
  return request<StorageLocation>('/locations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(location),
  });
}

export async function updateLocationApi(id: string, location: Partial<StorageLocation>): Promise<StorageLocation> {
  return request<StorageLocation>(`/locations/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(location),
  });
}

export async function deleteLocationApi(id: string): Promise<any> {
  return request<any>(`/locations/${id}`, { method: 'DELETE' });
}

// Analyzer API
export async function createAnalyzerApi(analyzer: Partial<Analyzer>): Promise<Analyzer> {
  return request<Analyzer>('/analyzers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(analyzer),
  });
}

export async function updateAnalyzerApi(id: string, analyzer: Partial<Analyzer>): Promise<Analyzer> {
  return request<Analyzer>(`/analyzers/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(analyzer),
  });
}

export async function deleteAnalyzerApi(id: string): Promise<any> {
  return request<any>(`/analyzers/${id}`, { method: 'DELETE' });
}

// Batch / Lot API
export async function markBatchOpenedApi(
  batchId: string,
  openedDate: string,
  openStabilityDays: number
): Promise<ReagentBatch> {
  return request<ReagentBatch>(`/batches/${batchId}/opened`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ openedDate, openStabilityDays }),
  });
}

export async function updateBatchStatusApi(
  batchId: string,
  status: string,
  notes?: string
): Promise<ReagentBatch> {
  return request<ReagentBatch>(`/batches/${batchId}/quarantine`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, notes }),
  });
}

export async function updateBatchApi(batchId: string, batch: Partial<ReagentBatch>): Promise<ReagentBatch> {
  return request<ReagentBatch>(`/batches/${batchId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(batch),
  });
}

export async function deleteBatchApi(batchId: string): Promise<any> {
  return request<any>(`/batches/${batchId}`, { method: 'DELETE' });
}

export async function stockInApi(payload: any): Promise<{ transaction: InventoryTransaction; batches: ReagentBatch[] }> {
  return request<{ transaction: InventoryTransaction; batches: ReagentBatch[] }>('/inventory/in', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function stockOutApi(payload: any): Promise<{ transaction: InventoryTransaction; batches: ReagentBatch[] }> {
  return request<{ transaction: InventoryTransaction; batches: ReagentBatch[] }>('/inventory/out', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function stockTransferApi(payload: any): Promise<any> {
  return request<any>('/inventory/transfer', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function createStockOpnameApi(payload: any): Promise<StockOpnameSession> {
  return request<StockOpnameSession>('/stock-opnames', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

// Purchase Order API
export async function createPOApi(payload: any): Promise<PurchaseOrder> {
  return request<PurchaseOrder>('/purchase-orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function updatePOApi(poId: string, payload: any): Promise<PurchaseOrder> {
  return request<PurchaseOrder>(`/purchase-orders/${poId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function deletePOApi(poId: string): Promise<any> {
  return request<any>(`/purchase-orders/${poId}`, { method: 'DELETE' });
}

export async function submitPOApi(poId: string): Promise<PurchaseOrder> {
  return request<PurchaseOrder>(`/purchase-orders/${poId}/submit`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function approvePOApi(poId: string, approvedBy?: string): Promise<PurchaseOrder> {
  return request<PurchaseOrder>(`/purchase-orders/${poId}/approve`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ approvedBy }),
  });
}

// Letterhead / Kop Surat API
export async function getLetterheadApi(): Promise<LetterheadConfig> {
  return request<LetterheadConfig>('/letterhead');
}

export async function updateLetterheadApi(payload: Partial<LetterheadConfig>): Promise<LetterheadConfig> {
  return request<LetterheadConfig>('/letterhead', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function markNotificationsReadApi(id?: string): Promise<any> {
  return request<any>('/notifications/read', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  });
}

// === Multi-Tenant / Private Database API ===
export async function fetchTenantsApi(): Promise<TenantInfo[]> {
  return request<TenantInfo[]>('/tenants');
}

export async function createTenantApi(payload: { name: string; unit: string; description?: string }): Promise<TenantInfo> {
  return request<TenantInfo>('/tenants', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function fetchAccountsApi(): Promise<User[]> {
  return request<User[]>('/accounts');
}

export async function createAccountApi(payload: {
  tenantId: string;
  name: string;
  username: string;
  password: string;
  email?: string;
  role: UserRole;
  unit?: string;
  status?: 'Aktif' | 'Nonaktif';
}): Promise<User> {
  return request<User>('/accounts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function switchAccountApi(accountId: string): Promise<{
  user: User;
  token: string;
  impersonated?: boolean;
  impersonatedBy?: string;
  effectiveRole?: UserRole;
}> {
  const res = await request<{
    user: User;
    token: string;
    impersonated?: boolean;
    impersonatedBy?: string;
    effectiveRole?: UserRole;
  }>('/auth/switch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ accountId }),
  });
  if (res.token) {
    try {
      window.sessionStorage.setItem(TOKEN_KEY, res.token);
    } catch {
      /* ignore */
    }
  }
  return res;
}

// Database Status & Connection Management APIs
export async function fetchDbStatusApi(): Promise<{
  ok: boolean;
  provider: 'neon' | 'supabase' | 'postgres' | 'json';
  providerLabel: string;
  connectionStringMasked: string;
  latencyMs: number;
  tenantCount: number;
  accountCount: number;
  details?: string;
}> {
  return request('/db/status');
}

export async function testDbConnectionApi(connectionString: string): Promise<{
  ok: boolean;
  provider: string;
  providerLabel: string;
  connectionStringMasked: string;
  latencyMs: number;
  tenantCount: number;
  accountCount: number;
  details?: string;
  error?: string;
}> {
  return request('/db/test-connection', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ connectionString }),
  });
}

export async function migrateDatabaseApi(): Promise<{ ok: boolean; message: string }> {
  return request('/db/migrate', {
    method: 'POST',
  });
}

export async function deleteTransactionApi(id: string): Promise<any> {
  return request<any>(`/transactions/${id}`, { method: 'DELETE' });
}

export async function updateTransactionApi(id: string, payload: any): Promise<any> {
  return request<any>(`/transactions/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function deleteStockOpnameApi(id: string): Promise<any> {
  return request<any>(`/stock-opnames/${id}`, { method: 'DELETE' });
}

export async function updateStockOpnameApi(id: string, payload: any): Promise<any> {
  return request<any>(`/stock-opnames/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}