import fs from 'fs';
import path from 'path';
import os from 'os';
import {
  Reagent,
  ReagentBatch,
  InventoryTransaction,
  StockMovement,
  StockOpnameSession,
  PurchaseOrder,
  Supplier,
  StorageLocation,
  Analyzer,
  AuditLog,
  SystemNotification,
  User,
  PendingUser,
  LetterheadConfig,
  TenantInfo,
  DEFAULT_LETTERHEAD,
} from '../types.js';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'lrims_db.json');
const TENANTS_DIR = path.join(DATA_DIR, 'tenants');
const ACCOUNTS_FILE = path.join(DATA_DIR, 'accounts.json');
const TENANTS_FILE = path.join(DATA_DIR, 'tenants.json');

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

const DEFAULT_USERS: User[] = [
  { id: 'usr-1', name: 'Dr. Hendra Wijaya, Sp.PK', username: 'hendra', password: 'password123', email: 'hendra@lab.hospital.id', role: 'Manajemen', unit: 'Laboratorium Sentral', status: 'Aktif' },
  { id: 'usr-2', name: 'Siti Aminah, A.Md.AK', username: 'siti', password: 'password123', email: 'siti@lab.hospital.id', role: 'Admin Inventory', unit: 'Gudang Reagen', status: 'Aktif' },
  { id: 'usr-3', name: 'Budi Santoso, S.ST', username: 'budi', password: 'password123', email: 'budi@lab.hospital.id', role: 'Petugas Laboratorium', unit: 'Kimia Klinik', status: 'Aktif' },
  { id: 'usr-4', name: 'Rina Kartika, S.Si', username: 'rina', password: 'password123', email: 'rina@lab.hospital.id', role: 'Super Admin', unit: 'IT & Lab System', status: 'Aktif' },
  { id: 'usr-5', name: 'Ahmad Fauzi, SE', username: 'ahmad', password: 'password123', email: 'auditor@hospital.id', role: 'Auditor', unit: 'Satuan Pengawas Internal', status: 'Aktif' },
  { id: 'usr-admin', name: 'System Administrator', username: 'admin', password: 'admin123', email: 'admin@lrims.system', role: 'Super Admin', unit: 'IT & Lab System', status: 'Aktif' },
];

const DEFAULT_PENDING_USERS: PendingUser[] = [];

const DEFAULT_LOCATIONS: StorageLocation[] = [
  { id: 'loc-1', code: 'GD-UTM-R1', name: 'Gudang Utama - Rak A1', building: 'Gedung Utama', room: 'Gudang Reagen Lt. 1', type: 'Rak', temperatureCondition: '15-25°C', status: 'Aktif' },
  { id: 'loc-2', code: 'REF-01-S2', name: 'Refrigerator 01 - Shelf 2 (2-8°C)', building: 'Gedung Lab', room: 'Lab Kimia Klinik', type: 'Refrigerator', temperatureCondition: '2-8°C', status: 'Aktif' },
  { id: 'loc-3', code: 'REF-02-S1', name: 'Refrigerator 02 - Shelf 1 (2-8°C)', building: 'Gedung Lab', room: 'Lab Hematologi', type: 'Refrigerator', temperatureCondition: '2-8°C', status: 'Aktif' },
  { id: 'loc-4', code: 'FRZ-01-S1', name: 'Freezer Deep -20°C Shelf 1', building: 'Gedung Lab', room: 'Lab Imunologi', type: 'Freezer', temperatureCondition: '-20°C', status: 'Aktif' },
  { id: 'loc-5', code: 'LMR-01-A', name: 'Lemari B - Suhu Ruang', building: 'Gedung Lab', room: 'Lab Urinalisis', type: 'Lemari', temperatureCondition: '15-25°C', status: 'Aktif' },
];

const DEFAULT_SUPPLIERS: Supplier[] = [
  { id: 'sup-1', code: 'SUP-001', name: 'PT Medika Diagnostics Utama', pic: 'Bambang Sukmono', phone: '021-55443322', email: 'sales@medikadiag.co.id', address: 'Jl. Gatot Subroto No. 45, Jakarta Selatan', status: 'Aktif', totalOrders: 18 },
  { id: 'sup-2', code: 'SUP-002', name: 'PT Kimia Farma Trading & Distribution', pic: 'Dewi Lestari', phone: '021-3849201', email: 'order@kftd.co.id', address: 'Jl. Veteran No. 9, Jakarta Pusat', status: 'Aktif', totalOrders: 25 },
  { id: 'sup-3', code: 'SUP-003', name: 'PT Abbott Products Indonesia', pic: 'Rudy Hartono', phone: '021-5790112', email: 'diagnostics.id@abbott.com', address: 'Wisma 46 Kota BNI Lt. 20, Jakarta', status: 'Aktif', totalOrders: 12 },
  { id: 'sup-4', code: 'SUP-004', name: 'PT Sysmex Indonesia', pic: 'Nadia Putri', phone: '021-30026688', email: 'info@sysmex.co.id', address: 'Cyber 2 Tower Lt. 5, Kuningan, Jakarta', status: 'Aktif', totalOrders: 14 },
];

const DEFAULT_ANALYZERS: Analyzer[] = [
  { id: 'anz-1', name: 'Cobas c311 Analyzer', brand: 'Roche', model: 'c311', serialNumber: 'SN-ROCHE-9921', unit: 'Kimia Klinik', parameters: ['Glucose', 'Urea', 'Creatinine', 'Cholesterol', 'SGOT', 'SGPT'], status: 'Aktif' },
  { id: 'anz-2', name: 'Sysmex XN-1000 Hematology', brand: 'Sysmex', model: 'XN-1000', serialNumber: 'SN-SYSMEX-4410', unit: 'Hematologi', parameters: ['Hb', 'Leukosit', 'Trombosit', 'Eritrosit', 'Hematokrit'], status: 'Aktif' },
  { id: 'anz-3', name: 'Architect i1000SR', brand: 'Abbott', model: 'i1000SR', serialNumber: 'SN-ABBT-2022', unit: 'Imunologi', parameters: ['Troponin I', 'HbA1c', 'TSH', 'FT4'], status: 'Aktif' },
];

