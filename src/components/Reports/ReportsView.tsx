import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Download,
  Printer,
  Search,
  Filter,
  Calendar,
  Layers,
  MapPin,
  Truck,
  Building2,
  FileText,
  Clock,
  DollarSign,
  Boxes,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  ClipboardCheck,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  ShoppingBag,
  Trash2,
  Edit2,
  X,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  Reagent,
  ReagentBatch,
  InventoryTransaction,
  StockOpnameSession,
  PurchaseOrder,
  Supplier,
  StorageLocation,
  ReportFilter,
} from '../../types.js';
import {
  deleteBatchApi,
  updateBatchApi,
  deleteTransactionApi,
  updateTransactionApi,
  deleteStockOpnameApi,
  updateStockOpnameApi,
  deletePOApi,
  updatePOApi,
} from '../../lib/api.js';

interface ReportsViewProps {
  reagents: Reagent[];
  batches: ReagentBatch[];
  transactions: InventoryTransaction[];
  stockOpnames: StockOpnameSession[];
  purchaseOrders?: PurchaseOrder[];
  suppliers: Supplier[];
  locations: StorageLocation[];
  currentRole: string;
  onDataChange?: () => Promise<void>;
}

type ReportTab = 'stock' | 'transactions' | 'expiry' | 'usage' | 'open-stability' | 'opname' | 'po';

