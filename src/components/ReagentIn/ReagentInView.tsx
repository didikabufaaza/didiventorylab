import React, { useState } from 'react';
import {
  ArrowDownLeft,
  Scan,
  Plus,
  Trash2,
  Building2,
  Calendar,
  FileText,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  Truck,
  MapPin,
  Package,
  Layers,
  Search,
  FileSpreadsheet,
} from 'lucide-react';
import {
  Reagent,
  Supplier,
  StorageLocation,
  UserRole,
} from '../../types.js';
import { SmartReagentInputModal } from '../MasterData/SmartReagentInputModal.js';

interface StockInItemInput {
  reagentId: string;
  reagentCode: string;
  reagentName: string;
  lotNumber: string;
  batchNumber: string;
  barcode: string;
  expiryDate: string;
  manufactureDate?: string;
  quantity: number;
  unit: string;
  unitPrice: number;
}

interface ReagentInViewProps {
  reagents: Reagent[];
  suppliers: Supplier[];
  locations: StorageLocation[];
  currentRole: UserRole;
  onOpenBarcodeScanner: () => void;
  onProcessStockIn: (payload: any) => Promise<void>;
  onCreateReagentsBatch?: (reagents: Partial<Reagent>[]) => Promise<void>;
  scannedBarcode?: string | null;
  clearScannedBarcode?: () => void;
}