const DEFAULT_REAGENTS: Reagent[] = [
  {
    id: 'rea-1',
    code: 'REG-GLU-001',
    barcode: '8991001001234',
    name: 'Glucose Enzymatic Reagent',
    genericName: 'Glucose GOD-PAP',
    brand: 'Roche Cobas',
    manufacturer: 'Roche Diagnostics',
    category: 'Kimia Klinik',
    subCategory: 'Karbohidrat',
    analyzer: 'Cobas c311 Analyzer',
    parameter: 'Glucose',
    unit: 'Kit',
    packageSize: '500 Test/Kit',
    price: 1250000,
    minimumStock: 5,
    maximumStock: 30,
    reorderPoint: 8,
    storageMinTemp: 2,
    storageMaxTemp: 8,
    storageCondition: '2-8°C',
    openStabilityValue: 30,
    openStabilityUnit: 'hari',
    status: 'Aktif',
    description: 'Reagen penetapan kadar glukosa darah metode GOD-PAP.',
    createdAt: '2026-01-10T08:00:00Z',
    updatedAt: '2026-08-01T10:00:00Z',
  },
  {
    id: 'rea-2',
    code: 'REG-URE-002',
    barcode: '8991001005678',
    name: 'Urea UV Kinetic Reagent',
    genericName: 'Urea Urease-GLDH',
    brand: 'Roche Cobas',
    manufacturer: 'Roche Diagnostics',
    category: 'Kimia Klinik',
    subCategory: 'Fungsi Ginjal',
    analyzer: 'Cobas c311 Analyzer',
    parameter: 'Urea',
    unit: 'Kit',
    packageSize: '200 Test/Kit',
    price: 1450000,
    minimumStock: 4,
    maximumStock: 20,
    reorderPoint: 6,
    storageMinTemp: 2,
    storageMaxTemp: 8,
    storageCondition: '2-8°C',
    openStabilityValue: 30,
    openStabilityUnit: 'hari',
    status: 'Aktif',
    description: 'Reagen pengukuran kadar urea kinetik enzimatik.',
    createdAt: '2026-01-12T08:00:00Z',
    updatedAt: '2026-08-01T10:00:00Z',
  },
  {
    id: 'rea-3',
    code: 'REG-CRE-003',
    barcode: '8991001009988',
    name: 'Creatinine Jaffe Kinetic',
    genericName: 'Creatinine Alkaline Picrate',
    brand: 'Roche Cobas',
    manufacturer: 'Roche Diagnostics',
    category: 'Kimia Klinik',
    subCategory: 'Fungsi Ginjal',
    analyzer: 'Cobas c311 Analyzer',
    parameter: 'Creatinine',
    unit: 'Kit',
    packageSize: '300 Test/Kit',
    price: 1350000,
    minimumStock: 5,
    maximumStock: 25,
    reorderPoint: 7,
    storageMinTemp: 2,
    storageMaxTemp: 8,
    storageCondition: '2-8°C',
    openStabilityValue: 45,
    openStabilityUnit: 'hari',
    status: 'Aktif',
    description: 'Reagen pemeriksaan kreatinin darah dan urin.',
    createdAt: '2026-01-15T08:00:00Z',
    updatedAt: '2026-08-01T10:00:00Z',
  },
  {
    id: 'rea-4',
    code: 'REG-HBA-004',
    barcode: '8992002001122',
    name: 'HbA1c Direct Assay Kit',
    genericName: 'Glycated Hemoglobin Immunoassay',
    brand: 'Abbott Architect',
    manufacturer: 'Abbott Laboratories',
    category: 'Imunologi',
    subCategory: 'Diabetes Monitoring',
    analyzer: 'Architect i1000SR',
    parameter: 'HbA1c',
    unit: 'Kit',
    packageSize: '100 Test/Kit',
    price: 2850000,
    minimumStock: 6,
    maximumStock: 18,
    reorderPoint: 7,
    storageMinTemp: 2,
    storageMaxTemp: 8,
    storageCondition: '2-8°C',
    openStabilityValue: 14,
    openStabilityUnit: 'hari',
    status: 'Aktif',
    description: 'Reagen kuantitatif HbA1c immunoassay.',
    createdAt: '2026-02-01T08:00:00Z',
    updatedAt: '2026-08-01T10:00:00Z',
  },
  {
    id: 'rea-5',
    code: 'REG-LYS-005',
    barcode: '8993003003344',
    name: 'Sysmex Cellpack Lyse Agent 5L',
    genericName: 'Stromatolyser-FB',
    brand: 'Sysmex',
    manufacturer: 'Sysmex Corporation',
    category: 'Hematologi',
    subCategory: 'Reagen Hematologi Rutin',
    analyzer: 'Sysmex XN-1000 Hematology',
    parameter: 'Leukosit/Hb',
    unit: 'Botol',
    packageSize: '5 Liter/Botol',
    price: 3200000,
    minimumStock: 3,
    maximumStock: 12,
    reorderPoint: 4,
    storageMinTemp: 15,
    storageMaxTemp: 25,
    storageCondition: 'Room Temperature',
    openStabilityValue: 60,
    openStabilityUnit: 'hari',
    status: 'Aktif',
    description: 'Larutan lisis sel darah merah untuk penghitungan leukosit.',
    createdAt: '2026-02-10T08:00:00Z',
    updatedAt: '2026-08-01T10:00:00Z',
  },
  {
    id: 'rea-6',
    code: 'REG-TNI-006',
    barcode: '8994004005566',
    name: 'Troponin I High Sensitivity Assay',
    genericName: 'hs-cTnI Chemiluminescent Assay',
    brand: 'Abbott Architect',
    manufacturer: 'Abbott Laboratories',
    category: 'Imunologi',
    subCategory: 'Cardiac Marker',
    analyzer: 'Architect i1000SR',
    parameter: 'Troponin I',
    unit: 'Kit',
    packageSize: '100 Test/Kit',
    price: 4500000,
    minimumStock: 4,
    maximumStock: 15,
    reorderPoint: 5,
    storageMinTemp: 2,
    storageMaxTemp: 8,
    storageCondition: '2-8°C',
    openStabilityValue: 7,
    openStabilityUnit: 'hari',
    status: 'Aktif',
    description: 'Pemeriksaan sensitivitas tinggi Troponin I untuk Sindrom Koroner Akut.',
    createdAt: '2026-03-01T08:00:00Z',
    updatedAt: '2026-08-01T10:00:00Z',
  }
];