export const ReportsView: React.FC<ReportsViewProps> = ({
  reagents,
  batches,
  transactions,
  stockOpnames,
  purchaseOrders = [],
  suppliers,
  locations,
  currentRole,
  onDataChange,
}) => {
  const [activeReportTab, setActiveReportTab] = useState<ReportTab>('stock');

  const canEdit = currentRole === 'Super Admin' || currentRole === 'Admin Inventory';

  // Checklist Selections
  const [selectedBatchIds, setSelectedBatchIds] = useState<Set<string>>(new Set());
  const [selectedTransactionIds, setSelectedTransactionIds] = useState<Set<string>>(new Set());
  const [selectedOpnameIds, setSelectedOpnameIds] = useState<Set<string>>(new Set());
  const [selectedPoIds, setSelectedPoIds] = useState<Set<string>>(new Set());
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);

  // Edit Targets
  const [editBatchTarget, setEditBatchTarget] = useState<ReagentBatch | null>(null);
  const [editTransactionTarget, setEditTransactionTarget] = useState<InventoryTransaction | null>(null);
  const [editOpnameTarget, setEditOpnameTarget] = useState<StockOpnameSession | null>(null);
  const [editPoTarget, setEditPoTarget] = useState<PurchaseOrder | null>(null);

  // Form States
  const [editBatchForm, setEditBatchForm] = useState({ purchasePrice: 0, lotNumber: '', expiryDate: '', locationId: '' });
  const [editTxForm, setEditTxForm] = useState({ destinationUnit: '', purpose: '', date: '' });
  const [editOpnameForm, setEditOpnameForm] = useState({ title: '', date: '' });
  const [editPoForm, setEditPoForm] = useState({ status: '', notes: '' });

  // === BATCHES HANDLERS ===
  const toggleSelectBatch = (id: string) => {
    setSelectedBatchIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const toggleSelectAllBatches = (filtered: ReagentBatch[]) => {
    if (filtered.length > 0 && filtered.every(b => selectedBatchIds.has(b.id))) {
      setSelectedBatchIds(new Set());
    } else {
      setSelectedBatchIds(new Set(filtered.map(b => b.id)));
    }
  };
  const handleBulkDeleteBatches = async () => {
    if (selectedBatchIds.size === 0) return;
    if (!window.confirm(`Hapus ${selectedBatchIds.size} batch/lot yang dipilih? Tindakan ini tidak bisa dibatalkan.`)) return;
    setBulkDeleteLoading(true);
    try {
      for (const id of Array.from(selectedBatchIds)) {
        await deleteBatchApi(id as string).catch(() => {});
      }
      setSelectedBatchIds(new Set());
      await onDataChange?.();
    } catch (err: any) {
      alert(err.message || 'Gagal menghapus beberapa batch');
    } finally {
      setBulkDeleteLoading(false);
    }
  };
  const handleSingleDeleteBatch = async (id: string) => {
    if (!window.confirm('Hapus batch/lot ini?')) return;
    try {
      await deleteBatchApi(id);
      setSelectedBatchIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      await onDataChange?.();
    } catch (err: any) {
      alert(err.message || 'Gagal menghapus batch');
    }
  };
  const openEditBatchModal = (b: ReagentBatch) => {
    setEditBatchTarget(b);
    setEditBatchForm({
      purchasePrice: b.purchasePrice,
      lotNumber: b.lotNumber,
      expiryDate: b.expiryDate,
      locationId: b.locationId || '',
    });
  };
  const handleUpdateBatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editBatchTarget) return;
    try {
      const loc = locations.find(l => l.id === editBatchForm.locationId);
      await updateBatchApi(editBatchTarget.id, {
        purchasePrice: editBatchForm.purchasePrice,
        lotNumber: editBatchForm.lotNumber,
        expiryDate: editBatchForm.expiryDate,
        locationId: editBatchForm.locationId || undefined,
        locationName: loc ? `${loc.name} (${loc.temperatureCondition})` : editBatchTarget.locationName,
      });
      setEditBatchTarget(null);
      await onDataChange?.();
    } catch (err: any) {
      alert(err.message || 'Gagal mengupdate batch');
    }
  };

  // === TRANSACTIONS HANDLERS ===
  const toggleSelectTransaction = (id: string) => {
    setSelectedTransactionIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const toggleSelectAllTransactions = (filtered: InventoryTransaction[]) => {
    if (filtered.length > 0 && filtered.every(t => selectedTransactionIds.has(t.id))) {
      setSelectedTransactionIds(new Set());
    } else {
      setSelectedTransactionIds(new Set(filtered.map(t => t.id)));
    }
  };
  const handleBulkDeleteTransactions = async () => {
    if (selectedTransactionIds.size === 0) return;
    if (!window.confirm(`Hapus ${selectedTransactionIds.size} transaksi yang dipilih? Tindakan ini tidak bisa dibatalkan.`)) return;
    setBulkDeleteLoading(true);
    try {
      for (const id of Array.from(selectedTransactionIds)) {
        await deleteTransactionApi(id as string).catch(() => {});
      }
      setSelectedTransactionIds(new Set());
      await onDataChange?.();
    } catch (err: any) {
      alert(err.message || 'Gagal menghapus beberapa transaksi');
    } finally {
      setBulkDeleteLoading(false);
    }
  };
  const handleSingleDeleteTransaction = async (id: string) => {
    if (!window.confirm('Hapus transaksi ini?')) return;
    try {
      await deleteTransactionApi(id);
      setSelectedTransactionIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      await onDataChange?.();
    } catch (err: any) {
      alert(err.message || 'Gagal menghapus transaksi');
    }
  };
  const openEditTransactionModal = (t: InventoryTransaction) => {
    setEditTransactionTarget(t);
    setEditTxForm({
      destinationUnit: t.destinationUnit || '',
      purpose: t.purpose || '',
      date: t.date,
    });
  };
  const handleUpdateTransactionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTransactionTarget) return;
    try {
      await updateTransactionApi(editTransactionTarget.id, editTxForm);
      setEditTransactionTarget(null);
      await onDataChange?.();
    } catch (err: any) {
      alert(err.message || 'Gagal mengupdate transaksi');
    }
  };

  // === STOCK OPNAMES HANDLERS ===
  const toggleSelectOpname = (id: string) => {
    setSelectedOpnameIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const toggleSelectAllOpnames = (filtered: StockOpnameSession[]) => {
    if (filtered.length > 0 && filtered.every(so => selectedOpnameIds.has(so.id))) {
      setSelectedOpnameIds(new Set());
    } else {
      setSelectedOpnameIds(new Set(filtered.map(so => so.id)));
    }
  };
  const handleBulkDeleteOpnames = async () => {
    if (selectedOpnameIds.size === 0) return;
    if (!window.confirm(`Hapus ${selectedOpnameIds.size} sesi stock opname yang dipilih?`)) return;
    setBulkDeleteLoading(true);
    try {
      for (const id of Array.from(selectedOpnameIds)) {
        await deleteStockOpnameApi(id as string).catch(() => {});
      }
      setSelectedOpnameIds(new Set());
      await onDataChange?.();
    } catch (err: any) {
      alert(err.message || 'Gagal menghapus beberapa stock opname');
    } finally {
      setBulkDeleteLoading(false);
    }
  };
  const handleSingleDeleteOpname = async (id: string) => {
    if (!window.confirm('Hapus sesi stock opname ini?')) return;
    try {
      await deleteStockOpnameApi(id);
      setSelectedOpnameIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      await onDataChange?.();
    } catch (err: any) {
      alert(err.message || 'Gagal menghapus stock opname');
    }
  };
  const openEditOpnameModal = (so: StockOpnameSession) => {
    setEditOpnameTarget(so);
    setEditOpnameForm({
      title: so.title,
      date: so.date,
    });
  };
  const handleUpdateOpnameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editOpnameTarget) return;
    try {
      await updateStockOpnameApi(editOpnameTarget.id, editOpnameForm);
      setEditOpnameTarget(null);
      await onDataChange?.();
    } catch (err: any) {
      alert(err.message || 'Gagal mengupdate stock opname');
    }
  };

  // === PO HANDLERS ===
  const toggleSelectPo = (id: string) => {
    setSelectedPoIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const toggleSelectAllPos = (filtered: PurchaseOrder[]) => {
    if (filtered.length > 0 && filtered.every(po => selectedPoIds.has(po.id))) {
      setSelectedPoIds(new Set());
    } else {
      setSelectedPoIds(new Set(filtered.map(po => po.id)));
    }
  };
  const handleBulkDeletePos = async () => {
    if (selectedPoIds.size === 0) return;
    if (!window.confirm(`Hapus ${selectedPoIds.size} purchase order yang dipilih?`)) return;
    setBulkDeleteLoading(true);
    try {
      for (const id of Array.from(selectedPoIds)) {
        await deletePOApi(id as string).catch(() => {});
      }
      setSelectedPoIds(new Set());
      await onDataChange?.();
    } catch (err: any) {
      alert(err.message || 'Gagal menghapus beberapa PO');
    } finally {
      setBulkDeleteLoading(false);
    }
  };
  const handleSingleDeletePo = async (id: string) => {
    if (!window.confirm('Hapus purchase order ini?')) return;
    try {
      await deletePOApi(id);
      setSelectedPoIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      await onDataChange?.();
    } catch (err: any) {
      alert(err.message || 'Gagal menghapus PO');
    }
  };
  const openEditPoModal = (po: PurchaseOrder) => {
    setEditPoTarget(po);
    setEditPoForm({
      status: po.status,
      notes: po.notes || '',
    });
  };
  const handleUpdatePoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editPoTarget) return;
    try {
      await updatePOApi(editPoTarget.id, editPoForm);
      setEditPoTarget(null);
      await onDataChange?.();
    } catch (err: any) {
      alert(err.message || 'Gagal mengupdate PO');
    }
  };

  // Filters State
  const [filters, setFilters] = useState<ReportFilter>({
    startDate: '',
    endDate: '',
    searchQuery: '',
    category: 'all',
    locationId: 'all',
    supplierId: 'all',
    transactionType: 'all',
    purpose: 'all',
    expiryStatus: 'all',
    analyzer: 'all',
  });

  // Date Presets
  const applyDatePreset = (preset: 'today' | '7days' | 'thisMonth' | 'thisYear' | 'all') => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    if (preset === 'today') {
      setFilters({ ...filters, startDate: todayStr, endDate: todayStr });
    } else if (preset === '7days') {
      const d = new Date();
      d.setDate(today.getDate() - 7);
      setFilters({ ...filters, startDate: d.toISOString().split('T')[0], endDate: todayStr });
    } else if (preset === 'thisMonth') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
      setFilters({ ...filters, startDate: firstDay, endDate: todayStr });
    } else if (preset === 'thisYear') {
      const firstDay = new Date(today.getFullYear(), 0, 1).toISOString().split('T')[0];
      setFilters({ ...filters, startDate: firstDay, endDate: todayStr });
    } else {
      setFilters({ ...filters, startDate: '', endDate: '' });
    }
  };

  const handleResetFilters = () => {
    setFilters({
      startDate: '',
      endDate: '',
      searchQuery: '',
      category: 'all',
      locationId: 'all',
      supplierId: 'all',
      transactionType: 'all',
      purpose: 'all',
      expiryStatus: 'all',
      analyzer: 'all',
    });
  };

  // Filtered Batches for Stock & Expiry Reports
  const filteredBatches = batches.filter((b) => {
    const reg = reagents.find((r) => r.id === b.reagentId);

    // Search query filter
    if (filters.searchQuery.trim()) {
      const q = filters.searchQuery.toLowerCase();
      const match =
        b.reagentName.toLowerCase().includes(q) ||
        b.reagentCode.toLowerCase().includes(q) ||
        b.lotNumber.toLowerCase().includes(q) ||
        b.barcode.toLowerCase().includes(q) ||
        b.supplierName.toLowerCase().includes(q);
      if (!match) return false;
    }

    // Category
    if (filters.category !== 'all' && reg?.category !== filters.category) return false;

    // Location
    if (filters.locationId !== 'all' && b.locationId !== filters.locationId) return false;

    // Supplier
    if (filters.supplierId !== 'all' && b.supplierId !== filters.supplierId) return false;

    // Expiry Status
    if (filters.expiryStatus !== 'all') {
      const expDate = new Date(b.expiryDate);
      const now = new Date();
      const diffDays = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 3600 * 24));

      if (filters.expiryStatus === 'expired' && diffDays >= 0) return false;
      if (filters.expiryStatus === 'critical' && (diffDays < 0 || diffDays > 7)) return false;
      if (filters.expiryStatus === 'warning' && (diffDays <= 7 || diffDays > 30)) return false;
      if (filters.expiryStatus === 'attention' && (diffDays <= 30 || diffDays > 90)) return false;
    }

    return true;
  });

  // Filtered Transactions
  const filteredTransactions = transactions.filter((t) => {
    // Search
    if (filters.searchQuery.trim()) {
      const q = filters.searchQuery.toLowerCase();
      const matchNumber = t.transactionNumber.toLowerCase().includes(q);
      const matchItem = t.items.some(
        (it) =>
          it.reagentName.toLowerCase().includes(q) ||
          it.lotNumber.toLowerCase().includes(q) ||
          it.barcode.toLowerCase().includes(q)
      );
      if (!matchNumber && !matchItem) return false;
    }

    // Date Range
    if (filters.startDate) {
      if (t.date < filters.startDate) return false;
    }
    if (filters.endDate) {
      if (t.date > filters.endDate + ' 23:59:59') return false;
    }

    // Transaction Type
    if (filters.transactionType !== 'all' && t.type !== filters.transactionType) return false;

    // Purpose
    if (filters.purpose !== 'all' && t.purpose !== filters.purpose) return false;

    return true;
  });

  // Filtered Purchase Orders for Page 7
  const filteredPOs = purchaseOrders.filter((po) => {
    // Search query
    if (filters.searchQuery.trim()) {
      const q = filters.searchQuery.toLowerCase();
      const matchNum = po.poNumber.toLowerCase().includes(q);
      const matchSup = po.supplierName.toLowerCase().includes(q);
      const matchNotes = (po.notes || '').toLowerCase().includes(q);
      const matchItem = po.items.some((it) => it.reagentName.toLowerCase().includes(q));
      if (!matchNum && !matchSup && !matchNotes && !matchItem) return false;
    }

    // Date Range
    if (filters.startDate && po.orderDate < filters.startDate) return false;
    if (filters.endDate && po.orderDate > filters.endDate + ' 23:59:59') return false;

    // Supplier
    if (filters.supplierId !== 'all' && po.supplierId !== filters.supplierId) return false;

    return true;
  });

  // Export to Excel (.xlsx)
  const handleExportExcel = () => {
    let exportData: any[] = [];
    let fileName = 'Laporan_LRIMS.xlsx';

    if (activeReportTab === 'stock') {
      fileName = 'Laporan_Stok_Reagen.xlsx';
      exportData = filteredBatches.map((b, idx) => ({
        'No': idx + 1,
        'Kode Reagen': b.reagentCode,
        'Nama Reagen': b.reagentName,
        'Merk': b.brand,
        'Nomor Lot': b.lotNumber,
        'Barcode': b.barcode,
        'Stok Fisik': b.currentQuantity,
        'Satuan': b.unit,
        'Suhu Storage': b.locationName,
        'Harga Beli/Unit (Rp)': b.purchasePrice,
        'Nilai Stok (Rp)': b.currentQuantity * b.purchasePrice,
        'Tanggal ED': b.expiryDate,
        'Status': b.status,
        'Supplier': b.supplierName,
      }));
    } else if (activeReportTab === 'transactions') {
      fileName = 'Laporan_Transaksi_Mutasi.xlsx';
      exportData = filteredTransactions.flatMap((t, idx) =>
        t.items.map((it) => ({
          'No Transaksi': t.transactionNumber,
          'Tanggal': t.date,
          'Tipe Transaksi': t.type,
          'Kode Reagen': it.reagentCode,
          'Nama Reagen': it.reagentName,
          'Nomor Lot': it.lotNumber,
          'Jumlah': it.quantity,
          'Satuan': it.unit,
          'Harga Satuan (Rp)': it.unitPrice,
          'Total Nilai (Rp)': it.totalPrice,
          'Unit Tujuan': t.destinationUnit || '-',
          'Tujuan Penggunaan': t.purpose || '-',
          'Petugas': t.userName,
        }))
      );
    } else if (activeReportTab === 'expiry') {
      fileName = 'Laporan_Kadaluarsa_ED.xlsx';
      exportData = filteredBatches.map((b, idx) => {
        const expDate = new Date(b.expiryDate);
        const now = new Date();
        const diffDays = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 3600 * 24));
        return {
          'No': idx + 1,
          'Nama Reagen': b.reagentName,
          'Nomor Lot': b.lotNumber,
          'Sisa Stok': b.currentQuantity,
          'Satuan': b.unit,
          'Tanggal ED': b.expiryDate,
          'Sisa Hari ED': diffDays,
          'Status ED': diffDays < 0 ? 'KADALUARSA' : diffDays <= 7 ? 'KRITIS' : diffDays <= 30 ? 'PERINGATAN' : 'NORMAL',
          'Lokasi Storage': b.locationName,
        };
      });
    } else if (activeReportTab === 'po') {
      fileName = 'Laporan_Purchase_Order_PO.xlsx';
      exportData = filteredPOs.map((po, idx) => ({
        'No': idx + 1,
        'Nomor PO': po.poNumber,
        'Tanggal Order': po.orderDate,
        'Supplier Vendor': po.supplierName,
        'Jumlah Item': po.items.length,
        'Rincian Reagen': po.items.map((i) => `${i.reagentName} (${i.quantityOrdered} ${i.unit})`).join('; '),
        'Subtotal (Rp)': po.subtotal,
        'PPN 11% (Rp)': po.tax,
        'Total Nilai PO (Rp)': po.total,
        'Status PO': po.status,
        'Disetujui Oleh': po.approvedBy || '-',
        'Catatan': po.notes || '-',
      }));
    }

    if (exportData.length === 0) {
      alert('Tidak ada data yang dapat diekspor.');
      return;
    }

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Laporan');
    XLSX.writeFile(wb, fileName);
  };

  // Export to PDF
  const handleExportPDF = () => {
    const doc = new jsPDF('landscape');
    doc.setFontSize(14);
    doc.text('INSTALASI LABORATORIUM RUMAH SAKIT', 14, 12);
    doc.setFontSize(10);

    if (activeReportTab === 'stock') {
      doc.text('LAPORAN PERSERDIAAN STOK REAGEN & VALUASI', 14, 20);
      const tableData = filteredBatches.map((b, idx) => [
        idx + 1,
        b.reagentCode,
        b.reagentName,
        b.lotNumber,
        `${b.currentQuantity} ${b.unit}`,
        `Rp ${b.purchasePrice.toLocaleString('id-ID')}`,
        `Rp ${(b.currentQuantity * b.purchasePrice).toLocaleString('id-ID')}`,
        b.expiryDate,
        b.locationName,
      ]);
      autoTable(doc, {
        startY: 25,
        head: [['No', 'Kode', 'Nama Reagen', 'Lot Number', 'Stok', 'Harga/Unit', 'Total Nilai', 'ED', 'Lokasi']],
        body: tableData,
        styles: { fontSize: 8 },
      });
    } else if (activeReportTab === 'transactions') {
      doc.text('LAPORAN MUTASI & TRANSAKSI REAGEN (IN / OUT)', 14, 20);
      const tableData = filteredTransactions.flatMap((t) =>
        t.items.map((it) => [
          t.transactionNumber,
          t.date.split(' ')[0],
          t.type,
          it.reagentName,
          it.lotNumber,
          `${it.quantity} ${it.unit}`,
          `Rp ${it.totalPrice.toLocaleString('id-ID')}`,
          t.destinationUnit || '-',
          t.userName,
        ])
      );
      autoTable(doc, {
        startY: 25,
        head: [['No Trx', 'Tanggal', 'Tipe', 'Nama Reagen', 'Lot', 'Jumlah', 'Total Value', 'Unit Tujuan', 'Petugas']],
        body: tableData,
        styles: { fontSize: 8 },
      });
    } else if (activeReportTab === 'po') {
      doc.text('LAPORAN REKAPITULASI PURCHASE ORDER (PO)', 14, 20);
      const tableData = filteredPOs.map((po, idx) => [
        idx + 1,
        po.poNumber,
        po.orderDate,
        po.supplierName,
        po.items.map((i) => `${i.reagentName} (${i.quantityOrdered} ${i.unit})`).join(', '),
        `Rp ${po.subtotal.toLocaleString('id-ID')}`,
        `Rp ${po.tax.toLocaleString('id-ID')}`,
        `Rp ${po.total.toLocaleString('id-ID')}`,
        po.status,
      ]);
      autoTable(doc, {
        startY: 25,
        head: [['No', 'Nomor PO', 'Tanggal', 'Supplier', 'Item Reagen', 'Subtotal', 'PPN 11%', 'Total PO', 'Status']],
        body: tableData,
        styles: { fontSize: 8 },
      });
    } else {
      window.print();
      return;
    }

    doc.save(`Laporan_SI_REAGEN_${activeReportTab}.pdf`);
  };

  // KPI Calculations
  const totalStockValue = filteredBatches.reduce((acc, b) => acc + b.currentQuantity * b.purchasePrice, 0);
  const totalItemsCount = filteredBatches.reduce((acc, b) => acc + b.currentQuantity, 0);

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="rounded-lg bg-indigo-100 p-2 text-indigo-700">
              <FileSpreadsheet className="h-6 w-6" />
            </span>
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Menu Laporan Lengkap & Analisis</h2>
              <p className="text-xs text-slate-500">
                Akses laporan komprehensif stok, transaksi IN/OUT, masa kadaluarsa, pemakaian per unit, PO, dan ekspor ke Excel/PDF.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={handleExportExcel}
            className="flex items-center space-x-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-emerald-700 transition shadow-sm"
          >
            <Download className="h-4 w-4" />
            <span>Ekspor Excel (.xlsx)</span>
          </button>
          <button
            onClick={handleExportPDF}
            className="flex items-center space-x-2 rounded-lg bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 transition shadow-sm"
          >
            <Printer className="h-4 w-4" />
            <span>Cetak / PDF</span>
          </button>
        </div>
      </div>

      {/* Report Sub-Tabs Navigation (7 TABS) */}
      <div className="flex items-center space-x-2 border-b border-slate-200 overflow-x-auto custom-scrollbar pb-1">
        <button
          onClick={() => setActiveReportTab('stock')}
          className={`flex items-center space-x-2 px-4 py-2 text-xs font-semibold rounded-lg transition shrink-0 ${
            activeReportTab === 'stock'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Boxes className="h-4 w-4" />
          <span>1. Laporan Stok & Valuasi</span>
        </button>

        <button
          onClick={() => setActiveReportTab('transactions')}
          className={`flex items-center space-x-2 px-4 py-2 text-xs font-semibold rounded-lg transition shrink-0 ${
            activeReportTab === 'transactions'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <ArrowLeftRight className="h-4 w-4" />
          <span>2. Laporan Transaksi IN/OUT</span>
        </button>

        <button
          onClick={() => setActiveReportTab('expiry')}
          className={`flex items-center space-x-2 px-4 py-2 text-xs font-semibold rounded-lg transition shrink-0 ${
            activeReportTab === 'expiry'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Clock className="h-4 w-4" />
          <span>3. Laporan Masa Kadaluarsa (ED)</span>
        </button>

        <button
          onClick={() => setActiveReportTab('usage')}
          className={`flex items-center space-x-2 px-4 py-2 text-xs font-semibold rounded-lg transition shrink-0 ${
            activeReportTab === 'usage'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Building2 className="h-4 w-4" />
          <span>4. Pemakaian Per Unit</span>
        </button>

        <button
          onClick={() => setActiveReportTab('open-stability')}
          className={`flex items-center space-x-2 px-4 py-2 text-xs font-semibold rounded-lg transition shrink-0 ${
            activeReportTab === 'open-stability'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Clock className="h-4 w-4" />
          <span>5. Open Stability Reagen</span>
        </button>

        <button
          onClick={() => setActiveReportTab('opname')}
          className={`flex items-center space-x-2 px-4 py-2 text-xs font-semibold rounded-lg transition shrink-0 ${
            activeReportTab === 'opname'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <ClipboardCheck className="h-4 w-4" />
          <span>6. Stock Opname & Selisih</span>
        </button>

        <button
          onClick={() => setActiveReportTab('po')}
          className={`flex items-center space-x-2 px-4 py-2 text-xs font-semibold rounded-lg transition shrink-0 ${
            activeReportTab === 'po'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <ShoppingBag className="h-4 w-4" />
          <span>7. Laporan Purchase Order (PO)</span>
        </button>
      </div>

      {/* Extensive Filter Panel */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-teal-600" />
            <h3 className="font-bold text-slate-800 text-sm">Panel Filter Kolom Laporan</h3>
          </div>
          <button
            onClick={handleResetFilters}
            className="flex items-center space-x-1 text-xs font-semibold text-rose-600 hover:text-rose-700"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Reset Semua Filter</span>
          </button>
        </div>

        {/* Date Presets Quick Bar */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="font-bold text-slate-500 mr-1">Preset Rentang Tanggal:</span>
          <button
            onClick={() => applyDatePreset('today')}
            className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 font-medium hover:bg-slate-100 text-slate-700"
          >
            Hari Ini
          </button>
          <button
            onClick={() => applyDatePreset('7days')}
            className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 font-medium hover:bg-slate-100 text-slate-700"
          >
            7 Hari Terakhir
          </button>
          <button
            onClick={() => applyDatePreset('thisMonth')}
            className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 font-medium hover:bg-slate-100 text-slate-700"
          >
            Bulan Ini
          </button>
          <button
            onClick={() => applyDatePreset('thisYear')}
            className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 font-medium hover:bg-slate-100 text-slate-700"
          >
            Tahun Ini
          </button>
          <button
            onClick={() => applyDatePreset('all')}
            className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 font-medium hover:bg-slate-100 text-slate-700"
          >
            Semua Tanggal
          </button>
        </div>

        {/* Filter Inputs Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Tanggal Mulai</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              className="w-full rounded-xl border border-slate-300 p-2 font-semibold"
            />
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">Tanggal Sampai</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              className="w-full rounded-xl border border-slate-300 p-2 font-semibold"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Supplier Vendor</label>
            <select
              value={filters.supplierId}
              onChange={(e) => setFilters({ ...filters, supplierId: e.target.value })}
              className="w-full rounded-xl border border-slate-300 p-2 font-semibold"
            >
              <option value="all">Semua Supplier</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Kata Kunci Pencarian</label>
            <input
              type="text"
              value={filters.searchQuery}
              onChange={(e) => setFilters({ ...filters, searchQuery: e.target.value })}
              placeholder="Kode, lot, reagen, PO..."
              className="w-full rounded-xl border border-slate-300 p-2 font-semibold"
            />
          </div>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {activeReportTab === 'po' ? (
          <>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Purchase Order (PO)</span>
              <p className="text-2xl font-black text-slate-900 mt-1">{filteredPOs.length} Dokumen PO</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Nilai Pemesanan (Subtotal)</span>
              <p className="text-2xl font-black text-indigo-600 mt-1">
                Rp {filteredPOs.reduce((a, b) => a + b.subtotal, 0).toLocaleString('id-ID')}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Nilai Keseluruhan (Termasuk PPN)</span>
              <p className="text-2xl font-black text-teal-600 mt-1">
                Rp {filteredPOs.reduce((a, b) => a + b.total, 0).toLocaleString('id-ID')}
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Jenis Batch / Lot</span>
              <p className="text-2xl font-black text-slate-900 mt-1">{filteredBatches.length} Batch Lot</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Fisik Kuantitas Stok</span>
              <p className="text-2xl font-black text-teal-600 mt-1">{totalItemsCount} Unit</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Estimasi Nilai Total Asset Stok</span>
              <p className="text-2xl font-black text-indigo-600 mt-1">Rp {totalStockValue.toLocaleString('id-ID')}</p>
            </div>
          </>
        )}
      </div>

      {/* Main Report Table Container */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          {activeReportTab === 'stock' && (
            <>
              {canEdit && selectedBatchIds.size > 0 && (
                <div className="flex items-center justify-between bg-rose-50 border-b border-rose-200 px-4 py-2.5">
                  <span className="text-xs font-bold text-rose-800">{selectedBatchIds.size} batch dipilih</span>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setSelectedBatchIds(new Set())}
                      className="rounded-lg border border-rose-300 px-3 py-1 text-xs font-bold text-rose-700 hover:bg-rose-100 transition"
                    >
                      Batalkan
                    </button>
                    <button
                      disabled={bulkDeleteLoading}
                      onClick={handleBulkDeleteBatches}
                      className="flex items-center space-x-1 px-3 py-1 rounded-lg bg-rose-600 text-xs font-bold text-white hover:bg-rose-700 transition"
                    >
                      <Trash2 className="h-3 w-3" />
                      <span>Hapus Terpilih</span>
                    </button>
                  </div>
                </div>
              )}
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider">
                  <tr>
                    {canEdit && (
                      <th className="pl-4 py-3 w-8">
                        <input
                          type="checkbox"
                          checked={filteredBatches.length > 0 && filteredBatches.every(b => selectedBatchIds.has(b.id))}
                          onChange={() => toggleSelectAllBatches(filteredBatches)}
                          className="w-4 h-4 rounded cursor-pointer accent-indigo-600"
                        />
                      </th>
                    )}
                    <th className="px-4 py-3">No</th>
                    <th className="px-4 py-3">Kode & Nama Reagen</th>
                    <th className="px-4 py-3">Lot Number</th>
                    <th className="px-4 py-3">Stok Fisik</th>
                    <th className="px-4 py-3">Harga Beli/Unit</th>
                    <th className="px-4 py-3">Total Nilai Valuasi</th>
                    <th className="px-4 py-3">Tgl Kadaluarsa (ED)</th>
                    <th className="px-4 py-3">Lokasi Storage</th>
                    {canEdit && <th className="px-4 py-3 text-right">Aksi</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {filteredBatches.map((b, idx) => (
                    <tr key={b.id} className={`hover:bg-slate-50/80 transition ${selectedBatchIds.has(b.id) ? 'bg-indigo-50/40' : ''}`}>
                      {canEdit && (
                        <td className="pl-4 py-3">
                          <input
                            type="checkbox"
                            checked={selectedBatchIds.has(b.id)}
                            onChange={() => toggleSelectBatch(b.id)}
                            className="w-4 h-4 rounded cursor-pointer accent-indigo-600"
                          />
                        </td>
                      )}
                      <td className="px-4 py-3 font-bold text-slate-500">{idx + 1}</td>
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        <div>{b.reagentName}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{b.reagentCode}</div>
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-indigo-700">{b.lotNumber}</td>
                      <td className="px-4 py-3 font-bold text-teal-800">
                        {b.currentQuantity} {b.unit}
                      </td>
                      <td className="px-4 py-3">Rp {b.purchasePrice.toLocaleString('id-ID')}</td>
                      <td className="px-4 py-3 font-bold text-slate-900">
                        Rp {(b.currentQuantity * b.purchasePrice).toLocaleString('id-ID')}
                      </td>
                      <td className="px-4 py-3 font-mono">{b.expiryDate}</td>
                      <td className="px-4 py-3">{b.locationName}</td>
                      {canEdit && (
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end space-x-1.5">
                            <button
                              onClick={() => openEditBatchModal(b)}
                              className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 hover:text-indigo-600 transition"
                              title="Edit"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleSingleDeleteBatch(b.id)}
                              className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 hover:text-rose-600 transition"
                              title="Hapus"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          {activeReportTab === 'transactions' && (
            <>
              {canEdit && selectedTransactionIds.size > 0 && (
                <div className="flex items-center justify-between bg-rose-50 border-b border-rose-200 px-4 py-2.5">
                  <span className="text-xs font-bold text-rose-800">{selectedTransactionIds.size} transaksi dipilih</span>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setSelectedTransactionIds(new Set())}
                      className="rounded-lg border border-rose-300 px-3 py-1 text-xs font-bold text-rose-700 hover:bg-rose-100 transition"
                    >
                      Batalkan
                    </button>
                    <button
                      disabled={bulkDeleteLoading}
                      onClick={handleBulkDeleteTransactions}
                      className="flex items-center space-x-1 px-3 py-1 rounded-lg bg-rose-600 text-xs font-bold text-white hover:bg-rose-700 transition"
                    >
                      <Trash2 className="h-3 w-3" />
                      <span>Hapus Terpilih</span>
                    </button>
                  </div>
                </div>
              )}
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider">
                  <tr>
                    {canEdit && (
                      <th className="pl-4 py-3 w-8">
                        <input
                          type="checkbox"
                          checked={filteredTransactions.length > 0 && filteredTransactions.every(t => selectedTransactionIds.has(t.id))}
                          onChange={() => toggleSelectAllTransactions(filteredTransactions)}
                          className="w-4 h-4 rounded cursor-pointer accent-indigo-600"
                        />
                      </th>
                    )}
                    <th className="px-4 py-3">No Transaksi</th>
                    <th className="px-4 py-3">Tgl & Waktu</th>
                    <th className="px-4 py-3">Tipe</th>
                    <th className="px-4 py-3">Detail Items Reagen</th>
                    <th className="px-4 py-3">Total Nilai Trx</th>
                    <th className="px-4 py-3">Unit Tujuan / Tujuan</th>
                    <th className="px-4 py-3">Petugas Audit</th>
                    {canEdit && <th className="px-4 py-3 text-right">Aksi</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {filteredTransactions.map((t) => (
                    <tr key={t.id} className={`hover:bg-slate-50/80 transition ${selectedTransactionIds.has(t.id) ? 'bg-indigo-50/40' : ''}`}>
                      {canEdit && (
                        <td className="pl-4 py-3">
                          <input
                            type="checkbox"
                            checked={selectedTransactionIds.has(t.id)}
                            onChange={() => toggleSelectTransaction(t.id)}
                            className="w-4 h-4 rounded cursor-pointer accent-indigo-600"
                          />
                        </td>
                      )}
                      <td className="px-4 py-3 font-mono font-bold text-slate-900">{t.transactionNumber}</td>
                      <td className="px-4 py-3 font-mono">{t.date}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                            t.type === 'IN'
                              ? 'bg-emerald-100 text-emerald-800'
                              : t.type === 'OUT'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-indigo-100 text-indigo-800'
                          }`}
                        >
                          {t.type}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {t.items.map((it) => (
                          <div key={it.id} className="text-xs">
                            <span className="font-semibold text-slate-900">{it.reagentName}</span> ({it.quantity} {it.unit})
                          </div>
                        ))}
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-900">Rp {t.totalAmount.toLocaleString('id-ID')}</td>
                      <td className="px-4 py-3">{t.destinationUnit || t.purpose || '-'}</td>
                      <td className="px-4 py-3">{t.userName}</td>
                      {canEdit && (
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end space-x-1.5">
                            <button
                              onClick={() => openEditTransactionModal(t)}
                              className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 hover:text-indigo-600 transition"
                              title="Edit"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleSingleDeleteTransaction(t.id)}
                              className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 hover:text-rose-600 transition"
                              title="Hapus"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          {activeReportTab === 'expiry' && (
            <>
              {canEdit && selectedBatchIds.size > 0 && (
                <div className="flex items-center justify-between bg-rose-50 border-b border-rose-200 px-4 py-2.5">
                  <span className="text-xs font-bold text-rose-800">{selectedBatchIds.size} batch dipilih</span>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setSelectedBatchIds(new Set())}
                      className="rounded-lg border border-rose-300 px-3 py-1 text-xs font-bold text-rose-700 hover:bg-rose-100 transition"
                    >
                      Batalkan
                    </button>
                    <button
                      disabled={bulkDeleteLoading}
                      onClick={handleBulkDeleteBatches}
                      className="flex items-center space-x-1 px-3 py-1 rounded-lg bg-rose-600 text-xs font-bold text-white hover:bg-rose-700 transition"
                    >
                      <Trash2 className="h-3 w-3" />
                      <span>Hapus Terpilih</span>
                    </button>
                  </div>
                </div>
              )}
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider">
                  <tr>
                    {canEdit && (
                      <th className="pl-4 py-3 w-8">
                        <input
                          type="checkbox"
                          checked={filteredBatches.length > 0 && filteredBatches.every(b => selectedBatchIds.has(b.id))}
                          onChange={() => toggleSelectAllBatches(filteredBatches)}
                          className="w-4 h-4 rounded cursor-pointer accent-indigo-600"
                        />
                      </th>
                    )}
                    <th className="px-4 py-3">Nama Reagen</th>
                    <th className="px-4 py-3">Lot Number</th>
                    <th className="px-4 py-3">Sisa Stok</th>
                    <th className="px-4 py-3">Tgl Kadaluarsa (ED)</th>
                    <th className="px-4 py-3">Status ED</th>
                    <th className="px-4 py-3">Lokasi Storage</th>
                    <th className="px-4 py-3">Supplier Vendor</th>
                    {canEdit && <th className="px-4 py-3 text-right">Aksi</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {filteredBatches.map((b) => {
                    const expDate = new Date(b.expiryDate);
                    const now = new Date();
                    const diffDays = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 3600 * 24));

                    let statusBadge = (
                      <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                        Normal (&gt; 90 Hari)
                      </span>
                    );
                    if (diffDays < 0) {
                      statusBadge = (
                        <span className="rounded bg-rose-600 px-2 py-0.5 text-[10px] font-bold text-white">
                          KADALUARSA
                        </span>
                      );
                    } else if (diffDays <= 7) {
                      statusBadge = (
                        <span className="rounded bg-amber-600 px-2 py-0.5 text-[10px] font-bold text-white">
                          KRITIS ({diffDays} Hari)
                        </span>
                      );
                    } else if (diffDays <= 30) {
                      statusBadge = (
                        <span className="rounded bg-yellow-100 px-2 py-0.5 text-[10px] font-bold text-yellow-900">
                          Peringatan ({diffDays} Hari)
                        </span>
                      );
                    }

                    return (
                      <tr key={b.id} className={`hover:bg-slate-50/80 transition ${selectedBatchIds.has(b.id) ? 'bg-indigo-50/40' : ''}`}>
                        {canEdit && (
                          <td className="pl-4 py-3">
                            <input
                              type="checkbox"
                              checked={selectedBatchIds.has(b.id)}
                              onChange={() => toggleSelectBatch(b.id)}
                              className="w-4 h-4 rounded cursor-pointer accent-indigo-600"
                            />
                          </td>
                        )}
                        <td className="px-4 py-3 font-semibold text-slate-900">{b.reagentName}</td>
                        <td className="px-4 py-3 font-mono">
                          <span className="font-bold">{b.lotNumber}</span>
                          <span className="block text-[10px] text-slate-500">{b.barcode}</span>
                        </td>
                        <td className="px-4 py-3 font-bold text-teal-800">
                          {b.currentQuantity} {b.unit}
                        </td>
                        <td className="px-4 py-3 font-bold text-slate-900">{b.expiryDate}</td>
                        <td className="px-4 py-3">{statusBadge}</td>
                        <td className="px-4 py-3">{b.locationName}</td>
                        <td className="px-4 py-3">{b.supplierName}</td>
                        {canEdit && (
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end space-x-1.5">
                              <button
                                onClick={() => openEditBatchModal(b)}
                                className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 hover:text-indigo-600 transition"
                                title="Edit"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => handleSingleDeleteBatch(b.id)}
                                className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 hover:text-rose-600 transition"
                                title="Hapus"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </>
          )}

          {activeReportTab === 'usage' && (
            <div className="p-6 text-slate-600 text-xs">
              <h4 className="font-bold text-slate-900 text-sm mb-3">Ringkasan Pemakaian Reagen per Unit Laboratorium</h4>
              <p className="mb-4">Data diakumulasi dari seluruh transaksi Reagen OUT berdasarkan unit kerja.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {['Kimia Klinik', 'Hematologi', 'Imunologi', 'Urinalisis', 'Mikrobiologi'].map((unitName) => {
                  const unitTrxs = transactions.filter((t) => t.type === 'OUT' && t.destinationUnit === unitName);
                  const totalVal = unitTrxs.reduce((acc, t) => acc + t.totalAmount, 0);
                  const itemCount = unitTrxs.reduce((acc, t) => acc + t.items.length, 0);

                  return (
                    <div key={unitName} className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 text-sm">{unitName}</span>
                        <span className="rounded bg-teal-100 text-teal-800 font-bold px-2 py-0.5 text-[11px]">
                          {unitTrxs.length} Transaksi
                        </span>
                      </div>
                      <p className="text-xs text-slate-600">Total Item Reagen Dipakai: <strong>{itemCount} Item</strong></p>
                      <p className="text-xs font-bold text-slate-900">Total Biaya Pemakaian: Rp {totalVal.toLocaleString('id-ID')}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeReportTab === 'open-stability' && (
            <>
              {canEdit && selectedBatchIds.size > 0 && (
                <div className="flex items-center justify-between bg-rose-50 border-b border-rose-200 px-4 py-2.5">
                  <span className="text-xs font-bold text-rose-800">{selectedBatchIds.size} batch dipilih</span>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setSelectedBatchIds(new Set())}
                      className="rounded-lg border border-rose-300 px-3 py-1 text-xs font-bold text-rose-700 hover:bg-rose-100 transition"
                    >
                      Batalkan
                    </button>
                    <button
                      disabled={bulkDeleteLoading}
                      onClick={handleBulkDeleteBatches}
                      className="flex items-center space-x-1 px-3 py-1 rounded-lg bg-rose-600 text-xs font-bold text-white hover:bg-rose-700 transition"
                    >
                      <Trash2 className="h-3 w-3" />
                      <span>Hapus Terpilih</span>
                    </button>
                  </div>
                </div>
              )}
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider">
                  <tr>
                    {canEdit && (
                      <th className="pl-4 py-3 w-8">
                        <input
                          type="checkbox"
                          checked={batches.filter((b) => b.openedDate || b.status === 'Opened').length > 0 && batches.filter((b) => b.openedDate || b.status === 'Opened').every(b => selectedBatchIds.has(b.id))}
                          onChange={() => toggleSelectAllBatches(batches.filter((b) => b.openedDate || b.status === 'Opened'))}
                          className="w-4 h-4 rounded cursor-pointer accent-indigo-600"
                        />
                      </th>
                    )}
                    <th className="px-4 py-3">Nama Reagen</th>
                    <th className="px-4 py-3">Lot Number</th>
                    <th className="px-4 py-3">Tgl Dibuka</th>
                    <th className="px-4 py-3">Stabilitas (Hari)</th>
                    <th className="px-4 py-3">Batas Tgl Setelah Dibuka</th>
                    <th className="px-4 py-3">ED Kemasan Original</th>
                    <th className="px-4 py-3">Status</th>
                    {canEdit && <th className="px-4 py-3 text-right">Aksi</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {batches.filter((b) => b.openedDate || b.status === 'Opened').map((b) => (
                    <tr key={b.id} className={`hover:bg-slate-50/80 transition ${selectedBatchIds.has(b.id) ? 'bg-indigo-50/40' : ''}`}>
                      {canEdit && (
                        <td className="pl-4 py-3">
                          <input
                            type="checkbox"
                            checked={selectedBatchIds.has(b.id)}
                            onChange={() => toggleSelectBatch(b.id)}
                            className="w-4 h-4 rounded cursor-pointer accent-indigo-600"
                          />
                        </td>
                      )}
                      <td className="px-4 py-3 font-semibold text-slate-900">{b.reagentName}</td>
                      <td className="px-4 py-3 font-mono font-bold">{b.lotNumber}</td>
                      <td className="px-4 py-3">{b.openedDate || '-'}</td>
                      <td className="px-4 py-3 font-bold">{b.openStabilityDays || 30} Hari</td>
                      <td className="px-4 py-3 font-bold text-teal-800">{b.openedExpiryDate || '-'}</td>
                      <td className="px-4 py-3">{b.expiryDate}</td>
                      <td className="px-4 py-3">
                        <span className="rounded bg-blue-100 text-blue-800 px-2 py-0.5 text-[10px] font-bold">
                          AKTIF DIBUKA
                        </span>
                      </td>
                      {canEdit && (
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end space-x-1.5">
                            <button
                              onClick={() => openEditBatchModal(b)}
                              className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 hover:text-indigo-600 transition"
                              title="Edit"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleSingleDeleteBatch(b.id)}
                              className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 hover:text-rose-600 transition"
                              title="Hapus"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          {activeReportTab === 'opname' && (
            <>
              {canEdit && selectedOpnameIds.size > 0 && (
                <div className="flex items-center justify-between bg-rose-50 border-b border-rose-200 px-4 py-2.5">
                  <span className="text-xs font-bold text-rose-800">{selectedOpnameIds.size} stock opname dipilih</span>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setSelectedOpnameIds(new Set())}
                      className="rounded-lg border border-rose-300 px-3 py-1 text-xs font-bold text-rose-700 hover:bg-rose-100 transition"
                    >
                      Batalkan
                    </button>
                    <button
                      disabled={bulkDeleteLoading}
                      onClick={handleBulkDeleteOpnames}
                      className="flex items-center space-x-1 px-3 py-1 rounded-lg bg-rose-600 text-xs font-bold text-white hover:bg-rose-700 transition"
                    >
                      <Trash2 className="h-3 w-3" />
                      <span>Hapus Terpilih</span>
                    </button>
                  </div>
                </div>
              )}
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider">
                  <tr>
                    {canEdit && (
                      <th className="pl-4 py-3 w-8">
                        <input
                          type="checkbox"
                          checked={stockOpnames.length > 0 && stockOpnames.every(so => selectedOpnameIds.has(so.id))}
                          onChange={() => toggleSelectAllOpnames(stockOpnames)}
                          className="w-4 h-4 rounded cursor-pointer accent-indigo-600"
                        />
                      </th>
                    )}
                    <th className="px-4 py-3">No</th>
                    <th className="px-4 py-3">Nomor Sesi</th>
                    <th className="px-4 py-3">Judul Sesi</th>
                    <th className="px-4 py-3">Tanggal Sesi</th>
                    <th className="px-4 py-3">Lokasi Penyimpanan</th>
                    <th className="px-4 py-3">Penanggung Jawab</th>
                    <th className="px-4 py-3">Total Item</th>
                    <th className="px-4 py-3">Total Selisih</th>
                    {canEdit && <th className="px-4 py-3 text-right">Aksi</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {stockOpnames.length === 0 ? (
                    <tr>
                      <td colSpan={canEdit ? 10 : 8} className="text-center py-10 text-slate-400 font-medium">
                        Belum ada sesi stock opname yang difinalisasi.
                      </td>
                    </tr>
                  ) : (
                    stockOpnames.map((so, idx) => (
                      <tr key={so.id} className={`hover:bg-slate-50/80 transition ${selectedOpnameIds.has(so.id) ? 'bg-indigo-50/40' : ''}`}>
                        {canEdit && (
                          <td className="pl-4 py-3">
                            <input
                              type="checkbox"
                              checked={selectedOpnameIds.has(so.id)}
                              onChange={() => toggleSelectOpname(so.id)}
                              className="w-4 h-4 rounded cursor-pointer accent-indigo-600"
                            />
                          </td>
                        )}
                        <td className="px-4 py-3 font-bold text-slate-500">{idx + 1}</td>
                        <td className="px-4 py-3 font-mono font-bold text-indigo-700">{so.sessionNumber}</td>
                        <td className="px-4 py-3 font-semibold text-slate-900">{so.title}</td>
                        <td className="px-4 py-3 font-mono">{so.date}</td>
                        <td className="px-4 py-3">{so.locationName}</td>
                        <td className="px-4 py-3">{so.userName}</td>
                        <td className="px-4 py-3 font-bold text-teal-800">{so.totalItems} Item</td>
                        <td className="px-4 py-3 font-bold text-rose-800">{so.totalDifference} Unit</td>
                        {canEdit && (
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end space-x-1.5">
                              <button
                                onClick={() => openEditOpnameModal(so)}
                                className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 hover:text-indigo-600 transition"
                                title="Edit"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => handleSingleDeleteOpname(so.id)}
                                className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 hover:text-rose-600 transition"
                                title="Hapus"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </>
          )}

          {activeReportTab === 'po' && (
            <>
              {canEdit && selectedPoIds.size > 0 && (
                <div className="flex items-center justify-between bg-rose-50 border-b border-rose-200 px-4 py-2.5">
                  <span className="text-xs font-bold text-rose-800">{selectedPoIds.size} purchase order dipilih</span>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setSelectedPoIds(new Set())}
                      className="rounded-lg border border-rose-300 px-3 py-1 text-xs font-bold text-rose-700 hover:bg-rose-100 transition"
                    >
                      Batalkan
                    </button>
                    <button
                      disabled={bulkDeleteLoading}
                      onClick={handleBulkDeletePos}
                      className="flex items-center space-x-1 px-3 py-1 rounded-lg bg-rose-600 text-xs font-bold text-white hover:bg-rose-700 transition"
                    >
                      <Trash2 className="h-3 w-3" />
                      <span>Hapus Terpilih</span>
                    </button>
                  </div>
                </div>
              )}
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider">
                  <tr>
                    {canEdit && (
                      <th className="pl-4 py-3 w-8">
                        <input
                          type="checkbox"
                          checked={filteredPOs.length > 0 && filteredPOs.every(po => selectedPoIds.has(po.id))}
                          onChange={() => toggleSelectAllPos(filteredPOs)}
                          className="w-4 h-4 rounded cursor-pointer accent-indigo-600"
                        />
                      </th>
                    )}
                    <th className="px-4 py-3">No</th>
                    <th className="px-4 py-3">Nomor PO</th>
                    <th className="px-4 py-3">Tgl Order</th>
                    <th className="px-4 py-3">Supplier Vendor</th>
                    <th className="px-4 py-3">Rincian Item Reagen</th>
                    <th className="px-4 py-3">Subtotal</th>
                    <th className="px-4 py-3">PPN 11%</th>
                    <th className="px-4 py-3">Total PO</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Catatan</th>
                    {canEdit && <th className="px-4 py-3 text-right">Aksi</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {filteredPOs.length === 0 ? (
                    <tr>
                      <td colSpan={canEdit ? 12 : 10} className="text-center py-10 text-slate-400 font-medium">
                        Tidak ada dokumen Purchase Order (PO) yang cocok dengan filter pencarian.
                      </td>
                    </tr>
                  ) : (
                    filteredPOs.map((po, idx) => (
                      <tr key={po.id} className={`hover:bg-slate-50/80 transition ${selectedPoIds.has(po.id) ? 'bg-indigo-50/40' : ''}`}>
                        {canEdit && (
                          <td className="pl-4 py-3">
                            <input
                              type="checkbox"
                              checked={selectedPoIds.has(po.id)}
                              onChange={() => toggleSelectPo(po.id)}
                              className="w-4 h-4 rounded cursor-pointer accent-indigo-600"
                            />
                          </td>
                        )}
                        <td className="px-4 py-3 font-bold text-slate-500">{idx + 1}</td>
                        <td className="px-4 py-3 font-mono font-bold text-indigo-700">{po.poNumber}</td>
                        <td className="px-4 py-3 font-mono">{po.orderDate}</td>
                        <td className="px-4 py-3 font-semibold text-slate-900">{po.supplierName}</td>
                        <td className="px-4 py-3">
                          {po.items.map((i) => (
                            <div key={i.id} className="text-[11px]">
                              <span className="font-semibold text-slate-900">{i.reagentName}</span> ({i.quantityOrdered} {i.unit})
                            </div>
                          ))}
                        </td>
                        <td className="px-4 py-3 font-medium">Rp {po.subtotal.toLocaleString('id-ID')}</td>
                        <td className="px-4 py-3 font-medium">Rp {po.tax.toLocaleString('id-ID')}</td>
                        <td className="px-4 py-3 font-bold text-slate-900">Rp {po.total.toLocaleString('id-ID')}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded px-2 py-0.5 text-[10px] font-extrabold ${
                              po.status === 'Approved'
                                ? 'bg-emerald-100 text-emerald-800'
                                : po.status === 'Submitted'
                                ? 'bg-blue-100 text-blue-800'
                                : po.status === 'Received'
                                ? 'bg-purple-100 text-purple-800'
                                : po.status === 'Draft'
                                ? 'bg-slate-100 text-slate-700'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {po.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[11px] text-slate-500">{po.notes || '-'}</td>
                        {canEdit && (
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end space-x-1.5">
                              <button
                                onClick={() => openEditPoModal(po)}
                                className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 hover:text-indigo-600 transition"
                                title="Edit"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => handleSingleDeletePo(po.id)}
                                className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 hover:text-rose-600 transition"
                                title="Hapus"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </>
          )}
        </div>
      </div>

      {/* === EDIT BATCH MODAL === */}
      {editBatchTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-800">Edit Batch/Lot: {editBatchTarget.lotNumber}</h3>
              <button onClick={() => setEditBatchTarget(null)} className="rounded-lg p-1 hover:bg-slate-100"><X className="h-4 w-4" /></button>
            </div>
            <form onSubmit={handleUpdateBatchSubmit} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Harga Beli</label>
                <input
                  type="number"
                  value={editBatchForm.purchasePrice}
                  onChange={(e) => setEditBatchForm({ ...editBatchForm, purchasePrice: Number(e.target.value) })}
                  className="w-full rounded-lg border border-slate-200 p-2 text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Nomor Lot</label>
                <input
                  type="text"
                  value={editBatchForm.lotNumber}
                  onChange={(e) => setEditBatchForm({ ...editBatchForm, lotNumber: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 p-2 text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Tanggal Kadaluarsa (ED)</label>
                <input
                  type="date"
                  value={editBatchForm.expiryDate}
                  onChange={(e) => setEditBatchForm({ ...editBatchForm, expiryDate: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 p-2 text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Lokasi Storage</label>
                <select
                  value={editBatchForm.locationId}
                  onChange={(e) => setEditBatchForm({ ...editBatchForm, locationId: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 p-2 text-xs"
                >
                  <option value="">Pilih Lokasi</option>
                  {locations.map(l => (
                    <option key={l.id} value={l.id}>{l.name} ({l.temperatureCondition})</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                <button type="button" onClick={() => setEditBatchTarget(null)} className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold">Batal</button>
                <button type="submit" className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* === EDIT TRANSACTION MODAL === */}
      {editTransactionTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-800">Edit Transaksi: {editTransactionTarget.transactionNumber}</h3>
              <button onClick={() => setEditTransactionTarget(null)} className="rounded-lg p-1 hover:bg-slate-100"><X className="h-4 w-4" /></button>
            </div>
            <form onSubmit={handleUpdateTransactionSubmit} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Unit Tujuan</label>
                <input
                  type="text"
                  value={editTxForm.destinationUnit}
                  onChange={(e) => setEditTxForm({ ...editTxForm, destinationUnit: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 p-2 text-xs"
                  placeholder="Contoh: Hematologi, Kimia Klinik, dll"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Tujuan / Keterangan</label>
                <input
                  type="text"
                  value={editTxForm.purpose}
                  onChange={(e) => setEditTxForm({ ...editTxForm, purpose: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 p-2 text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Tanggal Transaksi</label>
                <input
                  type="text"
                  value={editTxForm.date}
                  onChange={(e) => setEditTxForm({ ...editTxForm, date: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 p-2 text-xs"
                />
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                <button type="button" onClick={() => setEditTransactionTarget(null)} className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold">Batal</button>
                <button type="submit" className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* === EDIT STOCK OPNAME MODAL === */}
      {editOpnameTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-800">Edit Stock Opname Sesi: {editOpnameTarget.sessionNumber}</h3>
              <button onClick={() => setEditOpnameTarget(null)} className="rounded-lg p-1 hover:bg-slate-100"><X className="h-4 w-4" /></button>
            </div>
            <form onSubmit={handleUpdateOpnameSubmit} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Judul Sesi Opname</label>
                <input
                  type="text"
                  value={editOpnameForm.title}
                  onChange={(e) => setEditOpnameForm({ ...editOpnameForm, title: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 p-2 text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Tanggal Opname</label>
                <input
                  type="text"
                  value={editOpnameForm.date}
                  onChange={(e) => setEditOpnameForm({ ...editOpnameForm, date: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 p-2 text-xs"
                />
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                <button type="button" onClick={() => setEditOpnameTarget(null)} className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold">Batal</button>
                <button type="submit" className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* === EDIT PO MODAL === */}
      {editPoTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-800">Edit PO: {editPoTarget.poNumber}</h3>
              <button onClick={() => setEditPoTarget(null)} className="rounded-lg p-1 hover:bg-slate-100"><X className="h-4 w-4" /></button>
            </div>
            <form onSubmit={handleUpdatePoSubmit} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Status PO</label>
                <select
                  value={editPoForm.status}
                  onChange={(e) => setEditPoForm({ ...editPoForm, status: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 p-2 text-xs"
                >
                  <option value="Draft">Draft</option>
                  <option value="Submitted">Submitted</option>
                  <option value="Approved">Approved</option>
                  <option value="Received">Received</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Catatan PO</label>
                <input
                  type="text"
                  value={editPoForm.notes}
                  onChange={(e) => setEditPoForm({ ...editPoForm, notes: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 p-2 text-xs"
                />
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                <button type="button" onClick={() => setEditPoTarget(null)} className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold">Batal</button>
                <button type="submit" className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