export const ReagentInView: React.FC<ReagentInViewProps> = ({
  reagents,
  suppliers,
  locations,
  currentRole,
  onOpenBarcodeScanner,
  onProcessStockIn,
  onCreateReagentsBatch,
  scannedBarcode,
  clearScannedBarcode,
}) => {
  const canEdit = currentRole === 'Super Admin' || currentRole === 'Admin Inventory';
  const [isSmartInputOpen, setIsSmartInputOpen] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState(suppliers[0]?.id || 'sup-1');
  const [poNumber, setPoNumber] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [selectedLocationId, setSelectedLocationId] = useState(locations[0]?.id || 'loc-1');
  const [notes, setNotes] = useState('');

  // Item form inputs
  const [selectedReagentId, setSelectedReagentId] = useState(reagents[0]?.id || '');
  const [reagentSearchQuery, setReagentSearchQuery] = useState('');
  const [isReagentDropdownOpen, setIsReagentDropdownOpen] = useState(false);
  const [lotNumberInput, setLotNumberInput] = useState('');
  const [barcodeInput, setBarcodeInput] = useState(reagents[0]?.barcode || '');
  const [expiryDateInput, setExpiryDateInput] = useState('');
  const [qtyInput, setQtyInput] = useState<number>(1);
  const [unitPriceInput, setUnitPriceInput] = useState<number>(reagents[0]?.price || 0);

  // Items buffer list
  const [items, setItems] = useState<StockInItemInput[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());

  // Handle reagent selection auto fill
  const handleReagentChange = (rId: string) => {
    setSelectedReagentId(rId);
    const reg = reagents.find((r) => r.id === rId);
    if (reg) {
      setBarcodeInput(reg.barcode || '');
      setUnitPriceInput(reg.price || 0);
    }
  };

  const handleAddItemToBuffer = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!selectedReagentId) {
      setErrorMessage('Pilih jenis reagen.');
      return;
    }
    if (!lotNumberInput.trim()) {
      setErrorMessage('Nomor Lot / Batch wajib diisi.');
      return;
    }
    if (!expiryDateInput) {
      setErrorMessage('Tanggal Kadaluarsa (ED) wajib diisi.');
      return;
    }
    if (qtyInput <= 0) {
      setErrorMessage('Jumlah harus lebih besar dari 0.');
      return;
    }

    const reg = reagents.find((r) => r.id === selectedReagentId);
    if (!reg) return;

    const newItem: StockInItemInput = {
      reagentId: reg.id,
      reagentCode: reg.code,
      reagentName: reg.name,
      lotNumber: lotNumberInput.trim(),
      batchNumber: `B-${Math.floor(1000 + Math.random() * 9000)}`,
      barcode: barcodeInput.trim() || reg.barcode,
      expiryDate: expiryDateInput,
      quantity: qtyInput,
      unit: reg.unit,
      unitPrice: unitPriceInput,
    };

    setItems([...items, newItem]);
    setLotNumberInput('');
    setExpiryDateInput('');
    setQtyInput(1);
    setUnitPriceInput(0);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
    setSelectedIndices(prev => {
      const next = new Set<number>();
      prev.forEach(val => {
        if (val < index) next.add(val);
        if (val > index) next.add(val - 1);
      });
      return next;
    });
  };

  const handleBulkRemoveItems = () => {
    if (selectedIndices.size === 0) return;
    setItems(prev => prev.filter((_, i) => !selectedIndices.has(i)));
    setSelectedIndices(new Set());
  };

  const toggleSelectIndex = (idx: number) => {
    setSelectedIndices(prev => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  };

  const toggleSelectAllIndices = () => {
    if (items.length > 0 && selectedIndices.size === items.length) {
      setSelectedIndices(new Set());
    } else {
      setSelectedIndices(new Set(items.map((_, i) => i)));
    }
  };

  const handleFinalSubmit = async () => {
    if (items.length === 0) {
      setErrorMessage('Tambahkan minimal 1 item reagen untuk penerimaan.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const supplier = suppliers.find((s) => s.id === selectedSupplierId);
      const location = locations.find((l) => l.id === selectedLocationId);

      const payload = {
        supplierId: selectedSupplierId,
        supplierName: supplier?.name || 'Supplier',
        poNumber,
        invoiceNumber,
        locationId: selectedLocationId,
        locationName: location?.name || 'Gudang Utama',
        notes,
        userRole: currentRole,
        items,
      };

      await onProcessStockIn(payload);
      setSuccessMessage('Penerimaan Reagen Masuk (Stock IN) Berhasil Disimpan!');
      setItems([]);
      setSelectedIndices(new Set());
      setPoNumber('');
      setInvoiceNumber('');
      setNotes('');
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal memproses penerimaan Reagen IN');
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalAmount = items.reduce((acc, it) => acc + it.quantity * it.unitPrice, 0);

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="rounded-lg bg-emerald-100 p-2 text-emerald-700">
              <ArrowDownLeft className="h-6 w-6" />
            </span>
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Penerimaan Reagen Masuk (Stock IN)</h2>
              <p className="text-xs text-slate-500">
                Catat penerimaan reagen baru dari supplier/PO, buat nomor Lot, tetapkan Tanggal Expired (ED) dan Lokasi Penyimpanan.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          {canEdit && onCreateReagentsBatch && (
            <button
              onClick={() => setIsSmartInputOpen(true)}
              className="flex items-center space-x-2 rounded-lg bg-emerald-50 px-4 py-2.5 text-xs font-semibold text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition"
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-700" />
              <span>Smart Input Reagen</span>
            </button>
          )}
          <button
            onClick={onOpenBarcodeScanner}
            className="flex items-center justify-center space-x-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 transition shrink-0"
          >
            <Scan className="h-4 w-4" />
            <span>Scan Barcode (HP/USB)</span>
          </button>
        </div>
      </div>

      {/* Smart Input Reagen Modal */}
      {canEdit && onCreateReagentsBatch && (
        <SmartReagentInputModal
          isOpen={isSmartInputOpen}
          onClose={() => setIsSmartInputOpen(false)}
          onSave={async (imported) => {
            await onCreateReagentsBatch(imported);
            setIsSmartInputOpen(false);
          }}
        />
      )}

      {/* Messages */}
      {errorMessage && (
        <div className="flex items-center space-x-3 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 animate-fade-in">
          <AlertCircle className="h-5 w-5 shrink-0 text-rose-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="flex items-center space-x-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 animate-fade-in">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
          <span>{successMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Vendor & Header Info + Add Item Form (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Header Info Form */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
            <h3 className="font-semibold text-slate-900 text-sm flex items-center space-x-2 pb-2 border-b border-slate-100">
              <Truck className="h-4 w-4 text-indigo-600" />
              <span>Informasi Supplier, PO, & Lokasi Tujuan</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Supplier / Vendor *
                </label>
                <select
                  value={selectedSupplierId}
                  onChange={(e) => setSelectedSupplierId(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                >
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center space-x-1">
                  <MapPin className="h-3.5 w-3.5 text-indigo-600" />
                  <span>Lokasi Penyimpanan *</span>
                </label>
                <select
                  value={selectedLocationId}
                  onChange={(e) => setSelectedLocationId(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                >
                  {locations.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name} ({l.temperatureCondition})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nomor PO (Purchase Order)
                </label>
                <input
                  type="text"
                  value={poNumber}
                  onChange={(e) => setPoNumber(e.target.value)}
                  placeholder="Contoh: PO-2026-0801"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nomor Faktur / Invoice
                </label>
                <input
                  type="text"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  placeholder="Contoh: INV-MD-9912"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Add Item Form */}
          <form
            onSubmit={handleAddItemToBuffer}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4"
          >
            <h3 className="font-semibold text-slate-900 text-sm flex items-center space-x-2 pb-2 border-b border-slate-100">
              <Package className="h-4 w-4 text-indigo-600" />
              <span>Tambah Item Reagen ke Daftar Penerimaan</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2 relative">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Pilih Reagen *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={
                      isReagentDropdownOpen
                        ? reagentSearchQuery
                        : reagents.find((r) => r.id === selectedReagentId)
                        ? `${reagents.find((r) => r.id === selectedReagentId)?.name} (${reagents.find((r) => r.id === selectedReagentId)?.code}) - ${reagents.find((r) => r.id === selectedReagentId)?.brand} [${reagents.find((r) => r.id === selectedReagentId)?.packageSize}]`
                        : ''
                    }
                    onChange={(e) => {
                      if (!isReagentDropdownOpen) setIsReagentDropdownOpen(true);
                      setReagentSearchQuery(e.target.value);
                    }}
                    onFocus={() => {
                      setIsReagentDropdownOpen(true);
                      setReagentSearchQuery('');
                    }}
                    onBlur={() => {
                      setTimeout(() => {
                        setIsReagentDropdownOpen(false);
                      }, 200);
                    }}
                    placeholder="Ketik untuk mencari reagen..."
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 pl-8 pr-8 py-2 text-xs font-medium text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all cursor-pointer"
                  />
                  <div className="absolute left-2.5 top-1/2 -translate-y-1/2 flex items-center pointer-events-none">
                    <Search className="h-3.5 w-3.5 text-slate-400" />
                  </div>
                  <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center pointer-events-none text-slate-400 text-[10px]">
                    ▼
                  </div>
                </div>

                {isReagentDropdownOpen && (
                  <div className="absolute z-20 mt-1 w-full max-h-60 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl custom-scrollbar py-1 animate-fade-in">
                    {reagents.filter((r) => {
                      const q = reagentSearchQuery.toLowerCase();
                      return (
                        r.name.toLowerCase().includes(q) ||
                        r.code.toLowerCase().includes(q) ||
                        (r.brand && r.brand.toLowerCase().includes(q))
                      );
                    }).length === 0 ? (
                      <div className="px-3.5 py-2.5 text-xs text-slate-500">
                        Tidak ada reagen yang cocok
                      </div>
                    ) : (
                      reagents
                        .filter((r) => {
                          const q = reagentSearchQuery.toLowerCase();
                          return (
                            r.name.toLowerCase().includes(q) ||
                            r.code.toLowerCase().includes(q) ||
                            (r.brand && r.brand.toLowerCase().includes(q))
                          );
                        })
                        .map((r) => (
                          <button
                            key={r.id}
                            type="button"
                            onClick={() => {
                              handleReagentChange(r.id);
                              setIsReagentDropdownOpen(false);
                              setReagentSearchQuery('');
                            }}
                            className={`w-full text-left px-3.5 py-2.5 text-xs hover:bg-slate-50 transition-colors flex flex-col ${
                              r.id === selectedReagentId ? 'bg-indigo-50/70 font-semibold' : ''
                            }`}
                          >
                            <span className="font-bold text-slate-900">{r.name}</span>
                            <span className="text-[10px] text-slate-500 mt-0.5">
                              Kode: {r.code} | Merk: {r.brand} | Kemasan: {r.packageSize}
                            </span>
                          </button>
                        ))
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nomor Lot / Batch *
                </label>
                <input
                  type="text"
                  value={lotNumberInput}
                  onChange={(e) => setLotNumberInput(e.target.value)}
                  placeholder="Contoh: GLU-2026C"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Barcode / QR Code
                </label>
                <input
                  type="text"
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  placeholder="Scan barcode di sini..."
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tanggal Kadaluarsa (Expired Date) *
                </label>
                <input
                  type="date"
                  value={expiryDateInput}
                  onChange={(e) => setExpiryDateInput(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Jumlah (Qty) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={qtyInput}
                    onChange={(e) => setQtyInput(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Harga Beli / Unit (Rp)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={unitPriceInput}
                    onChange={(e) => setUnitPriceInput(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="w-full rounded-lg bg-indigo-600 py-2.5 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors flex items-center justify-center space-x-1.5"
            >
              <Plus className="h-4 w-4" />
              <span>Masukkan ke Daftar Penerimaan</span>
            </button>
          </form>
        </div>

        {/* Right Column: Items Buffer Table & Confirm (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center space-x-2">
                  {items.length > 0 && (
                    <input
                      type="checkbox"
                      checked={items.length > 0 && selectedIndices.size === items.length}
                      onChange={toggleSelectAllIndices}
                      className="w-4 h-4 rounded accent-indigo-600 cursor-pointer"
                    />
                  )}
                  <h3 className="font-bold text-slate-900 text-base">Rincian Barang Diterima</h3>
                </div>
                <div className="flex items-center space-x-2">
                  {selectedIndices.size > 0 && (
                    <button
                      onClick={handleBulkRemoveItems}
                      className="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 px-2 py-1 rounded-md hover:bg-rose-100 transition mr-2"
                    >
                      Hapus ({selectedIndices.size})
                    </button>
                  )}
                  <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                    {items.length} Item
                  </span>
                </div>
              </div>

              {/* Items List */}
              <div className="mt-4 space-y-3 max-h-[360px] overflow-y-auto pr-1 custom-scrollbar">
                {items.length === 0 ? (
                  <div className="py-16 text-center text-slate-400">
                    <Package className="mx-auto h-10 w-10 text-slate-300 mb-2 stroke-1" />
                    <p className="text-xs font-semibold text-slate-500">Belum ada item ditambahkan</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Isi form di sebelah kiri dan klik "Masukkan ke Daftar"
                    </p>
                  </div>
                ) : (
                  items.map((item, idx) => (
                    <div
                      key={idx}
                      className={`rounded-xl border p-3 flex items-center justify-between gap-2 transition ${
                        selectedIndices.has(idx) ? 'bg-indigo-50/60 border-indigo-200' : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center space-x-2 flex-1 min-w-0">
                        <input
                          type="checkbox"
                          checked={selectedIndices.has(idx)}
                          onChange={() => toggleSelectIndex(idx)}
                          className="w-4 h-4 rounded accent-indigo-600 cursor-pointer shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <h5 className="font-bold text-xs text-slate-900 truncate">
                            {item.reagentName}
                          </h5>
                          <p className="text-[11px] text-slate-600 mt-0.5">
                            LOT: <span className="font-semibold text-slate-900">{item.lotNumber}</span> | ED: {item.expiryDate}
                          </p>
                          <p className="text-[11px] text-indigo-800 font-bold">
                            {item.quantity} {item.unit} &times; Rp {item.unitPrice.toLocaleString('id-ID')}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => handleRemoveItem(idx)}
                        className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50 transition shrink-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Notes */}
              <div className="mt-4 pt-4 border-t border-slate-200">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Catatan Penerimaan / Kondisi Kemasan
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Contoh: Kemasan baik, indikator suhu sesuai 2-8°C..."
                  rows={2}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                />
              </div>
            </div>

            {/* Total & Action */}
            <div className="mt-6 pt-4 border-t border-slate-200">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold text-slate-600">Total Transaksi IN:</span>
                <span className="text-base font-extrabold text-emerald-800">
                  Rp {totalAmount.toLocaleString('id-ID')}
                </span>
              </div>

              <button
                onClick={handleFinalSubmit}
                disabled={isSubmitting || items.length === 0}
                className="w-full rounded-xl bg-emerald-600 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-emerald-600/30 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 disabled:opacity-50 transition flex items-center justify-center space-x-2"
              >
                {isSubmitting ? (
                  <span>Menyimpan Penerimaan...</span>
                ) : (
                  <>
                    <ArrowDownLeft className="h-5 w-5" />
                    <span>SIMPAN PENERIMAAN (STOCK IN)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
