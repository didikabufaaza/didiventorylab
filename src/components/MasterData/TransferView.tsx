import React, { useState } from 'react';
import {
  ArrowLeftRight,
  MapPin,
  Calendar,
  User,
  FileText,
  AlertCircle,
  CheckCircle2,
  Package,
  Layers,
  Search,
} from 'lucide-react';
import {
  ReagentBatch,
  StorageLocation,
  UserRole,
} from '../../types.js';

interface TransferViewProps {
  batches: ReagentBatch[];
  locations: StorageLocation[];
  currentRole: UserRole;
  onProcessTransfer: (payload: any) => Promise<void>;
}

export const TransferView: React.FC<TransferViewProps> = ({
  batches,
  locations,
  currentRole,
  onProcessTransfer,
}) => {
  const canEdit = currentRole === 'Super Admin' || currentRole === 'Admin Inventory';

  // Filter out batches that are empty or expired (or allow transferring any batch with stock > 0)
  const activeBatches = batches.filter((b) => b.currentQuantity > 0);

  // States
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [qtyInput, setQtyInput] = useState<number>(1);
  const [selectedDestLocationId, setSelectedDestLocationId] = useState(locations[0]?.id || '');
  const [notes, setNotes] = useState('');

  const [batchSearchQuery, setBatchSearchQuery] = useState('');
  const [isBatchDropdownOpen, setIsBatchDropdownOpen] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Selected batch info
  const selectedBatch = activeBatches.find((b) => b.id === selectedBatchId);

  // Filtered batches for dropdown search
  const filteredSearchBatches = activeBatches.filter(
    (b) =>
      b.reagentName.toLowerCase().includes(batchSearchQuery.toLowerCase()) ||
      b.lotNumber.toLowerCase().includes(batchSearchQuery.toLowerCase()) ||
      b.reagentCode.toLowerCase().includes(batchSearchQuery.toLowerCase())
  );

  const handleSelectBatch = (b: ReagentBatch) => {
    setSelectedBatchId(b.id);
    setBatchSearchQuery(`${b.reagentName} (LOT: ${b.lotNumber})`);
    setIsBatchDropdownOpen(false);
    // Suggest transferring whole batch quantity
    setQtyInput(b.currentQuantity);
    setErrorMessage(null);
  };

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!selectedBatchId || !selectedBatch) {
      setErrorMessage('Pilih batch reagen yang akan ditransfer.');
      return;
    }

    if (qtyInput <= 0) {
      setErrorMessage('Jumlah transfer harus lebih besar dari 0.');
      return;
    }

    if (qtyInput > selectedBatch.currentQuantity) {
      setErrorMessage(`Jumlah transfer melebihi stok yang tersedia (${selectedBatch.currentQuantity} ${selectedBatch.unit}).`);
      return;
    }

    if (!selectedDestLocationId) {
      setErrorMessage('Pilih lokasi penyimpanan tujuan.');
      return;
    }

    const destLoc = locations.find((l) => l.id === selectedDestLocationId);
    if (!destLoc) {
      setErrorMessage('Lokasi tujuan tidak valid.');
      return;
    }

    if (selectedBatch.locationId === selectedDestLocationId) {
      setErrorMessage('Lokasi tujuan sama dengan lokasi penyimpanan saat ini.');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        batchId: selectedBatch.id,
        quantity: qtyInput,
        sourceLocationName: selectedBatch.locationName,
        destinationLocationId: destLoc.id,
        destinationLocationName: destLoc.name,
        notes,
        userRole: currentRole,
      };

      await onProcessTransfer(payload);

      setSuccessMessage(
        `Sukses mentransfer ${qtyInput} ${selectedBatch.unit} ${selectedBatch.reagentName} (LOT: ${selectedBatch.lotNumber}) ke ${destLoc.name}.`
      );

      // Reset Form
      setSelectedBatchId('');
      setBatchSearchQuery('');
      setQtyInput(1);
      setNotes('');
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Gagal memproses transfer lokasi reagen.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">Transfer Lokasi Reagen</h1>
          <p className="text-xs text-slate-500 mt-1">
            Pindahkan reagen antar-rak, kulkas penyimpanan, atau ruangan laboratorium secara real-time.
          </p>
        </div>
      </div>

      {errorMessage && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-800 flex items-center space-x-2">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold text-emerald-800 flex items-center space-x-2">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>{successMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Transfer */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
          <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <ArrowLeftRight className="h-4 w-4 text-indigo-600" /> Formulir Mutasi Lokasi
          </h2>

          <form onSubmit={handleTransferSubmit} className="space-y-4">
            {/* Search/Select Batch */}
            <div className="relative">
              <label className="block text-[11px] font-bold text-slate-600 mb-1 uppercase">Pilih Reagen & Lot Number</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Ketik nama reagen atau lot number untuk mencari..."
                  value={batchSearchQuery}
                  onChange={(e) => {
                    setBatchSearchQuery(e.target.value);
                    setIsBatchDropdownOpen(true);
                  }}
                  onFocus={() => setIsBatchDropdownOpen(true)}
                  disabled={!canEdit || isSubmitting}
                  className="w-full rounded-xl border border-slate-200 p-3 pl-10 text-xs font-medium focus:border-indigo-500 focus:outline-hidden"
                />
                <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                {selectedBatchId && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedBatchId('');
                      setBatchSearchQuery('');
                      setErrorMessage(null);
                    }}
                    className="absolute right-3.5 top-3 text-[10px] bg-slate-100 hover:bg-slate-200 rounded px-2 py-1 text-slate-600 font-bold"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Dropdown */}
              {isBatchDropdownOpen && (
                <div className="absolute z-20 w-full mt-1 max-h-60 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg">
                  {filteredSearchBatches.length === 0 ? (
                    <div className="p-3 text-center text-xs text-slate-400 font-medium">
                      Tidak ada batch reagen dengan stok aktif.
                    </div>
                  ) : (
                    filteredSearchBatches.map((b) => (
                      <div
                        key={b.id}
                        onClick={() => handleSelectBatch(b)}
                        className="p-3 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-b-0 text-left"
                      >
                        <div className="font-bold text-slate-900 text-xs">{b.reagentName}</div>
                        <div className="flex items-center justify-between mt-1 text-[10px] text-slate-500">
                          <div>
                            LOT: <span className="font-mono font-bold text-indigo-700">{b.lotNumber}</span>
                          </div>
                          <div>
                            Lokasi Saat Ini: <span className="font-semibold text-slate-800">{b.locationName}</span>
                          </div>
                          <div>
                            Stok: <span className="font-bold text-teal-800">{b.currentQuantity} {b.unit}</span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Batch Info Summary */}
            {selectedBatch && (
              <div className="rounded-xl bg-slate-50 p-4 border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="block text-[10px] text-slate-500 font-bold uppercase">Stok Tersedia</span>
                  <span className="font-bold text-teal-800 text-sm mt-0.5 block">
                    {selectedBatch.currentQuantity} {selectedBatch.unit}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-500 font-bold uppercase">Lokasi Asal</span>
                  <span className="font-semibold text-slate-800 mt-0.5 block flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-rose-500" /> {selectedBatch.locationName}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-500 font-bold uppercase">Tanggal ED</span>
                  <span className="font-medium text-slate-800 mt-0.5 block flex items-center gap-1">
                    <Calendar className="h-3 w-3 text-slate-400" /> {selectedBatch.expiryDate}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-500 font-bold uppercase">Kode Reagen</span>
                  <span className="font-mono text-slate-600 mt-0.5 block">
                    {selectedBatch.reagentCode}
                  </span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Transfer Quantity */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1 uppercase">Jumlah Transfer</label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max={selectedBatch?.currentQuantity || 9999}
                    value={qtyInput}
                    onChange={(e) => setQtyInput(Number(e.target.value))}
                    disabled={!selectedBatchId || isSubmitting || !canEdit}
                    className="w-full rounded-xl border border-slate-200 p-3 text-xs font-bold focus:border-indigo-500 focus:outline-hidden"
                  />
                  <span className="absolute right-3.5 top-3.5 text-[11px] font-bold text-slate-400">
                    {selectedBatch?.unit || 'Unit'}
                  </span>
                </div>
              </div>

              {/* Destination Location */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1 uppercase">Lokasi Tujuan</label>
                <select
                  value={selectedDestLocationId}
                  onChange={(e) => setSelectedDestLocationId(e.target.value)}
                  disabled={!selectedBatchId || isSubmitting || !canEdit}
                  className="w-full rounded-xl border border-slate-200 p-3 text-xs font-bold focus:border-indigo-500 focus:outline-hidden bg-white"
                >
                  <option value="">Pilih Lokasi Tujuan</option>
                  {locations.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name} ({l.temperatureCondition})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1 uppercase">Keterangan / Alasan Mutasi</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={!selectedBatchId || isSubmitting || !canEdit}
                placeholder="Tuliskan catatan alasan mutasi atau info tambahan jika diperlukan..."
                rows={3}
                className="w-full rounded-xl border border-slate-200 p-3 text-xs focus:border-indigo-500 focus:outline-hidden"
              />
            </div>

            {/* Action Buttons */}
            {canEdit && (
              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold text-xs px-5 py-3 rounded-xl shadow-md hover:shadow-lg transition cursor-pointer"
                >
                  <ArrowLeftRight className="h-4 w-4" />
                  <span>{isSubmitting ? 'Memproses Mutasi...' : 'Eksekusi Transfer Lokasi'}</span>
                </button>
              </div>
            )}
          </form>
        </div>

        {/* Info & Ketentuan */}
        <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6 space-y-4">
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
            <AlertCircle className="h-4 w-4 text-indigo-600" /> Aturan Mutasi Lokasi
          </h3>
          <ul className="space-y-3 text-xs text-slate-600 list-disc pl-4 leading-relaxed">
            <li><strong>FEFO Integration</strong>: Transfer lokasi tidak mengubah tanggal kadaluarsa reagen ataupun data batch asal.</li>
            <li><strong>Audit Trail</strong>: Setiap pergeseran fisik reagen secara otomatis dicatat dalam log audit resmi beserta identitas petugas.</li>
            <li><strong>Kesesuaian Suhu</strong>: Pastikan reagen sensitif dipindahkan ke kulkas/rak yang memiliki kisaran suhu sesuai standar pabrik.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
