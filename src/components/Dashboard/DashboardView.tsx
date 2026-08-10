import React from 'react';
import {
  FlaskConical,
  Boxes,
  DollarSign,
  AlertTriangle,
  Clock,
  CheckCircle2,
  ArrowUpRight,
  ArrowDownLeft,
  Scan,
  ShoppingBag,
  TrendingUp,
  PieChart as PieIcon,
  Layers,
  Building2,
  Calendar,
} from 'lucide-react';
import { Reagent, ReagentBatch, InventoryTransaction } from '../../types.js';

interface DashboardViewProps {
  reagents: Reagent[];
  batches: ReagentBatch[];
  transactions: InventoryTransaction[];
  onOpenBarcodeScanner: () => void;
  onNavigateToTab: (tab: any) => void;
  readOnly?: boolean;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  reagents,
  batches,
  transactions,
  onOpenBarcodeScanner,
  onNavigateToTab,
  readOnly = false,
}) => {
  // Calculations
  const totalReagents = reagents.length;
  const activeBatches = batches.filter((b) => b.status === 'Available' || b.status === 'Opened');
  const totalStockUnits = batches.reduce((acc, b) => acc + (b.currentQuantity || 0), 0);
  const totalInventoryValue = batches.reduce(
    (acc, b) => acc + (b.currentQuantity || 0) * (b.purchasePrice || 0),
    0
  );

  const now = new Date();
  const d7 = new Date();
  d7.setDate(now.getDate() + 7);
  const d30 = new Date();
  d30.setDate(now.getDate() + 30);
  const d90 = new Date();
  d90.setDate(now.getDate() + 90);

  const expiredBatches = batches.filter(
    (b) => new Date(b.expiryDate) < now || b.status === 'Expired'
  );
  const criticalExpiring = batches.filter(
    (b) =>
      new Date(b.expiryDate) >= now &&
      new Date(b.expiryDate) <= d7 &&
      b.status !== 'Expired' &&
      b.currentQuantity > 0
  );
  const warningExpiring = batches.filter(
    (b) =>
      new Date(b.expiryDate) > d7 &&
      new Date(b.expiryDate) <= d30 &&
      b.status !== 'Expired' &&
      b.currentQuantity > 0
  );
  const attentionExpiring = batches.filter(
    (b) =>
      new Date(b.expiryDate) > d30 &&
      new Date(b.expiryDate) <= d90 &&
      b.status !== 'Expired' &&
      b.currentQuantity > 0
  );

  const lowStockReagents = reagents.filter((r) => {
    const totalQty = batches
      .filter((b) => b.reagentId === r.id && (b.status === 'Available' || b.status === 'Opened'))
      .reduce((acc, b) => acc + b.currentQuantity, 0);
    return totalQty <= r.minimumStock;
  });

  const openedBatches = batches.filter((b) => b.status === 'Opened');

  // Category breakdown
  const categoryMap: Record<string, { count: number; value: number }> = {};
  batches.forEach((b) => {
    const reg = reagents.find((r) => r.id === b.reagentId);
    const cat = reg?.category || 'Lainnya';
    if (!categoryMap[cat]) categoryMap[cat] = { count: 0, value: 0 };
    categoryMap[cat].count += b.currentQuantity;
    categoryMap[cat].value += b.currentQuantity * (b.purchasePrice || 0);
  });

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      {/* Top Banner & Quick Barcode Trigger */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 text-white shadow-lg relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 rounded-md bg-indigo-500/20 border border-indigo-400/30 px-3 py-1 text-xs font-semibold text-indigo-300 backdrop-blur-xs mb-2">
              <FlaskConical className="h-3.5 w-3.5" />
              <span>Sistem Manajemen Persediaan Reagen Lab</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-white">
              Dashboard Real-Time FEFO
            </h2>
            <p className="mt-1 text-xs text-slate-300 max-w-xl leading-relaxed">
              Pantau siklus persediaan reagen, pelacakan Lot/Batch, kepatuhan FEFO (First Expired First Out), stabilitas reagen terbuka, dan peringatan stok secara instan.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {!readOnly && (
              <button
                onClick={onOpenBarcodeScanner}
                className="flex items-center space-x-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-indigo-500 transition shadow-md shadow-indigo-950/50"
              >
                <Scan className="h-4 w-4" />
                <span>Scan Barcode (HP/USB)</span>
              </button>
            )}
            {!readOnly && (
              <button
                onClick={() => onNavigateToTab('reagent-out')}
                className="flex items-center space-x-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 px-4 py-2.5 text-xs font-semibold text-white transition backdrop-blur-xs"
              >
                <ArrowUpRight className="h-4 w-4" />
                <span>Reagen OUT</span>
              </button>
            )}
            {!readOnly && (
              <button
                onClick={() => onNavigateToTab('stock-in')}
                className="flex items-center space-x-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 px-4 py-2.5 text-xs font-semibold text-white transition backdrop-blur-xs"
              >
                <ArrowDownLeft className="h-4 w-4" />
                <span>Reagen IN</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Reagen Types */}
        <div
          onClick={readOnly ? undefined : () => onNavigateToTab('reagents')}
          className={`group rounded-xl border border-slate-200 bg-white p-5 shadow-sm ${readOnly ? '' : 'cursor-pointer hover:border-indigo-300 hover:shadow-md transition'}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Jenis Reagen
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition">
              <FlaskConical className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-bold text-slate-900">{totalReagents}</p>
            <p className="text-xs text-slate-500 mt-0.5">
              <span className="font-semibold text-indigo-600">{activeBatches.length} Lot</span> aktif terdaftar
            </p>
          </div>
        </div>

        {/* Total Stok Unit */}
        <div
          onClick={readOnly ? undefined : () => onNavigateToTab('batches')}
          className={`group rounded-xl border border-slate-200 bg-white p-5 shadow-sm ${readOnly ? '' : 'cursor-pointer hover:border-indigo-300 hover:shadow-md transition'}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Fisik Stok
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition">
              <Boxes className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-bold text-slate-900">{totalStockUnits} <span className="text-sm font-normal text-slate-500">Unit</span></p>
            <p className="text-xs text-slate-500 mt-0.5">
              Tersebar di <span className="font-semibold text-slate-700">5 Lokasi Storage</span>
            </p>
          </div>
        </div>

        {/* Total Inventory Value */}
        <div
          onClick={readOnly ? undefined : () => onNavigateToTab('reports')}
          className={`group rounded-xl border border-slate-200 bg-white p-5 shadow-sm ${readOnly ? '' : 'cursor-pointer hover:border-indigo-300 hover:shadow-md transition'}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Nilai Persediaan
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition">
              <DollarSign className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-xl font-bold text-slate-900 truncate">
              Rp {totalInventoryValue.toLocaleString('id-ID')}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">Valuasi stok harga beli</p>
          </div>
        </div>

        {/* Low Stock Alert */}
        <div
          onClick={readOnly ? undefined : () => onNavigateToTab('reagents')}
          className={`group rounded-xl border p-5 shadow-sm ${readOnly ? '' : 'cursor-pointer transition hover:shadow-md'} ${
            lowStockReagents.length > 0
              ? 'bg-amber-50/60 border-amber-200 hover:border-amber-400'
              : 'bg-white border-slate-200 hover:border-indigo-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-700">
              Stok Menipis
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-700 group-hover:bg-amber-600 group-hover:text-white transition">
              <AlertTriangle className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-bold text-amber-900">{lowStockReagents.length}</p>
            <p className="text-xs text-amber-700 font-medium mt-0.5">
              Di bawah Minimum / Reorder Point
            </p>
          </div>
        </div>
      </div>

      {/* Expired Status Section */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-100 gap-2">
          <div>
            <h3 className="font-bold text-slate-900 text-base flex items-center space-x-2">
              <Clock className="h-5 w-5 text-rose-600" />
              <span>Status Kadaluarsa & Masa Berlaku Lot (FEFO Monitoring)</span>
            </h3>
            <p className="text-xs text-slate-500">
              Klasifikasi otomatis masa simpan reagen berdasarkan tanggal kadaluarsa (ED)
            </p>
          </div>
          {!readOnly && (
            <button
              onClick={() => onNavigateToTab('batches')}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-700 hover:underline shrink-0"
            >
              Lihat Semua Lot &rarr;
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-5">
          {/* Expired */}
          <div
            onClick={readOnly ? undefined : () => onNavigateToTab('batches')}
            className={`rounded-xl border border-rose-200 bg-rose-50/60 p-4 flex flex-col justify-between ${readOnly ? '' : 'cursor-pointer hover:border-rose-300 transition'}`}
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-rose-800">KADALUARSA (Expired)</span>
                <span className="rounded-md bg-rose-600 px-2 py-0.5 text-xs font-bold text-white">
                  {expiredBatches.length}
                </span>
              </div>
              <p className="text-[11px] text-rose-600 mt-2">Sudah melewati tanggal kadaluarsa</p>
            </div>
            {expiredBatches.length > 0 && (
              <div className="mt-3 pt-3 border-t border-rose-200/50 space-y-1">
                {expiredBatches.slice(0, 3).map((b) => (
                  <div key={b.id} className="text-[10px] text-rose-700 flex justify-between items-center gap-1">
                    <span className="font-bold truncate" title={b.reagentName}>{b.reagentName}</span>
                    <span className="font-mono text-[9px] bg-rose-100/80 px-1 py-0.2 rounded shrink-0">Lot: {b.lotNumber}</span>
                  </div>
                ))}
                {expiredBatches.length > 3 && (
                  <div className="text-[9px] text-rose-500 font-bold text-right">
                    + {expiredBatches.length - 3} Lot Lainnya
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Critical <= 7 hari */}
          <div
            onClick={readOnly ? undefined : () => onNavigateToTab('batches')}
            className={`rounded-xl border border-amber-200 bg-amber-50/60 p-4 flex flex-col justify-between ${readOnly ? '' : 'cursor-pointer hover:border-amber-300 transition'}`}
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-800">KRITIS (&le; 7 Hari)</span>
                <span className="rounded-md bg-amber-600 px-2 py-0.5 text-xs font-bold text-white">
                  {criticalExpiring.length}
                </span>
              </div>
              <p className="text-[11px] text-amber-700 mt-2">Prioritaskan penggunaan FEFO segera</p>
            </div>
            {criticalExpiring.length > 0 && (
              <div className="mt-3 pt-3 border-t border-amber-200/50 space-y-1">
                {criticalExpiring.slice(0, 3).map((b) => (
                  <div key={b.id} className="text-[10px] text-amber-700 flex justify-between items-center gap-1">
                    <span className="font-bold truncate" title={b.reagentName}>{b.reagentName}</span>
                    <span className="font-mono text-[9px] bg-amber-100/80 px-1 py-0.2 rounded shrink-0">Lot: {b.lotNumber}</span>
                  </div>
                ))}
                {criticalExpiring.length > 3 && (
                  <div className="text-[9px] text-amber-500 font-bold text-right">
                    + {criticalExpiring.length - 3} Lot Lainnya
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Warning <= 30 hari */}
          <div
            onClick={readOnly ? undefined : () => onNavigateToTab('batches')}
            className={`rounded-xl border border-yellow-200 bg-yellow-50/60 p-4 flex flex-col justify-between ${readOnly ? '' : 'cursor-pointer hover:border-yellow-300 transition'}`}
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-yellow-800">PERINGATAN (&le; 30 Hari)</span>
                <span className="rounded-md bg-yellow-600 px-2 py-0.5 text-xs font-bold text-white">
                  {warningExpiring.length}
                </span>
              </div>
              <p className="text-[11px] text-yellow-700 mt-2">Mendekati masa habis berlaku</p>
            </div>
            {warningExpiring.length > 0 && (
              <div className="mt-3 pt-3 border-t border-yellow-200/50 space-y-1">
                {warningExpiring.slice(0, 3).map((b) => (
                  <div key={b.id} className="text-[10px] text-yellow-700 flex justify-between items-center gap-1">
                    <span className="font-bold truncate" title={b.reagentName}>{b.reagentName}</span>
                    <span className="font-mono text-[9px] bg-yellow-100/80 px-1 py-0.2 rounded shrink-0">Lot: {b.lotNumber}</span>
                  </div>
                ))}
                {warningExpiring.length > 3 && (
                  <div className="text-[9px] text-yellow-500 font-bold text-right">
                    + {warningExpiring.length - 3} Lot Lainnya
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Attention <= 90 hari */}
          <div
            onClick={readOnly ? undefined : () => onNavigateToTab('batches')}
            className={`rounded-xl border border-blue-200 bg-blue-50/60 p-4 flex flex-col justify-between ${readOnly ? '' : 'cursor-pointer hover:border-blue-300 transition'}`}
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-800">PERHATIAN (&le; 90 Hari)</span>
                <span className="rounded-md bg-blue-600 px-2 py-0.5 text-xs font-bold text-white">
                  {attentionExpiring.length}
                </span>
              </div>
              <p className="text-[11px] text-blue-700 mt-2">Perhatikan saat perencanaan PO</p>
            </div>
            {attentionExpiring.length > 0 && (
              <div className="mt-3 pt-3 border-t border-blue-200/50 space-y-1">
                {attentionExpiring.slice(0, 3).map((b) => (
                  <div key={b.id} className="text-[10px] text-blue-700 flex justify-between items-center gap-1">
                    <span className="font-bold truncate" title={b.reagentName}>{b.reagentName}</span>
                    <span className="font-mono text-[9px] bg-blue-100/80 px-1 py-0.2 rounded shrink-0">Lot: {b.lotNumber}</span>
                  </div>
                ))}
                {attentionExpiring.length > 3 && (
                  <div className="text-[9px] text-blue-500 font-bold text-right">
                    + {attentionExpiring.length - 3} Lot Lainnya
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Category Breakdown & Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Category Breakdown */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-base flex items-center space-x-2 pb-3 border-b border-slate-100">
              <PieIcon className="h-5 w-5 text-indigo-600" />
              <span>Stok Berdasarkan Kategori</span>
            </h3>

            <div className="mt-4 space-y-3">
              {Object.entries(categoryMap).map(([catName, stats]) => (
                <div key={catName} className="space-y-1">
                  <div className="flex justify-between text-xs font-medium text-slate-700">
                    <span>{catName}</span>
                    <span className="font-bold text-slate-900">
                      {stats.count} Unit (Rp {stats.value.toLocaleString('id-ID')})
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(
                          100,
                          (stats.value / (totalInventoryValue || 1)) * 100
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Opened Reagents Stat Box */}
          <div className="mt-6 rounded-xl border border-indigo-100 bg-indigo-50/60 p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-indigo-900">Reagen Dibuka (Open Stability)</p>
              <p className="text-[11px] text-indigo-700">
                {openedBatches.length} Lot reagen sedang dalam periode pemakaian aktif
              </p>
            </div>
            {!readOnly && (
              <button
                onClick={() => onNavigateToTab('batches')}
                className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-700 transition shrink-0"
              >
                Cek Stabilitas
              </button>
            )}
          </div>
        </div>

        {/* Recent Transactions Feed */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="font-bold text-slate-900 text-base flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-indigo-600" />
              <span>Transaksi Terakhir (IN / OUT)</span>
            </h3>
            {!readOnly && (
            <button
              onClick={() => onNavigateToTab('reports')}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-700 hover:underline"
            >
              Lihat Laporan Lengkap &rarr;
            </button>
          )}
          </div>

          <div className="mt-4 space-y-3">
            {transactions.slice(0, 5).map((trx) => (
              <div
                key={trx.id}
                className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/80 p-3.5 hover:bg-slate-100 transition"
              >
                <div className="flex items-center space-x-3">
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-xl font-bold text-white shrink-0 ${
                      trx.type === 'IN' ? 'bg-emerald-600' : 'bg-rose-600'
                    }`}
                  >
                    {trx.type === 'IN' ? (
                      <ArrowDownLeft className="h-5 w-5" />
                    ) : (
                      <ArrowUpRight className="h-5 w-5" />
                    )}
                  </div>

                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-xs text-slate-900">
                        {trx.transactionNumber}
                      </span>
                      <span
                        className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                          trx.type === 'IN'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {trx.type}
                      </span>
                    </div>

                    <p className="text-xs text-slate-500 mt-0.5">
                      {trx.type === 'IN'
                        ? `Dari ${trx.supplierName || 'Supplier'} | ${trx.items.length} Item`
                        : `Ke ${trx.destinationUnit || 'Unit'} (${trx.purpose || '-'}) | ${
                            trx.items.length
                          } Item`}
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <p className="font-bold text-xs text-slate-900">
                    Rp {trx.totalAmount.toLocaleString('id-ID')}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{trx.date}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
