export interface DBData {
  users: User[];
  reagents: Reagent[];
  batches: ReagentBatch[];
  transactions: InventoryTransaction[];
  stockMovements: StockMovement[];
  stockOpnames: StockOpnameSession[];
  purchaseOrders: PurchaseOrder[];
  suppliers: Supplier[];
  locations: StorageLocation[];
  analyzers: Analyzer[];
  auditLogs: AuditLog[];
  notifications: SystemNotification[];
  letterhead: LetterheadConfig;
  pendingUsers: PendingUser[];
}

export interface LetterheadConfig {
  pemdaName: string;
  hospitalName: string;
  hospitalAddress: string;
  phone: string;
  email: string;
  logoLeftUrl: string;
  logoRightUrl: string;
  signatory1Title: string; // Kabid Penunjang Medis
  signatory1Name: string;
  signatory1Nip: string;
  signatory2Title: string; // Kepala Instalasi Farmasi
  signatory2Name: string;
  signatory2Nip: string;
  signatory3Title: string; // Kepala Instalasi Laboratorium
  signatory3Name: string;
  signatory3Nip: string;
}

export const DEFAULT_LETTERHEAD: LetterheadConfig = {
  pemdaName: 'PEMERINTAH PROVINSI / KABUPATEN DINAS KESEHATAN',
  hospitalName: 'RSUD DR. RADEN SOEDJONO LABSENTRAL',
  hospitalAddress: 'Jl. Prof. Dr. Soepomo No. 45, Kompleks RSUD, Telp. (021) 555-1234',
  phone: '(021) 555-1234 / Fax: (021) 555-5678',
  email: 'info@rsud-soedjono.go.id / lab@rsud-soedjono.go.id',
  logoLeftUrl: '',
  logoRightUrl: '',
  signatory1Title: 'Kabid Penunjang Medis',
  signatory1Name: 'Dr. Hj. Endang Rahmawati, M.Kes',
  signatory1Nip: 'NIP. 19760412 200312 2 004',
  signatory2Title: 'Kepala Instalasi Farmasi',
  signatory2Name: 'Apt. Rian Hidayat, S.Farm',
  signatory2Nip: 'NIP. 19820815 200804 1 003',
  signatory3Title: 'Kepala Instalasi Laboratorium',
  signatory3Name: 'Dr. Hendra Wijaya, Sp.PK',
  signatory3Nip: 'NIP. 19791104 200604 1 009',
};

export type UserRole = 'Super Admin' | 'Admin Inventory' | 'Petugas Laboratorium' | 'Manajemen' | 'Auditor';

export interface TenantInfo {
  id: string;
  name: string;
  unit: string;
  status: 'Aktif' | 'Nonaktif';
  description?: string;
  createdAt?: string;
}

export interface User {
  id: string;
  name: string;
  username: string;
  password?: string;
  email: string;
  role: UserRole;
  unit: string;
  status: 'Aktif' | 'Nonaktif';
  tenantId?: string;
  tenantName?: string;
  createdBy?: string;
  createdAt?: string;
}

export type Account = User;

export interface PendingUser {
  id: string;
  name: string;
  username: string;
  password: string;
  email: string;
  unit: string;
  requestedRole: UserRole;
  registeredAt: string;
  tenantId?: string;
  message?: string;
}

