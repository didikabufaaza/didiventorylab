import React, { useState } from 'react';
import {
  Scan,
  Search,
  ShoppingCart,
  Trash2,
  AlertCircle,
  CheckCircle2,
  ArrowUpRight,
  Sparkles,
  Calendar,
  Building2,
  FileText,
  AlertTriangle,
  FlaskConical,
} from 'lucide-react';
import {
  Reagent,
  ReagentBatch,
  DestinationUnit,
  UsagePurpose,
  UserRole,
} from '../../types.js';

interface CartItem {
  batch: ReagentBatch;
  reagent: Reagent;
  quantity: number;
  isFefoRecommended: boolean;
  fefoWarning?: boolean;
}

interface ReagentOutViewProps {
  reagents: Reagent[];
  batches: ReagentBatch[];
  currentRole: UserRole;
  onOpenBarcodeScanner: () => void;
  onProcessStockOut: (payload: any) => Promise<void>;
  scannedBarcode?: string | null;
  clearScannedBarcode?: () => void;
}

export const ReagentOutView: React.FC<ReagentOutViewProps> = ({
  reagents,
  batches,
  currentRole,
  onOpenBarcodeScanner,
  onProcessStockOut,
  scannedBarcode,
  clearScannedBarcode,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [destinationUnit, setDestinationUnit] = useState<DestinationUnit>('Kimia Klinik');
  const [purpose, setPurpose] = useState<UsagePurpose>('Pemeriksaan Pasien');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [selectedBatchIds, setSelectedBatchIds] = useState<Set<string>>(new Set());

  // Available batches (active, quantity > 0, not expired)
  const availableBatches = batches.filter(
    (b) =>
      b.currentQuantity > 0 &&
      b.status !== 'Expired' &&
      b.status !== 'Quarantine' &&
      new Date(b.expiryDate) >= new Date()
  );

  // Instant filter for manual search
  const filteredBatches = availableBatches.filter((b) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      b.reagentName.toLowerCase().includes(q) ||
      b.reagentCode.toLowerCase().includes(q) ||
      b.lotNumber.toLowerCase().includes(q) ||
      b.barcode.toLowerCase().includes(q) ||
      b.brand.toLowerCase().includes(q)
    );
  });

  // Group filtered batches by reagent to show FEFO recommendation
  const batchesByReagent: Record<string, ReagentBatch[]> = {};
  filteredBatches.forEach((b) => {
    if (!batchesByReagent[b.reagentId]) batchesByReagent[b.reagentId] = [];
    batchesByReagent[b.reagentId].push(b);
  });

  // Sort batches within each reagent by Expiry Date ascending (FEFO)
  Object.keys(batchesByReagent).forEach((rId) => {
    batchesByReagent[rId].sort(
      (a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime()
    );
  });

  // Add item to cart with FEFO check
  const handleAddToCart = (batch: ReagentBatch) => {
    const reagent = reagents.find((r) => r.id === batch.reagentId);
    if (!reagent) return;

    // FEFO check: Check all active lots for this reagent
    const allLotsForReagent = batches
      .filter(
        (b) =>
          b.reagentId === batch.reagentId &&
          b.currentQuantity > 0 &&
          b.status !== 'Expired' &&
          b.status !== 'Quarantine' &&
          new Date(b.expiryDate) >= new Date()
      )
      .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());

    const earliestLot = allLotsForReagent[0];
    const isFefo = earliestLot && earliestLot.id === batch.id;

    // Check if already in cart
    const existingIndex = cart.findIndex((item) => item.batch.id === batch.id);
    if (existingIndex >= 0) {
      const updated = [...cart];
      if (updated[existingIndex].quantity + 1 > batch.currentQuantity) {
        setErrorMessage(
          `Jumlah melebihi stok tersedia (${batch.currentQuantity} ${batch.unit})`
        );
        return;
      }
      updated[existingIndex].quantity += 1;
      setCart(updated);
    } else {
      setCart([
        ...cart,
        {
          batch,
          reagent,
          quantity: 1,
          isFefoRecommended: isFefo,
          fefoWarning: !isFefo,
        },
      ]);
    }
  };

  const handleUpdateQuantity = (batchId: string, delta: number) => {
    setCart((prevCart) =>
      prevCart
        .map((item) => {
          if (item.batch.id === batchId) {
            const newQty = item.quantity + delta;
            if (newQty <= 0) return null;
            if (newQty > item.batch.currentQuantity) {
              setErrorMessage(`Maksimal stok tersedia adalah ${item.batch.currentQuantity}`);
              return item;
            }
            return { ...item, quantity: newQty };
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const handleRemoveItem = (batchId: string) => {
    setCart((prev) => prev.filter((item) => item.batch.id !== batchId));
    setSelectedBatchIds(prev => {
      const next = new Set(prev);
      next.delete(batchId);
      return next;
    });
  };

  const handleBulkRemoveItems = () => {
    if (selectedBatchIds.size === 0) return;
    setCart(prev => prev.filter(item => !selectedBatchIds.has(item.batch.id)));
    setSelectedBatchIds(new Set());
  };

  const toggleSelectBatch = (batchId: string) => {
    setSelectedBatchIds(prev => {
      const next = new Set(prev);
      next.has(batchId) ? next.delete(batchId) : next.add(batchId);
      return next;
    });
  };

  const toggleSelectAllCart = () => {
    if (cart.length > 0 && selectedBatchIds.size === cart.length) {
      setSelectedBatchIds(new Set());
    } else {
      setSelectedBatchIds(new Set(cart.map(item => item.batch.id)));
    }
  };

  const handleProcessSubmit = async () => {
    if (cart.length === 0) {
      setErrorMessage('Keranjang pengeluaran reagen masih kosong.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const payload = {
        destinationUnit,
        purpose,
        notes,
        userRole: currentRole,
        items: cart.map((item) => ({
          batchId: item.batch.id,
          quantity: item.quantity,
          purpose,
          destinationUnit,
        })),
      };

      await onProcessStockOut(payload);
      setSuccessMessage('Pengeluaran Reagen (Stock OUT) Berhasil Diproses!');
      setCart([]);
      setSelectedBatchIds(new Set());
      setNotes('');
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal memproses transaksi OUT');
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalCartItems = cart.reduce((acc, item) => acc + item.quantity, 0);
  const totalCartValue = cart.reduce(
    (acc, item) => acc + item.quantity * (item.batch.purchasePrice || 0),
    0
  );

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="rounded-lg bg-indigo-100 p-2 text-indigo-700">
              <ArrowUpRight className="h-6 w-6" />
            </span>
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Transaksi Reagen OUT (POS Kasir)</h2>
              <p className="text-xs text-slate-500">
                Input pengeluaran reagen dengan Kamera HP/USB Scanner atau Cari Manual. Mengutamakan aturan FEFO.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={onOpenBarcodeScanner}
          className="flex items-center justify-center space-x-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 transition shrink-0"
        >
          <Scan className="h-4 w-4" />
          <span>Scan Barcode Kamera / USB</span>
        </button>
      </div>

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

      {/* Main Grid: Item Selection vs Cart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Reagent Search & Catalog (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Search Box */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari reagen (Nama, Kode, Lot, Barcode, Merk)..."
              className="w-full rounded-lg border border-slate-200 bg-slate-50 pl-12 pr-4 py-3 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
            />
          </div>

          {/* Catalog List Grouped by Reagent */}
          <div className="space-y-4 max-h-[620px] overflow-y-auto pr-1 custom-scrollbar">
            {Object.keys(batchesByReagent).length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-400 bg-slate-50">
                <FlaskConical className="mx-auto h-12 w-12 text-slate-300 mb-2" />
                <p className="font-semibold text-slate-600">Tidak ada lot reagen yang sesuai</p>
                <p className="text-xs text-slate-400 mt-1">Coba ubah kata kunci atau pastikan stok tersedia</p>
              </div>
            ) : (
              Object.entries(batchesByReagent).map(([reagentId, batchList]) => {
                const reagent = reagents.find((r) => r.id === reagentId);
                return (
                  <div
                    key={reagentId}
                    className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs hover:border-slate-300 transition"
                  >
                    {/* Reagent Header */}
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">
                          {reagent?.name || batchList[0].reagentName}
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          Kode: <span className="font-mono text-slate-700">{reagent?.code}</span> | Merk: {batchList[0].brand}
                        </p>
                      </div>
                      <span className="rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-800">
                        {batchList.length} Lot Tersedia
                      </span>
                    </div>

                    {/* Available Lots for this Reagent */}
                    <div className="mt-3 space-y-2">
                      {batchList.map((batch, index) => {
                        const isFefo = index === 0; // First item is earliest expiry
                        return (
                          <div
                            key={batch.id}
                            className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg border transition gap-2 ${
                              isFefo
                                ? 'bg-emerald-50/50 border-emerald-200/80 hover:bg-emerald-50'
                                : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            <div className="space-y-1">
                              <div className="flex items-center space-x-2">
                                <span className="font-bold text-xs text-slate-900">
                                  LOT: {batch.lotNumber}
                                </span>
                                {isFefo && (
                                  <span className="flex items-center space-x-1 rounded-md bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white shadow-xs">
                                    <Sparkles className="h-3 w-3" />
                                    <span>REKOMENDASI FEFO</span>
                                  </span>
                                )}
                              </div>

                              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
                                <span className="flex items-center space-x-1">
                                  <Calendar className="h-3.5 w-3.5 text-slate-400" />
                                  <span className="font-semibold text-slate-800">ED: {batch.expiryDate}</span>
                                </span>
                                <span>Stok: <strong className="text-indigo-700">{batch.currentQuantity} {batch.unit}</strong></span>
                                <span>Lokasi: {batch.locationName}</span>
                              </div>
                            </div>

                            <button
                              onClick={() => handleAddToCart(batch)}
                              className={`rounded-lg px-3.5 py-2 text-xs font-semibold transition shrink-0 ${
                                isFefo
                                  ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs'
                                  : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs'
                              }`}
                            >
                              + Tambah
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Cart & Transaction Form (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col justify-between h-full">
            <div>
              {/* Cart Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center space-x-2">
                  {cart.length > 0 && (
                    <input
                      type="checkbox"
                      checked={cart.length > 0 && selectedBatchIds.size === cart.length}
                      onChange={toggleSelectAllCart}
                      className="w-4 h-4 rounded accent-indigo-600 cursor-pointer"
                    />
                  )}
                  <h3 className="font-semibold text-slate-900 text-base">Keranjang Pengeluaran</h3>
                </div>
                <div className="flex items-center space-x-2">
                  {selectedBatchIds.size > 0 && (
                    <button
                      onClick={handleBulkRemoveItems}
                      className="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 px-2 py-1 rounded-md hover:bg-rose-100 transition mr-2"
                    >
                      Hapus ({selectedBatchIds.size})
                    </button>
                  )}
                  <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-bold text-indigo-800">
                    {totalCartItems} Item
                  </span>
                </div>
              </div>

              {/* FEFO Warning Banner if any non-fefo item added */}
              {cart.some((i) => i.fefoWarning) && (
                <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 flex items-start space-x-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Peringatan FEFO:</span> Anda memilih lot reagen yang bukan tanggal kadaluarsa terdekat. Mohon konfirmasi sebelum memproses!
                  </div>
                </div>
              )}

              {/* Cart Item List */}
              <div className="mt-4 space-y-3 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                {cart.length === 0 ? (
                  <div className="py-12 text-center text-slate-400">
                    <ShoppingCart className="mx-auto h-10 w-10 text-slate-300 mb-2 stroke-1" />
                    <p className="text-xs font-semibold text-slate-500">Keranjang masih kosong</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Klik tombol (+ Tambah) pada katalog reagen
                    </p>
                  </div>
                ) : (
                  cart.map((item) => (
                    <div
                      key={item.batch.id}
                      className={`rounded-xl border p-3 flex items-center justify-between gap-3 transition ${
                        selectedBatchIds.has(item.batch.id) ? 'bg-indigo-50/60 border-indigo-200' : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center space-x-2 flex-1 min-w-0">
                        <input
                          type="checkbox"
                          checked={selectedBatchIds.has(item.batch.id)}
                          onChange={() => toggleSelectBatch(item.batch.id)}
                          className="w-4 h-4 rounded accent-indigo-600 cursor-pointer shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-1.5">
                            <h5 className="font-bold text-xs text-slate-900 truncate">
                              {item.reagent.name}
                            </h5>
                            {item.fefoWarning && (
                              <span className="rounded bg-amber-200 px-1 text-[9px] font-extrabold text-amber-900">
                                Non-FEFO
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            LOT: <span className="font-semibold text-slate-900">{item.batch.lotNumber}</span> | ED: {item.batch.expiryDate}
                          </p>
                          <p className="text-[11px] text-slate-700 font-medium">
                            Rp {(item.batch.purchasePrice || 0).toLocaleString('id-ID')} / {item.batch.unit}
                          </p>
                        </div>
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex items-center space-x-2 shrink-0">
                        <div className="flex items-center rounded-lg border border-slate-300 bg-white">
                          <button
                            onClick={() => handleUpdateQuantity(item.batch.id, -1)}
                            className="px-2 py-1 text-slate-600 hover:bg-slate-100 font-bold"
                          >
                            -
                          </button>
                          <span className="px-2 py-1 text-xs font-bold text-slate-900">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => handleUpdateQuantity(item.batch.id, 1)}
                            className="px-2 py-1 text-slate-600 hover:bg-slate-100 font-bold"
                          >
                            +
                          </button>
                        </div>

                        <button
                          onClick={() => handleRemoveItem(item.batch.id)}
                          className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50 transition shrink-0"
                          title="Hapus item"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Form Options */}
              <div className="mt-5 space-y-3 pt-4 border-t border-slate-200">
                {/* Destination Unit */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center space-x-1">
                    <Building2 className="h-3.5 w-3.5 text-indigo-600" />
                    <span>Tujuan Pengeluaran / Unit Laboratorium *</span>
                  </label>
                  <select
                    value={destinationUnit}
                    onChange={(e) => setDestinationUnit(e.target.value as DestinationUnit)}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                  >
                    <option value="Kimia Klinik">Kimia Klinik</option>
                    <option value="Hematologi">Hematologi</option>
                    <option value="Imunologi">Imunologi</option>
                    <option value="Mikrobiologi">Mikrobiologi</option>
                    <option value="Urinalisis">Urinalisis</option>
                    <option value="Bank Darah">Bank Darah</option>
                    <option value="Patologi Anatomi">Patologi Anatomi</option>
                    <option value="Gudang Utama">Gudang Utama</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                </div>

                {/* Usage Purpose */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center space-x-1">
                    <FileText className="h-3.5 w-3.5 text-indigo-600" />
                    <span>Keperluan / Jenis Pemakaian *</span>
                  </label>
                  <select
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value as UsagePurpose)}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                  >
                    <option value="Pemeriksaan Pasien">Pemeriksaan Pasien</option>
                    <option value="QC Internal">QC Internal</option>
                    <option value="Kalibrasi">Kalibrasi</option>
                    <option value="PME">PME (Pemantauan Mutu Eksternal)</option>
                    <option value="Validasi">Validasi Alat / Metode</option>
                    <option value="Penelitian">Penelitian / Training</option>
                    <option value="Kerusakan/Expired">Kerusakan / Disposal</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Catatan / Nomor Form Permintaan
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Contoh: Permintaan rutin shift pagi..."
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Total & Submit Button */}
            <div className="mt-6 pt-4 border-t border-slate-200">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold text-slate-600">Total Estimasi Nilai:</span>
                <span className="text-base font-extrabold text-indigo-900">
                  Rp {totalCartValue.toLocaleString('id-ID')}
                </span>
              </div>

              <button
                onClick={handleProcessSubmit}
                disabled={isSubmitting || cart.length === 0}
                className="w-full rounded-lg bg-indigo-600 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 disabled:opacity-50 transition-all flex items-center justify-center space-x-2"
              >
                {isSubmitting ? (
                  <span>Memproses...</span>
                ) : (
                  <>
                    <ArrowUpRight className="h-4 w-4" />
                    <span>PROSES PENGELUARAN (OUT)</span>
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