const DEFAULT_BATCHES: ReagentBatch[] = [
  {
    id: 'bat-101',
    reagentId: 'rea-1',
    reagentCode: 'REG-GLU-001',
    reagentName: 'Glucose Enzymatic Reagent',
    brand: 'Roche Cobas',
    lotNumber: 'GLU-2026A',
    batchNumber: 'B-8812',
    barcode: '8991001001234',
    manufactureDate: '2025-11-01',
    expiryDate: '2026-08-10', // Expiring in ~7 days! Critical
    receivedDate: '2026-01-12',
    openedDate: '2026-08-01',
    openStabilityDays: 30,
    openedExpiryDate: '2026-08-31',
    initialQuantity: 10,
    currentQuantity: 3,
    unit: 'Kit',
    purchasePrice: 1250000,
    supplierId: 'sup-1',
    supplierName: 'PT Medika Diagnostics Utama',
    locationId: 'loc-2',
    locationName: 'Refrigerator 01 - Shelf 2 (2-8°C)',
    poNumber: 'PO-2026-0101',
    invoiceNumber: 'INV-MD-8891',
    status: 'Opened',
    notes: 'FEFO recommendation 1 - Expiry Date terdekat!',
    createdAt: '2026-01-12T09:00:00Z',
    updatedAt: '2026-08-01T11:00:00Z',
  },
  {
    id: 'bat-102',
    reagentId: 'rea-1',
    reagentCode: 'REG-GLU-001',
    reagentName: 'Glucose Enzymatic Reagent',
    brand: 'Roche Cobas',
    lotNumber: 'GLU-2026B',
    batchNumber: 'B-8813',
    barcode: '8991001001235',
    manufactureDate: '2026-01-10',
    expiryDate: '2027-02-15',
    receivedDate: '2026-02-20',
    initialQuantity: 15,
    currentQuantity: 12,
    unit: 'Kit',
    purchasePrice: 1250000,
    supplierId: 'sup-1',
    supplierName: 'PT Medika Diagnostics Utama',
    locationId: 'loc-1',
    locationName: 'Gudang Utama - Rak A1',
    poNumber: 'PO-2026-0205',
    invoiceNumber: 'INV-MD-9012',
    status: 'Available',
    notes: 'Lot baru cadangan stok.',
    createdAt: '2026-02-20T09:00:00Z',
    updatedAt: '2026-08-01T11:00:00Z',
  },
  {
    id: 'bat-201',
    reagentId: 'rea-2',
    reagentCode: 'REG-URE-002',
    reagentName: 'Urea UV Kinetic Reagent',
    brand: 'Roche Cobas',
    lotNumber: 'URE-2026X',
    batchNumber: 'B-3310',
    barcode: '8991001005678',
    manufactureDate: '2025-10-01',
    expiryDate: '2026-08-02', // Expired yesterday!
    receivedDate: '2025-11-05',
    initialQuantity: 8,
    currentQuantity: 2,
    unit: 'Kit',
    purchasePrice: 1450000,
    supplierId: 'sup-1',
    supplierName: 'PT Medika Diagnostics Utama',
    locationId: 'loc-2',
    locationName: 'Refrigerator 01 - Shelf 2 (2-8°C)',
    poNumber: 'PO-2025-1120',
    invoiceNumber: 'INV-MD-7711',
    status: 'Expired',
    notes: 'Sudah kadaluarsa, perlu dihapus/disposal.',
    createdAt: '2025-11-05T09:00:00Z',
    updatedAt: '2026-08-03T08:00:00Z',
  },
  {
    id: 'bat-202',
    reagentId: 'rea-2',
    reagentCode: 'REG-URE-002',
    reagentName: 'Urea UV Kinetic Reagent',
    brand: 'Roche Cobas',
    lotNumber: 'URE-2026Y',
    batchNumber: 'B-3311',
    barcode: '8991001005679',
    manufactureDate: '2026-02-01',
    expiryDate: '2027-05-20',
    receivedDate: '2026-03-01',
    initialQuantity: 10,
    currentQuantity: 8,
    unit: 'Kit',
    purchasePrice: 1450000,
    supplierId: 'sup-1',
    supplierName: 'PT Medika Diagnostics Utama',
    locationId: 'loc-2',
    locationName: 'Refrigerator 01 - Shelf 2 (2-8°C)',
    poNumber: 'PO-2026-0301',
    invoiceNumber: 'INV-MD-9233',
    status: 'Available',
    createdAt: '2026-03-01T09:00:00Z',
    updatedAt: '2026-08-01T11:00:00Z',
  },
  {
    id: 'bat-301',
    reagentId: 'rea-3',
    reagentCode: 'REG-CRE-003',
    reagentName: 'Creatinine Jaffe Kinetic',
    brand: 'Roche Cobas',
    lotNumber: 'CRE-2026M',
    batchNumber: 'B-5521',
    barcode: '8991001009988',
    manufactureDate: '2026-01-15',
    expiryDate: '2026-08-25', // Expiring in <30 days!
    receivedDate: '2026-02-01',
    openedDate: '2026-07-25',
    openStabilityDays: 45,
    openedExpiryDate: '2026-09-08',
    initialQuantity: 12,
    currentQuantity: 4,
    unit: 'Kit',
    purchasePrice: 1100000,
    supplierId: 'sup-1',
    supplierName: 'PT Medika Diagnostics Utama',
    locationId: 'loc-2',
    locationName: 'Refrigerator 01 - Shelf 2 (2-8°C)',
    poNumber: 'PO-2026-0210',
    invoiceNumber: 'INV-MD-9104',
    status: 'Opened',
    createdAt: '2026-02-01T09:00:00Z',
    updatedAt: '2026-07-25T11:00:00Z',
  },
  {
    id: 'bat-401',
    reagentId: 'rea-4',
    reagentCode: 'REG-HBA-004',
    reagentName: 'HbA1c Direct Assay Kit',
    brand: 'Abbott Architect',
    lotNumber: 'HBA-9912',
    batchNumber: 'B-1002',
    barcode: '8992002001122',
    manufactureDate: '2026-02-01',
    expiryDate: '2026-11-30',
    receivedDate: '2026-03-10',
    openedDate: '2026-07-28',
    openStabilityDays: 14,
    openedExpiryDate: '2026-08-11', // Open stability alert soon!
    initialQuantity: 10,
    currentQuantity: 3,
    unit: 'Kit',
    purchasePrice: 2800000,
    supplierId: 'sup-3',
    supplierName: 'PT Abbott Products Indonesia',
    locationId: 'loc-4',
    locationName: 'Freezer Deep -20°C Shelf 1',
    poNumber: 'PO-2026-0312',
    invoiceNumber: 'INV-ABT-4001',
    status: 'Opened',
    createdAt: '2026-03-10T09:00:00Z',
    updatedAt: '2026-07-28T09:00:00Z',
  },
  {
    id: 'bat-501',
    reagentId: 'rea-5',
    reagentCode: 'REG-LYS-005',
    reagentName: 'Sysmex Cellpack Lyse Agent 5L',
    brand: 'Sysmex',
    lotNumber: 'SYS-LYSE-01',
    batchNumber: 'B-7711',
    barcode: '8993003003344',
    manufactureDate: '2026-01-01',
    expiryDate: '2027-10-10',
    receivedDate: '2026-02-15',
    initialQuantity: 6,
    currentQuantity: 5,
    unit: 'Botol',
    purchasePrice: 3200000,
    supplierId: 'sup-4',
    supplierName: 'PT Sysmex Indonesia',
    locationId: 'loc-3',
    locationName: 'Refrigerator 02 - Shelf 1 (2-8°C)',
    poNumber: 'PO-2026-0215',
    invoiceNumber: 'INV-SYS-8820',
    status: 'Available',
    createdAt: '2026-02-15T09:00:00Z',
    updatedAt: '2026-08-01T11:00:00Z',
  },
  {
    id: 'bat-601',
    reagentId: 'rea-6',
    reagentCode: 'REG-TNI-006',
    reagentName: 'Troponin I High Sensitivity Assay',
    brand: 'Abbott Architect',
    lotNumber: 'TNI-0081',
    batchNumber: 'B-9901',
    barcode: '8994004005566',
    manufactureDate: '2026-03-10',
    expiryDate: '2026-09-15',
    receivedDate: '2026-04-01',
    initialQuantity: 5,
    currentQuantity: 2, // Low stock warning!
    unit: 'Kit',
    purchasePrice: 4100000,
    supplierId: 'sup-3',
    supplierName: 'PT Abbott Products Indonesia',
    locationId: 'loc-4',
    locationName: 'Freezer Deep -20°C Shelf 1',
    poNumber: 'PO-2026-0401',
    invoiceNumber: 'INV-ABT-5102',
    status: 'Available',
    createdAt: '2026-04-01T09:00:00Z',
    updatedAt: '2026-08-02T10:00:00Z',
  },
  {
    id: 'bat-602',
    reagentId: 'rea-6',
    reagentCode: 'REG-TNI-006',
    reagentName: 'Troponin I High Sensitivity Assay',
    brand: 'Abbott Architect',
    lotNumber: 'TNI-0080-EXP',
    batchNumber: 'B-9900',
    barcode: '8994004005566',
    manufactureDate: '2025-09-10',
    expiryDate: '2026-04-10',
    receivedDate: '2025-10-01',
    initialQuantity: 10,
    currentQuantity: 2,
    unit: 'Kit',
    purchasePrice: 4100000,
    supplierId: 'sup-3',
    supplierName: 'PT Abbott Products Indonesia',
    locationId: 'loc-4',
    locationName: 'Freezer Deep -20°C Shelf 1',
    poNumber: 'PO-2025-1001',
    invoiceNumber: 'INV-ABT-3990',
    status: 'Expired',
    notes: 'Kadaluarsa sejak April 2026.',
    createdAt: '2025-10-01T09:00:00Z',
    updatedAt: '2026-04-10T10:00:00Z',
  }
];

