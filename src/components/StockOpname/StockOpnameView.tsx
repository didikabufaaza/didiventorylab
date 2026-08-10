import React, { useState } from 'react';
import { ClipboardCheck, Plus, CheckCircle2, AlertTriangle, Layers, Save } from 'lucide-react';
import { StockOpnameSession, ReagentBatch, StorageLocation, UserRole } from '../../types.js';

interface StockOpnameViewProps {
  stockOpnames: StockOpnameSession[];
  batches: ReagentBatch[];
  locations: StorageLocation[];
  currentRole: UserRole;
  onCreateStockOpname: (payload: any) => Promise<void>;
}

export const StockOpnameView: React.FC<StockOpnameViewProps> = ({
  stockOpnames,
  batches,
  locations,
  currentRole,
  onCreateStockOpname,
}) => {
  const [selectedLocationId, setSelectedLocationId] = useState(locations[0]?.id || 'loc-1');
  const [sessionTitle, setSessionTitle] = useState('Stock Opname Bulanan Reagen');
  const [isCreating, setIsCreating] = useState(false);

  // Buffer physical counts for batches in selected location
  const locationBatches = batches.filter((b) => b.locationId === selectedLocationId);
  const [physicalCounts, setPhysicalCounts] = useState<Record<string, number>>({});

  const handlePhysicalChange = (batchId: string, val: number) => {
    setPhysicalCounts({ ...physicalCounts, [batchId]: val });
  };

  const handleFinalizeOpname = async () => {
    const location = locations.find((l) => l.id === selectedLocationId);

    const items = locationBatches.map((b) => {
      const phys = physicalCounts[b.id] !== undefined ? physicalCounts[b.id] : b.currentQuantity;
      return {
        batchId: b.id,
        reagentId: b.reagentId,
        reagentCode: b.reagentCode,
        reagentName: b.reagentName,
        lotNumber: b.lotNumber,
        expiryDate: b.expiryDate,
        locationName: b.locationName,
        systemStock: b.currentQuantity,
        physicalStock: phys,
        unitPrice: b.purchasePrice || 0,
      };
    });

    await onCreateStockOpname({
      title: sessionTitle,
      locationId: selectedLocationId,
      locationName: location?.name || 'Gudang Utama',
      items,
    });

    setIsCreating(false);
  };

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="rounded-lg bg-teal-100 p-2 text-teal-700">
              <ClipboardCheck className="h-6 w-6" />
            </span>
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Stock Opname & Penyesuaian Fisik (Adjustment)</h2>
              <p className="text-xs text-slate-500">
                Pemeriksaan fisik rutin stok reagen, perhitungan otomatis selisih (+/-), dan koreksi inventory.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => setIsCreating(!isCreating)}
          className="flex items-center space-x-2 rounded-xl bg-teal-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-teal-600/30 hover:bg-teal-700 transition shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span>{isCreating ? 'Tutup Form Opname' : 'Mulai Sesi Stock Opname'}</span>
        </button>
      </div>

      {isCreating && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
          <h3 className="font-bold text-slate-900 text-sm">Form Pengecekan Fisik Stok (Opname Active)</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Judul / Keterangan Sesi</label>
              <input
                type="text"
                value={sessionTitle}
                onChange={(e) => setSessionTitle(e.target.value)}
                className="w-full rounded-xl border border-slate-300 p-2 text-xs font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Pilih Lokasi Audit Storage *</label>
              <select
                value={selectedLocationId}
                onChange={(e) => setSelectedLocationId(e.target.value)}
                className="w-full rounded-xl border border-slate-300 p-2 text-xs font-semibold"
              >
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 font-bold uppercase text-slate-700">
                <tr>
                  <th className="px-4 py-2.5">Reagen</th>
                  <th className="px-4 py-2.5">Lot & ED</th>
                  <th className="px-4 py-2.5">Stok Sistem</th>
                  <th className="px-4 py-2.5">Input Stok Fisik Audit</th>
                  <th className="px-4 py-2.5">Selisih (+/-)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {locationBatches.map((b) => {
                  const phys = physicalCounts[b.id] !== undefined ? physicalCounts[b.id] : b.currentQuantity;
                  const diff = phys - b.currentQuantity;
                  return (
                    <tr key={b.id}>
                      <td className="px-4 py-2.5 font-bold text-slate-900">{b.reagentName}</td>
                      <td className="px-4 py-2.5 font-mono">{b.lotNumber} ({b.expiryDate})</td>
                      <td className="px-4 py-2.5 font-bold text-slate-700">{b.currentQuantity} {b.unit}</td>
                      <td className="px-4 py-2.5">
                        <input
                          type="number"
                          min="0"
                          value={phys}
                          onChange={(e) => handlePhysicalChange(b.id, Number(e.target.value))}
                          className="w-24 rounded-lg border border-slate-300 p-1 text-center font-bold text-slate-900"
                        />
                      </td>
                      <td className="px-4 py-2.5 font-extrabold">
                        <span className={diff < 0 ? 'text-rose-600' : diff > 0 ? 'text-emerald-600' : 'text-slate-400'}>
                          {diff > 0 ? `+${diff}` : diff}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={handleFinalizeOpname}
              className="rounded-xl bg-teal-600 px-5 py-2.5 text-xs font-extrabold text-white hover:bg-teal-700 shadow-md flex items-center space-x-1.5"
            >
              <Save className="h-4 w-4" />
              <span>Finalisasi Stock Opname & Penyesuaian Stok</span>
            </button>
          </div>
        </div>
      )}

      {/* History */}
      <div className="space-y-3">
        <h3 className="font-bold text-slate-900 text-sm">Histori Sesi Stock Opname Terakhir</h3>
        {stockOpnames.map((so) => (
          <div key={so.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-2">
            <div className="flex justify-between items-center">
              <div>
                <span className="font-mono text-xs font-bold text-slate-900">{so.sessionNumber}</span>
                <span className="ml-2 text-xs font-bold text-slate-800">{so.title}</span>
              </div>
              <span className="rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5">
                {so.status}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Lokasi: {so.locationName} | Oleh: {so.userName} | Tanggal: {so.date}
            </p>
            <p className="text-xs font-bold text-slate-900">
              Total Item Audit: {so.totalItems} | Total Selisih Fisik: {so.totalDifference} Unit
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};