export interface Reagent {
  id: string;
  code: string;
  barcode: string;
  name: string;
  genericName?: string;
  brand: string;
  manufacturer: string;
  category: string;
  subCategory?: string;
  analyzer?: string;
  parameter?: string;
  unit: string; // e.g., Box, Kit, Vial, Botol, Test
  packageSize: string; // e.g., 100 tests/kit
  price?: number; // Harga satuan/kit (Rp)
  sellingPrice?: number; // Harga jual/kit (Rp)
  minimumStock: number;
  maximumStock: number;
  reorderPoint: number;
  storageMinTemp: number; // e.g. 2
  storageMaxTemp: number; // e.g. 8
  storageCondition: 'Room Temperature' | '2-8°C' | '-20°C' | '-80°C' | 'Protected from Light';
  openStabilityValue?: number; // e.g. 30
  openStabilityUnit?: 'hari' | 'minggu' | 'bulan';
  status: 'Aktif' | 'Tidak Aktif';
  description?: string;
  photoUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export type BatchStatus = 'Available' | 'Opened' | 'Quarantine' | 'Damaged' | 'Expired' | 'Empty' | 'Returned';

export interface ReagentBatch {
  id: string;
  reagentId: string;
  reagentCode: string;
  reagentName: string;
  brand: string;
  lotNumber: string;
  batchNumber: string;
  barcode: string;
  manufactureDate?: string;
  expiryDate: string; // ISO Date YYYY-MM-DD
  receivedDate: string;
  openedDate?: string; // ISO Date YYYY-MM-DD
  openStabilityDays?: number; // Calculated days stability after opening
  openedExpiryDate?: string; // Calculated date limit after opened
  initialQuantity: number;
  currentQuantity: number;
  unit: string;
  purchasePrice: number;
  supplierId: string;
  supplierName: string;
  locationId: string;
  locationName: string;
  poNumber?: string;
  invoiceNumber?: string;
  status: BatchStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type TransactionType = 'IN' | 'OUT' | 'TRANSFER' | 'ADJUSTMENT' | 'WASTE' | 'RETURN';

export type UsagePurpose = 'Pemeriksaan Pasien' | 'QC Internal' | 'Kalibrasi' | 'PME' | 'Validasi' | 'Penelitian' | 'Training' | 'Kerusakan/Expired' | 'Lainnya';

export type DestinationUnit = 'Kimia Klinik' | 'Hematologi' | 'Imunologi' | 'Mikrobiologi' | 'Urinalisis' | 'Bank Darah' | 'Patologi Anatomi' | 'Gudang Utama' | 'Lainnya';

export interface TransactionItem {
  id: string;
  reagentId: string;
  reagentCode: string;
  reagentName: string;
  batchId: string;
  lotNumber: string;
  barcode: string;
  expiryDate: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
  locationId?: string;
  locationName?: string;
  purpose?: UsagePurpose;
  destinationUnit?: DestinationUnit;
  notes?: string;
}

export interface InventoryTransaction {
  id: string;
  transactionNumber: string;
  type: TransactionType;
  date: string; // ISO string YYYY-MM-DD HH:mm:ss
  supplierId?: string;
  supplierName?: string;
  poNumber?: string;
  invoiceNumber?: string;
  sourceLocationId?: string;
  sourceLocationName?: string;
  destinationLocationId?: string;
  destinationLocationName?: string;
  destinationUnit?: DestinationUnit;
  purpose?: UsagePurpose;
  userId: string;
  userName: string;
  userRole: UserRole;
  notes?: string;
  status: 'Completed' | 'Pending' | 'Cancelled';
  items: TransactionItem[];
  totalAmount: number;
  createdAt: string;
}

export interface StockMovement {
  id: string;
  reagentId: string;
  reagentName: string;
  batchId: string;
  lotNumber: string;
  transactionId: string;
  transactionNumber: string;
  locationName: string;
  movementType: TransactionType;
  quantityIn: number;
  quantityOut: number;
  balanceAfter: number;
  createdAt: string;
  createdBy: string;
  notes?: string;
}

export interface StockOpnameItem {
  id: string;
  reagentId: string;
  reagentCode: string;
  reagentName: string;
  batchId: string;
  lotNumber: string;
  expiryDate: string;
  locationName: string;
  systemStock: number;
  physicalStock: number;
  difference: number;
  unitPrice: number;
  differenceValue: number; // difference * unitPrice
  notes?: string;
}

export interface StockOpnameSession {
  id: string;
  sessionNumber: string;
  title: string;
  locationId: string;
  locationName: string;
  date: string;
  userId: string;
  userName: string;
  status: 'Draft' | 'Finalized' | 'Cancelled';
  totalItems: number;
  totalDifference: number;
  notes?: string;
  items: StockOpnameItem[];
  createdAt: string;
}

export type POStatus = 'Draft' | 'Submitted' | 'Approved' | 'Ordered' | 'Partial Received' | 'Received' | 'Cancelled';

export interface POItem {
  id: string;
  reagentId: string;
  reagentCode: string;
  reagentName: string;
  unit: string;
  quantityOrdered: number;
  quantityReceived: number;
  unitPrice: number;
  totalPrice: number;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplierId: string;
  supplierName: string;
  orderDate: string;
  estimatedDeliveryDate: string;
  status: POStatus;
  items: POItem[];
  subtotal: number;
  tax: number;
  total: number;
  approvedBy?: string;
  notes?: string;
  createdAt: string;
}

export interface Supplier {
  id: string;
  code: string;
  name: string;
  pic: string;
  phone: string;
  email: string;
  address: string;
  status: 'Aktif' | 'Nonaktif';
  totalOrders?: number;
}

export interface StorageLocation {
  id: string;
  code: string;
  name: string; // e.g. Refrigerator 01 - Shelf 02
  building: string;
  room: string;
  type: 'Gudang' | 'Rak' | 'Lemari' | 'Refrigerator' | 'Freezer';
  temperatureCondition: string;
  status: 'Aktif' | 'Nonaktif';
}

export interface Analyzer {
  id: string;
  name: string;
  brand: string;
  model: string;
  serialNumber: string;
  unit: string;
  parameters: string[];
  status: 'Aktif' | 'Nonaktif';
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: string;
  module: string;
  targetId?: string;
  details: string;
  ipAddress?: string;
}

export interface SystemNotification {
  id: string;
  type: 'LOW_STOCK' | 'EXPIRED' | 'EXPIRING_SOON' | 'OPEN_STABILITY' | 'PO_APPROVAL' | 'QUARANTINE';
  title: string;
  message: string;
  severity: 'critical' | 'warning' | 'info';
  timestamp: string;
  read: boolean;
  linkModule?: string;
}

export interface ReportFilter {
  startDate: string;
  endDate: string;
  searchQuery: string;
  category: string;
  locationId: string;
  supplierId: string;
  transactionType: string;
  purpose: string;
  expiryStatus: string; // 'all' | 'expired' | 'critical' (<=7d) | 'warning' (<=30d) | 'attention' (<=90d)
  analyzer: string;
}