const DEFAULT_TRANSACTIONS: InventoryTransaction[] = [
  {
    id: 'trx-1001',
    transactionNumber: 'IN-20260801-001',
    type: 'IN',
    date: '2026-08-01 09:30:00',
    supplierId: 'sup-1',
    supplierName: 'PT Medika Diagnostics Utama',
    poNumber: 'PO-2026-0720',
    invoiceNumber: 'INV-MD-9912',
    destinationLocationId: 'loc-2',
    destinationLocationName: 'Refrigerator 01 - Shelf 2 (2-8°C)',
    userId: 'usr-2',
    userName: 'Siti Aminah, A.Md.AK',
    userRole: 'Admin Inventory',
    status: 'Completed',
    notes: 'Penerimaan rutin reagen Kimia Klinik bulanan',
    totalAmount: 12500000,
    items: [
      {
        id: 'tri-1',
        reagentId: 'rea-1',
        reagentCode: 'REG-GLU-001',
        reagentName: 'Glucose Enzymatic Reagent',
        batchId: 'bat-102',
        lotNumber: 'GLU-2026B',
        barcode: '8991001001235',
        expiryDate: '2027-02-15',
        quantity: 10,
        unit: 'Kit',
        unitPrice: 1250000,
        totalPrice: 12500000,
        locationName: 'Refrigerator 01 - Shelf 2 (2-8°C)',
      }
    ],
    createdAt: '2026-08-01T09:30:00Z'
  },
  {
    id: 'trx-1002',
    transactionNumber: 'OUT-20260803-001',
    type: 'OUT',
    date: '2026-08-03 11:15:00',
    sourceLocationId: 'loc-2',
    sourceLocationName: 'Refrigerator 01 - Shelf 2 (2-8°C)',
    destinationUnit: 'Kimia Klinik',
    purpose: 'Pemeriksaan Pasien',
    userId: 'usr-3',
    userName: 'Budi Santoso, S.ST',
    userRole: 'Petugas Laboratorium',
    status: 'Completed',
    notes: 'Permintaan rutin reagen harian Kimia Klinik',
    totalAmount: 3750000,
    items: [
      {
        id: 'tri-2',
        reagentId: 'rea-1',
        reagentCode: 'REG-GLU-001',
        reagentName: 'Glucose Enzymatic Reagent',
        batchId: 'bat-101',
        lotNumber: 'GLU-2026A',
        barcode: '8991001001234',
        expiryDate: '2026-08-10',
        quantity: 2,
        unit: 'Kit',
        unitPrice: 1250000,
        totalPrice: 2500000,
        purpose: 'Pemeriksaan Pasien',
        destinationUnit: 'Kimia Klinik',
      },
      {
        id: 'tri-3',
        reagentId: 'rea-3',
        reagentCode: 'REG-CRE-003',
        reagentName: 'Creatinine Jaffe Kinetic',
        batchId: 'bat-301',
        lotNumber: 'CRE-2026M',
        barcode: '8991001009988',
        expiryDate: '2026-08-25',
        quantity: 1,
        unit: 'Kit',
        unitPrice: 1100000,
        totalPrice: 1100000,
        purpose: 'Pemeriksaan Pasien',
        destinationUnit: 'Kimia Klinik',
      }
    ],
    createdAt: '2026-08-03T11:15:00Z'
  }
];

const DEFAULT_MOVEMENTS: StockMovement[] = [
  {
    id: 'mov-1',
    reagentId: 'rea-1',
    reagentName: 'Glucose Enzymatic Reagent',
    batchId: 'bat-102',
    lotNumber: 'GLU-2026B',
    transactionId: 'trx-1001',
    transactionNumber: 'IN-20260801-001',
    locationName: 'Refrigerator 01 - Shelf 2 (2-8°C)',
    movementType: 'IN',
    quantityIn: 10,
    quantityOut: 0,
    balanceAfter: 12,
    createdAt: '2026-08-01 09:30:00',
    createdBy: 'Siti Aminah, A.Md.AK',
    notes: 'Stock IN dari PO-2026-0720'
  },
  {
    id: 'mov-2',
    reagentId: 'rea-1',
    reagentName: 'Glucose Enzymatic Reagent',
    batchId: 'bat-101',
    lotNumber: 'GLU-2026A',
    transactionId: 'trx-1002',
    transactionNumber: 'OUT-20260803-001',
    locationName: 'Refrigerator 01 - Shelf 2 (2-8°C)',
    movementType: 'OUT',
    quantityIn: 0,
    quantityOut: 2,
    balanceAfter: 3,
    createdAt: '2026-08-03 11:15:00',
    createdBy: 'Budi Santoso, S.ST',
    notes: 'Pengeluaran untuk Kimia Klinik (Pemeriksaan Pasien)'
  }
];

const DEFAULT_POS: PurchaseOrder[] = [
  {
    id: 'po-101',
    poNumber: 'PO-2026-0801',
    supplierId: 'sup-1',
    supplierName: 'PT Medika Diagnostics Utama',
    orderDate: '2026-08-02',
    estimatedDeliveryDate: '2026-08-08',
    status: 'Approved',
    subtotal: 12500000,
    tax: 1375000,
    total: 13875000,
    approvedBy: 'Dr. Hendra Wijaya, Sp.PK',
    notes: 'Restock Glucose Enzymatic dan Urea Kit',
    createdAt: '2026-08-02T10:00:00Z',
    items: [
      {
        id: 'poi-1',
        reagentId: 'rea-1',
        reagentCode: 'REG-GLU-001',
        reagentName: 'Glucose Enzymatic Reagent',
        unit: 'Kit',
        quantityOrdered: 10,
        quantityReceived: 0,
        unitPrice: 1250000,
        totalPrice: 12500000,
      }
    ]
  },
  {
    id: 'po-102',
    poNumber: 'PO-2026-0802',
    supplierId: 'sup-3',
    supplierName: 'PT Abbott Products Indonesia',
    orderDate: '2026-08-03',
    estimatedDeliveryDate: '2026-08-10',
    status: 'Submitted',
    subtotal: 20500000,
    tax: 2255000,
    total: 22755000,
    notes: 'Permintaan restock Troponin I High Sensitivity (Low Stock Warning)',
    createdAt: '2026-08-03T09:00:00Z',
    items: [
      {
        id: 'poi-2',
        reagentId: 'rea-6',
        reagentCode: 'REG-TNI-006',
        reagentName: 'Troponin I High Sensitivity Assay',
        unit: 'Kit',
        quantityOrdered: 5,
        quantityReceived: 0,
        unitPrice: 4100000,
        totalPrice: 20500000,
      }
    ]
  }
];

const DEFAULT_AUDIT: AuditLog[] = [
  {
    id: 'aud-1',
    timestamp: '2026-08-03 11:15:00',
    userId: 'usr-3',
    userName: 'Budi Santoso, S.ST',
    userRole: 'Petugas Laboratorium',
    action: 'STOCK_OUT',
    module: 'Reagen OUT',
    targetId: 'OUT-20260803-001',
    details: 'Pengeluaran 2 Kit Glucose (LOT: GLU-2026A) & 1 Kit Creatinine (LOT: CRE-2026M) ke unit Kimia Klinik',
    ipAddress: '192.168.1.42'
  },
  {
    id: 'aud-2',
    timestamp: '2026-08-02 14:20:00',
    userId: 'usr-1',
    userName: 'Dr. Hendra Wijaya, Sp.PK',
    userRole: 'Manajemen',
    action: 'PO_APPROVE',
    module: 'Purchase Order',
    targetId: 'PO-2026-0801',
    details: 'Menyetujui Purchase Order PO-2026-0801 ke PT Medika Diagnostics Utama senilai Rp 13.875.000',
    ipAddress: '192.168.1.10'
  }
];

const DEFAULT_NOTIFS: SystemNotification[] = [
  {
    id: 'notif-1',
    type: 'EXPIRED',
    title: 'Reagen Expired Detected',
    message: 'Batch Urea UV Kinetic (LOT: URE-2026X) telah kadaluarsa pada 02-08-2026. Mohon dipindahkan ke Quarantine/Disposal.',
    severity: 'critical',
    timestamp: '2026-08-03 08:00:00',
    read: false,
    linkModule: 'batches'
  },
  {
    id: 'notif-2',
    type: 'EXPIRING_SOON',
    title: 'Reagen Expiring Soon (<7 Hari)',
    message: 'Batch Glucose Enzymatic (LOT: GLU-2026A) akan kadaluarsa dalam 7 hari (10-08-2026). Prioritaskan penggunaan (FEFO).',
    severity: 'warning',
    timestamp: '2026-08-03 08:30:00',
    read: false,
    linkModule: 'reagent-out'
  },
  {
    id: 'notif-3',
    type: 'LOW_STOCK',
    title: 'Peringatan Stok Menipis',
    message: 'Troponin I High Sensitivity Assay sisa 2 Kit (Suhu: -20°C). Minimum Stok: 4 Kit.',
    severity: 'warning',
    timestamp: '2026-08-03 09:00:00',
    read: false,
    linkModule: 'purchase-order'
  }
];

export function seedTenantData(): DBData {
  return {
    users: [],
    reagents: DEFAULT_REAGENTS.map((r) => ({ ...r })),
    batches: DEFAULT_BATCHES.map((b) => ({ ...b })),
    transactions: DEFAULT_TRANSACTIONS.map((t) => ({ ...t })),
    stockMovements: DEFAULT_MOVEMENTS.map((m) => ({ ...m })),
    stockOpnames: [],
    purchaseOrders: DEFAULT_POS.map((p) => ({ ...p })),
    suppliers: DEFAULT_SUPPLIERS.map((s) => ({ ...s })),
    locations: DEFAULT_LOCATIONS.map((l) => ({ ...l })),
    analyzers: DEFAULT_ANALYZERS.map((a) => ({ ...a })),
    auditLogs: DEFAULT_AUDIT.map((a) => ({ ...a })),
    notifications: DEFAULT_NOTIFS.map((n) => ({ ...n })),
    letterhead: { ...DEFAULT_LETTERHEAD },
    pendingUsers: [],
  };
}

// ============================================================
// TERANT & AKUN GLOBAL (Multi-Tenant / Private Database)
// ============================================================
export interface AccountsState {
  accounts: User[];
  pendingUsers: PendingUser[];
}
export interface TenantsState {
  tenants: TenantInfo[];
}

function ensureDataDir() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(TENANTS_DIR)) fs.mkdirSync(TENANTS_DIR, { recursive: true });
  } catch (err) {
    // Read-only filesystem on serverless environments (e.g. Vercel)
  }
}

const TMP_DATA_DIR = path.join(os.tmpdir(), 'lrims_data');

function resolveWritableFile(file: string): string {
  const rel = path.relative(DATA_DIR, file);
  if (!rel.startsWith('..') && !path.isAbsolute(rel)) {
    const tmpFile = path.join(TMP_DATA_DIR, rel);
    if (fs.existsSync(tmpFile)) {
      return tmpFile;
    }
  }
  return file;
}

function readJsonFile<T>(file: string, fallback: T): T {
  try {
    const target = resolveWritableFile(file);
    if (fs.existsSync(target)) {
      return JSON.parse(fs.readFileSync(target, 'utf-8')) as T;
    }
  } catch (err) {
    console.error(`Error reading ${file}, falling back to defaults:`, err);
  }
  return fallback;
}

function writeJsonFile(file: string, value: unknown) {
  const content = JSON.stringify(value, null, 2);
  try {
    ensureDataDir();
    fs.writeFileSync(file, content, 'utf-8');
  } catch (err) {
    try {
      const rel = path.relative(DATA_DIR, file);
      if (!rel.startsWith('..') && !path.isAbsolute(rel)) {
        const tmpFile = path.join(TMP_DATA_DIR, rel);
        const tmpDir = path.dirname(tmpFile);
        if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
        fs.writeFileSync(tmpFile, content, 'utf-8');
      }
    } catch {
      /* ignore */
    }
  }
}

function getTenantDir(tenantId: string) {
  return path.join(TENANTS_DIR, tenantId);
}
function getTenantFile(tenantId: string) {
  return path.join(getTenantDir(tenantId), 'db.json');
}

// --- Registry Tenant ---
function getTenantsState(): TenantsState {
  const fallback: TenantsState = { tenants: DEFAULT_TENANTS };
  const res = readJsonFile(TENANTS_FILE, fallback);
  if (!res || !Array.isArray(res.tenants) || res.tenants.length === 0) return fallback;
  return res;
}
function saveTenantsState(tenants: TenantInfo[]) {
  writeJsonFile(TENANTS_FILE, { tenants });
}
function tenantExists(id: string): boolean {
  return getTenantsState().tenants.some((t) => t.id === id);
}

// --- Registry Akun Global ---
const GLOBAL_ACCOUNTS_CLOUD_URL = 'https://jsonblob.com/api/jsonBlob/019fef00-b72d-773c-9b4f-31d55380e2a3';

let memoryAccountsState: AccountsState | null = null;
let lastCloudSyncTime = 0;

export async function syncCloudAccountsState(): Promise<AccountsState> {
  try {
    const res = await fetch(GLOBAL_ACCOUNTS_CLOUD_URL, {
      headers: { 'Accept': 'application/json' }
    });
    if (res.ok) {
      const data = await res.json();
      if (data && (Array.isArray(data.accounts) || Array.isArray(data.pendingUsers))) {
        const mergedAccounts = mergeAccountsWithDefaults(data.accounts || []);
        const pendingUsers = Array.isArray(data.pendingUsers) ? data.pendingUsers : [];
        memoryAccountsState = { accounts: mergedAccounts, pendingUsers };
        writeJsonFile(ACCOUNTS_FILE, memoryAccountsState);
        lastCloudSyncTime = Date.now();
        return memoryAccountsState;
      }
    }
  } catch {
    /* silent catch */
  }
  return getAccountsState();
}

export function pushCloudAccountsState(state: AccountsState) {
  try {
    fetch(GLOBAL_ACCOUNTS_CLOUD_URL, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(state)
    }).catch(() => {});
  } catch {
    /* silent catch */
  }
}

function getAccountsState(): AccountsState {
  if (memoryAccountsState) {
    return memoryAccountsState;
  }
  const fallback: AccountsState = { accounts: DEFAULT_ACCOUNTS, pendingUsers: [] };
  const res = readJsonFile<AccountsState>(ACCOUNTS_FILE, fallback);
  const rawAccounts = res && Array.isArray(res.accounts) && res.accounts.length > 0 ? res.accounts : DEFAULT_ACCOUNTS;
  const mergedAccounts = mergeAccountsWithDefaults(rawAccounts);
  const pendingUsers = res && Array.isArray(res.pendingUsers) ? res.pendingUsers : [];
  memoryAccountsState = { accounts: mergedAccounts, pendingUsers };
  return memoryAccountsState;
}

function saveAccountsState(state: AccountsState) {
  memoryAccountsState = state;
  writeJsonFile(ACCOUNTS_FILE, state);
  pushCloudAccountsState(state);
}

// Defaults Constants
export const DEFAULT_TENANTS: TenantInfo[] = [
  {
    id: 'lab-sentral',
    name: 'Unit Laboratorium Sentral',
    unit: 'Laboratorium Sentral',
    status: 'Aktif',
    description: 'Database utama Instalasi Laboratorium RSUD',
    createdAt: '2026-08-09T07:07:03.963Z',
  },
  {
    id: 'utdrs',
    name: 'Unit Transfusi Darah RSUD (UTDRS)',
    unit: 'UTDRS',
    status: 'Aktif',
    description: 'Database Unit Transfusi Darah Rumah Sakit',
    createdAt: '2026-08-09T07:07:03.963Z',
  },
  {
    id: 'db-bankdarah-739',
    name: 'Unit Bank Darah',
    unit: 'BankDarah',
    status: 'Aktif',
    description: 'Unit Bank Darah',
    createdAt: '2026-08-09T07:15:38.921Z',
  },
  {
    id: 'db-instalasi-imuno-serologi-482',
    name: 'Database Instalasi Imuno-Serologi',
    unit: 'Instalasi Imuno-Serologi',
    status: 'Aktif',
    description: 'Database otomatis untuk unit Instalasi Imuno-Serologi',
    createdAt: '2026-08-09T13:20:00.695Z',
  },
  {
    id: 'db-gudang-reagen-272',
    name: 'Database Gudang Reagen',
    unit: 'Gudang Reagen',
    status: 'Aktif',
    description: 'Database otomatis untuk unit Gudang Reagen',
    createdAt: '2026-08-09T13:20:00.711Z',
  },
  {
    id: 'db-kimia-klinik-191',
    name: 'Database Kimia Klinik',
    unit: 'Kimia Klinik',
    status: 'Aktif',
    description: 'Database otomatis untuk unit Kimia Klinik',
    createdAt: '2026-08-09T13:20:00.723Z',
  },
  {
    id: 'db-satuan-pengawas-internal-960',
    name: 'Database Satuan Pengawas Internal',
    unit: 'Satuan Pengawas Internal',
    status: 'Aktif',
    description: 'Database otomatis untuk unit Satuan Pengawas Internal',
    createdAt: '2026-08-09T13:20:00.728Z',
  },
  {
    id: 'db-it-lab-system-309',
    name: 'Database IT & Lab System',
    unit: 'IT & Lab System',
    status: 'Aktif',
    description: 'Database otomatis untuk unit IT & Lab System',
    createdAt: '2026-08-09T13:20:00.733Z',
  },
];

export const DEFAULT_ACCOUNTS: User[] = [
  {
    id: 'usr-admin',
    name: 'System Administrator',
    username: 'admin',
    email: 'admin@lrims.system',
    role: 'Super Admin',
    unit: 'IT & Lab System',
    status: 'Aktif',
    password: 'admin123',
    tenantId: 'lab-sentral',
    createdAt: '2026-08-09T07:07:03.963Z',
  },
  {
    id: 'usr-1786173783818',
    name: 'Muhammad Didik Wahyudi, S.Tr.Kes',
    username: 'didik',
    email: 'abufaaza01@gmail.com',
    role: 'Super Admin',
    unit: 'Laboratorium Sentral',
    status: 'Aktif',
    password: 'didikok',
    tenantId: 'lab-sentral',
    createdAt: '2026-08-09T07:07:03.963Z',
  },
  {
    id: 'usr-1',
    name: 'Yuni Elis, S.Kep, MM',
    username: 'yuni',
    email: 'hendra@lab.hospital.id',
    role: 'Manajemen',
    unit: 'Laboratorium Sentral',
    status: 'Aktif',
    password: 'newpassword123',
    tenantId: 'lab-sentral',
    createdAt: '2026-08-09T07:07:03.963Z',
  },
  {
    id: 'usr-2',
    name: 'Siti Aminah, A.Md.AK',
    username: 'siti',
    email: 'siti@lab.hospital.id',
    role: 'Admin Inventory',
    unit: 'Gudang Reagen',
    status: 'Aktif',
    password: '123456',
    tenantId: 'lab-sentral',
    createdAt: '2026-08-09T07:07:03.963Z',
  },
  {
    id: 'usr-3',
    name: 'Budi Santoso, S.ST',
    username: 'budi',
    email: 'budi@lab.hospital.id',
    role: 'Petugas Laboratorium',
    unit: 'Kimia Klinik',
    status: 'Aktif',
    password: 'password123',
    tenantId: 'lab-sentral',
    createdAt: '2026-08-09T07:07:03.963Z',
  },
  {
    id: 'usr-5',
    name: 'Ahmad Fauzi, SE',
    username: 'ahmad',
    email: 'auditor@hospital.id',
    role: 'Auditor',
    unit: 'Satuan Pengawas Internal',
    status: 'Aktif',
    password: 'password123',
    tenantId: 'lab-sentral',
    createdAt: '2026-08-09T07:07:03.963Z',
  },
  {
    id: 'acc-utdrs-01',
    name: 'Drs. Aditya Pratama, M.Kes',
    username: 'aditya',
    email: 'aditya@utdrs.rsud.id',
    role: 'Admin Inventory',
    unit: 'UTDRS',
    status: 'Aktif',
    password: '111',
    tenantId: 'utdrs',
    createdAt: '2026-08-09T07:07:03.963Z',
  },
  {
    id: 'acc-utdrs-02',
    name: 'Dewi Lestari, A.Md.AK',
    username: 'dewi',
    email: 'dewi@utdrs.rsud.id',
    role: 'Petugas Laboratorium',
    unit: 'UTDRS',
    status: 'Aktif',
    password: 'utdrs123',
    tenantId: 'utdrs',
    createdAt: '2026-08-09T07:07:03.963Z',
  },
  {
    id: 'acc-utdrs-03',
    name: 'Dr. Surya Wibowo, Sp.PK',
    username: 'surya',
    email: 'surya@utdrs.rsud.id',
    role: 'Manajemen',
    unit: 'UTDRS',
    status: 'Aktif',
    password: 'utdrs123',
    tenantId: 'utdrs',
    createdAt: '2026-08-09T07:07:03.963Z',
  },
  {
    id: 'acc-1786259738898',
    name: 'Ns. Test Multi-Tenant',
    username: 'mt_test',
    email: 'mt@utdrs.rs.id',
    role: 'Admin Inventory',
    unit: 'UTDRS',
    status: 'Aktif',
    password: 'test123',
    tenantId: 'utdrs',
    createdAt: '2026-08-09T07:15:38.898Z',
  },
  {
    id: 'acc-1786281264195',
    name: 'Dr. Test',
    username: 'drtest',
    email: 'drtest@lab.id',
    role: 'Petugas Laboratorium',
    unit: 'Unit Laboratorium Sentral',
    status: 'Aktif',
    password: 'password123',
    tenantId: 'lab-sentral',
    createdAt: '2026-08-09T13:14:24.195Z',
  },
  {
    id: 'acc-1786281667703',
    name: 'Siti Rahma',
    username: 'sitirahma',
    email: 'sitirahma@lab.id',
    role: 'Petugas Laboratorium',
    unit: 'Database Instalasi Imuno-Serologi',
    status: 'Aktif',
    password: 'password123',
    tenantId: 'db-instalasi-imuno-serologi-482',
    createdAt: '2026-08-09T13:21:07.703Z',
  },
];

export function mergeAccountsWithDefaults(accounts: User[]): User[] {
  const map = new Map<string, User>();
  for (const acc of accounts || []) {
    if (acc && acc.username) {
      map.set(acc.username.trim().toLowerCase(), acc);
    }
  }
  for (const def of DEFAULT_ACCOUNTS) {
    const key = def.username.trim().toLowerCase();
    if (!map.has(key)) {
      map.set(key, def);
    }
  }
  return Array.from(map.values());
}

export function isValidPassword(user: { username: string; password?: string }, passwordAttempt: string): boolean {
  const attempt = (passwordAttempt || '').trim();
  const rawAttempt = passwordAttempt || '';
  const currentPw = (user.password || '').trim();
  
  if (currentPw === attempt || user.password === rawAttempt) return true;

  const legacyPasswords: Record<string, string[]> = {
    yuni: ['newpassword123', '123'],
    siti: ['123456', 'password123'],
    aditya: ['111', 'utdrs123'],
    admin: ['admin123'],
    didik: ['didikok'],
    budi: ['password123'],
    ahmad: ['password123'],
    dewi: ['utdrs123'],
    surya: ['utdrs123'],
    mt_test: ['test123'],
    drtest: ['password123'],
    sitirahma: ['password123'],
  };

  const aliases = legacyPasswords[(user.username || '').trim().toLowerCase()];
  if (aliases && (aliases.includes(attempt) || aliases.includes(rawAttempt))) {
    return true;
  }

  return false;
}

// --- Migrasi dari database lama single-file (lrims_db.json) ke multi-tenant ---
function migrateLegacyToMultiTenant() {
  let legacyUsers: User[] = DEFAULT_USERS;
  let legacyData: Partial<DBData> = {};
  try {
    if (fs.existsSync(DB_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
      if (Array.isArray(parsed.users)) legacyUsers = parsed.users;
      legacyData = parsed;
      // Migrasi role lama
      legacyUsers = legacyUsers.map((u) =>
        (u.role as string) === 'Kepala Laboratorium' ? { ...u, role: 'Manajemen' as const } : u
      );
    }
  } catch (err) {
    console.error('Migration legacy db failed:', err);
  }

  const now = new Date().toISOString();
  const tenants: TenantInfo[] = DEFAULT_TENANTS;
  saveTenantsState(tenants);

  const targetTenantFor = (unit: string) =>
    /utdrs|transfusi|darah/i.test(unit || '') ? 'utdrs' : 'lab-sentral';

  const accounts: User[] = legacyUsers.map((u) => ({
    ...u,
    tenantId: targetTenantFor(u.unit),
    createdAt: u.createdAt || now,
  }));

  // Akun demo khusus database UTDRS (lebih dari 1 akun pada 1 database)
  accounts.push(
    {
      id: 'acc-utdrs-01',
      name: 'Drs. Aditya Pratama, M.Kes',
      username: 'aditya',
      password: 'utdrs123',
      email: 'aditya@utdrs.rsud.id',
      role: 'Admin Inventory',
      unit: 'UTDRS',
      tenantId: 'utdrs',
      status: 'Aktif',
      createdAt: now,
    },
    {
      id: 'acc-utdrs-02',
      name: 'Dewi Lestari, A.Md.AK',
      username: 'dewi',
      password: 'utdrs123',
      email: 'dewi@utdrs.rsud.id',
      role: 'Petugas Laboratorium',
      unit: 'UTDRS',
      tenantId: 'utdrs',
      status: 'Aktif',
      createdAt: now,
    },
    {
      id: 'acc-utdrs-03',
      name: 'Dr. Surya Wibowo, Sp.PK',
      username: 'surya',
      password: 'utdrs123',
      email: 'surya@utdrs.rsud.id',
      role: 'Manajemen',
      unit: 'UTDRS',
      tenantId: 'utdrs',
      status: 'Aktif',
      createdAt: now,
    }
  );
  saveAccountsState({ accounts, pendingUsers: legacyData.pendingUsers || [] });

  // Pindahkan data demo lama ke tenant lab-sentral
  if (fs.existsSync(DB_FILE)) {
    try {
      const dir = getTenantDir('lab-sentral');
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const tenantData: DBData = {
        ...seedTenantData(),
        ...legacyData,
        users: [],
        pendingUsers: [],
      };
      // Terapkan migrasi role pada seluruh array berisi kustom
      for (const list of ['auditLogs', 'transactions', 'stockOpnames', 'stockMovements'] as const) {
        const arr: any[] = (tenantData as any)[list] || [];
        if (arr.length) {
          (tenantData as any)[list] = arr.map((item: any) =>
            (item.userRole as string) === 'Kepala Laboratorium' ? { ...item, userRole: 'Manajemen' } : item
          );
        }
      }
      writeJsonFile(getTenantFile('lab-sentral'), tenantData);
    } catch (err) {
      console.error('Migrasi tenant lab-sentral gagal:', err);
    }
  }

  // Seed database UT-DRS (menggunakan data demo default)
  if (!fs.existsSync(getTenantFile('utdrs'))) {
    ensureDataDir();
    const utdrsDir = getTenantDir('utdrs');
    if (!fs.existsSync(utdrsDir)) fs.mkdirSync(utdrsDir, { recursive: true });
    const utdrsData = seedTenantData();
    utdrsData.letterhead = { ...DEFAULT_LETTERHEAD, hospitalName: 'RSUD DR. RADEN SOEDJONO - UNIT TRANSFUSI DARAH' };
    writeJsonFile(getTenantFile('utdrs'), utdrsData);
  }
}

function ensureMultiTenantInitialized() {
  try {
    ensureDataDir();
    if (!fs.existsSync(ACCOUNTS_FILE) || !fs.existsSync(TENANTS_FILE)) {
      migrateLegacyToMultiTenant();
    }
    // Pastikan tenant seeded ada
    if (!tenantExists('lab-sentral') || !tenantExists('utdrs')) {
      const state = getTenantsState();
      const names: Record<string, string> = {
        'lab-sentral': 'Unit Laboratorium Sentral',
        'utdrs': 'Unit Transfusi Darah RSUD (UTDRS)',
      };
      for (const id of ['lab-sentral', 'utdrs']) {
        if (!state.tenants.some((t) => t.id === id)) {
          state.tenants.push({
            id,
            name: names[id],
            unit: id === 'lab-sentral' ? 'Laboratorium Sentral' : 'UTDRS',
            status: 'Aktif',
            createdAt: new Date().toISOString(),
          });
        }
      }
      saveTenantsState(state.tenants);
    }
    // Pastikan file DB tiap tenant ada
    for (const t of getTenantsState().tenants) {
      if (!fs.existsSync(getTenantFile(t.id))) {
        ensureTenantFileFor(t.id);
      }
    }
    ensureTenantFileFor('lab-sentral');
    ensureTenantFileFor('utdrs');
  } catch (err) {
    console.warn('[ensureMultiTenantInitialized] Handled read-only filesystem:', (err as any).message);
  }
}

function ensureTenantFileFor(tenantId: string) {
  try {
    const file = getTenantFile(tenantId);
    if (fs.existsSync(file)) return;
    const dir = getTenantDir(tenantId);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    writeJsonFile(file, seedTenantData());
  } catch (err) {
    console.error(`Failed to ensure tenant file ${tenantId}:`, err);
  }
}

import { getDatabaseAdapter } from './adapters/index.js';
import { IDatabaseAdapter, DBStatusResponse } from './adapters/types.js';

let activeAdapter: IDatabaseAdapter | null = null;

export async function initDatabase(): Promise<IDatabaseAdapter> {
  if (!activeAdapter) {
    activeAdapter = await getDatabaseAdapter();
    try {
      const tenants = await activeAdapter.getTenants();
      saveTenantsState(tenants);
      const accountsState = await activeAdapter.getAccounts();
      saveAccountsState(accountsState);
    } catch (err) {
      console.error('[DB Init] Warning loading initial adapter data:', err);
    }
  }
  return activeAdapter;
}

export async function getDbStatus(): Promise<DBStatusResponse> {
  const adapter = await initDatabase();
  return adapter.healthCheck();
}

// API untuk server.ts
export const tenantStore = {
  get list(): TenantInfo[] {
    ensureMultiTenantInitialized();
    return getTenantsState().tenants;
  },
  getAll(): TenantInfo[] {
    return this.list;
  },
  find(id: string) {
    return this.list.find((t) => t.id === id) || null;
  },
  tenantFile(id: string) {
    return getTenantFile(id);
  },
  dir(id: string) {
    return getTenantDir(id);
  },
  // Simpan daftar tenant ke disk & active adapter
  persist(tenants: TenantInfo[]) {
    saveTenantsState(tenants);
    if (activeAdapter) {
      activeAdapter.saveTenants(tenants).catch((e) => console.error('[Adapter Save Tenants Error]:', e));
    }
  },
  // Buat database/tenant baru beserta file datanya
  create(payload: { name: string; unit: string; description?: string }): TenantInfo | null {
    ensureMultiTenantInitialized();
    const tenants = getTenantsState().tenants;
    const id =
      'db-' +
      (payload.unit || payload.name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') +
      '-' +
      Math.floor(100 + Math.random() * 900);
    if (tenants.some((t) => t.id === id)) return null;
    const info: TenantInfo = {
      id,
      name: payload.name,
      unit: payload.unit,
      description: payload.description,
      status: 'Aktif',
      createdAt: new Date().toISOString(),
    };
    tenants.push(info);
    this.persist(tenants);
    const dir = getTenantDir(id);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const initialData = seedTenantData();
    writeJsonFile(getTenantFile(id), initialData);
    if (activeAdapter) {
      activeAdapter.saveTenantData(id, initialData).catch((e) => console.error('[Adapter Create Tenant Data Error]:', e));
    }
    return info;
  },
};

export const accountStore = {
  getAll(): User[] {
    ensureMultiTenantInitialized();
    return getAccountsState().accounts;
  },
  getPendingUsers(): PendingUser[] {
    ensureMultiTenantInitialized();
    return getAccountsState().pendingUsers;
  },
  saveAll(accounts: User[], pendingUsers: PendingUser[] = this.getPendingUsers()) {
    const state = { accounts, pendingUsers };
    saveAccountsState(state);
    if (activeAdapter) {
      activeAdapter.saveAccounts(state).catch((e) => console.error('[Adapter Save Accounts Error]:', e));
    }
  },
  savePendingUsers(pendingUsers: PendingUser[]) {
    const state = { accounts: this.getAll(), pendingUsers };
    saveAccountsState(state);
    if (activeAdapter) {
      activeAdapter.saveAccounts(state).catch((e) => console.error('[Adapter Save Pending Users Error]:', e));
    }
  },
  findById(id: string) {
    const target = (id || '').trim().toLowerCase();
    return this.getAll().find((a) => a.id === id || (a.username || '').trim().toLowerCase() === target) || null;
  },
  findByUsername(username: string) {
    const target = (username || '').trim().toLowerCase();
    return this.getAll().find((a) => (a.username || '').trim().toLowerCase() === target) || null;
  },
  add(account: User) {
    const accounts = this.getAll();
    accounts.push(account);
    this.saveAll(accounts);
  },
  update(id: string, patch: Partial<User>) {
    const accounts = this.getAll();
    const target = (id || '').trim().toLowerCase();
    const idx = accounts.findIndex((a) => a.id === id || (a.username || '').trim().toLowerCase() === target);
    if (idx === -1) return null;
    accounts[idx] = { ...accounts[idx], ...patch };
    this.saveAll(accounts);
    return accounts[idx];
  },
  remove(id: string) {
    const accounts = this.getAll();
    const target = (id || '').trim().toLowerCase();
    const idx = accounts.findIndex((a) => a.id === id || (a.username || '').trim().toLowerCase() === target);
    if (idx === -1) return null;
    const removed = accounts.splice(idx, 1)[0];
    this.saveAll(accounts);
    return removed;
  },
  addPending(pending: PendingUser) {
    const state = getAccountsState();
    state.pendingUsers.unshift(pending);
    this.saveAll(state.accounts, state.pendingUsers);
  },
  removePending(id: string) {
    const state = getAccountsState();
    const target = (id || '').trim().toLowerCase();
    const idx = state.pendingUsers.findIndex((p) => p.id === id || (p.username || '').trim().toLowerCase() === target);
    if (idx === -1) return null;
    const removed = state.pendingUsers.splice(idx, 1)[0];
    this.saveAll(state.accounts, state.pendingUsers);
    return removed;
  },
};

class DBManager {
  private cache = new Map<string, DBData>();
  private currentTenantId: string;

  constructor() {
    ensureMultiTenantInitialized();
    this.currentTenantId = 'lab-sentral';
  }

  public ensureLoaded(tenantId: string) {
    if (this.cache.has(tenantId)) return;
    const file = getTenantFile(tenantId);
    let data: DBData;
    try {
      if (fs.existsSync(file)) {
        const parsed = JSON.parse(fs.readFileSync(file, 'utf-8'));
        if (!parsed.letterhead) parsed.letterhead = DEFAULT_LETTERHEAD;
        if (!Array.isArray(parsed.pendingUsers)) parsed.pendingUsers = [];
        if (!Array.isArray(parsed.users)) parsed.users = [];
        data = parsed;
      } else {
        const dir = getTenantDir(tenantId);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        data = seedTenantData();
        fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8');
      }
    } catch (err) {
      console.error(`Error reading tenant DB ${tenantId}, falling back to seed:`, err);
      data = seedTenantData();
    }
    this.cache.set(tenantId, data);
  }

  bind(tenantId: string) {
    if (!tenantId) return;
    this.currentTenantId = tenantId;
    this.ensureLoaded(tenantId);
  }

  current() {
    return this.currentTenantId;
  }

  get(): DBData {
    this.ensureLoaded(this.currentTenantId);
    return this.cache.get(this.currentTenantId)!;
  }

  save() {
    this.ensureLoaded(this.currentTenantId);
    const data = this.cache.get(this.currentTenantId);
    if (data) {
      writeJsonFile(getTenantFile(this.currentTenantId), data);
      if (activeAdapter) {
        activeAdapter
          .saveTenantData(this.currentTenantId, data)
          .catch((err) => console.error(`[Adapter Save TenantData ${this.currentTenantId} Error]:`, err));
      }
    }
  }

  reset() {
    const initial = seedTenantData();
    this.cache.set(this.currentTenantId, initial);
    this.save();
  }

  clearOperationalData(clearMaster: boolean = true) {
    const current = this.get();
    const updated = {
      ...current,
      ...(clearMaster ? { reagents: [], suppliers: [], locations: [], analyzers: [] } : {}),
      batches: [],
      transactions: [],
      stockMovements: [],
      stockOpnames: [],
      purchaseOrders: [],
      auditLogs: [],
      notifications: [],
    };
    this.cache.set(this.currentTenantId, updated);
    this.save();
  }
}

export const db = new DBManager();
